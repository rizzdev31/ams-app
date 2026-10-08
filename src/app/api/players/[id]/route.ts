import { NextResponse } from 'next/server';
import {
  dbPlayers,
  isDatabaseWritable,
  DB_READONLY_MESSAGE,
} from '@/lib/db';
import { requireSuperAdmin } from '@/lib/auth';
import { audit } from '@/lib/admin-users';
import { parseJsonBody } from '@/lib/http';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const POSITIONS = ['GK', 'DF', 'MF', 'FW'] as const;

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSuperAdmin();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Hanya superadmin.' }, { status: 403 });
    }
    await audit(session, 'update_player', 'players');

    if (!UUID_RE.test(id)) {
      return NextResponse.json({ success: false, error: 'ID pemain tidak valid.' }, { status: 400 });
    }
    if (!isDatabaseWritable()) {
      return NextResponse.json({ success: false, error: DB_READONLY_MESSAGE }, { status: 503 });
    }

    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.body;
    const update: Record<string, string | number | null> = {};

    if (body?.name !== undefined) {
      const v = typeof body.name === 'string' ? body.name.trim() : '';
      if (!v || v.length > 80) {
        return NextResponse.json({ success: false, error: 'Nama pemain wajib diisi (maks 80 huruf).' }, { status: 400 });
      }
      update.name = v;
    }
    if (body?.jersey_number !== undefined) {
      if (body.jersey_number === null || body.jersey_number === '') {
        update.jersey_number = null;
      } else {
        const v = Number(body.jersey_number);
        if (!Number.isInteger(v) || v < 0 || v > 99) {
          return NextResponse.json({ success: false, error: 'Nomor punggung harus 0–99.' }, { status: 400 });
        }
        update.jersey_number = v;
      }
    }
    if (body?.position !== undefined) {
      if (body.position === null || body.position === '') {
        update.position = null;
      } else {
        const v = String(body.position).toUpperCase();
        if (!POSITIONS.includes(v as (typeof POSITIONS)[number])) {
          return NextResponse.json({ success: false, error: 'Posisi harus GK, DF, MF, atau FW.' }, { status: 400 });
        }
        update.position = v;
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: false, error: 'Tidak ada perubahan untuk disimpan.' }, { status: 400 });
    }

    const data = await dbPlayers.update(id, update);
    if (!data) {
      return NextResponse.json({ success: false, error: 'Pemain tidak ditemukan.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('Update player error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message || 'Terjadi kesalahan' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await requireSuperAdmin();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Hanya superadmin.' }, { status: 403 });
    }
    await audit(session, 'delete_player', 'players');

    if (!UUID_RE.test(id)) {
      return NextResponse.json({ success: false, error: 'ID pemain tidak valid.' }, { status: 400 });
    }
    if (!isDatabaseWritable()) {
      return NextResponse.json({ success: false, error: DB_READONLY_MESSAGE }, { status: 503 });
    }

    await dbPlayers.delete(id);

    return NextResponse.json({ success: true, data: null });
  } catch (error: unknown) {
    console.error('Delete player error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message || 'Terjadi kesalahan' }, { status: 500 });
  }
}

