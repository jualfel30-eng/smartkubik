'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm as useRHForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { Lock, Mail } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useRHForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setServerError('');
    try {
      // SmartKubik auth: POST /auth/login → { data: { accessToken } }
      const res = await api.post<{ data: { accessToken: string } }>('/auth/login', data);
      localStorage.setItem('admin_token', res.data.accessToken);
      router.push('/admin/dashboard');
    } catch (err: unknown) {
      setServerError(err instanceof Error ? err.message : 'Credenciales inválidas');
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] bg-accent/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md p-8 md:p-10 bg-surface/80 backdrop-blur-xl border border-white/10 rounded-[2rem] shadow-2xl">
        <div className="mb-10 text-center">
          <h1 className="font-display font-black text-3xl mb-2 text-white">
            Panel <span className="text-accent">Administrativo</span>
          </h1>
          <p className="text-muted text-sm">Ingresa tus credenciales para continuar</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1">
            <div className="relative flex items-center">
              <Mail className="absolute left-4 w-5 h-5 text-muted" />
              <input
                {...register('email')}
                type="email"
                placeholder="Email"
                className={`w-full bg-black/30 border rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-white/30 focus:outline-none transition-colors ${errors.email ? 'border-red-500/50' : 'border-white/10 focus:border-accent'}`}
              />
            </div>
            {errors.email && <p className="text-xs text-red-400 px-2">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <div className="relative flex items-center">
              <Lock className="absolute left-4 w-5 h-5 text-muted" />
              <input
                {...register('password')}
                type="password"
                placeholder="Contraseña"
                className={`w-full bg-black/30 border rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-white/30 focus:outline-none transition-colors ${errors.password ? 'border-red-500/50' : 'border-white/10 focus:border-accent'}`}
              />
            </div>
            {errors.password && <p className="text-xs text-red-400 px-2">{errors.password.message}</p>}
          </div>

          {serverError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-4 bg-accent hover:bg-accent/90 text-white font-bold py-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_-5px_rgba(255,69,0,0.4)] disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSubmitting ? 'Verificando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
