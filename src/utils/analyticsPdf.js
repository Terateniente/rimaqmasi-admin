import {
  PDF_THEME,
  applyModernPageChrome,
  compactText,
  drawFilterChipsStrip,
  drawModernPdfHero,
  drawPdfKpiStrip,
  drawPillBadge,
  formatGeneratedDate,
  getModernTableDefaults,
  loadWhitePdfLogo,
  resolveBadgeTone,
} from './pdfBranding.js';

const STATUS_PILL_REGEX = /^(activo|inactivo|publicado|en revisi[oó]n|revision|borrador|archivado|completado|pendiente|aprobado|rechazado|[abc][12])$/i;

const parsePercentNumber = (value) => {
  const num = Number(String(value ?? '').replace('%', '').replace(',', '.').trim());
  if (!Number.isFinite(num)) return null;
  return Math.max(0, Math.min(100, num));
};

const isNumericColumn = (colName, rows) => {
  if (/cantidad|total|intentos|respuestas|correctas|usuarios|matr[ií]culas|xp|racha|vidas|d[ií]as|lecciones|palabras|n\.?°|id$/i.test(colName)) {
    return true;
  }
  const sample = rows.slice(0, 25).map((r) => String(r[colName] ?? '').trim()).filter(Boolean);
  if (!sample.length) return false;
  const numericCount = sample.filter((v) => /^-?[\d.,]+%?$/.test(v)).length;
  return numericCount / sample.length >= 0.8;
};

const isPercentColumn = (colName) =>
  /porcentaje|%|precisi[oó]n|progreso|avance/i.test(colName);

const isStatusColumn = (colName, rows) => {
  if (/estado|estatus|status|nivel/i.test(colName)) return true;
  const sample = rows.slice(0, 20).map((r) => String(r[colName] ?? '').trim()).filter(Boolean);
  if (!sample.length) return false;
  return sample.every((v) => STATUS_PILL_REGEX.test(v));
};

export const generateAnalyticsPdf = async ({ report, rows, days, filename, generatedBy = null }) => {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const allColumns = Object.keys(rows[0] || {});
  const columns = (report.pdf_columns || allColumns.slice(0, 9)).filter((col) => allColumns.includes(col));
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const whiteLogo = await loadWhitePdfLogo();

  const scope = report.scope || (report.periodSensitive === false ? 'Corte actual del sistema' : `Últimos ${days} días`);
  const generatedByName = [
    generatedBy?.nombres || generatedBy?.nombre,
    generatedBy?.apellidos || generatedBy?.apellido,
  ].filter(Boolean).join(' ');

  doc.setProperties({
    title: compactText(report.title, 'Reporte Analítico RIMAQMASI EDU'),
    subject: compactText(report.description, 'Reporte administrativo'),
    author: generatedByName || 'RIMAQMASI EDU',
    creator: 'RIMAQMASI EDU',
  });

  // 1. Encabezado sobrio estilo .rq-page-heading
  const hero = drawModernPdfHero(doc, {
    whiteLogo,
    eyebrow: 'REPORTE ANALÍTICO',
    title: report.title,
    subtitle: report.description,
    metaLeft: `Generado: ${formatGeneratedDate()}   ·   Alcance: ${scope}`,
    metaRight: generatedByName ? `Responsable: ${generatedByName}` : 'Analítica',
  });

  // 2. Tarjetas resumen estilo .nm-card (sin barras laterales)
  const kpi = drawPdfKpiStrip(
    doc,
    [
      {
        label: 'Registros',
        value: String(rows.length),
        sub: 'Filas exportadas en PDF',
      },
      {
        label: 'Alcance',
        value: scope,
        sub: report.periodSensitive === false ? 'Estado vigente' : 'Periodo filtrado',
      },
      {
        label: 'Columnas',
        value: `${columns.length} de ${allColumns.length}`,
        sub: allColumns.length > columns.length ? `Excel incluye ${allColumns.length} col.` : 'Vista completa',
      },
      {
        label: 'Resumen',
        value: report.summary || 'Datos validados',
        sub: 'Sistema RimaqMasi EDU',
      },
    ],
    { y: hero.bottomY + 4.5 }
  );

  let tableStartY = kpi.bottomY + 4.5;
  if (allColumns.length > columns.length) {
    const note = drawFilterChipsStrip(
      doc,
      [{ text: `Vista optimizada (${columns.length} columnas clave). Exporta a Excel para ver las ${allColumns.length} columnas.` }],
      { y: kpi.bottomY + 3.5 }
    );
    tableStartY = note.bottomY + 4;
  }

  // 3. Clasificación sobria de columnas
  const colMeta = columns.map((colName) => {
    const percentCol = isPercentColumn(colName);
    const statusCol = !percentCol && isStatusColumn(colName, rows);
    const numericCol = !percentCol && !statusCol && isNumericColumn(colName, rows);
    return { colName, percentCol, statusCol, numericCol };
  });

  const columnStyles = {};
  colMeta.forEach((meta, idx) => {
    if (meta.statusCol) {
      columnStyles[idx] = { halign: 'center' };
    } else if (meta.percentCol) {
      columnStyles[idx] = { halign: 'right', fontStyle: 'bold', textColor: PDF_THEME.TEXT_PRIMARY };
    } else if (meta.numericCol) {
      columnStyles[idx] = { halign: 'right' };
    }
  });

  const bodyRows = rows.map((row) =>
    colMeta.map((meta) => {
      const rawText = compactText(row[meta.colName], '—');
      if (meta.statusCol && STATUS_PILL_REGEX.test(rawText)) {
        return {
          content: rawText,
          _statusLabel: rawText,
          styles: { halign: 'center', fontSize: 6.8 },
        };
      }
      if (meta.percentCol) {
        const pct = parsePercentNumber(rawText);
        if (pct !== null) {
          return `${pct}%`;
        }
      }
      return rawText;
    })
  );

  const adaptiveFont = columns.length <= 5 ? 8 : columns.length <= 7 ? 7.4 : 6.8;
  const baseTable = getModernTableDefaults({ startY: tableStartY, fontSize: adaptiveFont });
  const pendingPills = new Map();

  autoTable(doc, {
    ...baseTable,
    head: [colMeta.map((meta) => ({
      content: compactText(meta.colName, meta.colName),
      styles: meta.statusCol
        ? { halign: 'center' }
        : meta.percentCol || meta.numericCol
          ? { halign: 'right' }
          : {},
    }))],
    body: bodyRows,
    columnStyles,
    willDrawCell: (data) => {
      if (data.section !== 'body') return;
      const raw = data.cell.raw;
      if (raw && typeof raw === 'object' && raw._statusLabel) {
        pendingPills.set(data.cell, raw._statusLabel);
        data.cell.text = [];
      }
    },
    didDrawCell: (data) => {
      if (data.section !== 'body') return;
      const label = pendingPills.get(data.cell);
      if (!label) return;
      pendingPills.delete(data.cell);
      const { cell } = data;
      const tone = resolveBadgeTone(label);
      drawPillBadge(doc, {
        x: cell.x + cell.width / 2,
        y: cell.y + (cell.height - 4.6) / 2,
        text: label.toUpperCase(),
        bg: tone.bg,
        color: tone.color,
        fontSize: 6.3,
        height: 4.6,
        paddingX: 2.1,
        align: 'center',
      });
    },
  });

  applyModernPageChrome(doc, {
    reportTitle: report.title,
    subtitle: scope,
  });

  const finalName = `${filename}.pdf`;
  doc.save(finalName);
  return finalName;
};
