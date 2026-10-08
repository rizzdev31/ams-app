/**
 * Segarkan src/lib/seed.ts dari database.
 *
 * Seed dipakai supaya halaman tampil sebelum fetch selesai, jadi isinya bisa
 * jadi basi setiap kali ada perubahan di admin panel. Jalankan script ini
 * setelah mengubah jadwal, skor, atau pengaturan:
 *
 *   npm run seed:refresh
 *
 * Butuh variabel di .env.local (NEXT_PUBLIC_SUPABASE_URL + anon key atau
 * service role key). Script ini hanya membaca.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

/** Ambil nilai dari .env.local tanpa bergantung pada library tambahan. */
function loadEnvLocal(): Record<string, string> {
  let raw: string;
  try {
    raw = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
  } catch {
    console.error('.env.local tidak ditemukan. Salin .env.local.example dulu.');
    process.exit(1);
  }
  const env: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    // Kupas komentar inline yang tidak di dalam quotes
    const hash = value.search(/\s+#/);
    if (hash >= 0 && !/^["']/.test(value)) value = value.slice(0, hash).trim();
    if (/^[A-Z0-9_]+$/.test(key)) {
      env[key] = value.replace(/^["']|["']$/g, '');
    }
  }
  return env;
}

const env = loadEnvLocal();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('NEXT_PUBLIC_SUPABASE_URL atau key tidak ditemukan di .env.local');
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  const [{ data: teams, error: teamsErr }, { data: matches, error: matchesErr }, { data: settings, error: settingsErr }, { data: players, error: playersErr }] =
    await Promise.all([
      supabase.from('teams').select('*').order('category').order('group_name').order('name'),
      supabase.from('matches').select('*').order('match_date').order('kickoff_time').order('field'),
      supabase.from('event_settings').select('*').limit(1).maybeSingle(),
      supabase.from('players').select('*').order('team_id').order('jersey_number', { nullsFirst: false }).order('name'),
    ]);

if (teamsErr || matchesErr || settingsErr || playersErr) {
  console.error('Gagal membaca database:', teamsErr ?? matchesErr ?? settingsErr ?? playersErr);
  process.exit(1);
}

if (!teams?.length) {
  console.error('Tidak ada tim di database — tidak menimpa seed yang sudah ada.');
  process.exit(1);
}

const safeMatches = matches ?? [];
const safePlayers = players ?? [];

const q = (v: unknown) => JSON.stringify(v);
const ts = (v: string | null) => q(v ?? null);

const teamsBlock = teams
  .map(
    (t) =>
      `  { id: ${q(t.id)}, name: ${q(t.name)}, short_name: ${q(t.short_name)}, logo_url: ${ts(t.logo_url)}, group_name: ${q(t.group_name)}, color: ${ts(t.color)}, category: ${q(t.category ?? 'U10')}, created_at: CREATED_AT },`
  )
  .join('\n');

const matchLines = safeMatches
  .map(
    (m) =>
      `  { id: ${q(m.id)}, team_a_id: ${q(m.team_a_id)}, team_b_id: ${q(m.team_b_id)}, score_a: ${m.score_a ?? 0}, score_b: ${m.score_b ?? 0}, status: ${q(m.status)}, match_date: ${q(m.match_date)}, kickoff_time: ${q(m.kickoff_time)}, field: ${q(m.field)}, stage: ${q(m.stage)}, group_name: ${ts(m.group_name)}, category: ${q(m.category ?? 'U10')} },`
  )
  .join('\n');

const s = settings;

const playersBlock = safePlayers
  .map(
    (p) =>
      `  { id: ${q(p.id)}, team_id: ${q(p.team_id)}, name: ${q(p.name)}, jersey_number: ${p.jersey_number ?? 'null'}, position: ${ts(p.position)}, created_at: CREATED_AT },`
  )
  .join('\n');

const file = `// =============================================
// Seed data — render instan tanpa menunggu jaringan
// =============================================
// DIJEMPUT OTOMATIS oleh \`npm run seed:refresh\`. Jangan disunting manual
// tanpa sengaja: file ini menentukan apa yang tampil sebelum API menjawab.
//
// Kalau data resmi berubah, jalankan skrip itu — jangan menebak angka.
//
// Terakhir disegarkan: ${new Date().toISOString().slice(0, 10)}
// =============================================

import { EventSettings, MatchWithTeams, Player, Team } from './types';

const CREATED_AT = ${q(teams[0]?.created_at ?? new Date().toISOString())};
const UPDATED_AT = ${q(safeMatches[0]?.updated_at ?? new Date().toISOString())};

export const SEED_TEAMS: Team[] = [
${teamsBlock}
];

const RAW_MATCHES = [
${matchLines}
] as const;

/** Pertandingan yang sudah dilektor tim A dan B, sama seperti output API. */
export const SEED_MATCHES: MatchWithTeams[] = RAW_MATCHES.flatMap((m) => {
  const team_a = SEED_TEAMS.find((t) => t.id === m.team_a_id);
  const team_b = SEED_TEAMS.find((t) => t.id === m.team_b_id);
  if (!team_a || !team_b) return [];
  return [{ ...m, team_a, team_b, updated_at: UPDATED_AT }];
});

/** Urutan nama A–Z untuk halaman daftar tim (API mengembalikan group_name, name; halaman mengurutkan ulang by name). */
export const SEED_TEAMS_SORTED: Team[] = [...SEED_TEAMS].sort(
  (a, b) => a.name.localeCompare(b.name)
);

/** Pertandingan seorang tim, terbaru lebih dulu — sama seperti halaman detail. */
export function seedTeamMatches(teamId: string): MatchWithTeams[] {
  return SEED_MATCHES.filter((m) => m.team_a_id === teamId || m.team_b_id === teamId).sort((a, b) =>
    \`\${b.match_date}\${b.kickoff_time}\`.localeCompare(\`\${a.match_date}\${a.kickoff_time}\`)
  );
}

/** Seluruh pemain untuk render instan. */
export const SEED_PLAYERS: Player[] = [
${playersBlock}
];

/** Pemain seorang tim. */
export function seedTeamPlayers(teamId: string): Player[] {
  return SEED_PLAYERS.filter((p) => p.team_id === teamId);
}

export const SEED_SETTINGS: EventSettings = {
  id: ${q(s?.id ?? 'default')},
  event_name: ${q(s?.event_name ?? 'An-Nur Mini Soccer')},
  start_date: ${q(s?.start_date ?? '2026-10-09')},
  end_date: ${q(s?.end_date ?? '2026-10-10')},
  location: ${q(s?.location ?? 'Lapangan An-Nur')},
  map_url: ${ts(s?.map_url ?? null)},
  rules_text: ${ts(s?.rules_text ?? null)},
  tiebreak_rules: ${q(s?.tiebreak_rules ?? 'poin → selisih gol → gol masuk')},
  contact_info: ${ts(s?.contact_info ?? null)},
};
`;

writeFileSync(join(process.cwd(), 'src', 'lib', 'seed.ts'), file, 'utf8');

console.log(`seed.ts disegarkan: ${teams.length} tim, ${safeMatches.length} pertandingan.`);
}

run().catch(console.error);
