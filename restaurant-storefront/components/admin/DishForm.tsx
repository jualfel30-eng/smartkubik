'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dish, Category, Ingredient } from '@/types';
import { Plus, Trash2, Save, X } from 'lucide-react';
import { restaurantAdminApi } from '@/lib/api';

const dishSchema = z.object({
  name: z.string().min(1, 'Requerido'),
  categoryId: z.string().optional(),
  description: z.string().optional(),
  price: z.number().min(0, 'Precio inválido'),
  imageUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  isAvailable: z.boolean(),
  allowsCustomization: z.boolean(),
  displayOrder: z.number(),
  baseIngredients: z.array(z.object({
    ingredientId: z.string().min(1),
    isRemovable: z.boolean(),
  })).optional(),
  availableExtras: z.array(z.object({
    ingredientId: z.string().min(1),
    maxQuantity: z.number().min(1),
  })).optional(),
});

type DishFormVals = z.infer<typeof dishSchema>;

interface Props {
  initialData?: Dish;
  categories: Category[];
  ingredients: Ingredient[];
  onSaved: () => void;
  onCancel: () => void;
}

export default function DishForm({ initialData, categories, ingredients, onSaved, onCancel }: Props) {
  const { register, handleSubmit, control, watch, formState: { errors, isSubmitting } } = useForm<DishFormVals>({
    resolver: zodResolver(dishSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      categoryId: (initialData.categoryId as Category)?._id || (initialData.categoryId as string) || '',
      description: initialData.description || '',
      price: Number(initialData.price),
      imageUrl: initialData.imageUrl || '',
      isAvailable: initialData.isAvailable,
      allowsCustomization: initialData.allowsCustomization,
      displayOrder: initialData.displayOrder,
      baseIngredients: initialData.baseIngredients.map(i => ({
        ingredientId: (i.ingredientId as Ingredient)?._id || i.ingredientId as string,
        isRemovable: i.isRemovable ?? true,
      })),
      availableExtras: initialData.availableExtras.map(e => ({
        ingredientId: (e.ingredientId as Ingredient)?._id || e.ingredientId as string,
        maxQuantity: e.maxQuantity ?? 1,
      })),
    } : {
      isAvailable: true,
      allowsCustomization: true,
      displayOrder: 0,
      price: 0,
      baseIngredients: [],
      availableExtras: [],
    },
  });

  const { fields: baseFields, append: appendBase, remove: removeBase } = useFieldArray({ control, name: 'baseIngredients' });
  const { fields: extraFields, append: appendExtra, remove: removeExtra } = useFieldArray({ control, name: 'availableExtras' });
  const allowsCustomization = watch('allowsCustomization');

  const onSubmit = async (data: DishFormVals) => {
    try {
      const token = localStorage.getItem('admin_token')!;
      if (initialData) {
        await restaurantAdminApi.updateDish(token, initialData._id, data);
      } else {
        await restaurantAdminApi.createDish(token, data);
      }
      onSaved();
    } catch (error) {
      alert('Error guardando plato');
      console.error(error);
    }
  };

  return (
    <div className="bg-surface border border-white/5 rounded-2xl p-6 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-display font-bold text-2xl text-white">
          {initialData ? 'Editar Plato' : 'Nuevo Plato'}
        </h2>
        <button onClick={onCancel} className="p-2 text-muted hover:text-white transition-colors bg-white/5 rounded-full">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Info Básica */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-white">Nombre *</label>
            <input {...register('name')} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-accent" />
            {errors.name && <p className="text-red-400 text-xs">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-white">Categoría</label>
            <select {...register('categoryId')} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-accent appearance-none">
              <option value="">Sin categoría</option>
              {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-white">Precio Base ($) *</label>
            <input type="number" step="0.01" {...register('price', { valueAsNumber: true })} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-accent font-mono" />
            {errors.price && <p className="text-red-400 text-xs">{errors.price.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-white">URL Imagen</label>
            <input {...register('imageUrl')} placeholder="https://..." className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-accent" />
            {errors.imageUrl && <p className="text-red-400 text-xs">{errors.imageUrl.message}</p>}
          </div>

          <div className="md:col-span-2 space-y-1">
            <label className="text-sm font-semibold text-white">Descripción</label>
            <textarea {...register('description')} rows={3} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-accent resize-none" />
          </div>
        </div>

        {/* Toggles */}
        <div className="flex flex-wrap gap-8 p-4 bg-white/5 rounded-xl border border-white/10">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" {...register('isAvailable')} className="w-5 h-5 rounded border-white/10 bg-black/30 text-accent accent-accent" />
            <span className="text-sm font-semibold text-white">Disponible en Menú</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" {...register('allowsCustomization')} className="w-5 h-5 rounded border-white/10 bg-black/30 text-accent accent-accent" />
            <span className="text-sm font-semibold text-white">Permite Personalización</span>
          </label>
        </div>

        {/* Builder de ingredientes */}
        {allowsCustomization && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-white/5 pt-8">

            {/* Ingredientes Base */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white">Ingredientes Base</h3>
                <button type="button" onClick={() => appendBase({ ingredientId: '', isRemovable: true })} className="text-xs font-bold text-accent hover:text-white transition-colors flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Añadir Base
                </button>
              </div>
              <p className="text-xs text-muted mb-4">Lo que trae el platillo por defecto.</p>
              <div className="space-y-3">
                {baseFields.map((field, index) => (
                  <div key={field.id} className="flex gap-3 items-start bg-black/20 p-3 rounded-xl border border-white/5">
                    <div className="flex-1 space-y-2">
                      <select {...register(`baseIngredients.${index}.ingredientId`)} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-accent appearance-none">
                        <option value="">Seleccionar Ingrediente...</option>
                        {ingredients.map(i => <option key={i._id} value={i._id}>{i.name}</option>)}
                      </select>
                      <label className="flex items-center gap-2 cursor-pointer pt-1">
                        <input type="checkbox" {...register(`baseIngredients.${index}.isRemovable`)} className="w-4 h-4 rounded border-white/10 bg-black/30 text-accent accent-accent" />
                        <span className="text-xs text-muted">Acepta ser removido</span>
                      </label>
                    </div>
                    <button type="button" onClick={() => removeBase(index)} className="p-2 text-muted hover:text-red-400 bg-white/5 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Extras */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white">Extras Disponibles</h3>
                <button type="button" onClick={() => appendExtra({ ingredientId: '', maxQuantity: 1 })} className="text-xs font-bold text-accent hover:text-white transition-colors flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Añadir Extra
                </button>
              </div>
              <p className="text-xs text-muted mb-4">Lo que el usuario puede añadir por un costo adicional.</p>
              <div className="space-y-3">
                {extraFields.map((field, index) => (
                  <div key={field.id} className="flex gap-3 items-start bg-black/20 p-3 rounded-xl border border-white/5">
                    <div className="flex-1 space-y-2">
                      <select {...register(`availableExtras.${index}.ingredientId`)} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-accent appearance-none">
                        <option value="">Seleccionar Ingrediente...</option>
                        {ingredients.map(i => <option key={i._id} value={i._id}>{i.name} (+${Number(i.extraPrice).toFixed(2)})</option>)}
                      </select>
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-xs text-muted">Cantidad máx:</span>
                        <input type="number" min="1" {...register(`availableExtras.${index}.maxQuantity`, { valueAsNumber: true })} className="w-16 bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-accent" />
                      </div>
                    </div>
                    <button type="button" onClick={() => removeExtra(index)} className="p-2 text-muted hover:text-red-400 bg-white/5 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        <div className="pt-6 border-t border-white/10 flex justify-end gap-4">
          <button type="button" onClick={onCancel} className="px-6 py-3 rounded-xl font-bold text-muted hover:text-white transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={isSubmitting} className="px-8 py-3 bg-accent text-white font-bold rounded-xl flex items-center gap-2 hover:bg-accent/90 transition-colors disabled:opacity-50">
            <Save className="w-5 h-5" />
            {isSubmitting ? 'Guardando...' : 'Guardar Plato'}
          </button>
        </div>
      </form>
    </div>
  );
}
