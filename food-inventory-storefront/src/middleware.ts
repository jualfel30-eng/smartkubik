import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Evitar loops de redirección - no procesar rutas especiales
  if (pathname.startsWith('/_next') ||
      pathname.startsWith('/api') ||
      pathname.includes('/404') ||
      pathname.includes('/error') ||
      pathname.includes('favicon.ico')) {
    return NextResponse.next();
  }

  let domain: string | null = null;
  const hostname = request.headers.get('host') || '';

  // MODO 1: Detectar subdominio (producción)
  // Ejemplo: cliente.smartkubik.com
  const subdomainMatch = hostname.match(/^([^.]+)\.smartkubik\.com$/);
  if (subdomainMatch && !['www', 'admin', 'api'].includes(subdomainMatch[1])) {
    domain = subdomainMatch[1];
  }

  // MODO 2: Detectar dominio en el path (desarrollo local)
  // Ejemplo: localhost:3001/cliente
  if (!domain) {
    const pathParts = pathname.split('/').filter(Boolean);
    if (pathParts.length > 0) {
      domain = pathParts[0];
    }
  }

  // Si no hay dominio, dejar pasar
  if (!domain) {
    return NextResponse.next();
  }

  try {
    // Obtener URL del backend desde env o usar localhost
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
    const apiUrl = backendUrl.replace('/api/v1', ''); // Remove /api/v1 if present

    // Llamar al backend para validar el tenant
    const response = await fetch(`${apiUrl}/api/v1/public/storefront/by-domain/${domain}`);

    if (!response.ok) {
      // Si el storefront no existe, continuar sin headers adicionales
      return NextResponse.next();
    }

    const result = await response.json();
    const config = result.data;

    // Agregar datos del tenant a los headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-tenant-id', config.tenantId._id || config.tenantId);
    requestHeaders.set('x-domain', config.domain);
    requestHeaders.set('x-template', config.templateType);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    // En caso de error, continuar sin headers adicionales
    console.error('Middleware error:', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
