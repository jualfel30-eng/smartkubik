'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { restaurantAdminApi } from '@/lib/api';
import { Save, Loader2 } from 'lucide-react';

const settingsSchema = z.object({
  restaurantName: z.string().min(1, 'Requerido'),
  whatsappNumber: z.string().min(8, 'Número de WhatsApp inválido. Ej: 584141234567'),
  paymentInstructions: z.string().min(1, 'Instrucciones requeridas'),
  currency: z.string().max(10).default('USD'),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color Hex inválido. Ej: #FF4500'),
  logoUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  heroVideoUrl: z.string().url('URL inválida').optional().or(z.literal('')),
  tagline: z.string().optional(),
});

type SettingsForm = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { currency: 'USD', accentColor: '#FF4500' },
  });

  const accentColorPreview = watch('accentColor');

  useEffect(() => {
    const token = localStorage.getItem('admin_token')!;
    restaurantAdminApi.getStorefrontConfig(token)
      .then((data: any) => {
        const rc = data?.restaurantConfig || {};
        reset({
          restaurantName: rc.restaurantName || '',
          whatsappNumber: rc.whatsappNumber || '',
          paymentInstructions: rc.paymentInstructions || '',
          currency: rc.currency || 'USD',
          accentColor: rc.accentColor || '#FF4500',
          logoUrl: rc.logoUrl || '',
          heroVideoUrl: rc.heroVideoUrl || '',
          tagline: rc.tagline || '',
        });
      })
      .catch(() => setToast({ msg: 'Error cargando configuración', type: 'error' }))
      .finally(() => setIsLoading(false));
  }, [reset]);

  const onSubmit = async (data: SettingsForm) => {
    setToast(null);
    try {
      const token = localStorage.getItem('admin_token')!;
      await restaurantAdminApi.updateStorefrontConfig(token, {
        ...data,
        enabled: true,
      });
      setToast({ msg: 'Configuración guardada exitosamente.', type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast({ msg: (err as Error).message || 'Error al guardar', type: 'error' });
    }
  };

  if (isLoading) return <div className="animate-pulse text-muted">Cargando...</div>;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="font-display font-black text-3xl text-white mb-2">Configuración</h1>
        <p className="text-muted">Personaliza la identidad de tu restaurante y datos de contacto.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-surface p-6 md:p-8 rounded-2xl border border-white/5">

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white">Nombre del Restaurante *</label>
            <input {...register('restaurantName')} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent" />
            {errors.restaurantName && <p className="text-xs text-red-400">{errors.restaurantName.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-white">WhatsApp para Pedidos *</label>
            <input {...register('whatsappNumber')} placeholder="584141234567" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent" />
            <p className="text-[11px] text-muted">Incluye código de país sin + (ej: 584141234567)</p>
            {errors.whatsappNumber && <p className="text-xs text-red-400">{errors.whatsappNumber.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-white">Tagline (opcional)</label>
          <input {...register('tagline')} placeholder="Tu experiencia gastronómica favorita" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-white">Instrucciones de Pago *</label>
          <textarea
            {...register('paymentInstructions')}
            rows={4}
            placeholder="Zelle: correo@ejemplo.com&#10;Pago Móvil: 0414-0000000 / V-00000000 / Banco"
            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent resize-none placeholder:text-muted/50"
          />
          {errors.paymentInstructions && <p className="text-xs text-red-400">{errors.paymentInstructions.message}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white">Moneda</label>
            <input {...register('currency')} placeholder="USD" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white">Color de Acento (Hex)</label>
            <div className="flex gap-3 items-center">
              <input
                {...register('accentColor')}
                className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent font-mono uppercase"
              />
              {/^#[0-9A-Fa-f]{6}$/.test(accentColorPreview || '') && (
                <div className="w-10 h-10 rounded-lg border border-white/10 shrink-0" style={{ backgroundColor: accentColorPreview }} />
              )}
            </div>
            {errors.accentColor && <p className="text-xs text-red-400">{errors.accentColor.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 pt-4 border-t border-white/5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white">URL Video Hero</label>
            <input {...register('heroVideoUrl')} placeholder="https://ejemplo.com/video.mp4" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent" />
            {errors.heroVideoUrl && <p className="text-xs text-red-400">{errors.heroVideoUrl.message}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white">URL Logo</label>
            <input {...register('logoUrl')} placeholder="https://ejemplo.com/logo.png" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent" />
            {errors.logoUrl && <p className="text-xs text-red-400">{errors.logoUrl.message}</p>}
          </div>
        </div>

        <div className="pt-6 flex items-center justify-between">
          <div>
            {toast && (
              <span className={`text-sm font-semibold ${toast.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                {toast.msg}
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 bg-accent text-white font-bold rounded-xl flex items-center gap-2 hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Guardar Cambios
          </button>
        </div>
      </form>
    </div>
  );
}
