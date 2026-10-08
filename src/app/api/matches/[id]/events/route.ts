import { NextResponse } from 'next/server';
import {
  dbMatchEvents,
  dbMatches,
  isDatabaseConfigured,
  isDatabaseWritable,
  DB_MISCONFIGURED_MESSAGE,
  DB_READONLY_MESSAGE,
} from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getOperatorSession } from '@/lib/operator-auth';
import { audit } from '@/lib/admin-users';
import { parseJsonBody } from '@/lib/http';
import type { MatchEventType } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_TYPES: MatchEventType[] = ['goal', 'yellow_card', 'red_card'];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { success: false, data: [], error: DB_MISCONFIGURED_MESSAGE },
      { status: 503 }
    );
  }

  try {
    const { id } = await params;
    if (!UUID_RE.test(id)) {
      return NextResponse.json(
        { success: false, error: 'ID pertandingan tidak valid.' },
        { status: 400 }
      );
    }

    const data = await dbMatchEvents.getByMatchId(id);
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('Fetch match events error:', error);
    return NextResponse.json(
      { success: false, data: [], error: (error as Error).message || 'Terjadi kesalahan' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();
    const operator = await getOperatorSession();
    if (!session && !operator) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Sesi panitia atau kode akses lapangan diperlukan.' },
        { status: 401 }
      );
    }
    const actor = session
      ? { sub: session.sub, username: session.username }
      : { username: operator?.title || 'operator_lapangan' };

    if (!UUID_RE.test(id)) {
      return NextResponse.json(
        { success: false, error: 'ID pertandingan tidak valid.' },
        { status: 400 }
      );
    }

    if (!isDatabaseWritable()) {
      return NextResponse.json(
        { success: false, error: DB_READONLY_MESSAGE },
        { status: 503 }
      );
    }

    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.body;

    const teamId = typeof body?.team_id === 'string' ? body.team_id.trim() : '';
    const playerName = typeof body?.player_name === 'string' ? body.player_name.trim() : '';
    const type = body?.type as MatchEventType;
    const minute = typeof body?.minute === 'number' ? Math.max(1, Math.min(120, Math.floor(body.minute))) : 1;
    const playerId = typeof body?.player_id === 'string' && UUID_RE.test(body.player_id) ? body.player_id : null;
    const note = typeof body?.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 100) : null;
    const autoScore = Boolean(body?.auto_score ?? true);

    if (!UUID_RE.test(teamId)) {
      return NextResponse.json({ success: false, error: 'Tim tidak valid.' }, { status: 400 });
    }
    if (!playerName) {
      return NextResponse.json({ success: false, error: 'Nama pemain wajib diisi.' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(type)) {
      return NextResponse.json({ success: false, error: 'Tipe kejadian tidak valid.' }, { status: 400 });
    }

    // 1. Ambil data match saat ini untuk verifikasi tim dan update skor
    const match = await dbMatches.getById(id);
    if (!match) {
      return NextResponse.json({ success: false, error: 'Pertandingan tidak ditemukan.' }, { status: 404 });
    }

    if (match.team_a_id !== teamId && match.team_b_id !== teamId) {
      return NextResponse.json({ success: false, error: 'Tim tidak bertanding dalam laga ini.' }, { status: 400 });
    }

    // 2. Simpan event ke tabel match_events
    const eventId = crypto.randomUUID();
    const newEvent = await dbMatchEvents.create({
      id: eventId,
      match_id: id,
      team_id: teamId,
      player_id: playerId,
      player_name: playerName,
      type,
      minute,
      note,
      created_at: new Date().toISOString(),
    });

    // 3. Jika event adalah GOL dan autoScore aktif, otomatis naikkan skor match
    let updatedMatch = match;
    if (type === 'goal' && autoScore) {
      const isTeamA = match.team_a_id === teamId;
      const newScoreA = isTeamA ? (match.score_a ?? 0) + 1 : (match.score_a ?? 0);
      const newScoreB = !isTeamA ? (match.score_b ?? 0) + 1 : (match.score_b ?? 0);

      const mData = await dbMatches.update(id, {
        score_a: newScoreA,
        score_b: newScoreB,
      });

      if (mData) updatedMatch = mData;
    }

    await audit(actor, 'create_event', 'match_events', {
      match_id: id,
      type,
      player_name: playerName,
      team_id: teamId,
    });

    return NextResponse.json({
      success: true,
      data: newEvent,
      match: updatedMatch,
    });
  } catch (error: unknown) {
    console.error('Create match event error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'Terjadi kesalahan' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();
    const operator = await getOperatorSession();
    if (!session && !operator) {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak. Sesi panitia atau kode akses lapangan diperlukan.' },
        { status: 401 }
      );
    }
    const actor = session
      ? { sub: session.sub, username: session.username }
      : { username: operator?.title || 'operator_lapangan' };

    if (!UUID_RE.test(id)) {
      return NextResponse.json(
        { success: false, error: 'ID pertandingan tidak valid.' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('event_id');
    const decrementScore = searchParams.get('decrement_score') === 'true';

    if (!eventId || !UUID_RE.test(eventId)) {
      return NextResponse.json(
        { success: false, error: 'ID event tidak valid.' },
        { status: 400 }
      );
    }

    if (!isDatabaseWritable()) {
      return NextResponse.json(
        { success: false, error: DB_READONLY_MESSAGE },
        { status: 503 }
      );
    }

    // 1. Ambil info event sebelum dihapus
    const event = await dbMatchEvents.getById(eventId);
    if (!event || event.match_id !== id) {
      return NextResponse.json(
        { success: false, error: 'Event tidak ditemukan.' },
        { status: 404 }
      );
    }

    // 2. Hapus event
    await dbMatchEvents.delete(eventId);

    // 3. Jika gol dan diminta decrementScore, kurangi skor pertandingan
    if (event.type === 'goal' && decrementScore) {
      const match = await dbMatches.getById(id);
      if (match) {
        const isTeamA = match.team_a_id === event.team_id;
        const newScoreA = isTeamA ? Math.max(0, (match.score_a ?? 0) - 1) : match.score_a;
        const newScoreB = !isTeamA ? Math.max(0, (match.score_b ?? 0) - 1) : match.score_b;

        await dbMatches.update(id, {
          score_a: newScoreA,
          score_b: newScoreB,
        });
      }
    }

    await audit(actor, 'delete_event', 'match_events', {
      match_id: id,
      event_id: eventId,
      type: event.type,
      player_name: event.player_name,
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete match event error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'Terjadi kesalahan' },
      { status: 500 }
    );
  }
}

