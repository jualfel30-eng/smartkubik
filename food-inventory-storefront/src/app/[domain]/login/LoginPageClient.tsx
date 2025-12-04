'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getStorefrontConfig } from '@/lib/api';

interface LoginPageClientProps {
  domain: string;
}

export function LoginPageClient({ domain }: LoginPageClientProps) {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detectar dark mode
  useEffect(() => {
    const stored = localStorage.getItem('storefront_theme');
    if (stored) {
      const val = stored === 'dark';
      setIsDarkMode(val);
      document.documentElement.classList.toggle('dark', val);
      return;
    }
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(prefersDark);
    document.documentElement.classList.toggle('dark', prefersDark);
  }, []);

  // Obtener parámetro de redirección
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRedirectPath(params.get('redirect'));
  }, []);

  // Cargar tenantId desde la configuración del storefront
  useState(() => {
    getStorefrontConfig(domain).then((config) => {
      const id = typeof config.tenantId === 'string'
        ? config.tenantId
        : config.tenantId._id;
      setTenantId(id);
    }).catch((err) => {
      console.error('Error loading tenant config:', err);
      setError('Error al cargar configuración de la tienda');
    });
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!tenantId) {
      setError('Error: No se pudo cargar la configuración de la tienda');
      return;
    }

    try {
      await login({ email, password }, tenantId);

      // Redirigir según parámetro o a home
      if (redirectPath === 'checkout') {
        router.push(`/${domain}/checkout`);
      } else {
        router.push(`/${domain}`);
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al iniciar sesión');
      }
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className={`mt-6 text-center text-3xl font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Iniciar Sesión
          </h2>
          <p className={`mt-2 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            O{' '}
            <Link
              href={`/${domain}/registro`}
              className="font-medium text-primary hover:opacity-80"
            >
              crea una cuenta nueva
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className={`rounded-md p-4 ${isDarkMode ? 'bg-red-900/30 border border-red-800' : 'bg-red-50'}`}>
              <div className={`text-sm ${isDarkMode ? 'text-red-400' : 'text-red-800'}`}>{error}</div>
            </div>
          )}

          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border rounded-t-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm ${isDarkMode ? 'border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-400' : 'border-gray-300 text-gray-900 placeholder-gray-500'}`}
                placeholder="Email"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border rounded-b-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm ${isDarkMode ? 'border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-400' : 'border-gray-300 text-gray-900 placeholder-gray-500'}`}
                placeholder="Contraseña"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link
                href={`/${domain}`}
                className={`font-medium ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-500'}`}
              >
                Volver a la tienda
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || !tenantId}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
