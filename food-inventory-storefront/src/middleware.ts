import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const domain = hostname.split(':')[0]; // Remover puerto

  // Llamar al backend para validar el tenant
  const response = await fetch(`http://localhost:3000/api/v1/storefront/preview/${domain}`);

  if (!response.ok) {
    return NextResponse.redirect(new URL('/404', request.url));
  }

  const config = await response.json();

  // Agregar datos del tenant a los headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-id', config.tenantId);
  requestHeaders.set('x-template', config.template);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
