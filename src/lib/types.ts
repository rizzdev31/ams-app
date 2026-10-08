// === Database Types ===

export type MatchStatus = 'scheduled' | 'live' | 'halftime' | 'finished';
export type MatchStage = 'grup' | 'perempat_final' | 'semifinal' | 'juara_3' | 'final';

export interface Team {
  id: string;
  name: string;
  short_name: string;
  logo_url: string | null;
  group_name: string;
  color: string | null;
  created_at: string;
  /** Kategori kompetisi: 'U10' | 'U12'. Opsional sampai migrasi Fase 3. */
  category?: string | null;
}

export interface Match {
  id: string;
  team_a_id: string;
  team_b_id: string;
  score_a: number;
  score_b: number;
  status: MatchStatus;
  match_date: string;
  kickoff_time: string;
  field: string;
  stage: MatchStage;
  group_name: string | null;
  updated_at: string;
  /** Kategori kompetisi: 'U10' | 'U12'. Opsional sampai migrasi Fase 3. */
  category?: string | null;
  /** Skor adu penalti (khusus babak sistem gugur jika skor normal imbang) */
  penalty_score_a?: number | null;
  penalty_score_b?: number | null;
  /** ID Tim pemenang yang ditentukan secara eksplisit (penalti / WO / diskualifikasi / coin toss) */
  winner_team_id?: string | null;
  /** Catatan khusus pertandingan (misal: "Menang Adu Penalti 3-2", "WO 3-0", dll) */
  notes?: string | null;
}

export type MatchEventType = 'goal' | 'yellow_card' | 'red_card';

export interface MatchEvent {
  id: string;
  match_id: string;
  team_id: string;
  player_id?: string | null;
  player_name: string;
  type: MatchEventType;
  minute: number;
  note?: string | null;
  created_at?: string;
}

export interface MatchWithTeams extends Match {
  team_a: Team;
  team_b: Team;
  events?: MatchEvent[];
}

export type PlayerPosition = 'GK' | 'DF' | 'MF' | 'FW';

export interface Player {
  id: string;
  team_id: string;
  name: string;
  jersey_number: number | null;
  position: PlayerPosition | null;
  created_at: string;
}

export interface EventSettings {
  id: string;
  event_name: string;
  start_date: string;
  end_date: string;
  location: string;
  map_url: string | null;
  rules_text: string | null;
  tiebreak_rules: string;
  contact_info: string | null;
  passcode_field_1?: string;
  passcode_field_2?: string;
  passcode_scorer?: string;
}

// === Computed Types ===

export interface StandingRow {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
}

export interface GroupStandings {
  group_name: string;
  rows: StandingRow[];
}

// === API Types ===

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface TeamFormData {
  name: string;
  short_name: string;
  logo_url?: string;
  group_name: string;
  color?: string;
  category: string;
}

export interface MatchFormData {
  team_a_id: string;
  team_b_id: string;
  match_date: string;
  kickoff_time: string;
  field: string;
  stage: MatchStage;
  group_name?: string;
  category: string;
}

// === Sponsorship Types ===

export type SponsorTier = 'platinum' | 'gold' | 'silver' | 'partner';

export interface Sponsor {
  id: string;
  name: string;
  logo_url: string;
  tier: SponsorTier;
  website_url?: string | null;
  display_order: number;
  active: boolean;
  created_at?: string;
}

export interface SponsorFormData {
  name: string;
  logo_url: string;
  tier: SponsorTier;
  website_url?: string;
  display_order?: number;
  active?: boolean;
}

