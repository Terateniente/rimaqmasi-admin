import { useEffect, useId, useMemo, useState } from 'react';
import { Activity, BookOpen, CheckCircle2, Clock3, Download, FileBarChart, FileSpreadsheet, FileText, GraduationCap, Languages, RefreshCw, ShieldCheck, Target, UserPlus, Users, Info, ArrowRight, TrendingUp, ClipboardList, Type } from 'lucide-react';
import { AreaChart, Area, BarChart as RechartsBarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { downloadCsv, getAdminAnalytics, getAdminExport } from '../services/analyticsService';
import { useAuth } from '../hooks/useAuth';
import { isSuperAdmin } from '../utils/roles';
import { drawWhitePdfLogo, loadWhitePdfLogo } from '../utils/pdfBranding';
import { RimaqSelect } from '../components/RimaqSelect';
import './analytics.css';

const RIMAQ_PALETTE = Object.freeze({
  red: '#B9212E',
  yellow: '#E4B221',
  green: '#3F8A4A',
  blue: '#1F5FA9',
  purple: '#6D3B8C',
  orange: '#D96C2F',
  white: '#FFFFFF',
});
const CHART_COLORS = [
  RIMAQ_PALETTE.red,
  RIMAQ_PALETTE.yellow,
  RIMAQ_PALETTE.green,
  RIMAQ_PALETTE.blue,
  RIMAQ_PALETTE.purple,
  RIMAQ_PALETTE.orange,
];

const formatNumber = value => new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1 }).format(value || 0);
const shortChartDateFormatter = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short' });
const longChartDateFormatter = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
const parseChartDate = value => {
  const [year, month, day] = String(value || '').split('-').map(Number);
  return year && month && day ? new Date(year, month - 1, day) : null;
};
const formatChartDate = (value, long = false) => {
  const date = parseChartDate(value);
  if (!date || Number.isNaN(date.getTime())) return String(value || '');
  return (long ? longChartDateFormatter : shortChartDateFormatter).format(date).replace('.', '');
};
const formatExportDate = value => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
const formatExportTime = value => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
};
const percent = (value, total) => total > 0 ? Number(((Number(value || 0) / total) * 100).toFixed(2)) : 0;

const buildExportReport = (data, kind) => {
  const distributions = data?.distributions || {};
  const totals = data?.totals || {};
  const trends = data?.trends || [];
  const distributionRows = (items, total) => (items || []).map(item => ({
    Estado: item.label || item.key || 'Sin estado',
    Cantidad: Number(item.value || 0),
    'Porcentaje (%)': percent(item.value, total),
  }));

  const reports = {
    users: {
      title: 'Listado completo de usuarios',
      description: 'Perfiles, roles, accesos, XP, rachas y participación.',
      summary: `${formatNumber(totals.usuarios)} usuarios analizados`,
      periodSensitive: false,
      rows: distributionRows(distributions.usuarios_estado, totals.usuarios),
    },
    courses: {
      title: 'Listado completo de cursos',
      description: 'Idiomas, nivel, estructura, responsables y matrículas.',
      summary: `${formatNumber(totals.cursos)} cursos analizados`,
      periodSensitive: false,
      rows: distributionRows(distributions.cursos_estado, totals.cursos),
    },
    learning: {
      title: 'Detalle de aprendizaje',
      description: 'Intentos, retos, respuestas, resultados, vidas y XP.',
      summary: `${formatNumber(totals.respuestas)} respuestas · ${formatNumber(totals.intentos)} intentos`,
      rows: trends.map(item => ({
        Fecha: formatExportDate(`${item.fecha}T12:00:00`),
        Intentos: Number(item.intentos || 0),
        Respuestas: Number(item.respuestas || 0),
        Correctas: Number(item.correctas || 0),
        'Precisión (%)': percent(item.correctas, item.respuestas),
      })),
    },
    enrollments: {
      title: 'Listado completo de matrículas',
      description: 'Estudiantes, cursos, progreso y actividad académica.',
      summary: `${formatNumber(totals.matriculas)} matrículas registradas`,
      rows: trends.map(item => ({ Fecha: formatExportDate(`${item.fecha}T12:00:00`), Matrículas: Number(item.matriculas || 0) })),
    },
    dictionary: {
      title: 'Diccionario completo',
      description: 'Traducciones, ejemplos, multimedia, categorías y autoría.',
      summary: `${formatNumber(totals.palabras)} palabras analizadas`,
      periodSensitive: false,
      rows: distributionRows(distributions.palabras_estado, totals.palabras),
    },
    activity: {
      title: 'Registro detallado de actividad',
      description: 'Eventos reales de todos los módulos durante el periodo.',
      summary: `${formatNumber((data?.recent_activity || []).length)} eventos recientes`,
      periodSensitive: false,
      rows: (data?.recent_activity || []).map(item => ({
        Fecha: formatExportDate(item.fecha),
        Hora: formatExportTime(item.fecha),
        Módulo: item.tipo === 'usuario' ? 'Usuarios' : item.tipo === 'matricula' ? 'Académico' : 'Diccionario',
        Evento: item.titulo || '',
        Detalle: item.detalle || '',
        Usuario: item.usuario || 'Autor no disponible',
      })),
    },
    overview: {
      title: 'Resumen de actividad diaria',
      description: 'Indicadores diarios consolidados del sistema.',
      summary: `${formatNumber(trends.length)} días incluidos`,
      rows: trends.map(item => ({
        Fecha: formatExportDate(`${item.fecha}T12:00:00`), Usuarios: Number(item.usuarios || 0),
        Matrículas: Number(item.matriculas || 0), Intentos: Number(item.intentos || 0),
        Respuestas: Number(item.respuestas || 0), Correctas: Number(item.correctas || 0),
      })),
    },
  };

  return reports[kind] || reports.overview;
};

const worksheetWidths = rows => Object.keys(rows[0] || {}).map(key => ({
  wch: Math.min(55, Math.max(key.length + 2, ...rows.map(row => String(row[key] ?? '').length + 2))),
}));
const pageConfig = {
  overview: ['Resumen general', 'Indicadores clave del aprendizaje y la gestión de la plataforma.'],
  statistics: ['Estadísticas', 'Tendencias y distribución de los datos principales.'],
  activity: ['Actividad reciente', 'Últimos cambios registrados en la plataforma.'],
  quick: ['Accesos rápidos', 'Atajos a las tareas administrativas más frecuentes.'],
  users: ['Reporte de usuarios', 'Cuentas, roles, estados y crecimiento reciente.'],
  courses: ['Reporte de cursos', 'Oferta académica y estado de publicación.'],
  learning: ['Reporte de aprendizaje', 'Intentos, respuestas y progreso promedio.'],
  enrollments: ['Reporte de matrículas', 'Inscripciones y evolución del periodo.'],
  dictionary: ['Reporte del diccionario', 'Palabras publicadas, pendientes y aportes por revisar.'],
  exports: ['Exportaciones', 'Descarga reportes administrativos en Excel y PDF.'],
};

const metricDefinitions = {
  overview: [['Eventos totales', 'eventos', Activity], ['Usuarios activos', 'usuarios', Users], ['Palabras registradas', 'palabras', Type], ['Matrículas', 'matriculas', GraduationCap]],
  users: [['Usuarios', 'usuarios', Users], ['Estudiantes', 'estudiantes', GraduationCap], ['Administradores', 'administradores', ShieldCheck]],
  courses: [['Cursos', 'cursos', BookOpen], ['Matrículas', 'matriculas', GraduationCap], ['Retos', 'retos', Target]],
  learning: [['Intentos', 'intentos', Activity], ['Respuestas', 'respuestas', CheckCircle2], ['Progreso promedio', 'progreso_promedio', FileBarChart]],
  enrollments: [['Matrículas', 'matriculas', GraduationCap], ['Estudiantes', 'estudiantes', Users], ['Cursos', 'cursos', BookOpen]],
  dictionary: [['Palabras', 'palabras', Languages], ['Aportes pendientes', 'aportes_pendientes', Clock3], ['Respuestas', 'respuestas', CheckCircle2]],
};

const quickActions = [
  ['/usuarios', 'Gestionar usuarios', Users, 'Crear, activar o revisar cuentas'], 
  ['/academica/cursos', 'Gestionar cursos', BookOpen, 'Editar la estructura académica'],
  ['/diccionario/palabras', 'Crear palabra', Languages, 'Registrar contenido oficial'], 
  ['/diccionario/aportes', 'Revisar aportes', CheckCircle2, 'Aprobar propuestas estudiantiles'],
  ['/evaluaciones/retos', 'Gestionar retos', Target, 'Crear actividades de aprendizaje'], 
  ['/academica/matriculas', 'Gestionar matrículas', GraduationCap, 'Administrar inscripciones activas']
];

// Inside AdminAnalytics component (replace view === 'quick'):
// Note: I will replace the inline section for view === 'quick' further down.

const DashboardSkeleton = () => (
  <div className="analytics-skeleton" aria-hidden="true" style={{ marginTop: 24 }}>
    <div className="metric-grid">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="nm-card skeleton-card">
          <div className="nm-header">
            <div className="skeleton-icon"></div>
            <div className="skeleton-text-group">
              <div className="skeleton-line short"></div>
              <div className="skeleton-line title"></div>
            </div>
          </div>
          <div className="nm-footer skeleton-footer">
             <div className="skeleton-line short"></div>
          </div>
        </div>
      ))}
    </div>
    <div className="dashboard-grid">
      <div className="skeleton-panel"></div>
      <div className="skeleton-panel"></div>
    </div>
  </div>
);

const ExportSkeleton = () => (
  <div className="export-grid" aria-hidden="true">
    {[...Array(6)].map((_, index) => (
      <div className="export-card export-skeleton-card" key={index}>
        <div className="skeleton-icon" />
        <div className="skeleton-line title" />
        <div className="skeleton-line" />
        <div className="skeleton-line short" />
        <div className="skeleton-line" />
      </div>
    ))}
  </div>
);

export const AdminAnalytics = ({ view = 'overview' }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuper = isSuperAdmin(user);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [exporting, setExporting] = useState('');
  const [title, description] = pageConfig[view] || pageConfig.overview;
  
  const load = async () => { try { setLoading(true); setData(await getAdminAnalytics(days)); } catch { toast.error('No se pudieron cargar los indicadores'); } finally { setLoading(false); } };
  useEffect(() => {
    let active = true;
    getAdminAnalytics(days)
      .then(result => { if (active) setData(result); })
      .catch(() => { if (active) toast.error('No se pudieron cargar los indicadores'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [days]);

  const metrics = useMemo(() => {
    if (!data) return [];
    const defaults = [
      ['Usuarios registrados', 'usuarios', UserPlus], 
      ['Cursos activos', 'cursos', BookOpen], 
      ['Matrículas registradas', 'matriculas', GraduationCap], 
      ['Palabras publicadas', 'palabras', Languages], 
      ['Aportes por revisar', 'aportes_pendientes', ClipboardList], 
      ['Avance promedio', 'progreso_promedio', TrendingUp]
    ];
    return (metricDefinitions[view] || defaults).map(([label, key, Icon]) => {
      let value = data.totals[key];
      if (key === 'eventos') {
        value = (data.totals.usuarios || 0) + (data.totals.matriculas || 0) + (data.totals.palabras || 0) + (data.totals.intentos || 0) + (data.totals.respuestas || 0);
      }
      return { label, key, Icon, value, suffix: key === 'progreso_promedio' ? '%' : '' };
    });
  }, [data, view]);

  const exportRows = async (kind = 'overview', format = 'excel') => {
    const taskKey = `${kind}:${format}`;
    const toastId = toast.loading(`Consultando datos y preparando ${format === 'excel' ? 'Excel' : format.toUpperCase()}…`);
    setExporting(taskKey);

    try {
      const detailKinds = ['users', 'courses', 'learning', 'enrollments', 'dictionary', 'activity'];
      const fallback = buildExportReport(data, kind);
      const detail = detailKinds.includes(kind) ? await getAdminExport(kind, days) : null;
      const report = detail ? { ...fallback, ...detail, rows: detail.rows || [] } : fallback;
      const rows = report.rows;
      if (!rows.length) {
        toast.error('No existen registros para exportar con el alcance seleccionado', { id: toastId });
        return;
      }
      const filename = `rimaqmasi-${kind}-${days}-dias-${new Date().toISOString().slice(0, 10)}`;
      if (format === 'csv') {
        downloadCsv(`${filename}.csv`, rows);
      } else if (format === 'excel') {
        const XLSX = await import('xlsx');
        const metadata = [
          ['RIMAQMASI', 'Reporte administrativo detallado'],
          ['Reporte', report.title],
          ['Descripción', report.description],
          ['Alcance', report.scope || (report.periodSensitive === false ? 'Corte actual del sistema' : `Últimos ${days} días`)],
          ['Generado', new Date().toLocaleString('es-PE')],
          ['Registros exportados', rows.length],
          ['Columnas incluidas', Object.keys(rows[0]).length],
          ['Seguridad', 'No incluye contraseñas, tokens ni secretos de autenticación'],
        ];
        const summarySheet = XLSX.utils.aoa_to_sheet(metadata);
        summarySheet['!cols'] = [{ wch: 24 }, { wch: 62 }];
        const dataSheet = XLSX.utils.json_to_sheet(rows);
        dataSheet['!cols'] = worksheetWidths(rows);
        dataSheet['!autofilter'] = { ref: dataSheet['!ref'] };
        const workbook = XLSX.utils.book_new();
        workbook.Props = { Title: report.title, Subject: report.description, Author: 'RimaqMasi', CreatedDate: new Date() };
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');
        XLSX.utils.book_append_sheet(workbook, dataSheet, 'Datos');
        XLSX.writeFile(workbook, `${filename}.xlsx`, { compression: true });
      } else if (format === 'pdf') {
        const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
        const allColumns = Object.keys(rows[0]);
        const columns = (report.pdf_columns || allColumns.slice(0, 9)).filter(column => allColumns.includes(column));
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const whiteLogo = await loadWhitePdfLogo();
        const pageWidth = doc.internal.pageSize.getWidth();
        doc.setFillColor(185, 33, 46);
        doc.rect(0, 0, pageWidth, 38, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        drawWhitePdfLogo(doc, whiteLogo, 14, 4, 62);
        doc.setFontSize(18);
        doc.text(report.title, 14, 25);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(243, 224, 226);
        doc.text(doc.splitTextToSize(report.description, pageWidth - 28), 14, 32);

        const scope = report.scope || (report.periodSensitive === false ? 'Corte actual' : `Últimos ${days} días`);
        const summary = [['REGISTROS', String(rows.length)], ['ALCANCE', scope], ['COLUMNAS EN EXCEL', String(allColumns.length)], ['GENERADO', new Date().toLocaleDateString('es-PE')]];
        const gap = 5;
        const cardWidth = (pageWidth - 28 - gap * 3) / 4;
        summary.forEach(([label, value], index) => {
          const x = 14 + index * (cardWidth + gap);
          doc.setFillColor(248, 244, 245);
          doc.roundedRect(x, 43, cardWidth, 14, 2, 2, 'F');
          doc.setTextColor(185, 33, 46);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.text(label, x + 4, 48);
          doc.setTextColor(35, 47, 66);
          doc.setFontSize(index === 1 ? 8 : 10);
          doc.text(doc.splitTextToSize(value, cardWidth - 8)[0], x + 4, 54);
        });
        autoTable(doc, {
          head: [columns],
          body: rows.map(row => columns.map(column => String(row[column] ?? ''))),
          startY: 63,
          margin: { left: 14, right: 14, bottom: 15 },
          theme: 'grid',
          headStyles: { fillColor: [100, 31, 39], textColor: 255, fontStyle: 'bold', lineColor: [130, 63, 71] },
          styles: { fontSize: 6.5, cellPadding: 2.2, overflow: 'linebreak', lineColor: [224, 218, 219], lineWidth: .15, textColor: [41, 50, 65] },
          alternateRowStyles: { fillColor: [249, 246, 247] },
          didDrawPage: () => {
            const pageHeight = doc.internal.pageSize.getHeight();
            doc.setDrawColor(220, 220, 220);
            doc.line(14, pageHeight - 11, pageWidth - 14, pageHeight - 11);
            doc.setFontSize(8);
            doc.setTextColor(110, 120, 136);
            doc.text('RIMAQMASI · Sistema de aprendizaje de idiomas', 14, pageHeight - 6);
            doc.text(`Página ${doc.internal.getCurrentPageInfo().pageNumber}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
          },
        });
        doc.save(`${filename}.pdf`);
      }
      toast.success(`${format === 'excel' ? 'Excel' : format.toUpperCase()} descargado correctamente`, { id: toastId });
    } catch (error) {
      console.error('No se pudo generar la exportación:', error);
      toast.error(
        error.response?.status === 404
          ? 'La API publicada todavía no contiene la exportación detallada. Actualiza el backend antes de descargar.'
          : error.response?.data?.message || 'No se pudo generar el archivo. Inténtalo nuevamente.',
        { id: toastId, duration: 6500 }
      );
    } finally {
      setExporting('');
    }
  };

  return <div className={`analytics-page analytics-page--${view}`}>
    <header className="analytics-header">
        <div>
          <div className="rq-page-heading">
            <div className="rq-page-heading__accent"></div>
            <h1 className="rq-page-heading__title">{title}</h1>
          </div>
          <p style={{ margin: 0 }}>{description}</p>
        </div>
        <div className="analytics-header-actions">
          <div style={{ minWidth: 120 }}>
            <RimaqSelect
              ariaLabel="Periodo del reporte"
              value={String(days)}
              onValueChange={(val) => {
                setLoading(true);
                setDays(Number(val));
              }}
              options={[
                { value: '7', label: '7 días' },
                { value: '30', label: '30 días' },
                { value: '90', label: '90 días' },
                { value: '365', label: '1 año' },
              ]}
            />
          </div>
          <button type="button" className="analytics-refresh" aria-label={loading ? 'Actualizando datos' : 'Actualizar datos'} onClick={() => load()} disabled={loading} style={{ border: '1px solid var(--color-surface-variant)', background: 'var(--color-surface)', color: 'var(--color-on-surface)', minHeight: 44, width: 44, borderRadius: 10, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
            <RefreshCw size={16} className={loading ? 'spinning' : ''} aria-hidden="true" />
          </button>
          {view !== 'exports' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="analytics-export analytics-export--excel" disabled={Boolean(exporting)} onClick={() => exportRows(view, 'excel')}>
                {exporting === `${view}:excel` ? <RefreshCw className="spinning" size={16} /> : <Download size={16} />} Excel
              </button>
              <button type="button" className="analytics-export analytics-export--pdf" disabled={Boolean(exporting)} onClick={() => exportRows(view, 'pdf')}>
                {exporting === `${view}:pdf` ? <RefreshCw className="spinning" size={16} /> : <Download size={16} />} PDF
              </button>
            </div>
          )}
        </div>
    </header>
    
    {loading ? (view === 'exports' ? <ExportSkeleton /> : <DashboardSkeleton />) : !data ? <div className="analytics-empty">No hay datos disponibles.</div> : <>
      
      {view !== 'activity' && view !== 'quick' && view !== 'exports' && (
        <section className="metric-grid">
          {metrics.map(({ label, key, Icon, value, suffix }) => (
            <article className="nm-card" key={key}>
              <div className="nm-header">
                <div className="nm-icon-wrapper"><Icon size={20} strokeWidth={1.5}/></div>
                <div className="nm-text">
                  <span>{label}</span>
                  <strong>{formatNumber(value)}{suffix}</strong>
                </div>
              </div>
              <div className="nm-footer">
                Últimos {days} días
              </div>
            </article>
          ))}
        </section>
      )}

      {(view === 'overview' || view === 'statistics') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Row 2: 2 columns */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 24 }}>
            <LineChart title="Actividad diaria" data={data.trends} series={[['intentos', RIMAQ_PALETTE.blue], ['matriculas', RIMAQ_PALETTE.green], ['respuestas', RIMAQ_PALETTE.red]]} />
            <HorizontalBarChart
              title="Estudiantes registrados"
              data={[{ label: 'Estudiantes', value: data.totals.estudiantes || 0 }]}
              colors={[RIMAQ_PALETTE.blue]}
              infoText="Total de cuentas activas registradas exclusivamente con el rol estudiante."
            />
          </div>

          {/* Row 3: 2 columns */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 24 }}>
            <DonutChart 
              title="Distribución por tipo" 
              data={[
                { label: 'Palabras registradas', value: data.totals.palabras || 0 },
                { label: 'Nuevos alumnos', value: data.totals.estudiantes || 0 },
                { label: 'Matrículas', value: data.totals.matriculas || 0 },
                { label: 'Respuestas registradas', value: data.totals.respuestas || 0 }
              ]}
              total={(data.totals.estudiantes || 0) + (data.totals.matriculas || 0) + (data.totals.palabras || 0) + (data.totals.respuestas || 0)}
              colors={CHART_COLORS}
            />
            <Heatmap title="Horas de mayor actividad" data={data.actividad_heatmap || []} />
          </div>

          {/* Row 4: 2 columns */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 24 }}>
            <HorizontalBarChart title="Top acciones recientes" data={data.top_acciones || [
                { label: 'Palabra registrada', value: data.totals.palabras || 0 },
                { label: 'Nueva matrícula', value: data.totals.matriculas || 0 },
                { label: 'Nuevo usuario', value: data.totals.usuarios || 0 }
              ].sort((a,b) => b.value - a.value)} colors={CHART_COLORS} />
            {isSuper && <HorizontalBarChart title="Usuarios más activos" data={data.usuarios_top || (() => {
                const counts = {};
                (data.recent_activity || []).forEach(item => {
                  let user = item.usuario || item.usuario_nombre || item.autor;
                  if (!user) {
                    if (item.tipo === 'matricula' && item.detalle.includes(' · ')) user = item.detalle.split(' · ')[0];
                    else if (item.tipo === 'usuario' && item.titulo === 'Nuevo usuario') user = item.detalle;
                    else user = null;
                  }
                  if (user) counts[user] = (counts[user] || 0) + 1;
                });
                const sorted = Object.entries(counts).map(([label, value]) => ({ label, value })).sort((a,b) => b.value - a.value).slice(0, 5);
                return sorted.length > 0 ? sorted : [{ label: 'Sin actividad suficiente', value: 0 }];
              })()} fill={RIMAQ_PALETTE.blue} />}
          </div>

          {/* Row 5: 1 column */}
          {isSuper && <HistoryTable items={(data.recent_activity || []).slice(0, 5)} onSeeAll={() => navigate('/dashboard/actividad')} />}

          {/* Accesos Rápidos */}
          <section style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ width: 4, height: 20, backgroundColor: 'var(--color-primary)', borderRadius: 2 }} />
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: 'var(--color-on-surface)' }}>Accesos rápidos</h2>
              <div style={{ flex: 1, height: 1, backgroundColor: 'var(--color-surface-variant)', marginLeft: 8 }} />
            </div>
            <div className="quick-grid">
              {quickActions
                .filter(([path]) => path !== '/usuarios' && path !== '/usuarios/roles')
                .map(([path, label, Icon, text]) => (
                <button key={path} onClick={() => navigate(path)}>
                  <span className="quick-icon-wrapper">
                    <Icon size={24} />
                  </span>
                  <strong>{label}</strong>
                  <div className="quick-divider" />
                  <small>{text}</small>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {view === 'users' && (
        <div className="dashboard-grid">
          <LineChart title="Nuevos usuarios en el periodo" data={data.trends} series={[["usuarios", RIMAQ_PALETTE.blue]]} />
          <DonutChart title="Distribución por rol" data={data.distributions.usuarios_estado} total={data.totals.usuarios} colors={CHART_COLORS} />
        </div>
      )}

      {view === 'courses' && (
        <div className="dashboard-grid">
          <LineChart title="Retos creados en el periodo" data={data.trends} series={[["retos", RIMAQ_PALETTE.green]]} />
          <DonutChart title="Cursos por estado" data={data.distributions.cursos_estado} total={data.totals.cursos} colors={CHART_COLORS} />
          <div className="dashboard-empty-cell"></div>
          <DonutChart title="Distribución de retos" data={data.distributions.retos_tipo} total={data.totals.retos} colors={CHART_COLORS} />
        </div>
      )}

      {view === 'learning' && (
        <div className="dashboard-grid">
          <LineChart title="Interacciones de aprendizaje" data={data.trends} series={[["respuestas", RIMAQ_PALETTE.blue], ["correctas", RIMAQ_PALETTE.green], ["intentos", RIMAQ_PALETTE.red]]} />
          <DonutChart title="Retos por tipo" data={data.distributions.retos_tipo} total={data.totals.retos} colors={CHART_COLORS} />
        </div>
      )}

      {view === 'enrollments' && (
        <div className="dashboard-grid">
          <LineChart title="Nuevas matrículas en el periodo" data={data.trends} series={[["matriculas", RIMAQ_PALETTE.green]]} />
          <DonutChart title="Matrículas por estado" data={data.distributions.matriculas_estado} total={data.totals.matriculas} colors={CHART_COLORS} />
        </div>
      )}
      
      {view === 'dictionary' && (
        <div className="dashboard-grid">
          <LineChart title="Evolución del diccionario" data={data.trends} series={[["palabras", RIMAQ_PALETTE.red]]} />
          <DonutChart 
            title="Palabras por estado" 
            data={data.distributions.palabras_estado}
            total={data.totals.palabras}
            infoText={`Distribución del diccionario oficial.`}
            colors={CHART_COLORS}
          />
          <div className="analytics-panel callout-panel">
            <Languages size={32} />
            <strong>{formatNumber(data.totals.aportes_pendientes)} aportes pendientes</strong>
            <p>Revisa y aprueba el contenido subido por los estudiantes para mantener la calidad del corpus lingüístico.</p>
            <button onClick={() => navigate('/diccionario/aportes')}>Ir a moderación de aportes</button>
          </div>
        </div>
      )}
      
      {view === 'activity' && isSuper && <ActivityTimeline items={data.recent_activity || []} />}
      

      {view === 'exports' && <ExportCenter data={data} onExport={exportRows} exporting={exporting} isSuper={isSuper} />}
    </>}
  </div>;
};

/* --- New Components --- */

const InfoTooltip = ({ text }) => {
  const tooltipId = useId();

  return (
    <span className="analytics-info-tooltip">
      <button
        type="button"
        className="analytics-info-tooltip__trigger"
        aria-label="Más información"
        aria-describedby={tooltipId}
      >
        <Info size={15} aria-hidden="true" />
      </button>
      <span id={tooltipId} role="tooltip" className="analytics-info-tooltip__content">
        <span className="analytics-info-tooltip__label">Cómo leerlo</span>
        <span className="analytics-info-tooltip__text">{text}</span>
      </span>
    </span>
  );
};

const HorizontalBarChart = ({ title, data, dataKey = "value", nameKey = "label", fill = "var(--color-primary)", colors, infoText = "Muestra el total registrado en cada categoría; una barra más larga representa una cantidad mayor." }) => {
  return (
    <article className="analytics-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-title" style={{ marginBottom: 16 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {title}
          <InfoTooltip text={infoText} />
        </h2>
      </div>
      <div style={{ width: '100%', flex: 1, minHeight: 260 }}>
        <ResponsiveContainer>
          <RechartsBarChart data={data} layout="vertical" margin={{ top: 0, right: 30, left: 30, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-surface-variant)" />
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-on-surface-variant)' }} />
            <YAxis dataKey={nameKey} type="category" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: 'var(--color-on-surface)', fontWeight: 500 }} width={120} />
            <Tooltip 
              cursor={{ fill: 'color-mix(in srgb, var(--color-on-surface) 5%, transparent)' }} 
              contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-surface-variant)', borderRadius: '12px', color: 'var(--color-on-surface)', boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }} 
              itemStyle={{ fontWeight: 700, color: 'var(--color-on-surface)' }} 
              labelStyle={{ display: 'none' }}
              formatter={(value, name, props) => [value, props.payload[nameKey]]}
            />
            <Bar dataKey={dataKey} radius={[0, 8, 8, 0]} barSize={16} fill={fill}>
              {colors && data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
};

const Heatmap = ({ title, data = [] }) => {
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  
  const maxVal = Math.max(1, ...data.map(d => d.value));

  const getIntensity = (d, h) => {
    const point = data.find(p => p.day === d && p.hour === Number(h));
    if (point) {
      return Math.max(0.1, point.value / maxVal);
    }
    return 0.02; // Default empty state
  };

  return (
    <article className="analytics-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-title" style={{ marginBottom: 16 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {title}
          <InfoTooltip text="Cada celda representa la actividad de un día y una hora. Un rojo más intenso indica mayor actividad." />
        </h2>
      </div>
      <div className="heatmap-container" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {days.map((day, d) => (
          <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 26, fontSize: 11, color: 'var(--color-on-surface-variant)' }}>{day}</span>
            <div style={{ display: 'flex', gap: 2, flex: 1 }}>
              {hours.map((hour, h) => (
                <div key={`${day}-${hour}`} style={{ flex: 1, aspectRatio: '1/1', background: RIMAQ_PALETTE.red, opacity: getIntensity(d, h), borderRadius: 1 }} title={`${day} ${hour}:00`} />
              ))}
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <span style={{ width: 26 }}></span>
          <div style={{ display: 'flex', justifyContent: 'space-between', flex: 1 }}>
            {hours.map((h, i) => i % 2 === 0 ? <span key={h} style={{ fontSize: 10, color: 'var(--color-on-surface-variant)', width: '8.33%', textAlign: 'left' }}>{h}</span> : null)}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 'auto', fontSize: 12, color: 'var(--color-on-surface-variant)', paddingTop: 16 }}>
           <span>Menor actividad</span>
           <div style={{ display: 'flex', gap: 2 }}>
             {[0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95].map(op => <div key={op} style={{ width: 14, height: 14, background: RIMAQ_PALETTE.red, opacity: op, borderRadius: 1 }} />)}
           </div>
           <span>Mayor actividad</span>
        </div>
      </div>
    </article>
  );
};

const HistoryTable = ({ items, onSeeAll }) => {
  return (
    <article className="analytics-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-title" style={{ marginBottom: 16 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          Historial reciente
          <InfoTooltip text="Presenta los últimos cambios registrados, junto con su fecha, detalle y usuario responsable." />
        </h2>
      </div>
      <div className="table-responsive" style={{ flex: 1 }}>
        <table className="analytics-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--color-surface-variant)', color: 'var(--color-on-surface-variant)', textAlign: 'left' }}>
              <th style={{ padding: '12px 8px', fontWeight: 600 }}>Fecha y hora</th>
              <th style={{ padding: '12px 8px', fontWeight: 600 }}>Tipo</th>
              <th style={{ padding: '12px 8px', fontWeight: 600 }}>Evento</th>
              <th style={{ padding: '12px 8px', fontWeight: 600 }}>Detalle</th>
              <th style={{ padding: '12px 8px', fontWeight: 600 }}>Usuario</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => {
              const date = new Date(item.fecha);
              let user = item.usuario || item.usuario_nombre || item.autor;
              if (!user) {
                if (item.tipo === 'matricula' && item.detalle.includes(' · ')) user = item.detalle.split(' · ')[0];
                else if (item.tipo === 'usuario' && item.titulo === 'Nuevo usuario') user = item.detalle;
                else user = 'Autor no disponible';
              }
              return (
                <tr key={item.id || i} style={{ borderBottom: '1px solid var(--color-surface-variant)' }}>
                  <td style={{ padding: '12px 8px', color: 'var(--color-on-surface-variant)' }}>
                    {date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })} <br/> {date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    <span className={`timeline-badge ${item.tipo}`} style={{ display: 'inline-flex', padding: '4px 8px', width: 'auto' }}>
                      {item.tipo === 'usuario' ? <UserPlus size={14} /> : item.tipo === 'matricula' ? <GraduationCap size={14} /> : <BookOpen size={14} />}
                      {item.tipo === 'usuario' ? 'SISTEMA' : item.tipo === 'matricula' ? 'ACADÉMICO' : 'DICCIONARIO'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 8px', fontWeight: 500, color: 'var(--color-on-surface)' }}>{item.titulo}</td>
                  <td style={{ padding: '12px 8px', color: 'var(--color-on-surface-variant)', maxWidth: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.detalle}>{item.detalle}</td>
                  <td style={{ padding: '12px 8px', color: 'var(--color-on-surface)', display: 'flex', alignItems: 'center', gap: 6 }}><Users size={14} color="var(--color-on-surface-variant)" /> {user}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <a onClick={onSeeAll} className="at-footer-link" style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px 0 0', color: RIMAQ_PALETTE.red, fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}>
        Ver todo el historial <ArrowRight size={16} />
      </a>
    </article>
  );
};

const LineChart = ({ title, data, series }) => {
  const [period, setPeriod] = useState('Diario');

  const visible = useMemo(() => {
    if (period === 'Diario') return data.slice(-30);
    
    const grouped = {};
    data.forEach(row => {
      const parts = row.fecha.split('-');
      if (parts.length !== 3) return;
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      
      const mYear = monday.getFullYear();
      const mMonth = String(monday.getMonth() + 1).padStart(2, '0');
      const mDate = String(monday.getDate()).padStart(2, '0');
      const safeKey = `${mYear}-${mMonth}-${mDate}`;

      if (!grouped[safeKey]) {
        grouped[safeKey] = { fecha: safeKey };
        series.forEach(([k]) => grouped[safeKey][k] = 0);
      }
      series.forEach(([k]) => {
        if (row[k]) grouped[safeKey][k] += row[k];
      });
    });
    
    return Object.values(grouped).slice(-12);
  }, [data, series, period]);

  return (
    <article className="analytics-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-title" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{title}</h2>
        <div className="analytics-period-switch" role="group" aria-label="Agrupar datos del gráfico">
          {['Diario', 'Semanal'].map(option => (
            <button
              key={option}
              type="button"
              className="analytics-period-switch__option"
              aria-pressed={period === option}
              onClick={() => setPeriod(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer>
          <AreaChart data={visible} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              {series.map(([key, color]) => (
                <linearGradient key={`color${key}`} id={`color${key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.4}/>
                  <stop offset="95%" stopColor={color} stopOpacity={0}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-surface-variant)" />
            <XAxis
              dataKey="fecha"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11.5, fill: 'var(--color-on-surface-variant)', fontWeight: 600 }}
              tickFormatter={value => formatChartDate(value)}
              tickMargin={12}
              minTickGap={28}
              interval="preserveStartEnd"
              padding={{ left: 10, right: 10 }}
            />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--color-on-surface-variant)' }} />
            <Tooltip labelFormatter={value => formatChartDate(value, true)} contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-surface-variant)', borderRadius: '16px', color: 'var(--color-on-surface)', boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }} itemStyle={{ fontWeight: 700, padding: '4px 0' }} labelStyle={{ color: 'var(--color-on-surface-variant)', marginBottom: '8px', fontWeight: 600 }} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: '13px', paddingTop: '16px', fontWeight: 600 }} />
            {series.map(([key, color]) => (
              <Area key={key} type="monotone" dataKey={key} name={key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ')} stroke={color} strokeWidth={3} fillOpacity={1} fill={`url(#color${key})`} activeDot={{ r: 6, strokeWidth: 0 }} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
};

const DonutChart = ({ title, data, total, infoText, colors = CHART_COLORS }) => {
  return (
    <article className="analytics-panel" style={{ height: '100%' }}>
      <div className="panel-title">
        <h2>{title}</h2>
      </div>
      <div className="donut-container">
        <div className="donut-chart-wrapper">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                innerRadius={50}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} itemStyle={{ color: 'var(--color-on-surface)', fontWeight: 700 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="donut-center-text">
            <strong>{formatNumber(total)}</strong>
            <span>Total</span>
          </div>
        </div>
        
        <div className="donut-legend">
          {data.map((item, index) => (
            <div key={item.label} className="donut-legend-item">
              <span className="donut-legend-color" style={{ backgroundColor: colors[index % colors.length] }}></span>
              <span className="donut-legend-label">{item.label}</span>
              <span className="donut-legend-value">{item.value}</span>
              <span className="donut-legend-percent">{total > 0 ? Math.round((item.value / total) * 100) : 0}%</span>
            </div>
          ))}
        </div>
      </div>
      {infoText && (
        <div className="donut-footer">
          <Info size={16} />
          <span>{infoText}</span>
        </div>
      )}
    </article>
  );
};

/* --- Old / Other Views Components --- */

const ActivityTimeline = ({ items }) => {
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil((items?.length || 0) / itemsPerPage);
  const currentItems = (items || []).slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <section className="analytics-panel" style={{ padding: 32 }}>
      <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <div className="nm-icon-wrapper" style={{ width: 44, height: 44, background: 'var(--color-surface-container-lowest)', borderColor: 'transparent' }}><ClipboardList size={20} /></div>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>Historial de auditoría y actividad</h2>
      </div>
      <div className="corporate-timeline">
        {currentItems.map((item) => {
          const date = new Date(item.fecha);
          return (
            <div key={item.id} className="timeline-item">
              <div className="timeline-date">
                <strong>{date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }).replace('.', '').toUpperCase()}</strong>
                <time>{date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</time>
              </div>
              <div className="timeline-divider">
                <span className={`timeline-dot ${item.tipo}`}></span>
              </div>
              <div className="timeline-content">
                <div className="timeline-card">
                  <span className={`timeline-badge ${item.tipo}`}>
                    {item.tipo === 'usuario' ? <UserPlus size={16} /> : item.tipo === 'matricula' ? <GraduationCap size={16} /> : <BookOpen size={16} />}
                    {item.tipo === 'usuario' ? 'SISTEMA' : item.tipo === 'matricula' ? 'ACADÉMICO' : 'DICCIONARIO'}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <strong style={{ fontSize: 15, color: 'var(--color-on-surface)', fontWeight: 800 }}>{item.titulo}</strong>
                    <p style={{ margin: 0, color: 'var(--color-on-surface-variant)', fontSize: 13 }}>{item.detalle}</p>
                    <small style={{ color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>Realizado por: {item.usuario || 'Autor no disponible'}</small>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--color-surface-variant)' }}>
          <button 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--color-surface-variant)', background: page === 1 ? 'transparent' : 'var(--color-surface)', color: page === 1 ? 'var(--color-on-surface-variant)' : 'var(--color-on-surface)', cursor: page === 1 ? 'not-allowed' : 'pointer', fontWeight: 600 }}
          >
            Anterior
          </button>
          <span style={{ fontSize: 14, color: 'var(--color-on-surface-variant)', fontWeight: 500 }}>
            Página {page} de {totalPages}
          </span>
          <button 
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--color-surface-variant)', background: page === totalPages ? 'transparent' : 'var(--color-surface)', color: page === totalPages ? 'var(--color-on-surface-variant)' : 'var(--color-on-surface)', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontWeight: 600 }}
          >
            Siguiente
          </button>
        </div>
      )}
    </section>
  );
};

const ExportCenter = ({ data, onExport, exporting, isSuper }) => {
  const expectedRows = {
    users: data.totals.usuarios, courses: data.totals.cursos, learning: data.totals.respuestas || data.totals.intentos,
    enrollments: data.totals.matriculas, dictionary: data.totals.palabras, activity: null,
  };
  const cards = [
    ['users', Users], ['courses', BookOpen], ['learning', TrendingUp],
    ['enrollments', GraduationCap], ['dictionary', Languages], ['activity', ClipboardList],
  ].filter(([key]) => key !== 'activity' || isSuper)
    .map(([key, Icon]) => ({ key, Icon, ...buildExportReport(data, key) }));

  return (
    <section className="export-center" aria-label="Centro de exportaciones">
      <div className="export-grid">
        {cards.map(({ key, Icon, title, description, summary }) => {
          const excelLoading = exporting === `${key}:excel`;
          const pdfLoading = exporting === `${key}:pdf`;
          return (
            <article className="export-card" key={key}>
              <div className="export-card__top">
                <span className="export-card__icon"><Icon size={24} /></span>
                <span className="export-card__rows">{expectedRows[key] == null ? 'Por periodo' : `${formatNumber(expectedRows[key])} registros`}</span>
              </div>
              <div className="export-card__content">
                <h2>{title}</h2>
                <p>{description}</p>
                <span className="export-card__summary">{summary}</span>
              </div>
              <div className="export-card__actions">
                <button className="export-button export-button--excel" disabled={Boolean(exporting)} onClick={() => onExport(key, 'excel')}>
                  {excelLoading ? <RefreshCw className="spinning" size={17} /> : <FileSpreadsheet size={17} />}
                  <span>{excelLoading ? 'Generando…' : 'Descargar Excel'}</span>
                </button>
                <button className="export-button export-button--pdf" disabled={Boolean(exporting)} onClick={() => onExport(key, 'pdf')}>
                  {pdfLoading ? <RefreshCw className="spinning" size={17} /> : <FileText size={17} />}
                  <span>{pdfLoading ? 'Generando…' : 'PDF'}</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
