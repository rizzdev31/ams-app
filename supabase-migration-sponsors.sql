-- ==============================================================================
-- MIGRASI SUPABASE: TABEL SPONSORS (SPONSORSHIP & PARTNERS TURNAMEN)
-- ==============================================================================
-- Jalankan skrip ini di SQL Editor Supabase untuk mengaktifkan fitur manajemen
-- sponsorship dan official partner turnamen.
-- ==============================================================================

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

-- Indeks performa
CREATE INDEX IF NOT EXISTS idx_sponsors_tier ON sponsors(tier);
CREATE INDEX IF NOT EXISTS idx_sponsors_active ON sponsors(active);
CREATE INDEX IF NOT EXISTS idx_sponsors_order ON sponsors(display_order);

-- Aktifkan Row Level Security (RLS)
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;

-- Kebijakan RLS:
-- 1. Siapa saja (publik) dapat membaca daftar sponsor
DROP POLICY IF EXISTS "Allow public read sponsors" ON sponsors;
CREATE POLICY "Allow public read sponsors" ON sponsors
  FOR SELECT USING (true);

-- 2. Service role (server API panitia) memiliki hak penuh (INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "Allow service role full access to sponsors" ON sponsors;
CREATE POLICY "Allow service role full access to sponsors" ON sponsors
  FOR ALL USING (true) WITH CHECK (true);
