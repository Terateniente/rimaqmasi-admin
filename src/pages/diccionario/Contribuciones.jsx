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
    <section style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '32px', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-surface)', border: '1px solid var(--color-surface-variant)', borderRadius: '12px', padding: '0 16px', height: '48px', flex: '1 1 300px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
        <Search size={20} color="var(--color-on-surface-variant)" style={{ marginRight: '12px' }} />
        <input 
          value={search} 
          onChange={event => setSearch(event.target.value)} 
          placeholder="Buscar palabra, significado o autor..." 
          style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '15px', color: 'var(--color-on-surface)' }} 
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
      {filtered.map(item => <article key={item.contribucion_id} className="contribution-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, background: item.estado === 'pendiente' ? '#FEF9C3' : item.estado === 'aprobada' ? '#DCFCE7' : '#FEE2E2', color: item.estado === 'pendiente' ? '#854D0E' : item.estado === 'aprobada' ? '#166534' : '#991B1B' }}>{labels[item.estado]}</span>
            <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, background: 'var(--color-surface-variant)', color: 'var(--color-on-surface)' }}>{item.tipo === 'palabra' ? 'Nueva palabra' : 'Nuevo significado'}</span>
          </div>
          <time style={{ fontSize: '13px', color: 'var(--color-on-surface-variant)', fontWeight: 500 }}>{new Date(item.creado_en).toLocaleDateString()}</time>
        </div>
        <h2 style={{ fontSize: '22px', margin: 0, color: 'var(--color-primary)', fontWeight: 800 }}>{item.termino || item.palabra?.termino}</h2>
        <div style={{ padding: '12px', background: 'var(--color-surface-variant)', borderRadius: '12px' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--color-on-surface)', fontWeight: 600 }}>{item.idioma?.nombre} → significado en {item.idiomaSignificado?.nombre}</p>
          <p style={{ margin: 0, fontSize: '15px', color: 'var(--color-on-surface)', lineHeight: 1.5 }}>{item.significado}</p>
        </div>
        {item.tipo_gramatical && <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, border: '1px solid var(--color-outline-variant)', width: 'fit-content', color: 'var(--color-on-surface-variant)' }}>{item.tipo_gramatical}</span>}
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-on-surface-variant)' }}>Enviado por <strong>{item.usuario?.nombres} {item.usuario?.apellidos}</strong> · {item.usuario?.correo}</p>
        {item.motivo_revision && <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid #FECACA', background: '#FEF2F2', fontSize: '14px', color: '#991B1B' }}><strong>Motivo de rechazo:</strong> {item.motivo_revision}</div>}
        {item.estado === 'pendiente' && <div style={{ display: 'flex', gap: '12px', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--color-surface-variant)' }}>
          <button onClick={() => review(item, 'aprobar')} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '10px', borderRadius: '8px', border: 'none', background: '#22c55e', color: 'white', fontWeight: 600, cursor: 'pointer' }}><CheckCircle2 size={18} /> Aprobar</button>
          <button onClick={() => { setReviewing(item); setMotivo(''); }} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '10px', borderRadius: '8px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 600, cursor: 'pointer' }}><XCircle size={18} /> Rechazar</button>
        </div>}
      </article>)}
    </div>}
    {reviewing && <div className="analytics-modal-backdrop" role="dialog" aria-modal="true"><div className="analytics-modal modal-content-responsive"><h2>Rechazar aporte</h2><p>Explica el motivo a {reviewing.usuario?.nombres}; podrá verlo desde su aplicación.</p><textarea value={motivo} onChange={event => setMotivo(event.target.value)} rows="4" placeholder="Ej. La escritura correcta es..." autoFocus /><div><button className="btn-secondary" onClick={() => setReviewing(null)}>Cancelar</button><button className="btn-reject" onClick={() => review(reviewing, 'rechazar')}>Confirmar rechazo</button></div></div></div>}
  </div>;
};
