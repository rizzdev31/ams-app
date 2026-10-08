-- ==============================================================================
-- MIGRASI SUPABASE: TABEL MATCH EVENTS (PENCETAK GOL & KARTU)
-- ==============================================================================
-- Jalankan skrip ini di SQL Editor Supabase untuk mengaktifkan fitur pencatatan
-- pencetak gol dan pemberian kartu kuning / kartu merah.
-- ==============================================================================

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

-- Indeks performa pencarian event per pertandingan
CREATE INDEX IF NOT EXISTS idx_match_events_match_id ON match_events(match_id);
CREATE INDEX IF NOT EXISTS idx_match_events_team_id ON match_events(team_id);

-- Aktifkan Row Level Security (RLS)
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;

-- Kebijakan RLS:
-- 1. Siapa saja (publik) dapat membaca event pertandingan
DROP POLICY IF EXISTS "Allow public read match_events" ON match_events;
CREATE POLICY "Allow public read match_events" ON match_events
  FOR SELECT USING (true);

-- 2. Service role (server API panitia) memiliki hak penuh (INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "Allow service role full access to match_events" ON match_events;
CREATE POLICY "Allow service role full access to match_events" ON match_events
  FOR ALL USING (true) WITH CHECK (true);
