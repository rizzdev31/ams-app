-- ==============================================================================
-- AN-NUR MINI SOCCER — SUPABASE DATABASE SCHEMA (LENGKAP & SIAP PAKAI)
-- ==============================================================================
-- File ini dirancang untuk dijalankan langsung di Supabase SQL Editor.
-- Skrip ini bersifat idempotent (aman dijalankan berulang kali tanpa error).
-- ==============================================================================

-- 0. Ekstensi UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. TABEL TEAMS (Daftar Tim Turnamen)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  short_name VARCHAR(3) NOT NULL,
  logo_url TEXT,
  group_name VARCHAR(10) NOT NULL,
  color VARCHAR(7),
  category VARCHAR(10) DEFAULT 'U10' CHECK (category IN ('U10', 'U12')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 2. TABEL MATCHES (Jadwal, Skor & Status Pertandingan)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_a_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  team_b_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT,
  score_a INT DEFAULT 0,
  score_b INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'halftime', 'finished')),
  match_date DATE NOT NULL,
  kickoff_time TIME NOT NULL,
  field VARCHAR(50) NOT NULL,
  stage VARCHAR(20) DEFAULT 'grup' CHECK (stage IN ('grup', 'perempat_final', 'semifinal', 'juara_3', 'final')),
  group_name VARCHAR(10),
  category VARCHAR(10) DEFAULT 'U10' CHECK (category IN ('U10', 'U12')),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 3. TABEL EVENT SETTINGS (Pengaturan Informasi Turnamen)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL DEFAULT 'An-Nur Mini Soccer',
  start_date DATE NOT NULL DEFAULT '2026-10-09',
  end_date DATE NOT NULL DEFAULT '2026-10-10',
  location TEXT NOT NULL DEFAULT 'Lapangan An-Nur',
  map_url TEXT,
  rules_text TEXT,
  tiebreak_rules TEXT DEFAULT 'poin → selisih gol → gol masuk',
  contact_info TEXT
);

-- ------------------------------------------------------------------------------
-- 4. TABEL PLAYERS (Daftar Pemain per Tim)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  jersey_number INT,
  position VARCHAR(2) CHECK (position IN ('GK', 'DF', 'MF', 'FW')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 4b. TABEL MATCH EVENTS (Pencetak Gol & Kartu Kuning/Merah)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS match_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  player_name TEXT NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('goal', 'yellow_card', 'red_card')),
  minute INT NOT NULL DEFAULT 1,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_match_events_match_id ON match_events(match_id);
CREATE INDEX IF NOT EXISTS idx_match_events_team_id ON match_events(team_id);

-- ------------------------------------------------------------------------------
-- 4c. TABEL SPONSORS (Sponsorship & Partner Resmi Turnamen)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sponsors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  tier VARCHAR(20) NOT NULL DEFAULT 'gold' CHECK (tier IN ('platinum', 'gold', 'silver', 'partner')),
  website_url TEXT,
  display_order INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sponsors_tier ON sponsors(tier);
CREATE INDEX IF NOT EXISTS idx_sponsors_active ON sponsors(active);
CREATE INDEX IF NOT EXISTS idx_sponsors_order ON sponsors(display_order);

-- ------------------------------------------------------------------------------
-- 5. TABEL ADMIN USERS (Pengguna & Hak Akses Panitia / Superadmin)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'admin' CHECK (role IN ('superadmin', 'admin')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 6. TABEL AUDIT LOG (Catatan Aktivitas Admin)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  username TEXT,
  action TEXT NOT NULL,
  target TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 7. DEFAULT INSERTS (Inisialisasi Data Awal)
-- ------------------------------------------------------------------------------
-- a. Inisialisasi event settings turnamen bila belum ada
INSERT INTO event_settings (event_name, start_date, end_date, location, tiebreak_rules)
SELECT 'An-Nur Mini Soccer', '2026-10-09', '2026-10-10', 'Lapangan An-Nur', 'poin → selisih gol → gol masuk'
WHERE NOT EXISTS (SELECT 1 FROM event_settings);

-- b. Inisialisasi akun Superadmin default: username 'admin', password 'annurminsoc2026'
-- (Aman: hanya dibuat jika username 'admin' belum ada)
INSERT INTO admin_users (username, password_hash, role, active)
SELECT 'admin', '$2b$10$YvYO5NeIw40CJ4WC3vB9CeULqHZHgGoRL3I1XcxdP7GiCHILalyQq', 'superadmin', true
WHERE NOT EXISTS (SELECT 1 FROM admin_users WHERE username = 'admin');

-- ------------------------------------------------------------------------------
-- 8. INDEXING UNTUK KECEPATAN QUERY
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date);
CREATE INDEX IF NOT EXISTS idx_matches_team_a ON matches(team_a_id);
CREATE INDEX IF NOT EXISTS idx_matches_team_b ON matches(team_b_id);
CREATE INDEX IF NOT EXISTS idx_matches_stage ON matches(stage);
CREATE INDEX IF NOT EXISTS idx_matches_category ON matches(category);
CREATE INDEX IF NOT EXISTS idx_teams_group ON teams(group_name);
CREATE INDEX IF NOT EXISTS idx_teams_category ON teams(category);
CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);

-- ------------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS) & KEBIJAKAN AKSES
-- ------------------------------------------------------------------------------
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Policy Publik (Read Only untuk pengunjung / official)
DROP POLICY IF EXISTS "Public can read teams" ON teams;
CREATE POLICY "Public can read teams" ON teams FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can read matches" ON matches;
CREATE POLICY "Public can read matches" ON matches FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can read event_settings" ON event_settings;
CREATE POLICY "Public can read event_settings" ON event_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can read players" ON players;
CREATE POLICY "Public can read players" ON players FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can read match_events" ON match_events;
CREATE POLICY "Public can read match_events" ON match_events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can read sponsors" ON sponsors;
CREATE POLICY "Public can read sponsors" ON sponsors FOR SELECT USING (true);

-- Policy Service Role (Akses penuh untuk Server API & Superadmin Backend)
DROP POLICY IF EXISTS "Service role full access match_events" ON match_events;
CREATE POLICY "Service role full access match_events" ON match_events FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access sponsors" ON sponsors;
CREATE POLICY "Service role full access sponsors" ON sponsors FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access teams" ON teams;
CREATE POLICY "Service role full access teams" ON teams FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access matches" ON matches;
CREATE POLICY "Service role full access matches" ON matches FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access event_settings" ON event_settings;
CREATE POLICY "Service role full access event_settings" ON event_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access players" ON players;
CREATE POLICY "Service role full access players" ON players FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access admin_users" ON admin_users;
CREATE POLICY "Service role full access admin_users" ON admin_users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access audit_log" ON audit_log;
CREATE POLICY "Service role full access audit_log" ON audit_log FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 10. TRIGGER AUTO-UPDATE `updated_at` PADA TABEL MATCHES
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS matches_updated_at ON matches;
CREATE TRIGGER matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==============================================================================
-- OPSIONAL: CONTOH DATA TIM TURNAMEN (Hapus tanda komentar /* */ jika ingin diisi)
-- ==============================================================================
/*
-- 1. Contoh Tim U10 (Grup A, B, C, D)
INSERT INTO teams (id, name, short_name, group_name, color, category) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Garuda Muda FC', 'GAR', 'A', '#0B3D91', 'U10'),
  ('a2222222-2222-2222-2222-222222222222', 'Bintang Timur FC', 'BTM', 'A', '#1E63D6', 'U10'),
  ('a3333333-3333-3333-3333-333333333333', 'Elang Perkasa', 'ELG', 'B', '#2563EB', 'U10'),
  ('a4444444-4444-4444-4444-444444444444', 'Rajawali Sakti', 'RJW', 'B', '#0284C7', 'U10'),
  ('a5555555-5555-5555-5555-555555555555', 'Harimau Putih', 'HMP', 'C', '#059669', 'U10'),
  ('a6666666-6666-6666-6666-666666666666', 'Singa Muda', 'SGM', 'C', '#D97706', 'U10'),
  ('a7777777-7777-7777-7777-777777777777', 'Badak Mandiri', 'BDK', 'D', '#DC2626', 'U10'),
  ('a8888888-8888-8888-8888-888888888888', 'An-Nur All Star U10', 'ANN', 'D', '#7C3AED', 'U10');

-- 2. Contoh Tim U12 (Grup A, B, C, D — diselaraskan dari lembar PDF W, X, Y, Z karena beda hari)
INSERT INTO teams (id, name, short_name, group_name, color, category) VALUES
  ('b1111111-1111-1111-1111-111111111111', 'Satria FC', 'STR', 'A', '#0B3D91', 'U12'),
  ('b2222222-2222-2222-2222-222222222222', 'Kencana United', 'KNC', 'A', '#1E63D6', 'U12'),
  ('b3333333-3333-3333-3333-333333333333', 'Cahaya Timur', 'CHT', 'B', '#2563EB', 'U12'),
  ('b4444444-4444-4444-4444-444444444444', 'Putra Samudra', 'PSM', 'B', '#0284C7', 'U12'),
  ('b5555555-5555-5555-5555-555555555555', 'Mitra Perkasa', 'MTR', 'C', '#059669', 'U12'),
  ('b6666666-6666-6666-6666-666666666666', 'Tunas Muda', 'TNS', 'C', '#D97706', 'U12'),
  ('b7777777-7777-7777-7777-777777777777', 'Bintang Laut', 'BLT', 'D', '#DC2626', 'U12'),
  ('b8888888-8888-8888-8888-888888888888', 'An-Nur All Star U12', 'ANZ', 'D', '#7C3AED', 'U12');
*/
