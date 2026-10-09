import { NextResponse } from 'next/server';
import {
  dbSettings,
  isDatabaseConfigured,
  isDatabaseWritable,
  DB_MISCONFIGURED_MESSAGE,
  DB_READONLY_MESSAGE,
} from '@/lib/db';
import { getSession } from '@/lib/auth';
import { audit } from '@/lib/admin-users';

const defaultSettings = {
  id: 'default',
  event_name: 'An-Nur Mini Soccer',
  start_date: '2026-10-09',
  end_date: '2026-10-10',
  location: 'Lapangan An-Nur',
  map_url: null,
  rules_text: null,
  tiebreak_rules: 'poin â†’ selisih gol â†’ gol masuk',
  contact_info: null,
};

/** The only columns a client is allowed to write. `id` is deliberately excluded. */
const WRITABLE = [
  'event_name',
  'start_date',
  'end_date',
  'location',
  'map_url',
  'rules_text',
  'tiebreak_rules',
  'contact_info',
  'passcode_field_1',
  'passcode_field_2',
  'passcode_scorer',
  'active_category',
  'active_date',
] as const;

/** Fields that must contain a value, and the 400 message if they don't. */
const REQUIRED: Record<(typeof WRITABLE)[number], string> = {
  event_name: 'Nama acara wajib diisi.',
  start_date: 'Tanggal mulai wajib diisi.',
  end_date: 'Tanggal selesai wajib diisi.',
  location: 'Lokasi wajib diisi.',
  map_url: '',
  rules_text: '',
  tiebreak_rules: 'Aturan tie-break wajib diisi.',
  contact_info: '',
  passcode_field_1: '',
  passcode_field_2: '',
  passcode_scorer: '',
  active_category: '',
  active_date: '',
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Whitelist + normalise the incoming body.
 * Empty optional strings become null so the column is cleared instead of
 * storing "". Throws an Error whose message is safe to show the user.
 */
function sanitiseSettings(input: unknown): Record<string, string | null> {
  if (typeof input !== 'object' || input === null) {
    throw new Error('Bad Request');
  }

  const src = input as Record<string, unknown>;
  const out: Record<string, string | null> = {};

  for (const field of WRITABLE) {
    const raw = src[field];

    if (raw === undefined || raw === null) {
      // Absent value: leave it alone rather than wiping a stored setting.
      continue;
    }

    if (typeof raw !== 'string') {
      throw new Error('Bad Request');
    }

    const value = raw.trim();

    if (REQUIRED[field] && value.length === 0) {
      throw new Error(REQUIRED[field]);
    }

    if (field === 'start_date' || field === 'end_date' || (field === 'active_date' && value.length > 0)) {
      if (!ISO_DATE.test(value)) throw new Error('Format tanggal tidak valid.');
    }

    if (field === 'map_url' && value.length > 0) {
      let parsed: URL;
      try {
        parsed = new URL(value);
      } catch {
        throw new Error('URL peta tidak valid.');
      }
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('URL peta harus diawali http:// atau https://');
      }
    }

    // Optional text fields: blank means "clear this"
    out[field] = value.length === 0 && !REQUIRED[field] ? null : value;
  }

  if (Object.keys(out).length === 0) {
    throw new Error('Tidak ada pengaturan untuk disimpan.');
  }

  if (out.start_date && out.end_date && out.start_date > out.end_date) {
    throw new Error('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.');
  }

  return out;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  if (!isDatabaseConfigured()) {
    console.warn(DB_MISCONFIGURED_MESSAGE);
    return NextResponse.json(
      { success: false, data: defaultSettings, error: DB_MISCONFIGURED_MESSAGE },
      { status: 503 }
    );
  }

  try {
    const rawData = await dbSettings.get();
    const data = rawData || defaultSettings;
    const session = await getSession();

    // Jika bukan admin/superadmin, jangan pernah ekspos kode akses ke publik!
    if (!session) {
      const safeData = { ...data };
      delete (safeData as any).passcode_field_1;
      delete (safeData as any).passcode_field_2;
      delete (safeData as any).passcode_scorer;
      return NextResponse.json({ success: true, data: safeData });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('Fetch settings error:', error);
    return NextResponse.json({ success: false, data: defaultSettings, error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Sesi berakhir, masuk kembali.' }, { status: 401 });
    }
    await audit(session, 'update_settings', 'event_settings');

    if (!isDatabaseWritable()) {
      return NextResponse.json({ success: false, error: DB_READONLY_MESSAGE }, { status: 503 });
    }

    let payload: Record<string, string | null>;
    try {
      payload = sanitiseSettings(await request.json());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Permintaan tidak valid.';
      if (message === 'Bad Request') {
        return NextResponse.json(
          { success: false, error: 'Format data tidak dikenali.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }

    const data = await dbSettings.update(payload);
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error)?.message || 'Terjadi kesalahan saat menyimpan pengaturan' },
      { status: 500 }
    );
  }
}

