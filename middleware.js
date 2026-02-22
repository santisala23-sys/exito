import { NextResponse } from 'next/server';

export function middleware(request) {
  // Buscamos si el usuario tiene la cookie del PIN
  const hasToken = request.cookies.has('exito_auth');
  const isLoginPage = request.nextUrl.pathname === '/login';

  // Si no tiene el token y no está en la página de login, ¡afuera!
  if (!hasToken && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Si ya tiene el token y quiere ir al login por error, lo mandamos al Home
  if (hasToken && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

// Le decimos al patovica qué rutas proteger (todas menos las internas de Next.js)
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};