-- Migration: Update matches_stage_check constraint for Quarter-finals and 3rd place playoff
-- Run this in Supabase Dashboard -> SQL Editor if not yet updated:

ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_stage_check;
ALTER TABLE matches ADD CONSTRAINT matches_stage_check 
  CHECK (stage IN ('grup', 'perempat_final', 'semifinal', 'juara_3', 'final'));

ALTER TABLE matches ADD COLUMN IF NOT EXISTS penalty_score_a INT DEFAULT NULL;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS penalty_score_b INT DEFAULT NULL;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS winner_team_id UUID REFERENCES teams(id);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;
