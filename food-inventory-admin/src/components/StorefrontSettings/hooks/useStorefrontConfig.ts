import { useEffect, useState } from 'react';
import { fetchApi } from '../../../lib/api';

export interface StorefrontConfig {
  _id: string;
  tenantId: string;
  domain: string;
  isActive: boolean;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    logo?: string;
    favicon?: string;
  };
  templateType: string;
  customCSS?: string;
  seo: {
    title: string;
    description: string;
    keywords: string[];
  };
  socialMedia: {
    facebook?: string;
    instagram?: string;
    whatsapp?: string;
    twitter?: string;
    linkedin?: string;
  };
  contactInfo: {
    email: string;
    phone: string;
    address?: {
      street: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
    };
  };
}

const extractPayload = (response: any) => response?.data ?? response ?? null;

const isNotFoundError = (error: any) => {
  const message = error?.message?.toLowerCase?.() ?? '';
  return (
    message.includes('no se encontró') ||
    message.includes('not found') ||
    message.includes('404') ||
    message.includes('cannot get')
  );
};

export function useStorefrontConfig() {
  const [config, setConfig] = useState<StorefrontConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await fetchApi('/storefront');
      setConfig(extractPayload(response));
      setError(null);
    } catch (err: any) {
      if (isNotFoundError(err)) {
        setConfig(null);
        setError(null);
      } else {
        setError(err?.message ?? 'Error al cargar configuración');
      }
    } finally {
      setLoading(false);
    }
  };

  const createConfig = async (data: Partial<StorefrontConfig>) => {
    try {
      setSaving(true);
      const response = await fetchApi('/storefront', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      const payload = extractPayload(response);
      setConfig(payload);
      setError(null);
      return { success: true, data: payload };
    } catch (err: any) {
      const message = err?.message ?? 'Error al crear configuración';
      setError(message);
      return { success: false, error: message };
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = async (data: Partial<StorefrontConfig>) => {
    try {
      setSaving(true);
      const response = await fetchApi('/storefront', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      const payload = extractPayload(response);
      setConfig(payload);
      setError(null);
      return { success: true, data: payload };
    } catch (err: any) {
      const message = err?.message ?? 'Error al actualizar configuración';
      setError(message);
      return { success: false, error: message };
    } finally {
      setSaving(false);
    }
  };

  const replaceConfig = async (data: Partial<StorefrontConfig>) => {
    try {
      setSaving(true);
      const response = await fetchApi('/storefront', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      const payload = extractPayload(response);
      setConfig(payload);
      setError(null);
      return { success: true, data: payload };
    } catch (err: any) {
      const message = err?.message ?? 'Error al reemplazar configuración';
      setError(message);
      return { success: false, error: message };
    } finally {
      setSaving(false);
    }
  };

  const deleteConfig = async () => {
    try {
      setSaving(true);
      await fetchApi('/storefront', { method: 'DELETE' });
      setConfig(null);
      setError(null);
      return { success: true };
    } catch (err: any) {
      const message = err?.message ?? 'Error al eliminar configuración';
      setError(message);
      return { success: false, error: message };
    } finally {
      setSaving(false);
    }
  };

  const resetConfig = async () => {
    try {
      setSaving(true);
      const response = await fetchApi('/storefront/reset', { method: 'POST' });
      const payload = extractPayload(response);
      setConfig(payload);
      setError(null);
      return { success: true, data: payload };
    } catch (err: any) {
      const message = err?.message ?? 'Error al resetear configuración';
      setError(message);
      return { success: false, error: message };
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    void fetchConfig();
  }, []);

  return {
    config,
    loading,
    error,
    saving,
    fetchConfig,
    createConfig,
    updateConfig,
    replaceConfig,
    deleteConfig,
    resetConfig,
  };
}
