import { NextResponse } from 'next/server';
import {
  dbTeams,
  isDatabaseConfigured,
  isDatabaseWritable,
  DB_MISCONFIGURED_MESSAGE,
  DB_READONLY_MESSAGE,
} from '@/lib/db';
import { getSession } from '@/lib/auth';
import { parseJsonBody } from '@/lib/http';
import { audit } from '@/lib/admin-users';
import { optimizeLogoDataUri } from '@/lib/image-compress';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  if (!isDatabaseConfigured()) {
    console.warn(DB_MISCONFIGURED_MESSAGE);
    return NextResponse.json(
      { success: false, data: [], error: DB_MISCONFIGURED_MESSAGE },
      { status: 503 }
    );
  }

  try {
    const data = await dbTeams.getAll();
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('Fetch teams error:', error);
    return NextResponse.json({ success: false, data: [], error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Sesi berakhir, masuk kembali.' }, { status: 401 });
    }
    await audit(session, 'create_team', 'teams');

    if (!isDatabaseWritable()) {
      return NextResponse.json({ success: false, error: DB_READONLY_MESSAGE }, { status: 503 });
    }

    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.body;
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const short_name = typeof body?.short_name === 'string' ? body.short_name.trim().toUpperCase() : '';
    const group_name = typeof body?.group_name === 'string' ? body.group_name.trim() : '';
    const logo_url = typeof body?.logo_url === 'string' && body.logo_url.trim() ? body.logo_url.trim() : null;
    const color = typeof body?.color === 'string' && body.color.trim() ? body.color.trim() : null;
    const category = typeof body?.category === 'string' ? body.category.trim().toUpperCase() : '';

    if (!name || !short_name || !group_name) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    if (category !== 'U10' && category !== 'U12') {
      return NextResponse.json({ success: false, error: 'Kategori harus U10 atau U12.' }, { status: 400 });
    }
    
    if (short_name.length !== 3) {
      return NextResponse.json({ success: false, error: 'Singkatan (short_name) harus 3 karakter' }, { status: 400 });
    }

    if (logo_url) {
      const isHttp = logo_url.startsWith('http://') || logo_url.startsWith('https://');
      const isRelative = logo_url.startsWith('/');
      const isDataUri = logo_url.startsWith('data:image/');
      if (!isHttp && !isRelative && !isDataUri) {
        return NextResponse.json(
          { success: false, error: 'URL logo harus berupa link http(s), path gambar /lokal, atau gambar upload.' },
          { status: 400 }
        );
      }
    }

    if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) {
      return NextResponse.json({ success: false, error: 'Warna harus format hex seperti #0B3D91.' }, { status: 400 });
    }

    const finalLogoUrl = logo_url ? await optimizeLogoDataUri(logo_url) : null;

    const data = await dbTeams.create({
      id: crypto.randomUUID(),
      name,
      short_name,
      group_name,
      logo_url: finalLogoUrl,
      color,
      category,
    });

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('Create team error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message || 'Terjadi kesalahan' }, { status: 500 });
  }
}

