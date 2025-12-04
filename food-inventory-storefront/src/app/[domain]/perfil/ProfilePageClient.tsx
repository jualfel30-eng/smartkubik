'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getStorefrontConfig } from '@/lib/api';

interface ProfilePageClientProps {
  domain: string;
}

export function ProfilePageClient({ domain }: ProfilePageClientProps) {
  const router = useRouter();
  const { customer, isAuthenticated, isLoading, logout, updateProfile, changePassword, refreshProfile } = useAuth();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [whatsappNotifications, setWhatsappNotifications] = useState(false);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // UI states
  const [isEditMode, setIsEditMode] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Cargar tenantId
  useEffect(() => {
    getStorefrontConfig(domain).then((config) => {
      const id = typeof config.tenantId === 'string'
        ? config.tenantId
        : config.tenantId._id;
      setTenantId(id);
    }).catch((err) => {
      console.error('Error loading tenant config:', err);
    });
  }, [domain]);

  // Cargar perfil del usuario
  useEffect(() => {
    if (tenantId && isAuthenticated && !customer) {
      refreshProfile(tenantId).catch(console.error);
    }
  }, [tenantId, isAuthenticated, customer, refreshProfile]);

  // Inicializar form con datos del usuario
  useEffect(() => {
    if (customer) {
      setName(customer.name || '');
      setPhone(customer.phone || '');
      setWhatsappNumber(customer.whatsappNumber || '');
      setEmailNotifications(customer.preferences?.notifications?.email || false);
      setWhatsappNotifications(customer.preferences?.notifications?.whatsapp || false);
    }
  }, [customer]);

  // Redirigir si no está autenticado
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/${domain}/login`);
    }
  }, [isLoading, isAuthenticated, router, domain]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      await updateProfile(
        {
          name,
          phone: phone || undefined,
          whatsappNumber: whatsappNumber || undefined,
          preferences: {
            notifications: {
              email: emailNotifications,
              whatsapp: whatsappNotifications,
            },
          },
        },
        tenantId
      );
      setSuccess('Perfil actualizado exitosamente');
      setIsEditMode(false);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al actualizar perfil');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    setError('');
    setSuccess('');

    if (newPassword !== confirmNewPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsSubmitting(true);

    try {
      await changePassword(
        {
          currentPassword,
          newPassword,
        },
        tenantId
      );
      setSuccess('Contraseña cambiada exitosamente');
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al cambiar contraseña');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push(`/${domain}`);
  };

  if (isLoading || !customer) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Cargando perfil...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen py-12 px-4 sm:px-6 lg:px-8 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-3xl mx-auto">
        <div className={`shadow rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          {/* Header */}
          <div className={`px-6 py-5 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Mi Perfil</h1>
                <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{customer.email}</p>
              </div>
              <Link
                href={`/${domain}`}
                className={`text-sm ${isDarkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Volver a la tienda
              </Link>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className={`mx-6 mt-6 rounded-md p-4 ${isDarkMode ? 'bg-red-900/30 border border-red-800' : 'bg-red-50'}`}>
              <div className={`text-sm ${isDarkMode ? 'text-red-400' : 'text-red-800'}`}>{error}</div>
            </div>
          )}
          {success && (
            <div className={`mx-6 mt-6 rounded-md p-4 ${isDarkMode ? 'bg-green-900/30 border border-green-800' : 'bg-green-50'}`}>
              <div className={`text-sm ${isDarkMode ? 'text-green-400' : 'text-green-800'}`}>{success}</div>
            </div>
          )}

          {/* Profile Info */}
          <div className="px-6 py-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Información Personal</h2>
              {!isEditMode && (
                <button
                  onClick={() => setIsEditMode(true)}
                  className="text-sm text-primary hover:opacity-80"
                >
                  Editar
                </button>
              )}
            </div>

            {!isEditMode ? (
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Nombre</label>
                  <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{customer.name}</p>
                </div>
                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Teléfono</label>
                  <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{customer.phone || 'No especificado'}</p>
                </div>
                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>WhatsApp</label>
                  <p className={`mt-1 text-sm ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{customer.whatsappNumber || 'No especificado'}</p>
                </div>
                <div>
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Notificaciones</label>
                  <div className="mt-2 space-y-2">
                    <p className={`text-sm ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                      Email: {customer.preferences?.notifications?.email ? 'Activadas' : 'Desactivadas'}
                    </p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                      WhatsApp: {customer.preferences?.notifications?.whatsapp ? 'Activadas' : 'Desactivadas'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label htmlFor="name" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Nombre *
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm ${isDarkMode ? 'border-gray-700 bg-gray-700 text-gray-100' : 'border-gray-300 text-gray-900'}`}
                  />
                </div>
                <div>
                  <label htmlFor="phone" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Teléfono
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm ${isDarkMode ? 'border-gray-700 bg-gray-700 text-gray-100' : 'border-gray-300 text-gray-900'}`}
                  />
                </div>
                <div>
                  <label htmlFor="whatsappNumber" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    WhatsApp
                  </label>
                  <input
                    id="whatsappNumber"
                    type="tel"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm ${isDarkMode ? 'border-gray-700 bg-gray-700 text-gray-100' : 'border-gray-300 text-gray-900'}`}
                  />
                </div>
                <div className="space-y-2">
                  <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Preferencias de notificaciones
                  </label>
                  <div className="flex items-center">
                    <input
                      id="emailNotifications"
                      type="checkbox"
                      checked={emailNotifications}
                      onChange={(e) => setEmailNotifications(e.target.checked)}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label htmlFor="emailNotifications" className={`ml-2 block text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                      Recibir notificaciones por email
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="whatsappNotifications"
                      type="checkbox"
                      checked={whatsappNotifications}
                      onChange={(e) => setWhatsappNotifications(e.target.checked)}
                      className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                    />
                    <label htmlFor="whatsappNotifications" className={`ml-2 block text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                      Recibir notificaciones por WhatsApp
                    </label>
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-primary text-white py-2 px-4 rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                  >
                    {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditMode(false)}
                    className={`flex-1 py-2 px-4 rounded-md focus:outline-none ${isDarkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Change Password Section */}
          <div className={`px-6 py-6 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Cambiar Contraseña</h2>
              {!isChangingPassword && (
                <button
                  onClick={() => setIsChangingPassword(true)}
                  className="text-sm text-primary hover:opacity-80"
                >
                  Cambiar
                </button>
              )}
            </div>

            {isChangingPassword && (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Contraseña Actual *
                  </label>
                  <input
                    id="currentPassword"
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm ${isDarkMode ? 'border-gray-700 bg-gray-700 text-gray-100' : 'border-gray-300 text-gray-900'}`}
                  />
                </div>
                <div>
                  <label htmlFor="newPassword" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Nueva Contraseña *
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm ${isDarkMode ? 'border-gray-700 bg-gray-700 text-gray-100 placeholder-gray-400' : 'border-gray-300 text-gray-900'}`}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <div>
                  <label htmlFor="confirmNewPassword" className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Confirmar Nueva Contraseña *
                  </label>
                  <input
                    id="confirmNewPassword"
                    type="password"
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm ${isDarkMode ? 'border-gray-700 bg-gray-700 text-gray-100' : 'border-gray-300 text-gray-900'}`}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-primary text-white py-2 px-4 rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                  >
                    {isSubmitting ? 'Cambiando...' : 'Cambiar Contraseña'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangingPassword(false);
                      setCurrentPassword('');
                      setNewPassword('');
                      setConfirmNewPassword('');
                      setError('');
                    }}
                    className={`flex-1 py-2 px-4 rounded-md focus:outline-none ${isDarkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Account Stats */}
          {(customer.loyaltyPoints || customer.totalSpent || customer.orderCount) && (
            <div className={`px-6 py-6 border-t ${isDarkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
              <h2 className={`text-lg font-medium mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Estadísticas de Cuenta</h2>
              <div className="grid grid-cols-3 gap-4">
                {customer.orderCount !== undefined && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{customer.orderCount}</p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Órdenes</p>
                  </div>
                )}
                {customer.totalSpent !== undefined && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">${customer.totalSpent.toFixed(2)}</p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Gastado</p>
                  </div>
                )}
                {customer.loyaltyPoints !== undefined && (
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{customer.loyaltyPoints}</p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Puntos</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Logout */}
          <div className={`px-6 py-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <button
              onClick={handleLogout}
              className={`w-full text-center py-2 px-4 border rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${isDarkMode ? 'border-red-800 text-red-400 hover:bg-red-900/30' : 'border-red-300 text-red-600 hover:bg-red-50'}`}
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
