import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSession, COOKIE_NAME, SESSION_DURATION } from '@/lib/auth';
import {
  ensureBootstrapSuperadmin,
  findUserByUsername,
  verifyUserPassword,
  audit,
} from '@/lib/admin-users';
import { isDatabaseWritable, DB_READONLY_MESSAGE } from '@/lib/db';
import { parseJsonBody } from '@/lib/http';

export const dynamic = 'force-dynamic';

const rateLimit = new Map<string, { count: number; timestamp: number }>();

function touchRateLimit(ip: string, now: number): boolean {
  if (rateLimit.size > 500) {
    for (const [key, rec] of rateLimit) {
      if (now - rec.timestamp >= 60000) rateLimit.delete(key);
    }
  }
  const rec = rateLimit.get(ip);
  if (!rec || now - rec.timestamp >= 60000) {
    rateLimit.set(ip, { count: 1, timestamp: now });
    return true;
  }
  if (rec.count >= 5) return false;
  rec.count += 1;
  return true;
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!touchRateLimit(ip, Date.now())) {
      return NextResponse.json({ success: false, error: 'Terlalu banyak percobaan login. Silakan coba lagi nanti.' }, { status: 429 });
    }

    if (!isDatabaseWritable()) {
      return NextResponse.json({ success: false, error: DB_READONLY_MESSAGE }, { status: 503 });
    }

    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;
    const { username, password } = parsedBody.body;
    if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
      return NextResponse.json({ success: false, error: 'Username dan password wajib diisi.' }, { status: 400 });
    }

    await ensureBootstrapSuperadmin();

    const user = await findUserByUsername(username.trim());
    if (!user || !user.active || !(await verifyUserPassword(user, password))) {
      return NextResponse.json({ success: false, error: 'Username atau password salah' }, { status: 401 });
    }

    const token = await createSession({ sub: user.id, username: user.username, role: user.role });
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_DURATION,
    });

    await audit({ id: user.id, username: user.username }, 'login', 'auth', { ip });

    return NextResponse.json({ success: true, data: { username: user.username, role: user.role } });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
