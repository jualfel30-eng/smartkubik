'use client';

import { useState, useEffect } from 'react';
import { restaurantAdminApi } from '@/lib/api';
import { Category, Dish, Ingredient } from '@/types';
import { Plus, Trash2, Layers, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import DishForm from '@/components/admin/DishForm';

export default function MenuManagementPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dishes' | 'categories'>('dishes');
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [isDishFormOpen, setIsDishFormOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('admin_token')!;
      const [cats, dishs, ings] = await Promise.all([
        restaurantAdminApi.getCategories(token) as Promise<Category[]>,
        restaurantAdminApi.getDishes(token) as Promise<Dish[]>,
        restaurantAdminApi.getIngredients(token) as Promise<Ingredient[]>,
      ]);
      setCategories(cats);
      setDishes(dishs);
      setIngredients(ings);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      const token = localStorage.getItem('admin_token')!;
      await restaurantAdminApi.createCategory(token, { name: newCatName, isActive: true, displayOrder: 0 });
      setNewCatName('');
      fetchAll();
    } catch {
      alert('Error creando categoría');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('¿Eliminar categoría? Los platos asociados quedarán sin categoría.')) return;
    try {
      const token = localStorage.getItem('admin_token')!;
      await restaurantAdminApi.deleteCategory(token, id);
      fetchAll();
    } catch {
      alert('Error eliminando categoría');
    }
  };

  const handleDeleteDish = async (id: string) => {
    if (!confirm('¿Eliminar este platillo permanentemente?')) return;
    try {
      const token = localStorage.getItem('admin_token')!;
      await restaurantAdminApi.deleteDish(token, id);
      fetchAll();
    } catch {
      alert('Error eliminando platillo');
    }
  };

  const handleToggleAvailability = async (id: string) => {
    try {
      const token = localStorage.getItem('admin_token')!;
      await restaurantAdminApi.toggleDishAvailability(token, id);
      fetchAll();
    } catch {
      alert('Error actualizando disponibilidad');
    }
  };

  if (isDishFormOpen) {
    return (
      <DishForm
        initialData={editingDish || undefined}
        categories={categories}
        ingredients={ingredients}
        onSaved={() => { setIsDishFormOpen(false); fetchAll(); }}
        onCancel={() => setIsDishFormOpen(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-3xl text-white">Menú y Platos</h1>
          <p className="text-muted text-sm">Gestiona tu oferta gastronómica, categorías y personalizaciones.</p>
        </div>
        <div className="flex p-1 bg-surface border border-white/5 rounded-xl w-fit">
          <button onClick={() => setActiveTab('dishes')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'dishes' ? 'bg-white/10 text-white' : 'text-muted hover:text-white'}`}>
            Platillos
          </button>
          <button onClick={() => setActiveTab('categories')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'categories' ? 'bg-white/10 text-white' : 'text-muted hover:text-white'}`}>
            Categorías
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-muted animate-pulse bg-surface border border-white/5 rounded-2xl">Cargando datos del menú...</div>
      ) : activeTab === 'categories' ? (

        <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-white/5 bg-white/5">
            <h3 className="font-bold text-lg text-white mb-4">Añadir Categoría</h3>
            <div className="flex gap-4">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Ej: Entradas, Bebidas..."
                className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-accent"
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
              />
              <button onClick={handleAddCategory} className="bg-accent text-white px-6 rounded-xl font-bold flex items-center justify-center transition-colors hover:bg-accent/90">
                Añadir
              </button>
            </div>
          </div>
          <div className="p-6 space-y-3">
            {categories.length === 0 ? (
              <p className="text-muted text-center py-4">No hay categorías configuradas.</p>
            ) : categories.map(cat => (
              <div key={cat._id} className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
                <div className="flex items-center gap-3">
                  <Layers className="w-5 h-5 text-muted" />
                  <span className="font-bold text-white text-lg">{cat.name}</span>
                </div>
                <button onClick={() => handleDeleteCategory(cat._id)} className="p-2 text-muted hover:text-red-400 bg-white/5 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

      ) : (

        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => { setEditingDish(null); setIsDishFormOpen(true); }}
              className="bg-accent text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-accent/90 transition-colors shadow-[0_0_20px_-5px_rgba(255,69,0,0.5)]"
            >
              <Plus className="w-5 h-5" /> Añadir Platillo
            </button>
          </div>

          <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden">
            {dishes.length === 0 ? (
              <div className="p-12 text-center text-muted flex flex-col items-center">
                <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
                <p>No hay platillos registrados.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 text-muted text-sm border-b border-white/10">
                      <th className="p-4 font-semibold">Plato</th>
                      <th className="p-4 font-semibold">Categoría</th>
                      <th className="p-4 font-semibold">Precio</th>
                      <th className="p-4 font-semibold">Estado</th>
                      <th className="p-4 font-semibold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {dishes.map(dish => {
                      const catName = (dish.categoryId as Category)?.name || 'Sin Categoría';
                      return (
                        <tr key={dish._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-[#1a1a1a] overflow-hidden shrink-0">
                                {dish.imageUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={dish.imageUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center font-bold text-muted/50">{dish.name[0]}</div>
                                )}
                              </div>
                              <div>
                                <div className="font-bold text-white">{dish.name}</div>
                                {dish.allowsCustomization && <div className="text-[10px] uppercase tracking-wider text-accent font-bold mt-0.5">MODIFICABLE</div>}
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-muted">{catName}</td>
                          <td className="p-4 text-white font-mono font-semibold">${Number(dish.price).toFixed(2)}</td>
                          <td className="p-4">
                            <button onClick={() => handleToggleAvailability(dish._id)} className="flex items-center gap-2 transition-colors">
                              {dish.isAvailable ? (
                                <><ToggleRight className="w-5 h-5 text-green-400" /><span className="text-green-400 text-xs font-bold">Activo</span></>
                              ) : (
                                <><ToggleLeft className="w-5 h-5 text-muted" /><span className="text-muted text-xs font-bold">Inactivo</span></>
                              )}
                            </button>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => { setEditingDish(dish); setIsDishFormOpen(true); }}
                                className="px-3 py-1.5 text-xs text-muted hover:text-white bg-white/5 rounded-lg transition-colors border border-white/5 hover:border-white/20 font-bold"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() => handleDeleteDish(dish._id)}
                                className="p-2 text-muted hover:text-red-400 bg-white/5 rounded-lg transition-colors border border-white/5 hover:border-red-500/30"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
