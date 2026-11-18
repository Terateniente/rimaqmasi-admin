import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Clock3, Search, XCircle } from 'lucide-react';
import { getContribuciones, revisarContribucion } from '../../services/diccionarioService';
import { matchesSearch } from '../../utils/searchUtils';
import { ModernPageSkeleton } from '../../components/ModernPageSkeleton';
import { RimaqSelect } from '../../components/RimaqSelect';
import { DeleteConfirmationModal } from '../../components/DeleteConfirmationModal';
import { PageHeader, EmptyState } from '../../components/PageKit';

const ESTADOS = {
  pendiente: { label: 'Pendiente', tone: 'warning' },
  aprobada: { label: 'Aprobado', tone: 'success' },
  rechazada: { label: 'Rechazado', tone: 'danger' },
};
const fullName = (u) => `${u?.nombres || ''} ${u?.apellidos || ''}`.trim();

export const Contribuciones = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [estado, setEstado] = useState('pendiente');
  const [tipo, setTipo] = useState('');
  const [search, setSearch] = useState('');
  const [rejecting, setRejecting] = useState(null);
  const [motivo, setMotivo] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const result = await getContribuciones({ estado, tipo });
      setItems(result.data || []);
    } catch {
      toast.error('No se pudieron cargar los aportes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [estado, tipo]);

  const review = async (item, accion) => {
    if (accion === 'rechazar' && !motivo.trim()) { toast.error('Escribe el motivo del rechazo'); return; }
    const toastId = toast.loading(accion === 'aprobar' ? 'Publicando aporte...' : 'Rechazando aporte...');
    try {
      await revisarContribucion(item.contribucion_id, accion, motivo.trim());
      toast.success(accion === 'aprobar' ? 'Aporte aprobado y publicado' : 'Aporte rechazado', { id: toastId });
      setRejecting(null);
      setMotivo('');
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo revisar el aporte', { id: toastId });
    }
  };

  const filtered = items.filter((item) => [item.termino || item.palabra?.termino, item.significado, fullName(item.usuario)].some((t) => matchesSearch(t, search)));

  return (
    <div>
      <PageHeader title="Aportes de estudiantes" description="Revisa cada propuesta antes de incorporarla al diccionario público." />

      <div className="rq-toolbar" style={{ gridTemplateColumns: 'minmax(260px, 2fr) repeat(2, minmax(180px, 1fr))' }}>
        <div className="rq-filter">
          <label htmlFor="aporte-search">Palabra clave</label>
          <div className="rq-search-box">
            <Search size={18} strokeWidth={2.5} aria-hidden="true" />
            <input id="aporte-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar palabra, significado o autor..." />
          </div>
        </div>
        <div className="rq-filter">
          <label>Estado</label>
          <RimaqSelect
            ariaLabel="Estado del aporte"
            value={estado || '__all__'}
            onValueChange={(val) => setEstado(val === '__all__' ? '' : val)}
            options={[
              { value: '__all__', label: 'Todos los estados' },
              { value: 'pendiente', label: 'Pendientes' },
              { value: 'aprobada', label: 'Aprobados' },
              { value: 'rechazada', label: 'Rechazados' },
            ]}
          />
        </div>
        <div className="rq-filter">
          <label>Tipo de contenido</label>
          <RimaqSelect
            ariaLabel="Tipo de contenido"
            value={tipo || '__all__'}
            onValueChange={(val) => setTipo(val === '__all__' ? '' : val)}
            options={[
              { value: '__all__', label: 'Todo el contenido' },
              { value: 'palabra', label: 'Nuevas palabras' },
              { value: 'definicion', label: 'Nuevos significados' },
            ]}
          />
        </div>
      </div>

      {loading ? (
        <ModernPageSkeleton cards={6} showHeading={false} compact />
      ) : filtered.length === 0 ? (
        <div className="rq-surface-card"><EmptyState icon={Clock3} title="No hay aportes con estos filtros" hint="Intenta cambiar el estado, el tipo de contenido o la búsqueda." /></div>
      ) : (
        <div className="rq-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {filtered.map((item) => {
            const e = ESTADOS[item.estado];
            return (
              <article key={item.contribucion_id} className="rq-card" style={{ height: 'auto' }}>
                <div className="rq-card__body rq-stack" style={{ gap: 14 }}>
                  <div className="rq-card__row" style={{ marginBottom: 0, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="rq-inline" style={{ gap: 6 }}>
                      <span className={`rq-badge rq-badge--${e?.tone || 'neutral'}`}>{e?.label || item.estado}</span>
                      <span className="rq-badge">{item.tipo === 'palabra' ? 'Nueva palabra' : 'Nuevo significado'}</span>
                    </div>
                    <time className="rq-card__meta" dateTime={item.creado_en}>{new Date(item.creado_en).toLocaleDateString('es-PE')}</time>
                  </div>
                  <h2 className="word-translation__term rq-route__target" style={{ margin: 0 }}>{item.termino || item.palabra?.termino}</h2>
                  <div className="word-translation">
                    <p className="rq-muted" style={{ margin: '0 0 6px', fontWeight: 600 }}>{item.idioma?.nombre} → significado en {item.idiomaSignificado?.nombre}</p>
                    <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.5 }}>{item.significado}</p>
                  </div>
                  {item.tipo_gramatical && <span className="rq-badge" style={{ width: 'fit-content', textTransform: 'none' }}>{item.tipo_gramatical}</span>}
                  <p className="rq-muted" style={{ margin: 0 }}>Enviado por <strong>{fullName(item.usuario)}</strong> · {item.usuario?.correo}</p>
                  {item.motivo_revision && (
                    <p className="rq-callout" style={{ background: 'var(--color-error-container)', color: 'var(--color-on-error-container)' }}>
                      <strong>Motivo de rechazo:</strong> {item.motivo_revision}
                    </p>
                  )}
                </div>
                {item.estado === 'pendiente' && (
                  <div className="rq-card__footer" style={{ gap: 10 }}>
                    <button type="button" className="rq-button rq-button--success" style={{ flex: 1 }} onClick={() => review(item, 'aprobar')}><CheckCircle2 size={17} /> Aprobar</button>
                    <button type="button" className="rq-button rq-button--danger" style={{ flex: 1 }} onClick={() => { setRejecting(item); setMotivo(''); }}><XCircle size={17} /> Rechazar</button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <DeleteConfirmationModal
        open={Boolean(rejecting)}
        icon={XCircle}
        title="Rechazar aporte"
        description={`Explica el motivo a ${rejecting?.usuario?.nombres || 'el estudiante'}; podrá verlo desde su aplicación.`}
        confirmLabel="Confirmar rechazo"
        confirmDisabled={!motivo.trim()}
        onCancel={() => setRejecting(null)}
        onConfirm={() => review(rejecting, 'rechazar')}
      >
        <textarea
          className="rq-field__input rq-textarea"
          style={{ marginTop: 16, textAlign: 'left' }}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={4}
          placeholder="Ej. La escritura correcta es..."
          aria-label="Motivo del rechazo"
        />
      </DeleteConfirmationModal>
    </div>
  );
};
