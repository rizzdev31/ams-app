import { NextResponse } from 'next/server';
import { dbMatches, isDatabaseWritable, DB_READONLY_MESSAGE } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getOperatorSession } from '@/lib/operator-auth';
import { audit } from '@/lib/admin-users';
import { parseJsonBody } from '@/lib/http';

export const dynamic = 'force-dynamic';

/**
 * API update skor real-time DENGAN proteksi terenkripsi.
 * Hanya dapat dipanggil oleh:
 * 1. Panitia / Superadmin terautentikasi (admin_session)
 * 2. Petugas lapangan / Wasit dengan token terenkripsi (operator_session)
 */
export async function PUT(request: Request) {
  try {
    if (!isDatabaseWritable()) {
      return NextResponse.json({ success: false, error: DB_READONLY_MESSAGE }, { status: 503 });
    }

    // 1. Verifikasi Autentikasi (Admin atau Operator Lapangan)
    const adminSession = await getSession();
    const operatorSession = await getOperatorSession();

    if (!adminSession && !operatorSession) {
      return NextResponse.json(
        {
          success: false,
          error: 'Akses ditolak. Sesi panitia atau kode akses lapangan diperlukan.',
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ success: false, error: 'ID pertandingan tidak valid.' }, { status: 400 });
    }

    // 2. Ambil data pertandingan saat ini untuk validasi hak akses per lapangan
    const existingMatch = await dbMatches.getById(id);
    if (!existingMatch) {
      return NextResponse.json({ success: false, error: 'Pertandingan tidak ditemukan.' }, { status: 404 });
    }

    // 3. Batasi wewenang operator berdasarkan lapangan jika bukan admin/scorer
    if (!adminSession && operatorSession) {
      if (operatorSession.scope === 'field_1' && String(existingMatch.field) !== '1') {
        return NextResponse.json(
          {
            success: false,
            error: 'Anda hanya memiliki wewenang untuk mengupdate pertandingan di Lapangan 1.',
          },
          { status: 403 }
        );
      }
      if (operatorSession.scope === 'field_2' && String(existingMatch.field) !== '2') {
        return NextResponse.json(
          {
            success: false,
            error: 'Anda hanya memiliki wewenang untuk mengupdate pertandingan di Lapangan 2.',
          },
          { status: 403 }
        );
      }
    }

    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.body;

    const updateData: Record<string, number | string | null> = {};
    const allowedStatuses = ['scheduled', 'live', 'halftime', 'finished'];

    if (body?.score_a !== undefined) {
      const sa = Number(body.score_a);
      if (!Number.isInteger(sa) || sa < 0 || sa > 99) {
        return NextResponse.json({ success: false, error: 'Skor harus 0-99.' }, { status: 400 });
      }
      updateData.score_a = sa;
    }

    if (body?.score_b !== undefined) {
      const sb = Number(body.score_b);
      if (!Number.isInteger(sb) || sb < 0 || sb > 99) {
        return NextResponse.json({ success: false, error: 'Skor harus 0-99.' }, { status: 400 });
      }
      updateData.score_b = sb;
    }

    if (body?.status !== undefined) {
      if (!allowedStatuses.includes(body.status)) {
        return NextResponse.json({ success: false, error: 'Status tidak valid.' }, { status: 400 });
      }
      updateData.status = body.status;
    }

    if (body?.penalty_score_a !== undefined) {
      updateData.penalty_score_a = body.penalty_score_a === null ? null : Number(body.penalty_score_a);
    }
    if (body?.penalty_score_b !== undefined) {
      updateData.penalty_score_b = body.penalty_score_b === null ? null : Number(body.penalty_score_b);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: 'Tidak ada data untuk disimpan.' }, { status: 400 });
    }

    const data = await dbMatches.update(id, updateData as any);

    // Audit log pencatatan
    const actorName = adminSession
      ? `admin_${adminSession.username}`
      : operatorSession?.title || 'operator_lapangan';

    await audit(
      { username: actorName },
      'score_update',
      `match_${id}`,
      { changes: updateData }
    );

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Update skor error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan sistem.' }, { status: 500 });
  }
}