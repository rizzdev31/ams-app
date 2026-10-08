import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  createOperatorToken,
  verifyPasscode,
  type OperatorScope,
} from '@/lib/operator-auth';
import { OPERATOR_COOKIE_NAME, OPERATOR_SESSION_DURATION } from '@/lib/session';
import { audit } from '@/lib/admin-users';
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
  if (rec.count >= 8) return false;
  rec.count += 1;
  return true;
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!touchRateLimit(ip, Date.now())) {
      return NextResponse.json(
        {
          success: false,
          error: 'Terlalu banyak percobaan kode sandi. Harap tunggu 1 menit.',
        },
        { status: 429 }
      );
    }

    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;

    const { target, passcode } = parsedBody.body;
    if (!target || !passcode || typeof passcode !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Target lapangan dan kode akses wajib diisi.' },
        { status: 400 }
      );
    }

    const validTargets = ['field_1', 'field_2', 'scorer'] as const;
    const scope = target as (typeof validTargets)[number];

    if (!validTargets.includes(scope)) {
      return NextResponse.json(
        { success: false, error: 'Target konsol tidak valid.' },
        { status: 400 }
      );
    }

    const isValid = await verifyPasscode(scope, passcode);
    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Kode akses salah. Silakan hubungi superadmin atau panitia turnamen.',
        },
        { status: 401 }
      );
    }

    // Buat token JWT terenkripsi
    const token = await createOperatorToken(scope as OperatorScope);
    const cookieStore = await cookies();

    cookieStore.set(OPERATOR_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: OPERATOR_SESSION_DURATION,
    });

    const targetLabel =
      scope === 'field_1'
        ? 'Lapangan 1'
        : scope === 'field_2'
        ? 'Lapangan 2'
        : 'Papan Update Skor';

    await audit(
      { username: `operator_${scope}` },
      'operator_gate_login',
      targetLabel,
      { ip }
    );

    return NextResponse.json({
      success: true,
      data: {
        scope,
        label: targetLabel,
      },
    });
  } catch (error) {
    console.error('Operator passcode error:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan sistem.' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(OPERATOR_COOKIE_NAME);
    return NextResponse.json({ success: true, message: 'Sesi operator berhasil diakhiri.' });
  } catch {
    return NextResponse.json({ success: false, error: 'Gagal keluar sesi.' }, { status: 500 });
  }
}
