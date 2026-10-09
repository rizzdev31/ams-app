import type { MatchWithTeams, Team, MatchStage } from './types';
import { calculateStandings } from './utils';

export interface BracketSlot {
  code: string;       // e.g. 'J:A', 'R:B', 'W:AA', 'L:EE'
  label: string;      // e.g. 'Juara Grup A', 'Runner-up Grup B'
  team: Team | null;
}

export interface KnockoutMatchNode {
  code: string;          // 'AA', 'BB', 'CC', 'DD', 'EE', 'FF', 'FINAL', 'JUARA_3'
  title: string;         // 'Perempat Final 1 (Grup AA)', etc.
  stage: MatchStage;
  field: string;         // '1' atau '2'
  kickoff_time: string;  // e.g. '14:00'
  match_date: string;    // '2026-10-09' (U10) atau '2026-10-10' (U12)
  homeSlot: BracketSlot;
  awaySlot: BracketSlot;
  match: MatchWithTeams | null;
  winnerTeam: Team | null;
  loserTeam: Team | null;
  isDrawWithoutWinner?: boolean;
  byPenalty?: boolean;
  byDecision?: boolean;
}

export interface TournamentBracket {
  category: 'U10' | 'U12';
  matchDate: string;
  isGroupStageComplete: boolean;
  quarterfinals: KnockoutMatchNode[];
  semifinals: KnockoutMatchNode[];
  finalMatch: KnockoutMatchNode;
  thirdPlaceMatch: KnockoutMatchNode;
  unresolvedDrawMatches: KnockoutMatchNode[];
}

export interface MatchOutcome {
  winner: Team | null;
  loser: Team | null;
  isDraw: boolean;
  byPenalty: boolean;
  byDecision: boolean;
}

export interface BracketBuildOptions {
  /** Override manual juara / runner-up grup (misal hasil coin-toss jika poin & statistik sama persis) */
  groupOverrides?: Record<string, { winnerId?: string; runnerUpId?: string }>;
  /** Override manual tim di slot bagan (misal { 'AA': { homeTeamId: '...', awayTeamId: '...' } }) */
  slotOverrides?: Record<string, { homeTeamId?: string; awayTeamId?: string }>;
}

/**
 * Konfigurasi skema babak gugur berdasarkan dokumen resmi:
 * - U-10: Jum'at, 9 Oktober 2026 (Grup A, B, C, D)
 * - U-12: Sabtu, 10 Oktober 2026 (Grup W, X, Y, Z)
 */
export const BRACKET_CONFIG = {
  U10: {
    date: '2026-10-09',
    groups: ['A', 'B', 'C', 'D'],
    qf: [
      { code: 'AA', title: 'Perempat Final 1 (Grup AA)', home: 'J:A', away: 'R:B', homeLabel: 'Juara Grup A', awayLabel: 'Runner-up Grup B', time: '14:00', field: '1' },
      { code: 'BB', title: 'Perempat Final 2 (Grup BB)', home: 'J:B', away: 'R:C', homeLabel: 'Juara Grup B', awayLabel: 'Runner-up Grup C', time: '14:00', field: '2' },
      { code: 'CC', title: 'Perempat Final 3 (Grup CC)', home: 'J:C', away: 'R:D', homeLabel: 'Juara Grup C', awayLabel: 'Runner-up Grup D', time: '14:30', field: '1' },
      { code: 'DD', title: 'Perempat Final 4 (Grup DD)', home: 'J:D', away: 'R:A', homeLabel: 'Juara Grup D', awayLabel: 'Runner-up Grup A', time: '14:30', field: '2' },
    ],
    sf: [
      { code: 'EE', title: 'Semifinal 1 (Match EE)', home: 'W:AA', away: 'W:BB', homeLabel: 'Pemenang 8 Besar AA', awayLabel: 'Pemenang 8 Besar BB', time: '15:00', field: '1' },
      { code: 'FF', title: 'Semifinal 2 (Match FF)', home: 'W:CC', away: 'W:DD', homeLabel: 'Pemenang 8 Besar CC', awayLabel: 'Pemenang 8 Besar DD', time: '15:00', field: '2' },
    ],
    final: { code: 'FINAL', title: 'Final Perebutan Juara 1 & 2', home: 'W:EE', away: 'W:FF', homeLabel: 'Pemenang Semifinal 1', awayLabel: 'Pemenang Semifinal 2', time: '15:30', field: '1' },
    thirdPlace: { code: 'JUARA_3', title: 'Perebutan Juara 3 & 4', home: 'L:EE', away: 'L:FF', homeLabel: 'Kalah Semifinal 1', awayLabel: 'Kalah Semifinal 2', time: '15:30', field: '2' },
  },
  U12: {
    date: '2026-10-10',
    groups: ['A', 'B', 'C', 'D'],
    qf: [
      { code: 'WW', title: 'Perempat Final 1 (Grup AA / WW)', home: 'J:A', away: 'R:B', homeLabel: 'Juara Grup A (W)', awayLabel: 'Runner-up Grup B (X)', time: '13:00', field: '1' },
      { code: 'XX', title: 'Perempat Final 2 (Grup BB / XX)', home: 'J:B', away: 'R:C', homeLabel: 'Juara Grup B (X)', awayLabel: 'Runner-up Grup C (Y)', time: '13:00', field: '2' },
      { code: 'YY', title: 'Perempat Final 3 (Grup CC / YY)', home: 'J:C', away: 'R:D', homeLabel: 'Juara Grup C (Y)', awayLabel: 'Runner-up Grup D (Z)', time: '13:30', field: '1' },
      { code: 'ZZ', title: 'Perempat Final 4 (Grup DD / ZZ)', home: 'J:D', away: 'R:A', homeLabel: 'Juara Grup D (Z)', awayLabel: 'Runner-up Grup A (W)', time: '13:30', field: '2' },
    ],
    sf: [
      { code: 'EE', title: 'Semifinal 1 (Match EE)', home: 'W:WW', away: 'W:XX', homeLabel: 'Pemenang 8 Besar 1 (WW)', awayLabel: 'Pemenang 8 Besar 2 (XX)', time: '14:00', field: '1' },
      { code: 'FF', title: 'Semifinal 2 (Match FF)', home: 'W:YY', away: 'W:ZZ', homeLabel: 'Pemenang 8 Besar 3 (YY)', awayLabel: 'Pemenang 8 Besar 4 (ZZ)', time: '14:00', field: '2' },
    ],
    final: { code: 'FINAL', title: 'Final Perebutan Juara 1 & 2', home: 'W:EE', away: 'W:FF', homeLabel: 'Pemenang Semifinal 1', awayLabel: 'Pemenang Semifinal 2', time: '14:30', field: '1' },
    thirdPlace: { code: 'JUARA_3', title: 'Perebutan Juara 3 & 4', home: 'L:EE', away: 'L:FF', homeLabel: 'Kalah Semifinal 1', awayLabel: 'Kalah Semifinal 2', time: '14:30', field: '2' },
  },
} as const;

/**
 * Menghitung juara (peringkat 1) dan runner-up (peringkat 2) dari masing-masing grup.
 * Mendukung opsi `groupOverrides` untuk intervensi superadmin (misal coin toss atau regulasi panitia).
 */
export function getGroupLeaders(
  category: 'U10' | 'U12',
  teams: Team[],
  matches: MatchWithTeams[],
  groupOverrides?: Record<string, { winnerId?: string; runnerUpId?: string }>
): Map<string, { winner: Team | null; runnerUp: Team | null; complete: boolean; overridden?: boolean }> {
  const cfg = BRACKET_CONFIG[category];
  const scopedTeams = teams.filter((t) => (t.category ?? 'U10') === category);
  const result = new Map<string, { winner: Team | null; runnerUp: Team | null; complete: boolean; overridden?: boolean }>();
  const legacyMap: Record<string, string> = { A: 'W', B: 'X', C: 'Y', D: 'Z', W: 'A', X: 'B', Y: 'C', Z: 'D' };

  for (const grp of cfg.groups) {
    let rows = calculateStandings(scopedTeams, matches, grp);
    let effectiveGrp: string = grp;
    if (rows.length === 0 && legacyMap[grp]) {
      const aliasRows = calculateStandings(scopedTeams, matches, legacyMap[grp]);
      if (aliasRows.length > 0) {
        rows = aliasRows;
        effectiveGrp = legacyMap[grp];
      }
    }

    const groupMatches = matches.filter(
      (m) =>
        (m.category ?? 'U10') === category &&
        m.stage === 'grup' &&
        (m.group_name === effectiveGrp || m.group_name === grp)
    );

    // Deteksi apakah fase grup sudah selesai:
    // 1. Jika ada override eksplisit dari panitia untuk juara & runner-up -> pasti complete.
    // 2. Jika semua laga terjadwal di grup ini sudah berstatus 'finished' (tahan skenario tim mundur/WO
    //    di mana jumlah laga bisa kurang dari 6 karena ada laga ditiadakan).
    const groupTeamsCount = scopedTeams.filter((t) => t.group_name === effectiveGrp || t.group_name === grp).length;
    const hasMatches = groupMatches.length > 0;
    const allMatchesFinished = hasMatches && groupMatches.every((m) => m.status === 'finished');
    const minMatchesExpected = groupTeamsCount <= 2 ? 1 : groupTeamsCount === 3 ? 3 : 6;
    let isComplete = allMatchesFinished && groupMatches.length >= Math.min(minMatchesExpected, groupMatches.length);

    let winner = rows[0]?.team ?? null;
    let runnerUp = rows[1]?.team ?? null;
    let overridden = false;

    // Cek jika ada override panitia/superadmin untuk grup ini
    const override = groupOverrides?.[grp] || (legacyMap[grp] ? groupOverrides?.[legacyMap[grp]] : undefined);
    if (override) {
      if (override.winnerId) {
        const found = scopedTeams.find((t) => t.id === override.winnerId);
        if (found) {
          winner = found;
          overridden = true;
        }
      }
      if (override.runnerUpId) {
        const found = scopedTeams.find((t) => t.id === override.runnerUpId);
        if (found) {
          runnerUp = found;
          overridden = true;
        }
      }
      // Jika panitia menetapkan juara dan runner-up manual (misal tiebreak koin toss atau tim WO),
      // tandai grup sebagai selesai sehingga babak gugur dapat diproses
      if (override.winnerId && override.runnerUpId) {
        isComplete = true;
      }
    }

    const item = {
      winner,
      runnerUp,
      complete: isComplete,
      overridden,
    };
    result.set(grp, item);
    if (legacyMap[grp]) {
      result.set(legacyMap[grp], item);
    }
  }

  return result;
}

/** 
 * Tentukan pemenang & yang kalah dari pertandingan yang sudah selesai.
 * Mendukung:
 * 1. Skor waktu normal (score_a vs score_b)
 * 2. Adu penalti (penalty_score_a vs penalty_score_b) jika waktu normal seri
 * 3. Keputusan khusus panitia (winner_team_id) untuk kasus WO / diskualifikasi / coin-toss
 */
export function getMatchOutcome(m: MatchWithTeams | null): MatchOutcome {
  if (!m || m.status !== 'finished') {
    return { winner: null, loser: null, isDraw: false, byPenalty: false, byDecision: false };
  }

  // 1. Selisih skor di waktu normal
  if (m.score_a > m.score_b) {
    return { winner: m.team_a, loser: m.team_b, isDraw: false, byPenalty: false, byDecision: false };
  }
  if (m.score_b > m.score_a) {
    return { winner: m.team_b, loser: m.team_a, isDraw: false, byPenalty: false, byDecision: false };
  }

  // 2. Skor waktu normal imbang (seri) -> Cek adu penalti
  const penA = m.penalty_score_a;
  const penB = m.penalty_score_b;
  if (typeof penA === 'number' && typeof penB === 'number' && penA !== penB) {
    if (penA > penB) {
      return { winner: m.team_a, loser: m.team_b, isDraw: true, byPenalty: true, byDecision: false };
    } else {
      return { winner: m.team_b, loser: m.team_a, isDraw: true, byPenalty: true, byDecision: false };
    }
  }

  // 3. Cek penetapan pemenang manual (misal WO 3-0, diskualifikasi, atau undian panitia)
  if (m.winner_team_id) {
    if (m.winner_team_id === m.team_a_id) {
      return { winner: m.team_a, loser: m.team_b, isDraw: true, byPenalty: false, byDecision: true };
    }
    if (m.winner_team_id === m.team_b_id) {
      return { winner: m.team_b, loser: m.team_a, isDraw: true, byPenalty: false, byDecision: true };
    }
  }

  // 4. Laga selesai imbang tapi belum ada penentuan pemenang (perlu adu penalti)
  return { winner: null, loser: null, isDraw: true, byPenalty: false, byDecision: false };
}

/**
 * Bangun struktur bagan lengkap untuk turnamen dengan pemetaan live match dari database.
 * Mendukung fleksibilitas options untuk override grup atau slot bagan tertentu.
 */
export function buildTournamentBracket(
  category: 'U10' | 'U12',
  teams: Team[],
  matches: MatchWithTeams[],
  options?: BracketBuildOptions
): TournamentBracket {
  const cfg = BRACKET_CONFIG[category];
  const leaders = getGroupLeaders(category, teams, matches, options?.groupOverrides);

  const isGroupStageComplete = cfg.groups.every((g) => leaders.get(g)?.complete);

  // Ambil pertandingan sistem gugur yang ada di DB untuk kategori ini
  const koMatches = matches.filter(
    (m) => (m.category ?? 'U10') === category && m.stage !== 'grup'
  );

  // Helper untuk mencari match di DB
  // 1. Mengutamakan kecocokan kode partai unik (group_name, misal 'AA', 'BB', 'CC', 'DD', 'EE', 'FF', 'FINAL', 'JUARA_3' atau alias U12)
  // 2. Fallback ke pencocokan stage + field + kickoff_time jika group_name belum terisi
  const findMatch = (stage: MatchStage, code: string, field: string, time: string): MatchWithTeams | null => {
    const byCode = koMatches.find((m) => {
      if (m.stage !== stage) return false;
      if (!m.group_name) return false;
      const gn = m.group_name.trim();
      if (gn === code) return true;
      // Alias mapping antara kode babak U10 dan U12
      if (code === 'AA' && gn === 'WW') return true;
      if (code === 'BB' && gn === 'XX') return true;
      if (code === 'CC' && gn === 'YY') return true;
      if (code === 'DD' && gn === 'ZZ') return true;
      if (code === 'WW' && gn === 'AA') return true;
      if (code === 'XX' && gn === 'BB') return true;
      if (code === 'YY' && gn === 'CC') return true;
      if (code === 'ZZ' && gn === 'DD') return true;
      return false;
    });
    if (byCode) return byCode;

    return (
      koMatches.find(
        (m) =>
          m.stage === stage &&
          m.field === field &&
          m.kickoff_time.slice(0, 5) === time.slice(0, 5)
      ) ?? null
    );
  };

  const findTeamById = (id?: string | null): Team | null => {
    if (!id) return null;
    return teams.find((t) => t.id === id) ?? null;
  };

  const unresolvedDrawMatches: KnockoutMatchNode[] = [];

  // 1. QUARTERFINALS (8 BESAR)
  const qfNodes: KnockoutMatchNode[] = cfg.qf.map((q) => {
    // home: J:A -> group A winner; away: R:B -> group B runner-up
    const homeGrp = q.home.split(':')[1];
    const awayGrp = q.away.split(':')[1];
    let homeTeam = leaders.get(homeGrp)?.winner ?? null;
    let awayTeam = leaders.get(awayGrp)?.runnerUp ?? null;

    // Periksa jika ada override slot manual untuk node ini
    const slotOvr = options?.slotOverrides?.[q.code];
    if (slotOvr?.homeTeamId) homeTeam = findTeamById(slotOvr.homeTeamId) ?? homeTeam;
    if (slotOvr?.awayTeamId) awayTeam = findTeamById(slotOvr.awayTeamId) ?? awayTeam;

    const dbMatch = findMatch('perempat_final', q.code, q.field, q.time);
    const outcome = getMatchOutcome(dbMatch);
    const isDrawWithoutWinner = Boolean(
      dbMatch && dbMatch.status === 'finished' && dbMatch.score_a === dbMatch.score_b && !outcome.winner
    );

    const node: KnockoutMatchNode = {
      code: q.code,
      title: q.title,
      stage: 'perempat_final',
      field: dbMatch?.field ?? q.field,
      kickoff_time: dbMatch?.kickoff_time ? dbMatch.kickoff_time.slice(0, 5) : q.time,
      match_date: dbMatch?.match_date ?? cfg.date,
      homeSlot: {
        code: q.home,
        label: q.homeLabel,
        team: slotOvr?.homeTeamId ? (findTeamById(slotOvr.homeTeamId) ?? homeTeam) : (dbMatch?.team_a ?? homeTeam),
      },
      awaySlot: {
        code: q.away,
        label: q.awayLabel,
        team: slotOvr?.awayTeamId ? (findTeamById(slotOvr.awayTeamId) ?? awayTeam) : (dbMatch?.team_b ?? awayTeam),
      },
      match: dbMatch,
      winnerTeam: outcome.winner,
      loserTeam: outcome.loser,
      isDrawWithoutWinner,
      byPenalty: outcome.byPenalty,
      byDecision: outcome.byDecision,
    };

    if (isDrawWithoutWinner) unresolvedDrawMatches.push(node);
    return node;
  });

  // Map hasil pemenang QF berdasarkan code (AA, BB, CC, DD / WW, XX, YY, ZZ)
  const qfWinners = new Map<string, Team | null>();
  qfNodes.forEach((node) => qfWinners.set(`W:${node.code}`, node.winnerTeam));

  // 2. SEMIFINALS
  const sfNodes: KnockoutMatchNode[] = cfg.sf.map((s) => {
    let homeTeam = qfWinners.get(s.home) ?? null;
    let awayTeam = qfWinners.get(s.away) ?? null;

    const slotOvr = options?.slotOverrides?.[s.code];
    if (slotOvr?.homeTeamId) homeTeam = findTeamById(slotOvr.homeTeamId) ?? homeTeam;
    if (slotOvr?.awayTeamId) awayTeam = findTeamById(slotOvr.awayTeamId) ?? awayTeam;

    const dbMatch = findMatch('semifinal', s.code, s.field, s.time);
    const outcome = getMatchOutcome(dbMatch);
    const isDrawWithoutWinner = Boolean(
      dbMatch && dbMatch.status === 'finished' && dbMatch.score_a === dbMatch.score_b && !outcome.winner
    );

    const node: KnockoutMatchNode = {
      code: s.code,
      title: s.title,
      stage: 'semifinal',
      field: dbMatch?.field ?? s.field,
      kickoff_time: dbMatch?.kickoff_time ? dbMatch.kickoff_time.slice(0, 5) : s.time,
      match_date: dbMatch?.match_date ?? cfg.date,
      homeSlot: {
        code: s.home,
        label: s.homeLabel,
        team: slotOvr?.homeTeamId ? (findTeamById(slotOvr.homeTeamId) ?? homeTeam) : (dbMatch?.team_a ?? homeTeam),
      },
      awaySlot: {
        code: s.away,
        label: s.awayLabel,
        team: slotOvr?.awayTeamId ? (findTeamById(slotOvr.awayTeamId) ?? awayTeam) : (dbMatch?.team_b ?? awayTeam),
      },
      match: dbMatch,
      winnerTeam: outcome.winner,
      loserTeam: outcome.loser,
      isDrawWithoutWinner,
      byPenalty: outcome.byPenalty,
      byDecision: outcome.byDecision,
    };

    if (isDrawWithoutWinner) unresolvedDrawMatches.push(node);
    return node;
  });

  const sfResults = new Map<string, { winner: Team | null; loser: Team | null }>();
  sfNodes.forEach((node) => {
    sfResults.set(node.code, { winner: node.winnerTeam, loser: node.loserTeam });
  });

  // 3. FINAL
  const finalMatch = (() => {
    const f = cfg.final;
    let homeTeam = sfResults.get('EE')?.winner ?? null;
    let awayTeam = sfResults.get('FF')?.winner ?? null;

    const slotOvr = options?.slotOverrides?.[f.code];
    if (slotOvr?.homeTeamId) homeTeam = findTeamById(slotOvr.homeTeamId) ?? homeTeam;
    if (slotOvr?.awayTeamId) awayTeam = findTeamById(slotOvr.awayTeamId) ?? awayTeam;

    const dbMatch = findMatch('final', f.code, f.field, f.time);
    const outcome = getMatchOutcome(dbMatch);
    const isDrawWithoutWinner = Boolean(
      dbMatch && dbMatch.status === 'finished' && dbMatch.score_a === dbMatch.score_b && !outcome.winner
    );

    const node: KnockoutMatchNode = {
      code: f.code,
      title: f.title,
      stage: 'final' as MatchStage,
      field: dbMatch?.field ?? f.field,
      kickoff_time: dbMatch?.kickoff_time ? dbMatch.kickoff_time.slice(0, 5) : f.time,
      match_date: dbMatch?.match_date ?? cfg.date,
      homeSlot: {
        code: f.home,
        label: f.homeLabel,
        team: slotOvr?.homeTeamId ? (findTeamById(slotOvr.homeTeamId) ?? homeTeam) : (dbMatch?.team_a ?? homeTeam),
      },
      awaySlot: {
        code: f.away,
        label: f.awayLabel,
        team: slotOvr?.awayTeamId ? (findTeamById(slotOvr.awayTeamId) ?? awayTeam) : (dbMatch?.team_b ?? awayTeam),
      },
      match: dbMatch,
      winnerTeam: outcome.winner,
      loserTeam: outcome.loser,
      isDrawWithoutWinner,
      byPenalty: outcome.byPenalty,
      byDecision: outcome.byDecision,
    };

    if (isDrawWithoutWinner) unresolvedDrawMatches.push(node);
    return node;
  })();

  // 4. PEREBUTAN JUARA 3
  const thirdPlaceMatch = (() => {
    const t = cfg.thirdPlace;
    let homeTeam = sfResults.get('EE')?.loser ?? null;
    let awayTeam = sfResults.get('FF')?.loser ?? null;

    const slotOvr = options?.slotOverrides?.[t.code];
    if (slotOvr?.homeTeamId) homeTeam = findTeamById(slotOvr.homeTeamId) ?? homeTeam;
    if (slotOvr?.awayTeamId) awayTeam = findTeamById(slotOvr.awayTeamId) ?? awayTeam;

    const dbMatch = findMatch('juara_3', t.code, t.field, t.time);
    const outcome = getMatchOutcome(dbMatch);
    const isDrawWithoutWinner = Boolean(
      dbMatch && dbMatch.status === 'finished' && dbMatch.score_a === dbMatch.score_b && !outcome.winner
    );

    const node: KnockoutMatchNode = {
      code: t.code,
      title: t.title,
      stage: 'juara_3' as MatchStage,
      field: dbMatch?.field ?? t.field,
      kickoff_time: dbMatch?.kickoff_time ? dbMatch.kickoff_time.slice(0, 5) : t.time,
      match_date: dbMatch?.match_date ?? cfg.date,
      homeSlot: {
        code: t.home,
        label: t.homeLabel,
        team: slotOvr?.homeTeamId ? (findTeamById(slotOvr.homeTeamId) ?? homeTeam) : (dbMatch?.team_a ?? homeTeam),
      },
      awaySlot: {
        code: t.away,
        label: t.awayLabel,
        team: slotOvr?.awayTeamId ? (findTeamById(slotOvr.awayTeamId) ?? awayTeam) : (dbMatch?.team_b ?? awayTeam),
      },
      match: dbMatch,
      winnerTeam: outcome.winner,
      loserTeam: outcome.loser,
      isDrawWithoutWinner,
      byPenalty: outcome.byPenalty,
      byDecision: outcome.byDecision,
    };

    if (isDrawWithoutWinner) unresolvedDrawMatches.push(node);
    return node;
  })();

  return {
    category,
    matchDate: cfg.date,
    isGroupStageComplete,
    quarterfinals: qfNodes,
    semifinals: sfNodes,
    finalMatch,
    thirdPlaceMatch,
    unresolvedDrawMatches,
  };
}

/**
 * Tipe isu diagnostik turnamen untuk Exception Handling Superadmin.
 */
export interface TournamentDiagnosticIssue {
  severity: 'error' | 'warning' | 'info';
  code: 'DRAW_UNRESOLVED_KNOCKOUT' | 'FIELD_TIME_CONFLICT' | 'STAGE_DEPENDENCY_PENDING' | 'MISMATCHED_CATEGORY' | 'INCOMPLETE_STANDINGS';
  title: string;
  description: string;
  matchId?: string;
  field?: string;
  date?: string;
  time?: string;
}

/**
 * Analisis diagnostik menyeluruh terhadap integritas jadwal, skor, dan bagan turnamen.
 * Sangat berguna untuk layar Superadmin sebelum babak gugur dimulai.
 */
export function diagnoseTournamentIssues(
  teams: Team[],
  matches: MatchWithTeams[]
): TournamentDiagnosticIssue[] {
  const issues: TournamentDiagnosticIssue[] = [];

  // 1. Periksa hasil laga sistem gugur yang seri tanpa pemenang
  matches.forEach((m) => {
    if (m.stage !== 'grup' && m.status === 'finished') {
      const outcome = getMatchOutcome(m);
      if (m.score_a === m.score_b && !outcome.winner) {
        issues.push({
          severity: 'error',
          code: 'DRAW_UNRESOLVED_KNOCKOUT',
          title: `Laga Babak Gugur Berakhir Seri Tanpa Pemenang Penalti`,
          description: `Partai ${m.team_a?.name || 'Tim A'} vs ${m.team_b?.name || 'Tim B'} (${m.stage}) berakhir ${m.score_a}-${m.score_b}, namun pemenang adu penalti / keputusan WO belum dicatat. Babak selanjutnya tidak dapat ditentukan.`,
          matchId: m.id,
          field: m.field,
          date: m.match_date,
          time: m.kickoff_time,
        });
      }
    }
  });

  // 2. Periksa bentrok jadwal di lapangan yang sama pada jam dan tanggal yang sama
  const slotMap = new Map<string, MatchWithTeams[]>();
  matches.forEach((m) => {
    const key = `${m.match_date}__${m.field}__${m.kickoff_time.slice(0, 5)}`;
    const list = slotMap.get(key) || [];
    list.push(m);
    slotMap.set(key, list);
  });

  slotMap.forEach((conflictMatches, key) => {
    if (conflictMatches.length > 1) {
      const [d, f, t] = key.split('__');
      issues.push({
        severity: 'warning',
        code: 'FIELD_TIME_CONFLICT',
        title: `Jadwal Bentrok di Lapangan ${f}`,
        description: `Terdapat ${conflictMatches.length} pertandingan dijadwalkan pada Lapangan ${f}, tanggal ${d}, jam ${t} WIB: ${conflictMatches.map((m) => `${m.team_a?.short_name || 'A'} vs ${m.team_b?.short_name || 'B'}`).join(' & ')}.`,
        field: f,
        date: d,
        time: t,
      });
    }
  });

  // 3. Periksa kesiapan fase grup saat babak gugur sudah ada yang live/selesai
  for (const cat of ['U10', 'U12'] as const) {
    const catMatches = matches.filter((m) => (m.category ?? 'U10') === cat);
    const catTeams = teams.filter((t) => (t.category ?? 'U10') === cat);
    if (catTeams.length === 0) continue;

    const groupMatches = catMatches.filter((m) => m.stage === 'grup');
    const knockoutMatches = catMatches.filter((m) => m.stage !== 'grup');

    const unfinishedGroup = groupMatches.filter((m) => m.status !== 'finished');
    const activeKnockout = knockoutMatches.filter((m) => m.status === 'live' || m.status === 'finished');

    if (unfinishedGroup.length > 0 && activeKnockout.length > 0) {
      issues.push({
        severity: 'warning',
        code: 'STAGE_DEPENDENCY_PENDING',
        title: `Fase Gugur Berjalan Sebelum Fase Grup Selesai (${cat})`,
        description: `Ada ${unfinishedGroup.length} laga grup yang belum selesai, tetapi babak gugur sudah dimulai/selesai. Pastikan bagan sudah disinkronkan dengan data final grup.`,
      });
    }
  }

  return issues;
}
