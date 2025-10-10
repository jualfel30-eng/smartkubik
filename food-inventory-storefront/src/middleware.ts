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

  // Extraer el dominio del path (formato: /[domain]/...)
  const pathParts = pathname.split('/').filter(Boolean);
  const domain = pathParts[0];

  // Si no hay dominio en el path, dejar pasar
  if (!domain) {
    return NextResponse.next();
  }

  try {
    // Llamar al backend para validar el tenant
    const response = await fetch(`http://localhost:3000/api/v1/public/storefront/by-domain/${domain}`);

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
