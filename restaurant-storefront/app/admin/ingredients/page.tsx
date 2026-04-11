'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { restaurantAdminApi } from '@/lib/api';
import { Ingredient } from '@/types';
import { Plus, Edit2, Trash2, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ingredientSchema = z.object({
    name: z.string().min(1, 'Requerido').max(100),
    category: z.string().optional(),
    extraPrice: z.coerce.number().min(0),
    isActive: z.boolean().default(true),
});

type IngredientForm = z.infer<typeof ingredientSchema>;

export default function IngredientsPage() {
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<IngredientForm>({
        resolver: zodResolver(ingredientSchema),
        defaultValues: { extraPrice: 0, isActive: true }
    });

    const fetchIngredients = async () => {
        try {
            const token = localStorage.getItem('admin_token')!;
            const data = await restaurantAdminApi.getIngredients(token) as Ingredient[];
            setIngredients(data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchIngredients();
    }, []);

    const openModal = (ing?: Ingredient) => {
        if (ing) {
            setEditingId(ing._id);
            reset({
                name: ing.name,
                category: ing.category || '',
                extraPrice: Number(ing.extraPrice),
                isActive: ing.isActive,
            });
        } else {
            setEditingId(null);
            reset({ name: '', category: '', extraPrice: 0, isActive: true });
        }
        setIsModalOpen(true);
    };

    const onSubmit = async (data: IngredientForm) => {
        try {
            const token = localStorage.getItem('admin_token')!;
            if (editingId) {
                await restaurantAdminApi.updateIngredient(token, editingId, data);
            } else {
                await restaurantAdminApi.createIngredient(token, data);
            }
            setIsModalOpen(false);
            fetchIngredients();
        } catch {
            alert('Error guardando ingrediente');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Seguro que deseas eliminar este ingrediente? Afectará a los platos que lo contengan.')) return;
        try {
            const token = localStorage.getItem('admin_token')!;
            await restaurantAdminApi.deleteIngredient(token, id);
            fetchIngredients();
        } catch {
            alert('Error eliminando ingrediente');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="font-display font-black text-3xl text-white">Ingredientes</h1>
                    <p className="text-muted text-sm">Gestiona el inventario global de ingredientes para personalización.</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="bg-accent text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-accent/90 transition-colors w-fit"
                >
                    <Plus className="w-5 h-5" /> Nuevo Ingrediente
                </button>
            </div>

            <div className="bg-surface border border-white/5 rounded-2xl overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center text-muted animate-pulse">Cargando...</div>
                ) : ingredients.length === 0 ? (
                    <div className="p-12 text-center text-muted flex flex-col items-center">
                        <AlertCircle className="w-12 h-12 mb-4 opacity-20" />
                        <p>No hay ingredientes registrados.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5 text-muted text-sm border-b border-white/10">
                                    <th className="p-4 font-semibold">Nombre</th>
                                    <th className="p-4 font-semibold">Categoría</th>
                                    <th className="p-4 font-semibold">Precio Extra</th>
                                    <th className="p-4 font-semibold">Estado</th>
                                    <th className="p-4 font-semibold text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {ingredients.map(ing => (
                                    <tr key={ing._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                        <td className="p-4 font-medium text-white">{ing.name}</td>
                                        <td className="p-4 text-muted">{ing.category || 'N/A'}</td>
                                        <td className="p-4 text-accent font-mono">${Number(ing.extraPrice).toFixed(2)}</td>
                                        <td className="p-4">
                                            {ing.isActive ?
                                                <span className="text-green-400 bg-green-400/10 px-2 py-1 rounded-md text-xs font-bold">Activo</span> :
                                                <span className="text-red-400 bg-red-400/10 px-2 py-1 rounded-md text-xs font-bold">Inactivo</span>
                                            }
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => openModal(ing)} className="p-2 text-muted hover:text-white bg-white/5 rounded-lg transition-colors">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(ing._id)} className="p-2 text-muted hover:text-red-400 bg-white/5 rounded-lg transition-colors">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-surface border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                            <div className="flex justify-between items-center p-6 border-b border-white/10">
                                <h3 className="font-display font-bold text-xl text-white">{editingId ? 'Editar' : 'Nuevo'} Ingrediente</h3>
                                <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                            </div>
                            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                                <div>
                                    <label className="text-sm text-white mb-1 block">Nombre *</label>
                                    <input {...register('name')} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-accent" />
                                    {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
                                </div>
                                <div>
                                    <label className="text-sm text-white mb-1 block">Categoría (Opcional)</label>
                                    <input {...register('category')} placeholder="Ej: Bases, Proteínas, Quesos" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-accent" />
                                </div>
                                <div>
                                    <label className="text-sm text-white mb-1 block">Precio si es Extra ($)</label>
                                    <input type="number" step="0.01" {...register('extraPrice')} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-accent font-mono" />
                                </div>
                                <div className="pt-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" {...register('isActive')} className="w-5 h-5 rounded border-white/10 bg-black/30 text-accent focus:ring-accent accent-accent" />
                                        <span className="text-sm text-white">Activo en el sistema</span>
                                    </label>
                                </div>
                                <div className="pt-4 flex justify-end gap-3 border-t border-white/10 mt-6">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-xl text-muted hover:text-white transition-colors">Cancelar</button>
                                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 bg-accent text-white font-bold rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50">Guardar</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
