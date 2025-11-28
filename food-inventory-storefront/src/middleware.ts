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
    // Rewrite la ruta para que Next.js use el parámetro dinámico [domain]
    const url = request.nextUrl.clone();

    // Si estamos en la raíz, rewrite a /${domain}
    if (pathname === '/' || pathname === '') {
      url.pathname = `/${domain}`;
    } else if (!pathname.startsWith(`/${domain}`)) {
      // Si la ruta no empieza con /${domain}, agregarla
      url.pathname = `/${domain}${pathname}`;
    }

    // Agregar el domain como header para que esté disponible en los componentes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-domain', domain);

    return NextResponse.rewrite(url, {
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
