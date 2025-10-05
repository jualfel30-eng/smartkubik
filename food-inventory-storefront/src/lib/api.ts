const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface StorefrontConfig {
  tenantId: string;
  template: string;
  theme: {
    colors: {
      [key: string]: string;
    };
    fonts?: {
      primary?: string;
    };
  };
  name: string;
  domain: string;
  logo?: string;
  description?: string;
}

/**
 * Obtiene la configuración del storefront para un dominio específico
 * @param domain - El dominio del tenant
 * @returns La configuración del storefront
 */
export async function getStorefrontConfig(domain: string): Promise<StorefrontConfig> {
  const response = await fetch(
    `${API_URL}/api/v1/storefront/preview/${domain}`,
    { next: { revalidate: 60 } }
  );

  if (!response.ok) {
    throw new Error('Storefront not found');
  }

  return response.json();
}

/**
 * Obtiene la lista de dominios activos
 * @returns Array de dominios activos
 */
export async function getActiveDomains(): Promise<string[]> {
  const response = await fetch(
    `${API_URL}/api/v1/storefront/active-domains`,
    { next: { revalidate: 60 } }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch active domains');
  }

  return response.json();
}
