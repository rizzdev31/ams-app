import { NextResponse } from 'next/server';
import {
  dbSponsors,
  isDatabaseWritable,
} from '@/lib/db';
import { getSession } from '@/lib/auth';
import { audit } from '@/lib/admin-users';
import { optimizeLogoDataUri } from '@/lib/image-compress';
import {
  updateLocalSponsor,
  deleteLocalSponsor,
  getLocalSponsors,
} from '@/lib/sponsors-store';
import type { SponsorTier } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_TIERS: SponsorTier[] = ['platinum', 'gold', 'silver', 'partner'];

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Sesi berakhir atau tidak memiliki izin.' },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID sponsor tidak valid.' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Data tidak valid.' }, { status: 400 });
    }

    const patch: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ success: false, error: 'Nama sponsor tidak boleh kosong.' }, { status: 400 });
      patch.name = name;
    }

    if (body.logo_url !== undefined) {
      let logo_url = String(body.logo_url).trim();
      if (!logo_url) return NextResponse.json({ success: false, error: 'Logo sponsor tidak boleh kosong.' }, { status: 400 });
      if (logo_url.startsWith('data:image/')) {
        logo_url = await optimizeLogoDataUri(logo_url);
      }
      patch.logo_url = logo_url;
    }

    if (body.tier !== undefined && VALID_TIERS.includes(body.tier)) {
      patch.tier = body.tier;
    }

    if (body.display_order !== undefined) {
      patch.display_order = Number(body.display_order) || 0;
    }

    if (body.active !== undefined) {
      patch.active = Boolean(body.active);
    }

    if (body.website_url !== undefined) {
      if (body.website_url === null || body.website_url === '') {
        patch.website_url = null;
      } else {
        const trimmed = String(body.website_url).trim();
        patch.website_url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
      }
    }

    await audit(session, 'update_sponsor', `sponsor:${id}`, patch);

    if (!isDatabaseWritable()) {
      const updated = updateLocalSponsor(id, patch);
      if (!updated) return NextResponse.json({ success: false, error: 'Sponsor tidak ditemukan.' }, { status: 404 });
      return NextResponse.json({ success: true, data: updated, source: 'local' });
    }

    const data = await dbSponsors.update(id, patch as any);
    if (!data) {
      // Cek local store
      const local = getLocalSponsors().find((s) => s.id === id);
      if (local) {
        const updated = updateLocalSponsor(id, patch);
        return NextResponse.json({ success: true, data: updated, source: 'local' });
      }
      return NextResponse.json({ success: false, error: 'Sponsor tidak ditemukan.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Error handler PUT /api/sponsors/[id]:', err);
    return NextResponse.json({ success: false, error: 'Gagal memperbarui sponsor.' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Sesi berakhir atau tidak memiliki izin.' },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID sponsor tidak valid.' }, { status: 400 });
    }

    await audit(session, 'delete_sponsor', `sponsor:${id}`);

    // Hapus di local fallback jika ada
    deleteLocalSponsor(id);

    if (isDatabaseWritable()) {
      await dbSponsors.delete(id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error handler DELETE /api/sponsors/[id]:', err);
    return NextResponse.json({ success: false, error: 'Gagal menghapus sponsor.' }, { status: 500 });
  }
}

