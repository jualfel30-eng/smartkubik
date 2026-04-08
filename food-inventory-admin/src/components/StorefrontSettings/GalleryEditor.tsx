import { useState, useEffect, useRef } from 'react';
import { Trash2, Upload, Eye, EyeOff, ChevronUp, ChevronDown, X, Plus, Tag } from 'lucide-react';
import {
  getBeautyGallery,
  getBeautyGalleryCategories,
  createBeautyGalleryItem,
  updateBeautyGalleryItem,
  deleteBeautyGalleryItem,
} from '../../lib/api';

interface GalleryItem {
  _id: string;
  image: string;
  beforeImage?: string;
  caption?: string;
  category?: string;
  tags: string[];
  isActive: boolean;
  sortOrder: number;
  professional?: { _id: string; name: string };
  createdAt: string;
}

interface EditState {
  caption: string;
  category: string;
  tags: string[];
  tagInput: string;
  beforeImage: string | null; // null = sin cambio, '' = eliminar, 'data:...' = nueva imagen
}

export function GalleryEditor() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ caption: '', category: '', tags: [], tagInput: '', beforeImage: null });
  const beforeFileInputRef = useRef<HTMLInputElement>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<GalleryItem | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [itemsRes, catsRes] = await Promise.all([
        getBeautyGallery(),
        getBeautyGalleryCategories(),
      ]);
      setItems(itemsRes?.data ?? itemsRes ?? []);
      const cats = catsRes?.data ?? catsRes ?? [];
      setCategories(Array.isArray(cats) ? cats.filter(Boolean) : []);
    } catch (e) {
      console.error('Error loading gallery:', e);
    } finally {
      setLoading(false);
    }
  };

  // Mismo patrón que ProductsManagement.jsx:compressAndConvertImage()
  // pero con dimensión mayor (1200px) y salida WebP para la galería pública.
  const compressToWebP = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
      if (!validTypes.includes(file.type)) {
        reject(new Error('Solo se permiten imágenes JPEG, PNG o WebP'));
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        reject(new Error(`"${file.name}" supera 15MB`));
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Error al cargar la imagen'));
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;

            // Max 1200px — galería se ve a pantalla completa, necesita más detalle que thumbnails
            let { width, height } = img;
            const maxSize = 1200;
            if (width > maxSize || height > maxSize) {
              if (width > height) {
                height = Math.round((height / width) * maxSize);
                width = maxSize;
              } else {
                width = Math.round((width / height) * maxSize);
                height = maxSize;
              }
            }

            canvas.width = width;
            canvas.height = height;
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, width, height);

            // WebP a 85% — ~30% más pequeño que JPEG equivalente
            const base64 = canvas.toDataURL('image/webp', 0.85);

            // Límite 800KB — WebP 85% es generoso para una foto de galería 1200px
            const sizeInKB = (base64.length * 3) / 4 / 1024;
            if (sizeInKB > 800) {
              // Reintentar con calidad menor si es necesario
              const base64Fallback = canvas.toDataURL('image/webp', 0.7);
              const fallbackKB = (base64Fallback.length * 3) / 4 / 1024;
              if (fallbackKB > 800) {
                reject(new Error(`"${file.name}": ${fallbackKB.toFixed(0)}KB tras compresión. Máximo 800KB.`));
              } else {
                resolve(base64Fallback);
              }
            } else {
              resolve(base64);
            }
          } catch (err: any) {
            reject(new Error(`Error al procesar imagen: ${err.message}`));
          }
        };
        img.src = e.target!.result as string;
      };
      reader.readAsDataURL(file);
    });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    setUploading(true);
    const errors: string[] = [];
    let uploaded = 0;

    try {
      for (const file of files) {
        let webp: string;
        try {
          webp = await compressToWebP(file);
        } catch (err: any) {
          errors.push(err.message);
          continue;
        }
        await createBeautyGalleryItem({
          image: webp,
          category: newCategory || undefined,
          sortOrder: items.length + uploaded,
        });
        uploaded++;
      }
      if (uploaded > 0) await loadData();
      if (errors.length > 0) alert('Algunos archivos no se pudieron subir:\n• ' + errors.join('\n• '));
    } catch (err: any) {
      alert('Error al subir imagen: ' + (err?.message ?? 'desconocido'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const startEdit = (item: GalleryItem) => {
    setEditingId(item._id);
    setEditState({
      caption: item.caption ?? '',
      category: item.category ?? '',
      tags: [...item.tags],
      tagInput: '',
      beforeImage: null,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditState({ caption: '', category: '', tags: [], tagInput: '', beforeImage: null });
  };

  const handleBeforeImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const webp = await compressToWebP(file);
      setEditState((s) => ({ ...s, beforeImage: webp }));
    } catch (err: any) {
      alert('Error al procesar imagen "antes": ' + err.message);
    }
  };

  const saveEdit = async (item: GalleryItem) => {
    setSavingId(item._id);
    try {
      const payload: Record<string, any> = {
        caption: editState.caption || undefined,
        category: editState.category || undefined,
        tags: editState.tags,
      };
      // beforeImage: null = no change, '' = remove, 'data:...' = new image
      if (editState.beforeImage !== null) {
        payload.beforeImage = editState.beforeImage || null;
      }
      await updateBeautyGalleryItem(item._id, payload);
      // Update category list if new
      if (editState.category && !categories.includes(editState.category)) {
        setCategories((prev) => [...prev, editState.category].sort());
      }
      await loadData();
      cancelEdit();
    } catch (err: any) {
      alert('Error al guardar: ' + (err?.message ?? 'desconocido'));
    } finally {
      setSavingId(null);
    }
  };

  const toggleActive = async (item: GalleryItem) => {
    setSavingId(item._id);
    try {
      await updateBeautyGalleryItem(item._id, { isActive: !item.isActive });
      setItems((prev) =>
        prev.map((i) => (i._id === item._id ? { ...i, isActive: !item.isActive } : i))
      );
    } catch (err: any) {
      alert('Error: ' + (err?.message ?? 'desconocido'));
    } finally {
      setSavingId(null);
    }
  };

  const deleteItem = async (item: GalleryItem) => {
    if (!confirm(`¿Eliminar esta foto? Esta acción no se puede deshacer.`)) return;
    setDeletingId(item._id);
    try {
      await deleteBeautyGalleryItem(item._id);
      setItems((prev) => prev.filter((i) => i._id !== item._id));
    } catch (err: any) {
      alert('Error al eliminar: ' + (err?.message ?? 'desconocido'));
    } finally {
      setDeletingId(null);
    }
  };

  const moveItem = async (item: GalleryItem, direction: 'up' | 'down') => {
    const filtered = filteredItems;
    const idx = filtered.findIndex((i) => i._id === item._id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= filtered.length) return;

    const swapItem = filtered[swapIdx];
    const newOrderA = swapItem.sortOrder;
    const newOrderB = item.sortOrder;

    setSavingId(item._id);
    try {
      await Promise.all([
        updateBeautyGalleryItem(item._id, { sortOrder: newOrderA }),
        updateBeautyGalleryItem(swapItem._id, { sortOrder: newOrderB }),
      ]);
      await loadData();
    } catch (err: any) {
      alert('Error al reordenar: ' + (err?.message ?? 'desconocido'));
    } finally {
      setSavingId(null);
    }
  };

  const addTag = () => {
    const tag = editState.tagInput.trim().toLowerCase();
    if (!tag || editState.tags.includes(tag)) return;
    setEditState((s) => ({ ...s, tags: [...s.tags, tag], tagInput: '' }));
  };

  const removeTag = (tag: string) => {
    setEditState((s) => ({ ...s, tags: s.tags.filter((t) => t !== tag) }));
  };

  const filteredItems = items
    .filter((i) => !filterCategory || i.category === filterCategory)
    .sort((a, b) => a.sortOrder - b.sortOrder || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div>
      {/* Header + Upload */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Galería / Portfolio
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {items.length} foto{items.length !== 1 ? 's' : ''} •{' '}
            {items.filter((i) => i.isActive).length} visible{items.filter((i) => i.isActive).length !== 1 ? 's' : ''} en el sitio
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Categoría rápida para nuevas fotos */}
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-700 rounded-md px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
          >
            <option value="">Sin categoría</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {uploading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {uploading ? 'Subiendo...' : 'Subir fotos'}
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
        Formatos: JPG, PNG, WebP • Hasta 15MB por imagen • Se optimizan automáticamente a WebP (máx. 1200px, 800KB) • Puedes subir varias a la vez
      </p>

      {/* Category filter */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilterCategory('')}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              !filterCategory
                ? 'bg-blue-600 text-white border-blue-600'
                : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-400'
            }`}
          >
            Todas ({items.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat === filterCategory ? '' : cat)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                filterCategory === cat
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-400'
              }`}
            >
              {cat} ({items.filter((i) => i.category === cat).length})
            </button>
          ))}
        </div>
      )}

      {/* Empty state */}
      {filteredItems.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          <Upload className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            {filterCategory ? `No hay fotos en "${filterCategory}"` : 'No hay fotos en la galería'}
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            Sube tu primer foto para que aparezca en el sitio web
          </p>
        </div>
      )}

      {/* Gallery grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredItems.map((item, idx) => (
          <div
            key={item._id}
            className={`group relative bg-white dark:bg-gray-800 border rounded-lg overflow-hidden shadow-sm transition-all ${
              item.isActive
                ? 'border-gray-200 dark:border-gray-700'
                : 'border-dashed border-gray-300 dark:border-gray-600 opacity-60'
            }`}
          >
            {/* Image */}
            <div className="relative aspect-square bg-gray-100 dark:bg-gray-700">
              <img
                src={item.image}
                alt={item.caption ?? 'Foto de galería'}
                className="w-full h-full object-cover"
              />

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={() => setPreviewItem(item)}
                  className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                  title="Ver preview"
                >
                  <Eye className="h-4 w-4 text-gray-700" />
                </button>
              </div>

              {/* Inactive badge */}
              {!item.isActive && (
                <div className="absolute top-2 left-2 bg-gray-900/70 text-white text-xs px-2 py-0.5 rounded">
                  Oculta
                </div>
              )}

              {/* Before/After badge */}
              {item.beforeImage && (
                <div className="absolute top-2 right-2 bg-purple-600/90 text-white text-xs px-2 py-0.5 rounded font-medium">
                  A/D
                </div>
              )}

              {/* Category badge */}
              {item.category && (
                <div className="absolute bottom-2 left-2 bg-blue-600/90 text-white text-xs px-2 py-0.5 rounded">
                  {item.category}
                </div>
              )}
            </div>

            {/* Editing mode */}
            {editingId === item._id ? (
              <div className="p-3 space-y-2">
                <input
                  type="text"
                  value={editState.caption}
                  onChange={(e) => setEditState((s) => ({ ...s, caption: e.target.value }))}
                  placeholder="Descripción (opcional)"
                  className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />

                <div>
                  <input
                    type="text"
                    value={editState.category}
                    onChange={(e) => setEditState((s) => ({ ...s, category: e.target.value }))}
                    placeholder="Categoría (ej: Cortes, Color)"
                    list={`cats-${item._id}`}
                    className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <datalist id={`cats-${item._id}`}>
                    {categories.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>

                {/* Before image (Antes/Después) */}
                <div className="border border-dashed border-purple-300 dark:border-purple-800 rounded p-2 bg-purple-50 dark:bg-purple-900/20">
                  <p className="text-xs font-medium text-purple-700 dark:text-purple-300 mb-1.5">
                    Imagen "Antes" (opcional)
                  </p>
                  {/* Preview current beforeImage */}
                  {(editState.beforeImage ?? item.beforeImage) ? (
                    <div className="relative mb-1.5">
                      <img
                        src={editState.beforeImage ?? item.beforeImage}
                        alt="Antes"
                        className="w-full aspect-square object-cover rounded"
                      />
                      <button
                        onClick={() => setEditState((s) => ({ ...s, beforeImage: '' }))}
                        className="absolute top-1 right-1 p-0.5 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                        title="Quitar imagen 'antes'"
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>
                  ) : null}
                  <input
                    ref={beforeFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleBeforeImageUpload}
                  />
                  <button
                    onClick={() => beforeFileInputRef.current?.click()}
                    className="w-full text-xs py-1 border border-purple-400 dark:border-purple-600 text-purple-700 dark:text-purple-300 rounded hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors"
                  >
                    {(editState.beforeImage ?? item.beforeImage) ? 'Cambiar imagen' : '+ Subir foto "antes"'}
                  </button>
                </div>

                {/* Tags */}
                <div className="flex gap-1">
                  <input
                    type="text"
                    value={editState.tagInput}
                    onChange={(e) => setEditState((s) => ({ ...s, tagInput: e.target.value }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                    placeholder="Agregar tag"
                    className="flex-1 text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <button onClick={addTag} className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
                    <Plus className="h-3 w-3 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
                {editState.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {editState.tags.map((tag) => (
                      <span key={tag} className="inline-flex items-center gap-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
                        <Tag className="h-2.5 w-2.5" />
                        {tag}
                        <button onClick={() => removeTag(tag)} className="ml-0.5 hover:text-red-500">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => saveEdit(item)}
                    disabled={savingId === item._id}
                    className="flex-1 text-xs py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {savingId === item._id ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="text-xs px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-2">
                {/* Caption */}
                {item.caption && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate mb-1" title={item.caption}>
                    {item.caption}
                  </p>
                )}
                {/* Tags */}
                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {item.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded">
                        #{tag}
                      </span>
                    ))}
                    {item.tags.length > 3 && (
                      <span className="text-xs text-gray-400">+{item.tags.length - 3}</span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEdit(item)}
                    className="flex-1 text-xs py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => toggleActive(item)}
                    disabled={savingId === item._id}
                    title={item.isActive ? 'Ocultar del sitio' : 'Mostrar en el sitio'}
                    className="p-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-40"
                  >
                    {item.isActive
                      ? <Eye className="h-3.5 w-3.5 text-green-600" />
                      : <EyeOff className="h-3.5 w-3.5 text-gray-400" />
                    }
                  </button>
                  <button
                    onClick={() => moveItem(item, 'up')}
                    disabled={idx === 0 || savingId === item._id}
                    title="Mover arriba"
                    className="p-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-30"
                  >
                    <ChevronUp className="h-3.5 w-3.5 text-gray-500" />
                  </button>
                  <button
                    onClick={() => moveItem(item, 'down')}
                    disabled={idx === filteredItems.length - 1 || savingId === item._id}
                    title="Mover abajo"
                    className="p-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-30"
                  >
                    <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                  </button>
                  <button
                    onClick={() => deleteItem(item)}
                    disabled={deletingId === item._id}
                    title="Eliminar foto"
                    className="p-1 border border-red-200 dark:border-red-900 rounded hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Preview modal */}
      {previewItem && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-white dark:bg-gray-900 rounded-lg overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreviewItem(null)}
              className="absolute top-3 right-3 z-10 p-1 bg-black/40 hover:bg-black/60 rounded-full transition-colors"
            >
              <X className="h-5 w-5 text-white" />
            </button>
            {previewItem.beforeImage ? (
              <div className="grid grid-cols-2 bg-gray-100 dark:bg-gray-800">
                <div className="relative">
                  <img
                    src={previewItem.beforeImage}
                    alt="Antes"
                    className="w-full max-h-[60vh] object-cover"
                  />
                  <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs font-semibold px-2 py-0.5 rounded">
                    ANTES
                  </span>
                </div>
                <div className="relative">
                  <img
                    src={previewItem.image}
                    alt="Después"
                    className="w-full max-h-[60vh] object-cover"
                  />
                  <span className="absolute bottom-2 right-2 bg-purple-600/90 text-white text-xs font-semibold px-2 py-0.5 rounded">
                    DESPUÉS
                  </span>
                </div>
              </div>
            ) : (
              <img
                src={previewItem.image}
                alt={previewItem.caption ?? 'Foto'}
                className="w-full max-h-[70vh] object-contain bg-gray-100 dark:bg-gray-800"
              />
            )}
            {(previewItem.caption || previewItem.category || previewItem.tags.length > 0) && (
              <div className="p-4">
                {previewItem.caption && (
                  <p className="text-gray-800 dark:text-gray-200 text-sm mb-2">{previewItem.caption}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {previewItem.category && (
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                      {previewItem.category}
                    </span>
                  )}
                  {previewItem.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
