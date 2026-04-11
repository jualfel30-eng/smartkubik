/**
 * Resolución de tenantId para el restaurant-storefront
 *
 * - En desarrollo local: usa NEXT_PUBLIC_TENANT_ID de .env.local
 * - En producción: lee el header `host` automáticamente y resuelve desde el API
 *
 * Uso en Server Components (App Router):
 *   import { resolveTenantId } from '@/lib/tenant';
 *   const tenantId = await resolveTenantId();  // sin argumento — lee el host solo
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

/**
 * Resuelve el tenantId. Nunca lanza — devuelve '' si no puede resolver.
 * Orden de prioridad:
 *   1. NEXT_PUBLIC_TENANT_ID (desarrollo local)
 *   2. Header `host` de la request actual → llama API restaurant/by-domain
 */
export async function resolveTenantId(): Promise<string> {
  // Prioridad 1: variable de entorno explícita (desarrollo local)
  if (process.env.NEXT_PUBLIC_TENANT_ID) {
    return process.env.NEXT_PUBLIC_TENANT_ID;
  }

  // Prioridad 2: leer header `host` de la request actual (solo en Server Components)
  try {
    const { headers } = await import('next/headers');
    const headersList = await headers();
    const host = headersList.get('host') || '';
    if (host) {
      const tenantId = await resolveTenantFromDomain(host);
      if (tenantId) return tenantId;
    }
  } catch {
    // headers() no disponible fuera del contexto de request (build time, etc.)
  }

  return '';
}

/**
 * Llama al endpoint `/public/restaurant/by-domain/:domain` para resolver el tenantId.
 * Este endpoint NO requiere isActive=true, soporta configuración inicial.
 * El dominio puede ser:
 *   - Subdominio:    "restaurante1.smartkubik.com"
 *   - Dominio propio: "menu.mirestaurante.com"
 */
async function resolveTenantFromDomain(host: string): Promise<string | null> {
  const cleanHost = host.split(':')[0]; // quitar puerto si lo hay

  // Candidatos a probar en orden:
  // 1. Host completo: "savagerestaurant.smartkubik.com"
  // 2. Solo subdomain: "savagerestaurant"  (como se guarda desde DomainSettings)
  const parts = cleanHost.split('.');
  const candidates: string[] = [cleanHost];
  if (parts.length >= 2) candidates.push(parts[0]); // subdomain slug

  for (const candidate of candidates) {
    try {
      const res = await fetch(
        `${API_URL}/public/restaurant/by-domain/${encodeURIComponent(candidate)}`,
        { next: { revalidate: 300 } },
      );
      if (res.ok) {
        const data = await res.json();
        if (data?.tenantId) return data.tenantId;
      }
    } catch {
      // continuar con el siguiente candidato
    }
  }

  return null;
}

/**
 * Extrae el subdominio de un host completo (helper para logging/debugging).
 * "restaurante1.smartkubik.com" → "restaurante1"
 * "localhost" → null
 */
export function extractSubdomain(host: string): string | null {
  const parts = host.split(':')[0].split('.');
  if (parts.length < 3) return null;
  return parts[0];
}
