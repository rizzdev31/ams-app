import { NextResponse } from 'next/server';
import {
  dbSponsors,
  isDatabaseConfigured,
  isDatabaseWritable,
} from '@/lib/db';
import { getSession } from '@/lib/auth';
import { audit } from '@/lib/admin-users';
import { optimizeLogoDataUri } from '@/lib/image-compress';
import {
  getLocalSponsors,
  addLocalSponsor,
} from '@/lib/sponsors-store';
import type { Sponsor, SponsorTier } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VALID_TIERS: SponsorTier[] = ['platinum', 'gold', 'silver', 'partner'];

const TIER_WEIGHT: Record<SponsorTier, number> = {
  platinum: 1,
  gold: 2,
  silver: 3,
  partner: 4,
};

function sortSponsors(list: Sponsor[]): Sponsor[] {
  return [...list].sort((a, b) => {
    const wa = TIER_WEIGHT[a.tier] ?? 99;
    const wb = TIER_WEIGHT[b.tier] ?? 99;
    if (wa !== wb) return wa - wb;
    const oa = a.display_order ?? 0;
    const ob = b.display_order ?? 0;
    if (oa !== ob) return oa - ob;
    return (a.name || '').localeCompare(b.name || '');
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const includeAll = searchParams.get('all') === 'true';

  if (!isDatabaseConfigured()) {
    const local = getLocalSponsors();
    const filtered = includeAll ? local : local.filter((s) => s.active);
    return NextResponse.json({
      success: true,
      data: sortSponsors(filtered),
      source: 'local_fallback',
    });
  }

  try {
    const data = await dbSponsors.getAll(includeAll);
    return NextResponse.json({
      success: true,
      data: sortSponsors(data),
      source: 'database',
    });
  } catch (err) {
    console.warn('Gagal membaca sponsors dari database, beralih ke lokal:', err);
    const local = getLocalSponsors();
    const filtered = includeAll ? local : local.filter((s) => s.active);
    return NextResponse.json({
      success: true,
      data: sortSponsors(filtered),
      source: 'local_fallback',
    });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Sesi berakhir atau tidak memiliki izin.' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Format data tidak valid.' }, { status: 400 });
    }

    const name = String(body.name || '').trim();
    if (!name) {
      return NextResponse.json({ success: false, error: 'Nama sponsor wajib diisi.' }, { status: 400 });
    }

    let logo_url = String(body.logo_url || '').trim();
    if (!logo_url) {
      return NextResponse.json({ success: false, error: 'Logo sponsor wajib diisi.' }, { status: 400 });
    }

    // Kompresi logo transparan otomatis
    if (logo_url.startsWith('data:image/')) {
      logo_url = await optimizeLogoDataUri(logo_url);
    }

    const tier: SponsorTier = VALID_TIERS.includes(body.tier) ? body.tier : 'gold';
    const display_order = typeof body.display_order === 'number' ? body.display_order : 0;
    const active = body.active !== undefined ? Boolean(body.active) : true;

    let website_url: string | null = null;
    if (body.website_url && typeof body.website_url === 'string') {
      const trimmed = body.website_url.trim();
      if (trimmed.length > 0) {
        if (!/^https?:\/\//i.test(trimmed)) {
          website_url = `https://${trimmed}`;
        } else {
          website_url = trimmed;
        }
      }
    }

    const id = crypto.randomUUID();
    const payload: Sponsor = {
      id,
      name,
      logo_url,
      tier,
      website_url,
      display_order,
      active,
      created_at: new Date().toISOString(),
    };

    await audit(session, 'create_sponsor', 'sponsors', { name, tier });

    if (!isDatabaseWritable()) {
      const created = addLocalSponsor(payload);
      return NextResponse.json({ success: true, data: created, source: 'local' });
    }

    const data = await dbSponsors.create(payload);
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Error handler POST /api/sponsors:', err);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan pada server saat menambahkan sponsor.' },
      { status: 500 }
    );
  }
}

