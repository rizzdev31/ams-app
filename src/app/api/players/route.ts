import { NextResponse } from 'next/server';
import {
  dbPlayers,
  dbTeams,
  isDatabaseConfigured,
  isDatabaseWritable,
  DB_MISCONFIGURED_MESSAGE,
  DB_READONLY_MESSAGE,
} from '@/lib/db';
import { requireSuperAdmin } from '@/lib/auth';
import { audit } from '@/lib/admin-users';
import { parseJsonBody } from '@/lib/http';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const POSITIONS = ['GK', 'DF', 'MF', 'FW'] as const;

export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { success: false, data: [], error: DB_MISCONFIGURED_MESSAGE },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('team_id') || undefined;

    if (teamId && !UUID_RE.test(teamId)) {
      return NextResponse.json({ success: false, error: 'ID tim tidak valid.' }, { status: 400 });
    }

    const data = await dbPlayers.getAll(teamId);
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('Fetch players error:', error);
    return NextResponse.json({ success: false, data: [], error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSuperAdmin();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Hanya superadmin.' }, { status: 403 });
    }
    await audit(session, 'create_player', 'players');

    if (!isDatabaseWritable()) {
      return NextResponse.json({ success: false, error: DB_READONLY_MESSAGE }, { status: 503 });
    }

    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.body;

    const team_id = typeof body?.team_id === 'string' ? body.team_id : '';
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const jersey_number = body?.jersey_number === null || body?.jersey_number === undefined ? null : Number(body.jersey_number);
    const position = body?.position === null || body?.position === undefined || body.position === '' ? null : String(body.position).toUpperCase();

    if (!UUID_RE.test(team_id)) {
      return NextResponse.json({ success: false, error: 'ID tim tidak valid.' }, { status: 400 });
    }
    if (!name || name.length > 80) {
      return NextResponse.json({ success: false, error: 'Nama pemain wajib diisi (maks 80 huruf).' }, { status: 400 });
    }
    if (jersey_number !== null && (!Number.isInteger(jersey_number) || jersey_number < 0 || jersey_number > 99)) {
      return NextResponse.json({ success: false, error: 'Nomor punggung harus 0–99.' }, { status: 400 });
    }
    if (position !== null && !POSITIONS.includes(position as (typeof POSITIONS)[number])) {
      return NextResponse.json({ success: false, error: 'Posisi harus GK, DF, MF, atau FW.' }, { status: 400 });
    }

    const team = await dbTeams.getById(team_id);
    if (!team) {
      return NextResponse.json({ success: false, error: 'Tim tidak ditemukan.' }, { status: 400 });
    }

    const data = await dbPlayers.create({
      id: crypto.randomUUID(),
      team_id,
      name,
      jersey_number,
      position,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('Create player error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message || 'Terjadi kesalahan' }, { status: 500 });
  }
}

