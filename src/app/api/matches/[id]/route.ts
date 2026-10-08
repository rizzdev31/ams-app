import { NextResponse } from 'next/server';
import {
  dbMatches,
  dbTeams,
  isDatabaseConfigured,
  isDatabaseWritable,
  DB_MISCONFIGURED_MESSAGE,
  DB_READONLY_MESSAGE,
} from '@/lib/db';
import { getSession } from '@/lib/auth';
import { audit } from '@/lib/admin-users';
import { parseJsonBody } from '@/lib/http';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;
const STATUSES = ['scheduled', 'live', 'halftime', 'finished'] as const;
const STAGES = ['grup', 'perempat_final', 'semifinal', 'juara_3', 'final'] as const;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { success: false, error: DB_MISCONFIGURED_MESSAGE },
      { status: 503 }
    );
  }

  try {
    const { id } = await params;

    if (!UUID_RE.test(id)) {
      return NextResponse.json({ success: false, error: 'ID pertandingan tidak valid.' }, { status: 400 });
    }

    const data = await dbMatches.getById(id);
    if (!data) return NextResponse.json({ success: false, error: 'Pertandingan tidak ditemukan.' }, { status: 404 });
    
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('Fetch match error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message || 'Terjadi kesalahan' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Sesi berakhir, masuk kembali.' }, { status: 401 });
    }
    await audit(session, 'update_match', 'matches');

    if (!UUID_RE.test(id)) {
      return NextResponse.json({ success: false, error: 'ID pertandingan tidak valid.' }, { status: 400 });
    }

    if (!isDatabaseWritable()) {
      return NextResponse.json({ success: false, error: DB_READONLY_MESSAGE }, { status: 503 });
    }

    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.body;
    const update: Record<string, string | number | null> = {};

    if (body?.team_a_id !== undefined) {
      if (typeof body.team_a_id !== 'string' || !UUID_RE.test(body.team_a_id)) {
        return NextResponse.json({ success: false, error: 'ID tim tidak valid.' }, { status: 400 });
      }
      update.team_a_id = body.team_a_id;
    }
    if (body?.team_b_id !== undefined) {
      if (typeof body.team_b_id !== 'string' || !UUID_RE.test(body.team_b_id)) {
        return NextResponse.json({ success: false, error: 'ID tim tidak valid.' }, { status: 400 });
      }
      update.team_b_id = body.team_b_id;
    }
    if (update.team_a_id && update.team_b_id && update.team_a_id === update.team_b_id) {
      return NextResponse.json({ success: false, error: 'Tim A dan Tim B tidak boleh sama' }, { status: 400 });
    }
    if (body?.match_date !== undefined) {
      const v = typeof body.match_date === 'string' ? body.match_date.trim() : '';
      if (!ISO_DATE.test(v)) {
        return NextResponse.json({ success: false, error: 'Format tanggal tidak valid. Gunakan YYYY-MM-DD.' }, { status: 400 });
      }
      update.match_date = v;
    }
    if (body?.kickoff_time !== undefined) {
      const v = typeof body.kickoff_time === 'string' ? body.kickoff_time.trim() : '';
      if (!TIME_RE.test(v)) {
        return NextResponse.json({ success: false, error: 'Format jam tidak valid. Gunakan HH:MM.' }, { status: 400 });
      }
      update.kickoff_time = v;
    }
    if (body?.field !== undefined) {
      const v = typeof body.field === 'string' ? body.field.trim() : '';
      if (!v) return NextResponse.json({ success: false, error: 'Lapangan wajib diisi.' }, { status: 400 });
      update.field = v;
    }
    if (body?.status !== undefined) {
      if (!STATUSES.includes(body.status)) {
        return NextResponse.json({ success: false, error: 'Status tidak valid.' }, { status: 400 });
      }
      const current = await dbMatches.getById(id);
      if (current) {
        const allowed: Record<string, string[]> = {
          scheduled: ['live'],
          live: ['halftime', 'finished'],
          halftime: ['live', 'finished'],
          finished: ['live', 'halftime', 'scheduled'], // REVISION: Mengizinkan buka kembali match selesai jika ada koreksi/protes
        };
        if (!(allowed[current.status] ?? []).includes(body.status) && current.status !== body.status) {
          return NextResponse.json(
            { success: false, error: `Tidak bisa mengubah status dari "${current.status}" ke "${body.status}".` },
            { status: 400 }
          );
        }
      }
      update.status = body.status;
    }
    if (body?.stage !== undefined) {
      if (!STAGES.includes(body.stage)) {
        return NextResponse.json({ success: false, error: 'Fase tidak valid.' }, { status: 400 });
      }
      update.stage = body.stage;
    }
    if (body?.group_name !== undefined) {
      update.group_name =
        typeof body.group_name === 'string' && body.group_name.trim() ? body.group_name.trim() : null;
    }
    if (body?.category !== undefined) {
      const v = typeof body.category === 'string' ? body.category.trim().toUpperCase() : '';
      if (v !== 'U10' && v !== 'U12') {
        return NextResponse.json({ success: false, error: 'Kategori harus U10 atau U12.' }, { status: 400 });
      }
      update.category = v;
    }
    if (body?.score_a !== undefined || body?.score_b !== undefined) {
      for (const k of ['score_a', 'score_b'] as const) {
        if (body?.[k] !== undefined) {
          if (!Number.isInteger(body[k]) || body[k] < 0 || body[k] > 99) {
            return NextResponse.json({ success: false, error: 'Skor harus bilangan bulat 0–99.' }, { status: 400 });
          }
          update[k] = body[k];
        }
      }
    }
    if (body?.penalty_score_a !== undefined) {
      if (body.penalty_score_a === null) {
        update.penalty_score_a = null;
      } else if (!Number.isInteger(body.penalty_score_a) || body.penalty_score_a < 0 || body.penalty_score_a > 99) {
        return NextResponse.json({ success: false, error: 'Skor penalti A harus 0–99 atau null.' }, { status: 400 });
      } else {
        update.penalty_score_a = body.penalty_score_a;
      }
    }
    if (body?.penalty_score_b !== undefined) {
      if (body.penalty_score_b === null) {
        update.penalty_score_b = null;
      } else if (!Number.isInteger(body.penalty_score_b) || body.penalty_score_b < 0 || body.penalty_score_b > 99) {
        return NextResponse.json({ success: false, error: 'Skor penalti B harus 0–99 atau null.' }, { status: 400 });
      } else {
        update.penalty_score_b = body.penalty_score_b;
      }
    }
    if (body?.winner_team_id !== undefined) {
      if (body.winner_team_id === null || body.winner_team_id === '') {
        update.winner_team_id = null;
      } else if (typeof body.winner_team_id === 'string' && UUID_RE.test(body.winner_team_id)) {
        update.winner_team_id = body.winner_team_id;
      } else {
        return NextResponse.json({ success: false, error: 'ID tim pemenang tidak valid.' }, { status: 400 });
      }
    }
    if (body?.notes !== undefined) {
      update.notes = typeof body.notes === 'string' ? body.notes.trim() || null : null;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: false, error: 'Tidak ada perubahan untuk disimpan.' }, { status: 400 });
    }

    // Bila kategori atau tim berubah, pastikan kedua tim satu kategori
    if (update.category !== undefined || update.team_a_id !== undefined || update.team_b_id !== undefined) {
      const current = await dbMatches.getById(id);
      if (current) {
        const effCategory = (update.category as string) ?? current.category;
        const teamAId = (update.team_a_id as string) ?? current.team_a_id;
        const teamBId = (update.team_b_id as string) ?? current.team_b_id;
        const [tA, tB] = await Promise.all([
          dbTeams.getById(teamAId),
          dbTeams.getById(teamBId),
        ]);
        if (!tA || !tB || tA.category !== effCategory || tB.category !== effCategory) {
          return NextResponse.json(
            { success: false, error: `Kedua tim harus berkategori ${effCategory}.` },
            { status: 400 }
          );
        }
      }
    }

    const data = await dbMatches.update(id, update as any);
    if (!data) {
      return NextResponse.json({ success: false, error: 'Pertandingan tidak ditemukan.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('Update match error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message || 'Terjadi kesalahan' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Sesi berakhir, masuk kembali.' }, { status: 401 });
    }
    await audit(session, 'update_match', 'matches');

    if (!UUID_RE.test(id)) {
      return NextResponse.json({ success: false, error: 'ID pertandingan tidak valid.' }, { status: 400 });
    }

    if (!isDatabaseWritable()) {
      return NextResponse.json({ success: false, error: DB_READONLY_MESSAGE }, { status: 503 });
    }

    await dbMatches.delete(id);

    return NextResponse.json({ success: true, data: null });
  } catch (error: unknown) {
    console.error('Delete match error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message || 'Terjadi kesalahan' }, { status: 500 });
  }
}

