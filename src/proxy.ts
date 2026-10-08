import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import {
  COOKIE_NAME,
  OPERATOR_COOKIE_NAME,
  OPERATOR_SESSION_DURATION,
  sessionSecretBytes,
} from './lib/session';

const SESSION_SECRET = sessionSecretBytes();

/** Samakan '/panitia/masuk' dan '/panitia/masuk/' supaya tidak terjebak guard. */
function normalise(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

export async function proxy(request: NextRequest) {
  const pathname = normalise(request.nextUrl.pathname);
  const searchParams = request.nextUrl.searchParams;
  const authQueryToken = searchParams.get('auth');

  // 1. TANGANI LINK AKSES CEPAT TERENKRIPSI (?auth=<token>)
  if (authQueryToken) {
    try {
      const { payload } = await jwtVerify(authQueryToken, SESSION_SECRET);
      if (payload?.scope) {
        // Token valid! Bersihkan param 'auth' dari URL agar clean
        const cleanUrl = new URL(request.url);
        cleanUrl.searchParams.delete('auth');
        const res = NextResponse.redirect(cleanUrl);
        res.cookies.set(OPERATOR_COOKIE_NAME, authQueryToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: OPERATOR_SESSION_DURATION,
        });
        return res;
      }
    } catch {
      // Token tidak valid, lanjutkan evaluasi guard normal
    }
  }

  // 2. PROTEKSI PORTAL PANITIA / SUPERADMIN (/panitia/*)
  if (pathname.startsWith('/panitia') && pathname !== '/panitia/masuk') {
    const sessionCookie = request.cookies.get(COOKIE_NAME)?.value;

    if (!sessionCookie) {
      const loginUrl = new URL('/panitia/masuk', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      await jwtVerify(sessionCookie, SESSION_SECRET);
    } catch {
      const loginUrl = new URL('/panitia/masuk', request.url);
      loginUrl.searchParams.set('from', pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete(COOKIE_NAME);
      return response;
    }
    return NextResponse.next();
  }

  // Helper verifikasi admin session
  const adminCookie = request.cookies.get(COOKIE_NAME)?.value;
  let isAdmin = false;
  if (adminCookie) {
    try {
      await jwtVerify(adminCookie, SESSION_SECRET);
      isAdmin = true;
    } catch {
      isAdmin = false;
    }
  }

  // Helper verifikasi operator session
  const operatorCookie = request.cookies.get(OPERATOR_COOKIE_NAME)?.value;
  let operatorScope: string | null = null;
  if (operatorCookie) {
    try {
      const { payload } = await jwtVerify(operatorCookie, SESSION_SECRET);
      operatorScope = (payload.scope as string) || null;
    } catch {
      operatorScope = null;
    }
  }

  // 3. PROTEKSI PAPAN UPDATE SKOR (/updateskor)
  if (pathname === '/updateskor' || pathname.startsWith('/updateskor/')) {
    if (pathname === '/updateskor/masuk') {
      return NextResponse.next();
    }

    // Jika admin/superadmin login, izinkan langsung
    if (isAdmin) {
      return NextResponse.next();
    }

    // Jika operator punya scope 'scorer' atau 'all', izinkan
    if (operatorScope === 'scorer' || operatorScope === 'all') {
      return NextResponse.next();
    }

    // Jika tidak punya akses, redirect ke gerbang sandi
    const gateUrl = new URL('/updateskor/masuk', request.url);
    const response = NextResponse.redirect(gateUrl);
    if (operatorCookie) response.cookies.delete(OPERATOR_COOKIE_NAME);
    return response;
  }

  // 4. PROTEKSI KONSOL LAPANGAN (/lapangan, /lapangan/1, /lapangan/2)
  if (pathname === '/lapangan' || pathname.startsWith('/lapangan/')) {
    if (pathname === '/lapangan/masuk') {
      return NextResponse.next();
    }

    // Jika admin/superadmin login, izinkan langsung ke semua lapangan
    if (isAdmin) {
      return NextResponse.next();
    }

    // Cek kecocokan lapangan
    if (pathname === '/lapangan/1') {
      if (operatorScope === 'field_1' || operatorScope === 'all' || operatorScope === 'scorer') {
        return NextResponse.next();
      }
    } else if (pathname === '/lapangan/2') {
      if (operatorScope === 'field_2' || operatorScope === 'all' || operatorScope === 'scorer') {
        return NextResponse.next();
      }
    } else if (pathname === '/lapangan') {
      if (operatorScope) {
        return NextResponse.next();
      }
    }

    // Jika tidak punya izin, redirect ke gerbang masuk lapangan
    const gateUrl = new URL('/lapangan/masuk', request.url);
    if (pathname === '/lapangan/1') gateUrl.searchParams.set('target', 'field_1');
    else if (pathname === '/lapangan/2') gateUrl.searchParams.set('target', 'field_2');
    gateUrl.searchParams.set('from', pathname);

    const response = NextResponse.redirect(gateUrl);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/panitia/:path*',
    '/lapangan',
    '/lapangan/:path*',
    '/updateskor',
    '/updateskor/:path*',
  ],
};
