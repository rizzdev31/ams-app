import { NextResponse } from 'next/server';
import {
  dbTeams,
  dbMatches,
  isDatabaseConfigured,
  isDatabaseWritable,
  DB_MISCONFIGURED_MESSAGE,
  DB_READONLY_MESSAGE,
} from '@/lib/db';
import { getSession } from '@/lib/auth';
import { audit } from '@/lib/admin-users';
import { parseJsonBody } from '@/lib/http';
import { optimizeLogoDataUri } from '@/lib/image-compress';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!UUID_RE.test(id)) {
      return NextResponse.json({ success: false, error: 'ID tim tidak valid.' }, { status: 400 });
    }

    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: false, error: DB_MISCONFIGURED_MESSAGE }, { status: 503 });
    }

    const data = await dbTeams.getById(id);
    if (!data) return NextResponse.json({ success: false, error: 'Tim tidak ditemukan.' }, { status: 404 });
    
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('Fetch team error:', error);
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
    await audit(session, 'update_team', 'teams');

    if (!UUID_RE.test(id)) {
      return NextResponse.json({ success: false, error: 'ID tim tidak valid.' }, { status: 400 });
    }

    if (!isDatabaseWritable()) {
      return NextResponse.json({ success: false, error: DB_READONLY_MESSAGE }, { status: 503 });
    }

    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.body;
    const update: Record<string, string | null> = {};

    if (body?.name !== undefined) {
      const v = typeof body.name === 'string' ? body.name.trim() : '';
      if (!v) return NextResponse.json({ success: false, error: 'Nama tim wajib diisi.' }, { status: 400 });
      update.name = v;
    }
    if (body?.short_name !== undefined) {
      const v = typeof body.short_name === 'string' ? body.short_name.trim().toUpperCase() : '';
      if (v.length !== 3) return NextResponse.json({ success: false, error: 'Singkatan (short_name) harus 3 karakter' }, { status: 400 });
      update.short_name = v;
    }
    if (body?.group_name !== undefined) {
      const v = typeof body.group_name === 'string' ? body.group_name.trim() : '';
      if (!v) return NextResponse.json({ success: false, error: 'Grup wajib diisi.' }, { status: 400 });
      update.group_name = v;
    }
    if (body?.category !== undefined) {
      const v = typeof body.category === 'string' ? body.category.trim().toUpperCase() : '';
      if (v !== 'U10' && v !== 'U12') {
        return NextResponse.json({ success: false, error: 'Kategori harus U10 atau U12.' }, { status: 400 });
      }
      update.category = v;
    }
    if (body?.logo_url !== undefined) {
      const v = typeof body.logo_url === 'string' ? body.logo_url.trim() : '';
      if (v) {
        const isHttp = v.startsWith('http://') || v.startsWith('https://');
        const isRelative = v.startsWith('/');
        const isDataUri = v.startsWith('data:image/');
        if (!isHttp && !isRelative && !isDataUri) {
          return NextResponse.json(
            { success: false, error: 'URL logo harus berupa link http(s), path gambar /lokal, atau gambar upload.' },
            { status: 400 }
          );
        }
        update.logo_url = await optimizeLogoDataUri(v);
      } else {
        update.logo_url = null;
      }
    }
    if (body?.color !== undefined) {
      const v = typeof body.color === 'string' ? body.color.trim() : '';
      if (v && !/^#[0-9a-fA-F]{6}$/.test(v)) {
        return NextResponse.json({ success: false, error: 'Warna harus format hex seperti #0B3D91.' }, { status: 400 });
      }
      update.color = v || null;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ success: false, error: 'Tidak ada perubahan untuk disimpan.' }, { status: 400 });
    }
    
    const data = await dbTeams.update(id, update);
    if (!data) {
      return NextResponse.json({ success: false, error: 'Tim tidak ditemukan.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('Update team error:', error);
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
    await audit(session, 'update_team', 'teams');

    if (!UUID_RE.test(id)) {
      return NextResponse.json({ success: false, error: 'ID tim tidak valid.' }, { status: 400 });
    }

    if (!isDatabaseWritable()) {
      return NextResponse.json({ success: false, error: DB_READONLY_MESSAGE }, { status: 503 });
    }

    // Cek apakah tim sudah punya pertandingan
    const allMatches = await dbMatches.getAll();
    const hasMatches = allMatches.some((m) => m.team_a_id === id || m.team_b_id === id);
    if (hasMatches) {
      return NextResponse.json({ success: false, error: 'Tim tidak bisa dihapus karena sudah memiliki pertandingan' }, { status: 400 });
    }

    await dbTeams.delete(id);

    return NextResponse.json({ success: true, data: null });
  } catch (error: unknown) {
    console.error('Delete team error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message || 'Terjadi kesalahan' }, { status: 500 });
  }
}

