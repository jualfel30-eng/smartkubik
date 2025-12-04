'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getStorefrontConfig } from '@/lib/api';

interface RegisterPageClientProps {
  domain: string;
}

export function RegisterPageClient({ domain }: RegisterPageClientProps) {
  const router = useRouter();
  const { register, isLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [marketingOptIn, setMarketingOptIn] = useState(false);
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

    // Validar contraseñas
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      await register(
        {
          name,
          email,
          password,
          phone: phone || undefined,
          whatsappNumber: whatsappNumber || undefined,
          marketingOptIn,
        },
        tenantId
      );

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
        setError('Error al registrar usuario');
      }
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className={`mt-6 text-center text-3xl font-extrabold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Crear Cuenta
          </h2>
          <p className={`mt-2 text-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            O{' '}
            <Link
              href={`/${domain}/login`}
              className="font-medium text-primary hover:opacity-80"
            >
              inicia sesión si ya tienes cuenta
            </Link>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className={`rounded-md p-4 ${isDarkMode ? 'bg-red-900/30 border border-red-800' : 'bg-red-50'}`}>
              <div className={`text-sm ${isDarkMode ? 'text-red-400' : 'text-red-800'}`}>{error}</div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Nombre completo *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`mt-1 appearance-none block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm ${isDarkMode ? 'border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-400' : 'border-gray-300 text-gray-900 placeholder-gray-400'}`}
                placeholder="Juan Pérez"
              />
            </div>

            <div>
              <label htmlFor="email" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Email *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`mt-1 appearance-none block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm ${isDarkMode ? 'border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-400' : 'border-gray-300 text-gray-900 placeholder-gray-400'}`}
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Contraseña *
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`mt-1 appearance-none block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm ${isDarkMode ? 'border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-400' : 'border-gray-300 text-gray-900 placeholder-gray-400'}`}
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Confirmar contraseña *
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`mt-1 appearance-none block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm ${isDarkMode ? 'border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-400' : 'border-gray-300 text-gray-900 placeholder-gray-400'}`}
                placeholder="Repite tu contraseña"
              />
            </div>

            <div>
              <label htmlFor="phone" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Teléfono (opcional)
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`mt-1 appearance-none block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm ${isDarkMode ? 'border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-400' : 'border-gray-300 text-gray-900 placeholder-gray-400'}`}
                placeholder="+58 424 1234567"
              />
            </div>

            <div>
              <label htmlFor="whatsappNumber" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                WhatsApp (opcional)
              </label>
              <input
                id="whatsappNumber"
                name="whatsappNumber"
                type="tel"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className={`mt-1 appearance-none block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm ${isDarkMode ? 'border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-400' : 'border-gray-300 text-gray-900 placeholder-gray-400'}`}
                placeholder="+58 424 1234567"
              />
            </div>

            <div className="flex items-center">
              <input
                id="marketingOptIn"
                name="marketingOptIn"
                type="checkbox"
                checked={marketingOptIn}
                onChange={(e) => setMarketingOptIn(e.target.checked)}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor="marketingOptIn" className={`ml-2 block text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                Quiero recibir ofertas y promociones
              </label>
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
              {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
