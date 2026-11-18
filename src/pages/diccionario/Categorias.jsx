import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { Search, Plus, Trash2, Tag, X, Edit2 } from 'lucide-react';
import { getCategorias, createCategoria, updateCategoria, deleteCategoria } from '../../services/diccionarioService';
import { matchesSearch } from '../../utils/searchUtils';
import { DeleteConfirmationModal, ConfirmDialog } from '../../components/DeleteConfirmationModal';
import { PageHeader, EmptyState, Pagination } from '../../components/PageKit';

const ITEMS_PER_PAGE = 6;
const categoriaId = (c) => c?.categoria_id || c?.categorias_vocabulario_id || c?.categorias_id || c?.id;

export const Categorias = () => {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editing, setEditing] = useState(null); // null = cerrado, {} = nueva, categoría = edición
  const [itemToDelete, setItemToDelete] = useState(null);
  const [confirmData, setConfirmData] = useState(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const isCreate = editing && !categoriaId(editing);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await getCategorias();
      setCategorias(Array.isArray(res) ? res : res.data || []);
    } catch {
      toast.error('No se pudieron cargar las categorías');
      setCategorias([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const openForm = (categoria = {}) => {
    reset({ nombre: categoria.nombre || '', descripcion: categoria.descripcion || '' });
    setEditing(categoria);
  };

  const confirmDelete = async () => {
    const toastId = toast.loading(`Eliminando categoría "${itemToDelete.nombre}"...`);
    try {
      await deleteCategoria(categoriaId(itemToDelete));
      toast.success('Categoría eliminada exitosamente', { id: toastId });
      fetchData();
    } catch {
      toast.error('Error al eliminar la categoría', { id: toastId });
    } finally {
      setItemToDelete(null);
    }
  };

  const confirmSubmit = async () => {
    const toastId = toast.loading(`${isCreate ? 'Creando' : 'Editando'} categoría "${confirmData.nombre}"...`);
    try {
      if (isCreate) await createCategoria(confirmData);
      else await updateCategoria(categoriaId(editing), confirmData);
      toast.success(`Categoría ${isCreate ? 'creada' : 'editada'} exitosamente`, { id: toastId });
      setEditing(null);
      setConfirmData(null);
      fetchData();
    } catch {
      toast.error(`Error al ${isCreate ? 'crear' : 'editar'} la categoría`, { id: toastId });
    }
  };

  const filtered = categorias.filter((c) => matchesSearch(c.nombre, searchTerm) || matchesSearch(c.descripcion, searchTerm));
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const visible = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div>
      <PageHeader
        title="Categorías"
        description="Administra las categorías de vocabulario del diccionario."
        actions={<button type="button" className="rq-button rq-button--primary" onClick={() => openForm()}><Plus size={18} strokeWidth={2.5} /> Nueva Categoría</button>}
      />

      <div className="rq-toolbar">
        <div className="rq-filter">
          <label htmlFor="categoria-search">Palabra clave</label>
          <div className="rq-search-box">
            <Search size={18} strokeWidth={2.5} aria-hidden="true" />
            <input id="categoria-search" type="search" placeholder="Buscar por nombre o descripción..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="rq-table-card">
        <div className="table-responsive-container">
          <table className="rq-table" aria-busy={loading}>
            <thead>
              <tr>
                <th style={{ width: 80 }}>ID</th>
                <th>Nombre</th>
                <th>Descripción</th>
                <th className="rq-col-actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }, (_, i) => (
                  <tr key={i} aria-hidden="true">
                    {[40, 140, 260, 70].map((w, j) => <td key={j}><div className="skeleton" style={{ width: w, height: 20, borderRadius: 6 }} /></td>)}
                  </tr>
                ))
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={4} className="rq-empty-cell">
                    <EmptyState icon={Tag} title={searchTerm ? 'No se encontraron categorías' : 'Aún no hay categorías'} hint={searchTerm ? 'Intenta con otra búsqueda' : 'Comienza creando la primera categoría'} />
                  </td>
                </tr>
              ) : (
                visible.map((c) => (
                  <tr key={categoriaId(c)}>
                    <td><span className="rq-badge">#{categoriaId(c)}</span></td>
                    <td className="rq-strong">{c.nombre}</td>
                    <td className="rq-muted" style={{ fontSize: 13.5 }}>{c.descripcion || '—'}</td>
                    <td className="rq-col-actions">
                      <div>
                        <button type="button" className="rq-icon-btn" onClick={() => openForm(c)} title="Editar" aria-label={`Editar ${c.nombre}`}><Edit2 size={17} /></button>
                        <button type="button" className="rq-icon-btn rq-icon-btn--danger" onClick={() => setItemToDelete(c)} title="Eliminar" aria-label={`Eliminar ${c.nombre}`}><Trash2 size={17} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={currentPage} totalPages={totalPages} onChange={setCurrentPage} />

      {editing && (
        <div className="rq-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="categoria-modal-title">
          <div className="modal-content-responsive rq-modal-dialog">
            <div className="rq-modal-header">
              <h2 id="categoria-modal-title" className="rq-modal-header__title">{isCreate ? 'Nueva Categoría' : 'Editar Categoría'}</h2>
              <button type="button" className="rq-icon-close" onClick={() => setEditing(null)} aria-label="Cerrar modal"><X size={18} /></button>
            </div>
            <form className="rq-form" onSubmit={handleSubmit(setConfirmData)}>
              <div className="rq-stack" style={{ gap: 20 }}>
                <div className="rq-field">
                  <label htmlFor="categoria-nombre" className="rq-field__label">Nombre de la categoría <span className="rq-required">*</span></label>
                  <input id="categoria-nombre" {...register('nombre', { required: 'El nombre es obligatorio' })} placeholder="Animales, Saludos, Verbos..." className={`rq-field__input${errors.nombre ? ' rq-field__input--error' : ''}`} />
                  {errors.nombre && <span className="rq-field__error">{errors.nombre.message}</span>}
                </div>
                <div className="rq-field">
                  <label htmlFor="categoria-descripcion" className="rq-field__label">Descripción</label>
                  <textarea id="categoria-descripcion" rows={4} {...register('descripcion')} placeholder="Breve descripción de los términos que incluye esta categoría..." className="rq-field__input rq-textarea" />
                </div>
              </div>
              <div className="rq-form__actions">
                <button type="button" className="rq-button rq-button--ghost" onClick={() => setEditing(null)}>Cancelar</button>
                <button type="submit" className="rq-button rq-button--primary">{isCreate ? 'Crear categoría' : 'Guardar cambios'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <DeleteConfirmationModal open={Boolean(itemToDelete)} title="¿Eliminar categoría?" itemName={itemToDelete?.nombre} onCancel={() => setItemToDelete(null)} onConfirm={confirmDelete} />

      <ConfirmDialog
        open={Boolean(confirmData)}
        icon={Tag}
        title={isCreate ? '¿Crear categoría?' : '¿Guardar cambios?'}
        description={isCreate ? `Se creará la categoría "${confirmData?.nombre}".` : `Se guardarán los cambios de "${confirmData?.nombre}".`}
        confirmLabel={isCreate ? 'Sí, crear' : 'Sí, guardar'}
        onCancel={() => setConfirmData(null)}
        onConfirm={confirmSubmit}
      />
    </div>
  );
};
