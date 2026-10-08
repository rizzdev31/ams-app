import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { findUserById, verifyUserPassword, hashPassword, updatePassword, audit } from '@/lib/admin-users';
import { isDatabaseWritable, DB_READONLY_MESSAGE } from '@/lib/db';
import { parseJsonBody } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Sesi berakhir, masuk kembali.' }, { status: 401 });
  }
  if (!isDatabaseWritable()) {
    return NextResponse.json({ success: false, error: DB_READONLY_MESSAGE }, { status: 503 });
  }
  try {
    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;
    const { current_password, new_password } = parsedBody.body;
    if (typeof current_password !== 'string' || typeof new_password !== 'string') {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap.' }, { status: 400 });
    }
    if (new_password.length < 8) {
      return NextResponse.json({ success: false, error: 'Password baru minimal 8 karakter.' }, { status: 400 });
    }

    const user = await findUserById(session.sub);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User tidak ditemukan.' }, { status: 404 });
    }
    if (!(await verifyUserPassword(user, current_password))) {
      return NextResponse.json({ success: false, error: 'Password saat ini salah.' }, { status: 401 });
    }

    const password_hash = await hashPassword(new_password);
    await updatePassword(session.sub, password_hash);
    await audit(session, 'change_password', 'auth', { user_id: session.sub });

    return NextResponse.json({ success: true, data: null });
  } catch (e) {
    console.error('Change password error:', e);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan' }, { status: 500 });
  }
}
