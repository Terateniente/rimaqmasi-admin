/** Bloques compartidos por todas las vistas del panel. Estilos en styles/components.css. */
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';

export const PageHeader = ({ title, description, actions }) => (
  <header className="rq-page-header">
    <div className="rq-page-header__text">
      <div className="rq-page-heading">
        <span className="rq-page-heading__accent" aria-hidden="true" />
        <h1 className="rq-page-heading__title">{title}</h1>
      </div>
      {description && <p className="rq-page-header__desc">{description}</p>}
    </div>
    {actions && <div className="rq-page-header__actions">{actions}</div>}
  </header>
);

export const EmptyState = ({ icon: Icon, title, hint }) => (
  <div className="rq-empty">
    {Icon && <Icon size={44} strokeWidth={1.5} aria-hidden="true" />}
    <p className="rq-empty__title">{title}</p>
    {hint && <p className="rq-empty__hint">{hint}</p>}
  </div>
);

export const DetailStat = ({ icon: Icon, label, value, tone }) => (
  <div className="rq-stat">
    <span className={`rq-icon-chip${tone ? ` rq-icon-chip--${tone}` : ''}`} aria-hidden="true"><Icon size={18} /></span>
    <div>
      <span className="rq-overline">{label}</span>
      <span className="rq-stat__value">{value}</span>
    </div>
  </div>
);

/** Interruptor activo/inactivo con su etiqueta. */
export const StatusSwitch = ({ active, onToggle, name }) => (
  <div className="rq-inline">
    <button
      type="button"
      role="switch"
      className="rq-switch"
      aria-checked={active}
      aria-label={`${active ? 'Desactivar' : 'Activar'} ${name}`}
      onClick={onToggle}
    />
    <span className="rq-switch-label">{active ? 'Activo' : 'Inactivo'}</span>
  </div>
);

/** Encabezado de columna ordenable. sort = { key, direction: 'asc' | 'desc' }. */
export const SortHeader = ({ label, sortKey, sort, onSort, style }) => {
  const active = sort.key === sortKey;
  const Icon = !active ? ChevronsUpDown : sort.direction === 'asc' ? ChevronUp : ChevronDown;
  return (
    <th style={style} aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="rq-sort-btn" onClick={() => onSort(sortKey)}>
        {label}
        <Icon size={14} className={active ? '' : 'rq-sort-btn__idle'} aria-hidden="true" />
      </button>
    </th>
  );
};

/** Nivel MCER: A = básico, B = intermedio, C = avanzado. */
const LEVEL_TONE = { A: 'info', B: 'warning', C: 'success' };
export const LevelBadge = ({ nivel = 'A1' }) => (
  <span className={`rq-badge rq-badge--${LEVEL_TONE[nivel[0]] || 'neutral'}`}>{nivel}</span>
);

export const formatAuditDate = (value) => {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const auditName = (u) => {
  if (!u) return 'Usuario';
  return `${u.nombres || u.nombre || ''} ${u.apellidos || u.apellido || ''}`.trim() || u.correo || 'Usuario';
};

const AuditPerson = ({ user, date }) => (
  <div className="rq-person">
    <span className="rq-person__avatar" aria-hidden="true">{user ? auditName(user).charAt(0).toUpperCase() : '?'}</span>
    <div>
      <strong>{auditName(user)}</strong>
      <small>{formatAuditDate(date) || 'Fecha desconocida'}</small>
    </div>
  </div>
);

/** Panel "quién creó / quién modificó" de los modales de detalle. */
export const AuditPanel = ({ record }) => (
  <section className="rq-audit" aria-label="Auditoría del registro">
    <span className="rq-overline">Auditoría del registro</span>
    <div className="rq-stats">
      <div>
        <span className="rq-overline">Creado por</span>
        <AuditPerson user={record.creado_por} date={record.fecha_creacion || record.creado_en} />
      </div>
      <div>
        <span className="rq-overline">Última actualización</span>
        {record.actualizado_por_id
          ? <AuditPerson user={record.actualizado_por} date={record.fecha_actualizacion || record.actualizado_en} />
          : <p className="rq-muted rq-person" style={{ fontStyle: 'italic' }}>Sin modificaciones recientes</p>}
      </div>
    </div>
  </section>
);

export const Pagination = ({ page, totalPages, onChange }) => {
  if (totalPages <= 1) return null;
  return (
    <nav className="rq-pagination" aria-label="Paginación">
      <button type="button" className="rq-button rq-button--ghost" disabled={page === 1} onClick={() => onChange(page - 1)}>
        Anterior
      </button>
      <span className="rq-pagination__status">Página {page} de {totalPages}</span>
      <button type="button" className="rq-button rq-button--ghost" disabled={page === totalPages} onClick={() => onChange(page + 1)}>
        Siguiente
      </button>
    </nav>
  );
};
