import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, FileText, Filter, Search, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getContribuciones, revisarContribucion } from '../../services/diccionarioService';
import '../analytics.css';
import { ModernPageSkeleton } from '../../components/ModernPageSkeleton';
import { RimaqSelect } from '../../components/RimaqSelect';

const labels = { pendiente: 'Pendiente', aprobada: 'Aprobado', rechazada: 'Rechazado' };

export const Contribuciones = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [estado, setEstado] = useState('pendiente');
  const [tipo, setTipo] = useState('');
  const [search, setSearch] = useState('');
  const [reviewing, setReviewing] = useState(null);
  const [motivo, setMotivo] = useState('');

  const load = async () => {
    try { setLoading(true); const result = await getContribuciones({ estado, tipo }); setItems(result.data || []); }
    catch { toast.error('No se pudieron cargar los aportes'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [estado, tipo]);
  const filtered = useMemo(() => items.filter(item => `${item.termino || item.palabra?.termino || ''} ${item.significado} ${item.usuario?.nombres || ''}`.toLowerCase().includes(search.toLowerCase())), [items, search]);

  const review = async (item, accion) => {
    if (accion === 'rechazar' && !motivo.trim()) { toast.error('Escribe el motivo del rechazo'); return; }
    const toastId = toast.loading(accion === 'aprobar' ? 'Publicando aporte...' : 'Rechazando aporte...');
    try { await revisarContribucion(item.contribucion_id, accion, motivo.trim()); toast.success(accion === 'aprobar' ? 'Aporte aprobado y publicado' : 'Aporte rechazado', { id: toastId }); setReviewing(null); setMotivo(''); await load(); }
    catch (error) { toast.error(error.response?.data?.message || 'No se pudo revisar el aporte', { id: toastId }); }
  };

  return <div className="analytics-page">
    <header className="analytics-header">
      <div>
        <div className="rq-page-heading">
          <div className="rq-page-heading__accent" />
          <h1 className="rq-page-heading__title">Aportes de estudiantes</h1>
        </div>
        <p>Revisa cada propuesta antes de incorporarla al diccionario público.</p>
      </div>
      <div className="analytics-header-icon"><FileText size={25} /></div>
    </header>
    <section style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginBottom: '28px', alignItems: 'center' }}>
      <div className="rq-search-box rq-search-field" style={{ flex: '1 1 300px' }}>
        <Search size={18} strokeWidth={2.5} />
        <input 
          value={search} 
          onChange={event => setSearch(event.target.value)} 
          placeholder="Buscar palabra, significado o autor..." 
          className="rq-search-field__input"
        />
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <RimaqSelect
          value={estado || '__all__'}
          onValueChange={(val) => setEstado(val === '__all__' ? '' : val)}
          options={[
            { value: '__all__', label: 'Todos los estados' },
            { value: 'pendiente', label: 'Pendientes' },
            { value: 'aprobada', label: 'Aprobados' },
            { value: 'rechazada', label: 'Rechazados' }
          ]}
          style={{ minWidth: '180px' }}
        />

        <RimaqSelect
          value={tipo || '__all__'}
          onValueChange={(val) => setTipo(val === '__all__' ? '' : val)}
          options={[
            { value: '__all__', label: 'Todo el contenido' },
            { value: 'palabra', label: 'Nuevas palabras' },
            { value: 'definicion', label: 'Nuevos significados' }
          ]}
          style={{ minWidth: '180px' }}
        />
      </div>
    </section>
    {loading ? <ModernPageSkeleton cards={6} showHeading={false} compact /> : filtered.length === 0 ? (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', background: 'var(--color-surface)', border: '1px dashed var(--color-outline-variant)', borderRadius: '24px', margin: '24px 0', textAlign: 'center' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'color-mix(in srgb, var(--color-primary) 8%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
          <Clock3 size={40} color="var(--color-primary)" />
        </div>
        <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-on-surface)', margin: '0 0 8px 0' }}>No hay aportes con estos filtros</h3>
        <p style={{ color: 'var(--color-on-surface-variant)', margin: 0, maxWidth: '400px', fontSize: '15px' }}>
          Intenta cambiar el estado, tipo de contenido, o realiza otra búsqueda.
        </p>
      </div>
    ) : <div className="contribution-grid responsive-grid">
      {filtered.map(item => <article key={item.contribucion_id} className="contribution-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 700, background: item.estado === 'pendiente' ? 'var(--color-warning-container)' : item.estado === 'aprobada' ? 'var(--color-success-container)' : 'var(--color-error-container)', color: item.estado === 'pendiente' ? 'var(--color-on-warning-container)' : item.estado === 'aprobada' ? 'var(--color-on-success-container)' : 'var(--color-on-error-container)' }}>{labels[item.estado]}</span>
            <span style={{ padding: '4px 12px', borderRadius: '999px', fontSize: '12px', fontWeight: 600, background: 'var(--color-surface-container-high)', color: 'var(--color-on-surface-variant)' }}>{item.tipo === 'palabra' ? 'Nueva palabra' : 'Nuevo significado'}</span>
          </div>
          <time style={{ fontSize: '12.5px', color: 'var(--color-on-surface-variant)', fontWeight: 500 }}>{new Date(item.creado_en).toLocaleDateString()}</time>
        </div>
        <h2 style={{ fontSize: '22px', margin: 0, color: 'var(--color-primary-text)', fontWeight: 800 }}>{item.termino || item.palabra?.termino}</h2>
        <div style={{ padding: '12px 14px', background: 'var(--color-surface-container-low)', border: '1px solid var(--color-outline-variant)', borderRadius: '10px' }}>
          <p style={{ margin: '0 0 6px 0', fontSize: '13.5px', color: 'var(--color-on-surface-variant)', fontWeight: 600 }}>{item.idioma?.nombre} → significado en {item.idiomaSignificado?.nombre}</p>
          <p style={{ margin: 0, fontSize: '14.5px', color: 'var(--color-on-surface)', lineHeight: 1.5 }}>{item.significado}</p>
        </div>
        {item.tipo_gramatical && <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, border: '1px solid var(--color-outline-variant)', width: 'fit-content', color: 'var(--color-on-surface-variant)' }}>{item.tipo_gramatical}</span>}
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>Enviado por <strong>{item.usuario?.nombres} {item.usuario?.apellidos}</strong> · {item.usuario?.correo}</p>
        {item.motivo_revision && <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid color-mix(in srgb, var(--color-error-text) 28%, transparent)', background: 'var(--color-error-container)', fontSize: '13.5px', color: 'var(--color-on-error-container)' }}><strong>Motivo de rechazo:</strong> {item.motivo_revision}</div>}
        {item.estado === 'pendiente' && <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--color-outline-variant)' }}>
          <button type="button" onClick={() => review(item, 'aprobar')} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '10px', borderRadius: '10px', border: 'none', background: 'var(--color-success)', color: 'var(--color-on-primary)', fontWeight: 700, cursor: 'pointer' }}><CheckCircle2 size={17} /> Aprobar</button>
          <button type="button" onClick={() => { setReviewing(item); setMotivo(''); }} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '10px', borderRadius: '10px', border: 'none', background: 'var(--color-error)', color: 'var(--color-on-error)', fontWeight: 700, cursor: 'pointer' }}><XCircle size={17} /> Rechazar</button>
        </div>}
      </article>)}
    </div>}
    {reviewing && <div className="analytics-modal-backdrop" role="dialog" aria-modal="true"><div className="analytics-modal modal-content-responsive"><h2>Rechazar aporte</h2><p>Explica el motivo a {reviewing.usuario?.nombres}; podrá verlo desde su aplicación.</p><textarea value={motivo} onChange={event => setMotivo(event.target.value)} rows="4" placeholder="Ej. La escritura correcta es..." autoFocus /><div><button type="button" className="btn-secondary" onClick={() => setReviewing(null)}>Cancelar</button><button type="button" className="btn-reject" onClick={() => review(reviewing, 'rechazar')}>Confirmar rechazo</button></div></div></div>}
  </div>;
};
