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
  /** Kategori fokus turnamen yang sedang berjalan aktif: 'U10' | 'U12' | 'Semua' */
  active_category?: string;
  /** Tanggal pertandingan fokus turnamen yang sedang berjalan aktif: '2026-10-09' | '2026-10-10' */
  active_date?: string;
  /** Poin untuk kemenangan di fase grup (default 3 poin) */
  points_per_win?: number;
}

// === Archive / Container Snapshot Types ===

export interface TournamentArchiveSnapshot {
  archived_at: string;
  category: string;
  total_teams: number;
  total_matches: number;
  finished_matches: number;
  champion_name?: string | null;
  runner_up_name?: string | null;
  third_place_name?: string | null;
  fourth_place_name?: string | null;
  teams: Team[];
  matches: MatchWithTeams[];
  group_standings?: Record<string, StandingRow[]>;
  bracket_summary?: {
    qf?: { code: string; title: string; score: string; winner?: string; byPenalty?: boolean }[];
    sf?: { code: string; title: string; score: string; winner?: string; byPenalty?: boolean }[];
    final?: { title: string; score: string; winner?: string; byPenalty?: boolean };
    third_place?: { title: string; score: string; winner?: string; byPenalty?: boolean };
  };
}

export interface TournamentArchive {
  id: string;
  name: string; // Custom nama dari superadmin, misal: "Turnamen U-10 Selesai (9 Okt 2026)"
  category: string; // 'U10' | 'U12' | 'Semua'
  match_date?: string | null;
  description?: string | null;
  snapshot_data: TournamentArchiveSnapshot;
  created_at: string;
}

export interface TournamentArchiveFormData {
  name: string;
  category: string;
  match_date?: string;
  description?: string;
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

