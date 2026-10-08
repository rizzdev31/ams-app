/**
 * Skrip Migrasi: Salin seluruh data dari Supabase/Seed ke MySQL lokal.
 * Jalankan dengan: npx tsx scripts/migrate-supabase-to-mysql.ts
 */

import mysql from 'mysql2/promise';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { SEED_MATCHES, SEED_SETTINGS, SEED_TEAMS } from '../src/lib/seed';

function loadEnvLocal(): Record<string, string> {
  try {
    const raw = readFileSync(join(process.cwd(), '.env.local'), 'utf8');
    const env: Record<string, string> = {};
    for (const line of raw.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      env[key] = value;
    }
    return env;
  } catch {
    return {};
  }
}

const env = loadEnvLocal();

const dbConfig = {
  host: process.env.DB_HOST || env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || env.DB_PORT || 3306),
  user: process.env.DB_USER || env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || env.DB_PASSWORD || '',
  database: process.env.DB_NAME || env.DB_NAME || 'annur_minsoc',
};

async function main() {
  console.log(`Menghubungkan ke MySQL di ${dbConfig.host}:${dbConfig.port} (database: ${dbConfig.database})...`);
  const pool = mysql.createPool(dbConfig);

  try {
    const [test] = await pool.query('SELECT 1 + 1 AS result');
    console.log('✅ Berhasil terkoneksi ke MySQL!');

    // 1. Ambil data dari Supabase (atau fallback seed jika supabase offline)
    let teams = SEED_TEAMS;
    let matches = SEED_MATCHES;
    let settings = SEED_SETTINGS;
    let matchEvents: any[] = [];
    let players: any[] = [];

    const supaUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    const supaKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supaUrl && supaKey) {
      console.log('Mengambil data terbaru dari Supabase...');
      const sb = createClient(supaUrl, supaKey);

      const [resTeams, resMatches, resSettings, resEvents, resPlayers] = await Promise.all([
        sb.from('teams').select('*'),
        sb.from('matches').select('*'),
        sb.from('event_settings').select('*').limit(1).maybeSingle(),
        sb.from('match_events').select('*'),
        sb.from('players').select('*'),
      ]);

      if (resTeams.data?.length) teams = resTeams.data as any;
      if (resMatches.data?.length) matches = resMatches.data as any;
      if (resSettings.data) settings = resSettings.data as any;
      if (resEvents.data) matchEvents = resEvents.data as any;
      if (resPlayers.data) players = resPlayers.data as any;
    }

    console.log(`Data siap dimigrasi: ${teams.length} tim, ${matches.length} pertandingan, ${players.length} pemain, ${matchEvents.length} event gol/kartu.`);

    // 2. Insert Teams
    for (const t of teams) {
      await pool.query(
        `INSERT INTO teams (id, name, short_name, logo_url, group_name, color, category)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), short_name=VALUES(short_name), logo_url=VALUES(logo_url), group_name=VALUES(group_name), color=VALUES(color), category=VALUES(category)`,
        [t.id, t.name, t.short_name, t.logo_url || null, t.group_name, t.color || null, t.category || 'U10']
      );
    }
    console.log(`✅ ${teams.length} tim berhasil disimpan ke MySQL.`);

    // 3. Insert Matches
    for (const m of matches) {
      await pool.query(
        `INSERT INTO matches (id, team_a_id, team_b_id, score_a, score_b, status, match_date, kickoff_time, field, stage, group_name, category)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE score_a=VALUES(score_a), score_b=VALUES(score_b), status=VALUES(status), match_date=VALUES(match_date), kickoff_time=VALUES(kickoff_time), field=VALUES(field), stage=VALUES(stage), group_name=VALUES(group_name), category=VALUES(category)`,
        [
          m.id,
          m.team_a_id,
          m.team_b_id,
          m.score_a ?? 0,
          m.score_b ?? 0,
          m.status || 'scheduled',
          m.match_date,
          m.kickoff_time,
          m.field,
          m.stage || 'grup',
          m.group_name || null,
          m.category || 'U10',
        ]
      );
    }
    console.log(`✅ ${matches.length} jadwal pertandingan berhasil disimpan ke MySQL.`);

    // 4. Insert Event Settings
    if (settings) {
      await pool.query(
        `INSERT INTO event_settings (id, event_name, start_date, end_date, location, map_url, rules_text, tiebreak_rules, contact_info)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE event_name=VALUES(event_name), start_date=VALUES(start_date), end_date=VALUES(end_date), location=VALUES(location), map_url=VALUES(map_url), rules_text=VALUES(rules_text), tiebreak_rules=VALUES(tiebreak_rules), contact_info=VALUES(contact_info)`,
        [
          settings.id || 'f1bc52dd-0df6-4855-a179-bd48875935b6',
          settings.event_name,
          settings.start_date ? settings.start_date.slice(0, 10) : '2026-10-09',
          settings.end_date ? settings.end_date.slice(0, 10) : '2026-10-10',
          settings.location,
          settings.map_url || null,
          settings.rules_text || null,
          settings.tiebreak_rules,
          settings.contact_info || null,
        ]
      );
      console.log('✅ Pengaturan turnamen berhasil disimpan ke MySQL.');
    }

    // 5. Insert Players
    for (const p of players) {
      await pool.query(
        `INSERT INTO players (id, team_id, name, jersey_number, position)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), jersey_number=VALUES(jersey_number), position=VALUES(position)`,
        [p.id, p.team_id, p.name, p.jersey_number ?? null, p.position ?? null]
      );
    }
    if (players.length) console.log(`✅ ${players.length} pemain berhasil disimpan ke MySQL.`);

    // 6. Insert Match Events
    for (const ev of matchEvents) {
      await pool.query(
        `INSERT INTO match_events (id, match_id, team_id, player_id, player_name, type, minute, note)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE player_name=VALUES(player_name), type=VALUES(type), minute=VALUES(minute), note=VALUES(note)`,
        [ev.id, ev.match_id, ev.team_id, ev.player_id || null, ev.player_name, ev.type, ev.minute, ev.note || null]
      );
    }
    if (matchEvents.length) console.log(`✅ ${matchEvents.length} pencetak gol & kartu berhasil disimpan ke MySQL.`);

    console.log('\n🎉 MIGRASI KE MYSQL SELESAI DENGAN SUKSES! Database MySQL siap digunakan.');
  } catch (err) {
    console.error('❌ Terjadi kesalahan saat migrasi:', err);
  } finally {
    await pool.end();
  }
}

main();
