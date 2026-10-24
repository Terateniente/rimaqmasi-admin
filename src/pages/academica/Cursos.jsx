import React, { useEffect, useState } from 'react';
import { getCursos, getCursoById, createCurso, updateCurso, deleteCurso, toggleEstadoCurso, uploadPortadaCurso } from '../../services/cursoService';
import { getIdiomas } from '../../services/idiomaService';
import { getUsuarios } from '../../services/userService';
import { getUnidadsByCurso } from '../../services/unidadService';
import { getSesionesByUnidad } from '../../services/sesionService';
import { getLeccionesBySesion } from '../../services/leccionService';
import { toast } from 'sonner';
import { Search, Plus, Edit2, Trash2, ArrowRight, X, Save, BookOpen, Calendar, User, CheckCircle, XCircle, Eye, Layers, ListTree, FileDown, LoaderCircle, Filter, ChevronDown } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../hooks/useAuth';
import { FastAverageColor } from 'fast-average-color';
import { matchesSearch } from '../../utils/searchUtils';
import { generateCurriculumPdf } from '../../utils/curriculumPdf';
import { DeleteConfirmationModal } from '../../components/DeleteConfirmationModal';
import { WizardProgress } from '../../components/WizardProgress';
import { RimaqSelect } from '../../components/RimaqSelect';

const normalizeList = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  return [];
};

const nivelesCurso = [
  { value: 'A1', label: 'A1 - Básico', grupo: 'Básico' },
  { value: 'A2', label: 'A2 - Básico', grupo: 'Básico' },
  { value: 'B1', label: 'B1 - Intermedio', grupo: 'Intermedio' },
  { value: 'B2', label: 'B2 - Intermedio', grupo: 'Intermedio' },
  { value: 'C1', label: 'C1 - Avanzado', grupo: 'Avanzado' },
  { value: 'C2', label: 'C2 - Avanzado', grupo: 'Avanzado' },
];

const getNivelCursoLabel = (nivel) => nivelesCurso.find(n => n.value === nivel)?.label || 'A1 - Básico';

const CursoCard = ({ curso, idiomas, getImageUrl, onView, onEdit, onDelete, onToggleEstado, onExportPdf, isExportingPdf }) => {
  // Find full idioma data (with flag URL) from the idiomas list
  const idiomaOrigenFull = idiomas.find(i => (i.idioma_id || i.id) === curso.idioma_origen_id);
  const idiomaDestinoFull = idiomas.find(i => (i.idioma_id || i.id) === curso.idioma_destino_id);
  const flagOrigen = getImageUrl(idiomaOrigenFull?.url_icono_bandera);
  const flagDestino = getImageUrl(idiomaDestinoFull?.url_icono_bandera);
  const cursoNombre = curso.nombre || 'Sin nombre';

  const [colorOrigen, setColorOrigen] = useState('var(--color-on-surface)');
  const [colorDestino, setColorDestino] = useState('var(--color-primary)');

  useEffect(() => {
    const fac = new FastAverageColor();
    if (flagOrigen) {
      fac.getColorAsync(flagOrigen, { crossOrigin: 'anonymous' })
        .then(color => setColorOrigen(color.hex))
        .catch(() => setColorOrigen('var(--color-on-surface)'));
    } else {
      setColorOrigen('var(--color-on-surface)');
    }
    
    if (flagDestino) {
      fac.getColorAsync(flagDestino, { crossOrigin: 'anonymous' })
        .then(color => setColorDestino(color.hex))
        .catch(() => setColorDestino('var(--color-primary)'));
    } else {
      setColorDestino('var(--color-primary)');
    }
  }, [flagOrigen, flagDestino]);
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${d.getDate().toString().padStart(2, '0')} ${months[d.getMonth()]}, ${d.getFullYear()}`;
  };

  const isActive = curso.estado === 'activo';
  const isoOrigen = idiomaOrigenFull?.codigo_iso || idiomaOrigenFull?.nombres?.substring(0, 3).toUpperCase() || idiomaOrigenFull?.nombre?.substring(0, 3).toUpperCase() || 'XXX';
  const isoDestino = idiomaDestinoFull?.codigo_iso || idiomaDestinoFull?.nombres?.substring(0, 3).toUpperCase() || idiomaDestinoFull?.nombre?.substring(0, 3).toUpperCase() || 'XXX';
  const codigoCurso = `${isoOrigen}-${isoDestino}-${curso.nivel || 'A1'}`;

  return (
    <div style={{
      backgroundColor: 'var(--color-surface)',
      borderRadius: '12px',
      border: '1px solid var(--color-surface-variant)',
      borderTop: 'none',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: 'var(--shadow-level-1)',
      transition: 'box-shadow 0.3s ease, transform 0.2s ease',
      opacity: isActive ? 1 : 0.75,
    }}
      onMouseOver={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-level-2)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.boxShadow = 'var(--shadow-level-1)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Background Image Layer */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundImage: `url(${getImageUrl(curso.url_imagen_portada) || getImageUrl('/images/img-1784471656275-235106556.png')})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: 'blur(8px)',
        opacity: 0.4,
        zIndex: 0,
        transform: 'scale(1.1)' // Prevent blurred edges from showing
      }} />
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.55)',
        zIndex: 0
      }} />

      {/* Solid gradient top border */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '5px',
        background: isActive ? `linear-gradient(to right, ${colorOrigen}, ${colorDestino})` : 'var(--color-outline)',
        zIndex: 2
      }} />

      {/* Header con badge y Código */}
      <div style={{ padding: '20px 20px 0 20px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '12px' }}>
          <span style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 700,
            backgroundColor: isActive ? 'color-mix(in srgb, #16a34a 12%, transparent)' : 'rgba(255,255,255,0.1)',
            color: isActive ? '#4ade80' : 'rgba(255,255,255,0.7)',
            border: `1px solid ${isActive ? 'color-mix(in srgb, #16a34a 25%, transparent)' : 'rgba(255,255,255,0.2)'}`
          }}>
            {isActive ? <CheckCircle size={12} /> : <XCircle size={12} />}
            {isActive ? 'Activo' : 'Inactivo'}
          </span>
          <span style={{
            fontSize: '12px',
            fontWeight: 800,
            color: '#fff',
            backgroundColor: 'rgba(0,0,0,0.6)',
            border: '1px solid rgba(255,255,255,0.2)',
            padding: '4px 10px',
            borderRadius: '12px'
          }}>
            {codigoCurso}
          </span>
        </div>

        <div style={{ marginBottom: '16px', textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '20px', color: '#fff', fontWeight: 800, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
            {cursoNombre}
          </h3>
          {curso.descripcion && (
            <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.85)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
              {curso.descripcion}
            </p>
          )}
        </div>

        {/* Par de idiomas */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          marginBottom: '20px'
        }}>
          <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {flagOrigen && (
              <img 
                src={flagOrigen} 
                alt={(idiomaOrigenFull?.nombres || idiomaOrigenFull?.nombre)} 
                style={{ 
                  width: '32px', height: '32px', 
                  borderRadius: '6px', 
                  objectFit: 'cover', 
                  marginBottom: '8px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }} 
                crossOrigin="anonymous"
                onError={(e) => e.target.style.display = 'none'}
              />
            )}
            <span style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#fff',
              lineHeight: 1.2,
              textShadow: '0 2px 4px rgba(0,0,0,0.8)'
            }}>
              {(idiomaOrigenFull?.nombres || idiomaOrigenFull?.nombre) || 'Desconocido'}
            </span>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '32px', height: '32px',
            backgroundColor: 'rgba(255,255,255,0.15)',
            borderRadius: '50%',
            color: 'rgba(255,255,255,0.9)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <ArrowRight size={16} />
          </div>

          <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {flagDestino && (
              <img 
                src={flagDestino} 
                alt={(idiomaDestinoFull?.nombres || idiomaDestinoFull?.nombre)} 
                style={{ 
                  width: '32px', height: '32px', 
                  borderRadius: '6px', 
                  objectFit: 'cover', 
                  marginBottom: '8px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }} 
                crossOrigin="anonymous"
                onError={(e) => e.target.style.display = 'none'}
              />
            )}
            <span style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#fff',
              textShadow: '0 2px 4px rgba(0,0,0,0.8)'
            }}>
              {(idiomaDestinoFull?.nombres || idiomaDestinoFull?.nombre) || '—'}
            </span>
          </div>
        </div>

        {/* Fecha y creador */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '6px',
          paddingBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.8)', fontWeight: 600, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
            <Calendar size={12} />
            <span>Creado el: {formatDate(curso.creado_en || curso.fecha_creacion)}</span>
          </div>
        </div>
      </div>

      {/* Footer con toggle y acciones */}
      <div style={{
        backgroundColor: 'color-mix(in srgb, var(--color-surface-container-low) 80%, transparent)',
        backdropFilter: 'blur(8px)',
        padding: '12px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: '1px solid color-mix(in srgb, var(--color-surface-variant) 50%, transparent)',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Toggle Estado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => onToggleEstado(curso)}
            style={{
              width: '40px', height: '22px',
              backgroundColor: isActive ? 'var(--color-primary)' : 'var(--color-surface-variant)',
              borderRadius: '11px',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background-color 0.3s ease',
              padding: 0
            }}
          >
            <div style={{
              width: '18px', height: '18px',
              backgroundColor: 'white',
              borderRadius: '50%',
              position: 'absolute',
              top: '2px',
              left: isActive ? '20px' : '2px',
              transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
            }} />
          </button>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-on-surface-variant)' }}>Estado</span>
        </div>

        {/* Botones Editar y Eliminar */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => onExportPdf(curso)}
            disabled={isExportingPdf}
            style={{
              background: 'transparent', border: 'none', cursor: isExportingPdf ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: 'var(--color-primary)', padding: '8px', borderRadius: '8px', transition: 'all 0.2s', opacity: isExportingPdf ? 0.65 : 1, fontSize: '11px', fontWeight: 700
            }}
            onMouseOver={(e) => { if (!isExportingPdf) e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-primary) 10%, transparent)'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            title="Descargar malla curricular en PDF"
            aria-label="Descargar malla curricular en PDF"
          >
            {isExportingPdf ? <LoaderCircle size={16} /> : <FileDown size={16} strokeWidth={2.5} />}
            PDF
          </button>
          <button
            onClick={() => onView(curso)}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-error)', padding: '8px', borderRadius: '8px', transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'color-mix(in srgb, #b91c1c 10%, transparent)'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            title="Ver Detalles"
          >
            <Eye size={16} strokeWidth={2.5} />
          </button>
          <button
            onClick={() => onEdit(curso)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-primary)',
              padding: '8px',
              borderRadius: '8px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--color-primary) 10%, transparent)'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            title="Editar"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => onDelete(curso)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-outline)',
              padding: '8px',
              borderRadius: '8px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-outline)'; }}
            title="Eliminar"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export const Cursos = () => {
  const { user } = useAuth();
  const currentUserId = user?.id || user?.usuarios_id || user?.usuario_id;

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
  const BACKEND_HOST = API_URL.replace('/api/v1', '');
  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return cleanPath.startsWith('/public') ? `${BACKEND_HOST}${cleanPath}` : `${BACKEND_HOST}/public${cleanPath}`;
  };

  const formatAuditDate = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAuditUserName = (usuario) => {
    if (!usuario) return 'Usuario';
    const nombres = usuario.nombres || usuario.nombre || '';
    const apellidos = usuario.apellidos || usuario.apellido || '';
    return `${nombres} ${apellidos}`.trim() || usuario.correo || 'Usuario';
  };

  const getAuditUserInitial = (usuario) => getAuditUserName(usuario).charAt(0).toUpperCase();

  const [cursos, setCursos] = useState([]);
  const [idiomas, setIdiomas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [currentId, setCurrentId] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [confirmData, setConfirmData] = useState(null);
  const [selectedCursoView, setSelectedCursoView] = useState(null);
  const [exportingCourseId, setExportingCourseId] = useState(null);
  const [portadaFile, setPortadaFile] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; // 'all' | 'active' | 'inactive'

  const { register, handleSubmit, reset, setValue, trigger, watch, formState: { errors } } = useForm();
  const watchIdiomaOrigenId = watch('idioma_origen_id');
  const watchIdiomaDestinoId = watch('idioma_destino_id');
  const watchNivel = watch('nivel');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cursosRes, idiomasRes, usuariosRes] = await Promise.all([
        getCursos(),
        getIdiomas(),
        getUsuarios()
      ]);
      const cursosList = Array.isArray(cursosRes) ? cursosRes : (cursosRes.data || []);
      const idiomasList = Array.isArray(idiomasRes) ? idiomasRes : (idiomasRes.data || []);
      const usuariosList = Array.isArray(usuariosRes) ? usuariosRes : (usuariosRes.data || []);
      setCursos(cursosList);
      setIdiomas(idiomasList);
      setUsuarios(usuariosList);
    } catch (error) {
      toast.error('No se pudieron cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreate = () => {
    setModalMode('create');
    setCurrentId(null);
    setCurrentStep(1);
    reset({ nombre: '', idioma_origen_id: '', idioma_destino_id: '', activo: true, nivel: 'A1' });
    setPortadaFile(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (curso) => {
    setModalMode('edit');
    setCurrentId(curso.curso_id || curso.id);
    setCurrentStep(1);
    setValue('nombre', curso.nombre || '');
    setValue('idioma_origen_id', String(curso.idioma_origen_id));
    setValue('idioma_destino_id', String(curso.idioma_destino_id));
    setValue('nivel', curso.nivel || 'A1');
    setValue('activo', curso.estado === 'activo');
    setPortadaFile(null);
    setIsModalOpen(true);
  };

  const handleNextStep = async () => {
    let fieldsToValidate = [];
    if (currentStep === 1) fieldsToValidate = ['nombre', 'idioma_origen_id', 'idioma_destino_id'];
    else if (currentStep === 2) fieldsToValidate = ['nivel'];

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleView = async (curso) => {
    try {
      const response = await getCursoById(curso.curso_id || curso.id);
      let cursoData = response.data || response;
      if (!cursoData.creado_por && cursoData.creado_por_id) {
        cursoData.creado_por = usuarios.find(u => String(u.id || u.usuario_id || u.usuarios_id) === String(cursoData.creado_por_id));
      }
      if (!cursoData.actualizado_por && cursoData.actualizado_por_id) {
        cursoData.actualizado_por = usuarios.find(u => String(u.id || u.usuario_id || u.usuarios_id) === String(cursoData.actualizado_por_id));
      }
      const unidades = normalizeList(await getUnidadsByCurso(cursoData.curso_id || cursoData.id));
      cursoData.unidades = unidades;
      setSelectedCursoView(cursoData);
    } catch (error) {
      toast.error('Error al obtener los detalles del curso');
      setSelectedCursoView(curso);
    }
  };

  const handleExportPdf = async (curso) => {
    const cursoId = curso.curso_id || curso.id;
    const toastId = toast.loading('Preparando la malla curricular...');
    setExportingCourseId(cursoId);

    try {
      if (!cursoId) throw new Error('El curso no tiene un identificador válido');

      const [cursoResponse, unidadesResponse] = await Promise.all([
        getCursoById(cursoId),
        getUnidadsByCurso(cursoId),
      ]);
      const cursoCompleto = cursoResponse?.data?.data || cursoResponse?.data || cursoResponse || curso;
      const unidades = normalizeList(unidadesResponse);
      const unidadesCompletas = await Promise.all(
        unidades.map(async (unidad) => {
          const unidadId = unidad.unidad_id || unidad.unidads_id || unidad.id;
          if (!unidadId) return { ...unidad, sesiones: [] };
          const sesiones = normalizeList(await getSesionesByUnidad(unidadId));
          const sesionesCompletas = await Promise.all(
            sesiones.map(async (sesion) => {
              const sesionId = sesion.sesion_id || sesion.sesiones_id || sesion.id;
              if (!sesionId) return { ...sesion, lecciones: [] };
              const lecciones = normalizeList(await getLeccionesBySesion(sesionId));
              return { ...sesion, lecciones };
            })
          );
          return { ...unidad, sesiones: sesionesCompletas };
        })
      );

      const fileName = await generateCurriculumPdf({
        curso: cursoCompleto,
        unidades: unidadesCompletas,
        generatedBy: user,
        portadaUrl: getImageUrl(cursoCompleto.url_imagen_portada),
      });
      toast.success(`PDF generado: ${fileName}`, { id: toastId });
    } catch (error) {
      console.error('Error al generar la malla curricular:', error);
      toast.error(
        error.response?.data?.message || 'No se pudo generar la malla curricular',
        { id: toastId }
      );
    } finally {
      setExportingCourseId(null);
    }
  };

  const handleDelete = (curso) => {
    setItemToDelete(curso);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    const id = itemToDelete.curso_id || itemToDelete.id;
    const toastId = toast.loading('Eliminando curso...');
    try {
      await deleteCurso(id);
      toast.success('Curso eliminado exitosamente', { id: toastId });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al eliminar el curso', { id: toastId });
    } finally {
      setItemToDelete(null);
    }
  };

  const handleToggleEstado = async (curso) => {
    const id = curso.curso_id || curso.id;
    const toastId = toast.loading(`${curso.estado === 'activo' ? 'Desactivando' : 'Activando'} curso...`);
    try {
      await toggleEstadoCurso(id, {
        estado: curso.estado === 'activo' ? 'inactivo' : 'activo',
        actualizado_por_id: currentUserId
      });
      toast.success(`Curso ${curso.estado === 'activo' ? 'desactivado' : 'activado'} exitosamente`, { id: toastId });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al cambiar el estado', { id: toastId });
    }
  };

  const handlePreSubmit = (data) => {
    setConfirmData(data);
  };

  const confirmSubmit = async () => {
    if (!confirmData) return;
    const data = confirmData;
    const actionName = modalMode === 'create' ? 'Creando' : 'Actualizando';
    const toastId = toast.loading(`${actionName} curso...`);
    try {
      const payload = {
        nombre: data.nombre.trim(),
        idioma_origen_id: parseInt(data.idioma_origen_id),
        idioma_destino_id: parseInt(data.idioma_destino_id),
        nivel: data.nivel || 'A1',
        url_imagen_portada: data.url_imagen_portada,
        estado: (data.activo !== undefined ? data.activo : true) ? 'activo' : 'inactivo'
      };

      let cursoIdCreatedOrUpdated = currentId;

      if (modalMode === 'create') {
        payload.creado_por_id = currentUserId;
        const result = await createCurso(payload);
        cursoIdCreatedOrUpdated = result.data?.curso_id || result.data?.id || result.curso_id || result.id;
        toast.success('Curso creado exitosamente', { id: toastId });
      } else {
        payload.actualizado_por_id = currentUserId;
        await updateCurso(currentId, payload);
        toast.success('Curso actualizado exitosamente', { id: toastId });
      }

      if (portadaFile && cursoIdCreatedOrUpdated) {
        toast.loading('Subiendo imagen de portada...', { id: toastId });
        await uploadPortadaCurso(cursoIdCreatedOrUpdated, portadaFile);
        toast.success('Portada subida exitosamente', { id: toastId });
      }

      setIsModalOpen(false);
      setConfirmData(null);
      setPortadaFile(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || `Error al ${modalMode === 'create' ? 'crear' : 'actualizar'} el curso`, { id: toastId });
    }
  };

  // Helpers para nombre de idiomas en confirmación
  const getIdiomaName = (id) => {
    const idioma = idiomas.find(i => String(i.idioma_id || i.id) === String(id));
    return idioma?.nombres || idioma?.nombre || 'Desconocido';
  };

  // Filtrado
  const filteredCursos = cursos.filter(curso => {
    const isSearchMatch =
      matchesSearch(getIdiomaName(curso.idioma_origen_id), searchTerm) ||
      matchesSearch(getIdiomaName(curso.idioma_destino_id), searchTerm) ||
      matchesSearch(curso.nombre, searchTerm) ||
      matchesSearch(getNivelCursoLabel(curso.nivel), searchTerm);
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && curso.estado === 'activo') ||
      (statusFilter === 'inactive' && curso.estado !== 'activo');
    return isSearchMatch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredCursos.length / itemsPerPage) || 1;
  const paginatedCursos = filteredCursos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  return (
    <div className="academic-modal-scroll" style={{ padding: '24px 32px', overflowY: 'auto', flex: 1 }}>

      {/* Cabecera */}
      <div className="flex-col-mobile" style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          <div className="rq-page-heading">
            <div className="rq-page-heading__accent"></div>
            <h1 className="rq-page-heading__title">Gestión de Cursos</h1>
          </div>
          <p style={{ color: 'var(--color-on-surface-variant)', margin: 0, fontSize: '15px', maxWidth: '600px', lineHeight: '1.5' }}>
            Administra los pares de idiomas de aprendizaje para la plataforma.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '12px 24px',
            backgroundColor: 'var(--color-primary)',
            color: 'var(--color-on-primary)',
            border: '2px solid var(--color-primary)',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap'
          }}
          onMouseOver={(e) => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseOut={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          Crear Curso
        </button>
      </div>

      {/* Barra de Filtros Compacta */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          
          {/* Buscar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>Palabra clave</label>
            <div style={{
              display: 'flex', alignItems: 'center', backgroundColor: 'var(--color-surface-container-low)',
              borderRadius: '12px', padding: '12px 16px',
              border: '1px solid var(--color-outline-variant)', transition: 'all 0.2s'
            }} onFocus={e => e.currentTarget.style.borderColor = 'var(--color-primary)'} onBlur={e => e.currentTarget.style.borderColor = 'var(--color-outline-variant)'}>
              <Search size={18} color="var(--color-outline)" strokeWidth={2.5} />
              <input
                type="text"
                placeholder="Buscar por idioma..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', marginLeft: '12px', width: '100%', fontSize: '14px', fontWeight: 500, color: 'var(--color-on-surface)' }}
              />
            </div>
          </div>
          
          {/* Estado */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '180px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-on-surface-variant)' }}>Estado de curso</label>
            <RimaqSelect
              value={statusFilter}
              onValueChange={setStatusFilter}
              options={[
                { value: 'all', label: 'Todos los estados' },
                { value: 'active', label: 'Activos' },
                { value: 'inactive', label: 'Inactivos' }
              ]}
              style={{ minWidth: '180px' }}
            />
          </div>
        </div>

      {/* Grid de Cursos */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px'
      }}>
        {loading ? (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{
                backgroundColor: 'var(--color-surface)',
                borderRadius: '12px',
                border: '1px solid var(--color-surface-variant)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}>
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <div className="skeleton" style={{ width: '70px', height: '22px', borderRadius: '20px' }}></div>
                    <div className="skeleton" style={{ width: '50px', height: '16px', borderRadius: '4px' }}></div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '20px' }}>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <div className="skeleton" style={{ width: '50px', height: '10px', borderRadius: '4px', margin: '0 auto 8px auto' }}></div>
                      <div className="skeleton" style={{ width: '90px', height: '24px', borderRadius: '4px', margin: '0 auto' }}></div>
                    </div>
                    <div className="skeleton" style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0 }}></div>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <div className="skeleton" style={{ width: '50px', height: '10px', borderRadius: '4px', margin: '0 auto 8px auto' }}></div>
                      <div className="skeleton" style={{ width: '90px', height: '24px', borderRadius: '4px', margin: '0 auto' }}></div>
                    </div>
                  </div>
                  <div className="skeleton" style={{ width: '160px', height: '14px', borderRadius: '4px' }}></div>
                </div>
                <div style={{
                  backgroundColor: 'var(--color-surface-container-low)',
                  padding: '12px 16px',
                  display: 'flex', justifyContent: 'space-between',
                  borderTop: '1px solid var(--color-surface-variant)'
                }}>
                  <div className="skeleton" style={{ width: '100px', height: '22px', borderRadius: '4px' }}></div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div className="skeleton" style={{ width: '32px', height: '32px', borderRadius: '8px' }}></div>
                    <div className="skeleton" style={{ width: '32px', height: '32px', borderRadius: '8px' }}></div>
                  </div>
                </div>
              </div>
            ))}
          </>
        ) : paginatedCursos.length === 0 ? (
          <div style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: '64px 32px',
            color: 'var(--color-outline)'
          }}>
            <BookOpen size={48} strokeWidth={1.5} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 4px 0' }}>
              {searchTerm || statusFilter !== 'all' ? 'No se encontraron cursos con esos filtros' : 'Aún no hay cursos registrados'}
            </p>
            <p style={{ fontSize: '13px', margin: 0 }}>
              {searchTerm || statusFilter !== 'all' ? 'Intenta con otra búsqueda' : 'Crea el primer curso haciendo clic en "Crear Curso"'}
            </p>
          </div>
        ) : (
          paginatedCursos.map((curso, i) => (
            <CursoCard
              key={curso.curso_id || curso.id || i}
              curso={curso}
              idiomas={idiomas}
              getImageUrl={getImageUrl}
              onView={handleView}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
              onToggleEstado={handleToggleEstado}
              onExportPdf={handleExportPdf}
              isExportingPdf={exportingCourseId === (curso.curso_id || curso.id)}
            />
          ))
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '24px', marginBottom: '24px' }}>
          <button 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            style={{ 
              padding: '8px 16px', borderRadius: '8px', 
              border: '1px solid var(--color-surface-variant)', 
              backgroundColor: currentPage === 1 ? 'var(--color-surface-variant)' : 'var(--color-surface)', 
              color: currentPage === 1 ? 'var(--color-outline)' : 'var(--color-on-surface)',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              fontWeight: 600, fontSize: '13px',
              transition: 'all 0.2s'
            }}
          >
            Anterior
          </button>
          <span style={{ fontSize: '14px', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>
            Página {currentPage} de {totalPages}
          </span>
          <button 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            style={{ 
              padding: '8px 16px', borderRadius: '8px', 
              border: '1px solid var(--color-surface-variant)', 
              backgroundColor: currentPage === totalPages ? 'var(--color-surface-variant)' : 'var(--color-surface)', 
              color: currentPage === totalPages ? 'var(--color-outline)' : 'var(--color-on-surface)',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              fontWeight: 600, fontSize: '13px',
              transition: 'all 0.2s'
            }}
          >
            Siguiente
          </button>
        </div>
      )}

      {/* Modal Formulario Crear/Editar */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="modal-content-responsive" style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: '16px',
            maxHeight: '90vh',
            boxShadow: 'var(--shadow-level-3)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--color-surface-variant)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--color-on-surface)' }}>{modalMode === 'create' ? 'Crear Nuevo Curso' : 'Editar Curso'}</h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--color-outline)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={(event) => { event.preventDefault(); if (currentStep < 3) handleNextStep(); }} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
              <div className="academic-modal-scroll" style={{ padding: '24px 32px', overflowY: 'auto' }}>
              <WizardProgress
                currentStep={currentStep}
                steps={[
                  { label: 'Información básica', description: 'Configura el nombre y los idiomas del curso.' },
                  { label: 'Nivel académico', description: 'Selecciona la dificultad o nivel del curso.' },
                  { label: 'Apariencia y estado', description: 'Añade una portada y define su disponibilidad.' }
                ]}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* STEP 1: Basic Info & Languages */}
                {currentStep === 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.3s ease' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Nombre visible para estudiantes <span style={{ color: 'var(--color-error)' }}>*</span>
                      </label>
                      <input
                        type="text"
                        {...register('nombre', { required: 'El nombre del curso es requerido' })}
                        placeholder="Quechua Sureño desde Español"
                        style={{ padding: '14px 16px', borderRadius: '10px', border: '1px solid var(--color-surface-variant)', backgroundColor: 'var(--color-surface)', color: 'var(--color-on-surface)', fontSize: '15px', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }}
                        onFocus={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--color-primary) 12%, transparent)'; }}
                        onBlur={e => { e.target.style.borderColor = 'var(--color-surface-variant)'; e.target.style.boxShadow = 'none'; }}
                      />
                      {errors.nombre && <span style={{ color: 'var(--color-error)', fontSize: '13px', fontWeight: 500 }}>{errors.nombre.message}</span>}
                    </div>

                    <div className="flex-col-mobile" style={{ alignItems: 'flex-start', gap: '16px', backgroundColor: 'var(--color-surface-container-lowest)', padding: '20px', borderRadius: '12px', border: '1px solid var(--color-surface-variant)' }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Origen (El que hablas) <span style={{ color: 'var(--color-error)' }}>*</span>
                        </label>
                        <input type="hidden" {...register('idioma_origen_id', { required: 'Selecciona un idioma' })} />
                        <RimaqSelect
                          value={String(watchIdiomaOrigenId || '')}
                          onValueChange={(val) => setValue('idioma_origen_id', val, { shouldValidate: true })}
                          placeholder="Selecciona idioma..."
                          options={idiomas.map(i => ({
                            value: String(i.idioma_id || i.id),
                            label: `${i.nombres || i.nombre} (${i.codigo_iso})`
                          }))}
                          className="rimaq-select--full-width"
                        />
                        {errors.idioma_origen_id && <span style={{ color: 'var(--color-error)', fontSize: '13px', fontWeight: 500 }}>{errors.idioma_origen_id.message}</span>}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'center', alignSelf: 'center', padding: '16px 0' }}>
                        <div style={{
                          width: '40px', height: '40px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--color-primary-container)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <ArrowRight size={20} color="var(--color-primary)" strokeWidth={2.5} />
                        </div>
                      </div>

                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Destino (El que aprendes) <span style={{ color: 'var(--color-error)' }}>*</span>
                        </label>
                        <input type="hidden" {...register('idioma_destino_id', { required: 'Selecciona un idioma' })} />
                        <RimaqSelect
                          value={String(watchIdiomaDestinoId || '')}
                          onValueChange={(val) => setValue('idioma_destino_id', val, { shouldValidate: true })}
                          placeholder="Selecciona idioma..."
                          options={idiomas.map(i => ({
                            value: String(i.idioma_id || i.id),
                            label: `${i.nombres || i.nombre} (${i.codigo_iso})`
                          }))}
                          className="rimaq-select--full-width"
                        />
                        {errors.idioma_destino_id && <span style={{ color: 'var(--color-error)', fontSize: '13px', fontWeight: 500 }}>{errors.idioma_destino_id.message}</span>}
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: Level */}
                {currentStep === 2 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: 'var(--color-surface-container-lowest)', padding: '24px', borderRadius: '12px', border: '1px solid var(--color-surface-variant)' }}>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Seleccionar Nivel Académico <span style={{ color: 'var(--color-error)' }}>*</span>
                      </label>
                      <input type="hidden" {...register('nivel', { required: 'Selecciona un nivel' })} />
                      <RimaqSelect
                        value={String(watchNivel || '')}
                        onValueChange={(val) => setValue('nivel', val, { shouldValidate: true })}
                        placeholder="Selecciona un nivel..."
                        options={nivelesCurso.map(n => ({
                          value: n.value,
                          label: `${n.label} (${n.grupo})`
                        }))}
                        className="rimaq-select--full-width"
                      />
                      {errors.nivel && <span style={{ color: 'var(--color-error)', fontSize: '13px', fontWeight: 500 }}>{errors.nivel.message}</span>}
                      
                      <div style={{ marginTop: '16px', padding: '16px', borderRadius: '8px', backgroundColor: 'var(--color-secondary-container)', color: 'var(--color-on-secondary-container)', fontSize: '14px', lineHeight: 1.5 }}>
                        <strong>Tip:</strong> Asegúrate de que el nivel seleccionado coincida con el contenido de las lecciones para proporcionar una experiencia de aprendizaje adecuada.
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: Appearance and Status */}
                {currentStep === 3 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-on-surface-variant)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Imagen de Portada (Opcional)
                      </label>
                      <div style={{ display: 'flex', gap: '24px', alignItems: 'center', backgroundColor: 'var(--color-surface-container-lowest)', padding: '24px', borderRadius: '12px', border: '1px dashed var(--color-outline-variant)' }}>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => setPortadaFile(e.target.files[0])}
                            style={{ 
                              width: '100%',
                              padding: '12px 16px', 
                              borderRadius: '8px', 
                              border: '1px solid var(--color-surface-variant)', 
                              backgroundColor: 'var(--color-surface)', 
                              color: 'var(--color-on-surface)',
                              cursor: 'pointer',
                              transition: 'border-color 0.2s'
                            }} 
                            onMouseOver={e => e.currentTarget.style.borderColor = 'var(--color-primary)'}
                            onMouseOut={e => e.currentTarget.style.borderColor = 'var(--color-surface-variant)'}
                          />
                          <span style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>Sube una imagen representativa para el curso. Formatos soportados: JPG, PNG, WEBP.</span>
                        </div>
                        {(portadaFile || (modalMode === 'edit' && cursos.find(c => (c.cursos_id || c.id) === currentId)?.url_imagen_portada)) && (
                          <div style={{ 
                            width: '120px', height: '80px', 
                            borderRadius: '12px', overflow: 'hidden', 
                            border: '3px solid var(--color-surface-variant)',
                            backgroundColor: 'var(--color-surface-container-lowest)',
                            flexShrink: 0,
                            boxShadow: 'var(--shadow-level-2)'
                          }}>
                            <img 
                              src={portadaFile ? URL.createObjectURL(portadaFile) : getImageUrl(cursos.find(c => (c.cursos_id || c.id) === currentId)?.url_imagen_portada)} 
                              alt="Preview" 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {modalMode === 'edit' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px', backgroundColor: 'var(--color-surface-container-high)', borderRadius: '12px', border: '1px solid var(--color-surface-variant)', marginTop: '8px' }}>
                        <input
                          type="checkbox"
                          {...register('activo')}
                          id="activo-checkbox"
                          style={{ width: '24px', height: '24px', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <label htmlFor="activo-checkbox" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-on-surface)', cursor: 'pointer', userSelect: 'none' }}>
                            Curso Activo
                          </label>
                          <span style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>Si está marcado, el curso será visible en la plataforma para los estudiantes.</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              </div>

              <div id="rq-step-form-actions" className="rq-form-actions rq-step-form-actions" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                <div className="rq-step-form-actions__primary">
                  {currentStep > 1 && <button type="button" onClick={() => setCurrentStep(prev => prev - 1)}>Anterior</button>}
                  {currentStep < 3 ? (
                    <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); handleNextStep(); }}>Continuar</button>
                  ) : (
                    <button type="button" onClick={handleSubmit(handlePreSubmit)}>{modalMode === 'create' ? 'Crear Curso' : 'Guardar cambios'}</button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmationModal open={Boolean(itemToDelete)} title="¿Eliminar curso?" itemName={itemToDelete ? (itemToDelete.nombre || `${getIdiomaName(itemToDelete.idioma_origen_id)} → ${getIdiomaName(itemToDelete.idioma_destino_id)}`) : ''} onCancel={() => setItemToDelete(null)} onConfirm={confirmDelete} />

      {/* Modal Confirmación de Guardar */}
      {confirmData && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1060,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="modal-content-responsive" style={{
            backgroundColor: 'var(--color-surface)',
            borderRadius: '16px',
            padding: '32px 24px',
            boxShadow: 'var(--shadow-level-3)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              backgroundColor: 'var(--color-primary)', color: '#ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}>
              <Save size={32} />
            </div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: '20px', color: 'var(--color-on-surface)' }}>
              {modalMode === 'create' ? '¿Crear este curso?' : '¿Guardar cambios?'}
            </h2>
            <p style={{ margin: '0 0 24px 0', color: 'var(--color-on-surface-variant)', fontSize: '14px', lineHeight: '1.5' }}>
              {modalMode === 'create'
                ? `Crearás el curso "${confirmData.nombre}".`
                : `Se guardarán los cambios del curso "${confirmData.nombre}".`
              }
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setConfirmData(null)}
                style={{ flex: 1, padding: '12px', background: 'var(--color-surface-container-high)', border: 'none', borderRadius: '8px', color: 'var(--color-on-surface)', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmSubmit}
                style={{ flex: 1, padding: '12px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}
              >
                {modalMode === 'create' ? 'Sí, crear' : 'Sí, guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver Detalles de Curso */}
      {selectedCursoView && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(4px)' }}>
          <div className="modal-content-responsive" style={{ backgroundColor: 'var(--color-surface)', borderRadius: '16px', boxShadow: 'var(--shadow-level-3)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-surface-variant)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-surface-container-low)' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--color-on-surface)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Eye size={20} color="var(--color-primary)" />
                Detalles del Curso
              </h2>
              <button onClick={() => setSelectedCursoView(null)} style={{ background: 'none', border: 'none', color: 'var(--color-outline)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <div className="academic-modal-scroll" style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Título Principal */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{ padding: '10px', backgroundColor: 'var(--color-info-container)', borderRadius: '12px', color: 'var(--color-on-info-container)' }}>
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-outline)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nombre del curso</span>
                    <h3 style={{ margin: '4px 0 6px 0', fontSize: '18px', color: 'var(--color-on-surface)' }}>
                      {selectedCursoView.nombre || `${getIdiomaName(selectedCursoView.idioma_origen_id)} → ${getIdiomaName(selectedCursoView.idioma_destino_id)}`}
                    </h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                      <span style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: 'var(--color-surface-container-high)', color: 'var(--color-on-surface-variant)', fontSize: '12px', fontWeight: 700 }}>
                        Nivel: {getNivelCursoLabel(selectedCursoView.nivel)}
                      </span>
                      <span style={{ color: 'var(--color-on-surface-variant)', fontSize: '13px', fontWeight: 600 }}>
                        {(getIdiomaName(selectedCursoView.idioma_origen_id)) || 'Origen'} → {(getIdiomaName(selectedCursoView.idioma_destino_id)) || 'Destino'}
                      </span>
                    </div>
                  </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--color-surface-variant)', margin: '0' }} />

                {/* Grid de Detalles 2 Columnas */}
                <div className="responsive-grid" style={{ gap: '20px' }}>
                  {/* Estado */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ padding: '8px', backgroundColor: selectedCursoView.estado === 'activo' ? 'var(--color-success-container)' : 'var(--color-neutral-container)', borderRadius: '8px', color: selectedCursoView.estado === 'activo' ? 'var(--color-on-success-container)' : 'var(--color-on-neutral-container)' }}>
                      {selectedCursoView.estado === 'activo' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-outline)' }}>ESTADO DEL CURSO</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: selectedCursoView.estado === 'activo' ? 'var(--color-on-success-container)' : 'var(--color-on-neutral-container)' }}>
                        {selectedCursoView.estado === 'activo' ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>

                  {/* Nivel */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ padding: '8px', backgroundColor: 'var(--color-neutral-container)', borderRadius: '8px', color: 'var(--color-on-surface-variant)' }}>
                      <BookOpen size={18} />
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-outline)' }}>NIVEL</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-on-surface)' }}>{getNivelCursoLabel(selectedCursoView.nivel)}</span>
                    </div>
                  </div>

                  {/* Unidads */}
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ padding: '8px', backgroundColor: 'var(--color-neutral-container)', borderRadius: '8px', color: 'var(--color-on-surface-variant)' }}>
                      <Layers size={18} />
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-outline)' }}>UNIDADES CREADAS</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-on-surface)' }}>
                        {(selectedCursoView.unidades || selectedCursoView.unidads || []).length} unidades
                      </span>
                    </div>
                  </div>
                </div>

                <hr style={{ border: 'none', borderTop: '1px solid var(--color-surface-variant)', margin: '0' }} />

                {/* Footer Info (Auditoría e ID) */}
                <div style={{ backgroundColor: 'var(--color-surface-container-low)', padding: '16px', borderRadius: '12px', border: '1px dashed var(--color-dashed-border)' }}>
                  <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-on-surface-variant)', letterSpacing: '0.5px' }}>AUDITORÍA DEL REGISTRO</span>
                  </div>
                  
                  <div className="responsive-grid" style={{ gap: '16px' }}>
                    {/* Creación */}
                    <div>
                      <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-outline)', marginBottom: '4px' }}>CREADO POR</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--color-info-container)', color: 'var(--color-on-info-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                          {selectedCursoView.creado_por ? getAuditUserInitial(selectedCursoView.creado_por) : '?'}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface)' }}>
                            {getAuditUserName(selectedCursoView.creado_por)}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>
                            {formatAuditDate(selectedCursoView.fecha_creacion || selectedCursoView.creado_en) || 'Fecha desconocida'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actualización */}
                    <div>
                      <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-outline)', marginBottom: '4px' }}>ÚLTIMA ACTUALIZACIÓN</span>
                      {selectedCursoView.actualizado_por_id && selectedCursoView.actualizado_por_id !== 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'var(--color-neutral-container)', color: 'var(--color-on-surface-variant)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
                            {selectedCursoView.actualizado_por ? getAuditUserInitial(selectedCursoView.actualizado_por) : '?'}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-on-surface)' }}>
                              {getAuditUserName(selectedCursoView.actualizado_por)}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--color-on-surface-variant)' }}>
                              {formatAuditDate(selectedCursoView.fecha_actualizacion || selectedCursoView.actualizado_en) || 'Fecha desconocida'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', fontStyle: 'italic', display: 'flex', alignItems: 'center', height: '24px' }}>
                          Sin modificaciones recientes
                        </span>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--color-surface-variant)', display: 'flex', justifyContent: 'flex-end', backgroundColor: 'var(--color-surface-container-low)' }}>
              <button onClick={() => setSelectedCursoView(null)} style={{ padding: '10px 20px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', transition: 'background-color 0.2s' }}>Entendido</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
