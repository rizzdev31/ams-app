import { NextResponse } from 'next/server';
import {
  dbMatches,
  isDatabaseWritable,
  DB_READONLY_MESSAGE,
} from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getOperatorSession } from '@/lib/operator-auth';
import { audit } from '@/lib/admin-users';
import { parseJsonBody } from '@/lib/http';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();
    const operator = await getOperatorSession();
    if (!session && !operator) {
      return NextResponse.json({ success: false, error: 'Sesi berakhir, masuk kembali.' }, { status: 401 });
    }
    const actor = session ? { sub: session.sub, username: session.username } : { username: operator?.title || 'operator_lapangan' };
    await audit(actor, 'update_score', 'matches');

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return NextResponse.json({ success: false, error: 'ID pertandingan tidak valid.' }, { status: 400 });
    }

    if (!isDatabaseWritable()) {
      return NextResponse.json({ success: false, error: DB_READONLY_MESSAGE }, { status: 503 });
    }

    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.body;
    const updateData: Record<string, number | string | null> = {};

    if (body?.score_a !== undefined) {
      if (!Number.isInteger(body.score_a) || body.score_a < 0 || body.score_a > 99) {
        return NextResponse.json({ success: false, error: 'Skor harus bilangan bulat 0–99.' }, { status: 400 });
      }
      updateData.score_a = body.score_a;
    }
    if (body?.score_b !== undefined) {
      if (!Number.isInteger(body.score_b) || body.score_b < 0 || body.score_b > 99) {
        return NextResponse.json({ success: false, error: 'Skor harus bilangan bulat 0–99.' }, { status: 400 });
      }
      updateData.score_b = body.score_b;
    }
    if (body?.status !== undefined) {
      const allowed = ['scheduled', 'live', 'halftime', 'finished'];
      if (!allowed.includes(body.status)) {
        return NextResponse.json({ success: false, error: 'Status tidak valid.' }, { status: 400 });
      }
      updateData.status = body.status;
    }

    // Dukungan Adu Penalti
    if (body?.penalty_score_a !== undefined) {
      if (body.penalty_score_a === null) {
        updateData.penalty_score_a = null;
      } else if (!Number.isInteger(body.penalty_score_a) || body.penalty_score_a < 0 || body.penalty_score_a > 99) {
        return NextResponse.json({ success: false, error: 'Skor penalti A harus bilangan bulat 0–99 atau null.' }, { status: 400 });
      } else {
        updateData.penalty_score_a = body.penalty_score_a;
      }
    }

    if (body?.penalty_score_b !== undefined) {
      if (body.penalty_score_b === null) {
        updateData.penalty_score_b = null;
      } else if (!Number.isInteger(body.penalty_score_b) || body.penalty_score_b < 0 || body.penalty_score_b > 99) {
        return NextResponse.json({ success: false, error: 'Skor penalti B harus bilangan bulat 0–99 atau null.' }, { status: 400 });
      } else {
        updateData.penalty_score_b = body.penalty_score_b;
      }
    }

    // Dukungan Penetapan Pemenang Eksplisit (WO / Keputusan Panitia)
    if (body?.winner_team_id !== undefined) {
      if (body.winner_team_id === null || body.winner_team_id === '') {
        updateData.winner_team_id = null;
      } else if (typeof body.winner_team_id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.winner_team_id)) {
        updateData.winner_team_id = body.winner_team_id;
      } else {
        return NextResponse.json({ success: false, error: 'ID tim pemenang tidak valid.' }, { status: 400 });
      }
    }

    // Catatan Pertandingan
    if (body?.notes !== undefined) {
      updateData.notes = typeof body.notes === 'string' ? body.notes.trim() || null : null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: 'Tidak ada skor, status, atau catatan untuk disimpan.' }, { status: 400 });
    }

    const data = await dbMatches.update(id, updateData as any);
    if (!data) {
      return NextResponse.json({ success: false, error: 'Pertandingan tidak ditemukan.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('Update match score error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message || 'Terjadi kesalahan' }, { status: 500 });
  }
}
