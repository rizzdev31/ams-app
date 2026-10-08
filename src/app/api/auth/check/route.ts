import { NextResponse } from 'next/server';
import { getSession, createSession, COOKIE_NAME, SESSION_DURATION } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const session = await getSession();
    const cookieStore = await cookies();
    if (!session) {
      // Hapus cookie sesi usang dari browser jika tidak valid lagi di database
      cookieStore.delete(COOKIE_NAME);
      return NextResponse.json({ success: false, authenticated: false }, { status: 401 });
    }
    // Sliding session: setiap check aktif memperpanjang cookie sebesar SESSION_DURATION.
    const token = await createSession({ sub: session.sub, username: session.username, role: session.role });
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_DURATION,
    });
    return NextResponse.json({ success: true, authenticated: true, data: { username: session.username, role: session.role } });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ success: false, authenticated: false, error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
