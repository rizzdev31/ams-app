import type { Match, MatchWithTeams, Team, StandingRow, GroupStandings } from './types';

/**
 * Calculate standings from finished matches for a specific group
 */
export function calculateStandings(
  teams: Team[],
  matches: Match[] | MatchWithTeams[],
  groupName: string
): StandingRow[] {
  const groupTeams = teams.filter((t) => t.group_name === groupName);
  const finishedMatches = matches.filter((m) => {
    if (m.status !== 'finished') return false;
    // Jangan pernah hitung laga babak gugur (8 besar, semifinal, final) ke klasemen grup
    if (m.stage && m.stage !== 'grup') return false;
    if (m.group_name === groupName) return true;
    // Fallback: baris matches tanpa group_name tetap dihitung selama
    // kedua timnya ada di grup ini (data lama bisa NULL/kosong).
    if (!m.group_name) {
      const ta = teams.find((t) => t.id === m.team_a_id);
      const tb = teams.find((t) => t.id === m.team_b_id);
      return ta?.group_name === groupName && tb?.group_name === groupName;
    }
    return false;
  });

  const rows: StandingRow[] = groupTeams.map((team) => {
    let played = 0, won = 0, drawn = 0, lost = 0, gf = 0, ga = 0;

    finishedMatches.forEach((m) => {
      let scored: number | undefined;
      let conceded: number | undefined;

      if (m.team_a_id === team.id) {
        scored = m.score_a;
        conceded = m.score_b;
      } else if (m.team_b_id === team.id) {
        scored = m.score_b;
        conceded = m.score_a;
      }

      if (scored !== undefined && conceded !== undefined) {
        played++;
        gf += scored;
        ga += conceded;
        if (scored > conceded) won++;
        else if (scored === conceded) drawn++;
        else lost++;
      }
    });

    return {
      team,
      played,
      won,
      drawn,
      lost,
      goals_for: gf,
      goals_against: ga,
      goal_difference: gf - ga,
      // Regulasi Resmi Turnamen: Menang = 2 Poin, Seri = 1 Poin, Kalah = 0 Poin
      points: won * 2 + drawn,
    };
  });

  // Helper untuk menentukan hasil Head-to-Head langsung antara 2 tim
  const getHeadToHead = (teamAId: string, teamBId: string): number => {
    const directMatch = finishedMatches.find(
      (m) =>
        (m.team_a_id === teamAId && m.team_b_id === teamBId) ||
        (m.team_a_id === teamBId && m.team_b_id === teamAId)
    );
    if (!directMatch) return 0;
    const scoreA = directMatch.team_a_id === teamAId ? directMatch.score_a : directMatch.score_b;
    const scoreB = directMatch.team_a_id === teamBId ? directMatch.score_a : directMatch.score_b;
    return scoreA - scoreB; // >0 jika A menang, <0 jika B menang
  };

  // Hierarki Tiebreaker Resmi Turnamen:
  // 1. Akumulasi Poin Tertinggi (M=2, S=1, K=0)
  // 2. Selisih Gol Tertinggi (Goal Difference = Gol Masuk - Gol Kebobolan)
  // 3. Produktivitas Gol Tertinggi (Jumlah Gol Memasukkan / Gol Dicetak)
  // 4. Head-to-Head (Hasil pertemuan langsung antar tim yang berpoin sama)
  // 5. Gol Kebobolan Tersedikit (Goals Against Terendah)
  // 6. Urutan Nama Tim (Alfabetis)
  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference;
    if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;

    const h2h = getHeadToHead(a.team.id, b.team.id);
    if (h2h !== 0) return -h2h;

    if (a.goals_against !== b.goals_against) return a.goals_against - b.goals_against;

    return a.team.name.localeCompare(b.team.name);
  });

  return rows;
}

/**
 * Calculate standings for all groups
 */
export function calculateAllStandings(
  teams: Team[],
  matches: Match[] | MatchWithTeams[]
): GroupStandings[] {
  const groupNames = [...new Set(teams.map((t) => t.group_name))].sort();
  return groupNames.map((group_name) => ({
    group_name,
    rows: calculateStandings(teams, matches, group_name),
  }));
}

/**
 * Label posisi pemain dalam Bahasa Indonesia.
 */
export function positionLabel(p: string | null | undefined): string {
  switch (p) {
    case 'GK': return 'Kiper';
    case 'DF': return 'Belakang';
    case 'MF': return 'Tengah';
    case 'FW': return 'Depan';
    default: return '–';
  }
}

/**
 * Tanggal hari ini dalam zona WIB (Asia/Jakarta) sebagai YYYY-MM-DD.
 * Jangan pakai `new Date().toISOString().split('T')[0]` — itu UTC dan bisa
 * geser H-1/H+1 di sekitar tengah malam WIB.
 */
export function todayWIB(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return parts; // en-CA = YYYY-MM-DD
}

/**
 * Format date to Indonesian locale
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Format short date
 */
export function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Format time (HH:MM)
 */
export function formatTime(timeStr: string): string {
  return timeStr.slice(0, 5);
}

/**
 * Get status label in Indonesian
 */
export function getStatusLabel(status: string): string {
  switch (status) {
    case 'scheduled': return 'Akan Datang';
    case 'live': return 'LIVE';
    case 'halftime': return 'Istirahat';
    case 'finished': return 'Selesai';
    default: return status;
  }
}

/**
 * Label babak / fase turnamen dalam Bahasa Indonesia
 */
export function getStageLabel(stage: string): string {
  switch (stage) {
    case 'grup': return 'Babak Grup';
    case 'perempat_final': return '8 Besar';
    case 'semifinal': return 'Semifinal';
    case 'juara_3': return 'Juara 3';
    case 'final': return 'Final';
    default: return stage;
  }
}

/**
 * Get status color classes
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'live': return 'bg-red-500 text-white';
    case 'halftime': return 'bg-yellow-500 text-white';
    case 'finished': return 'bg-gray-500 text-white';
    case 'scheduled': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Get initials from team name (for placeholder logo)
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Calculate countdown to event
 */
export function getCountdown(targetDate: string): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
} {
  const target = new Date(targetDate).getTime();
  const now = Date.now();
  const diff = target - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    isPast: false,
  };
}

/**
 * Pemetaan partai resmi berdasarkan dokumen PDF turnamen:
 * - U-10 (Jumat, 9 Okt 2026): Partai 1 (07:00) s/d Partai 12 (13:30) dengan Ishoma (11:30-12:30)
 * - U-12 (Sabtu, 10 Okt 2026): Partai 1 (07:00) s/d Partai 12 (12:30)
 * - Babak gugur:
 *   - Perempat Final: 8 Besar · Partai 1 / 2
 *   - Semifinal: Semifinal · Partai 3
 *   - Final & Juara 3: Final / Juara 3 · Partai 4
 */
export function getMatchPartai(match: {
  stage?: string | null;
  kickoff_time?: string | null;
  category?: string | null;
}): { partaiNum: number | null; label: string } {
  const time = match.kickoff_time?.slice(0, 5) || '';
  const cat = match.category ?? 'U10';
  const stage = match.stage ?? 'grup';

  if (stage === 'grup') {
    if (cat === 'U10') {
      const u10Map: Record<string, number> = {
        '07:00': 1,
        '07:30': 2,
        '08:00': 3,
        '08:30': 4,
        '09:00': 5,
        '09:30': 6,
        '10:00': 7,
        '10:30': 8,
        '11:00': 9,
        '12:30': 10,
        '13:00': 11,
        '13:30': 12,
      };
      const num = u10Map[time];
      if (num) return { partaiNum: num, label: `Partai ${num}` };
    } else {
      // U12
      const u12Map: Record<string, number> = {
        '07:00': 1,
        '07:30': 2,
        '08:00': 3,
        '08:30': 4,
        '09:00': 5,
        '09:30': 6,
        '10:00': 7,
        '10:30': 8,
        '11:00': 9,
        '11:30': 10,
        '12:00': 11,
        '12:30': 12,
      };
      const num = u12Map[time];
      if (num) return { partaiNum: num, label: `Partai ${num}` };
    }
    return { partaiNum: null, label: 'Fase Grup' };
  }

  if (stage === 'perempat_final') {
    const isFirstWave = (cat === 'U10' && time === '14:00') || (cat === 'U12' && time === '13:00');
    return {
      partaiNum: isFirstWave ? 1 : 2,
      label: `8 Besar (Partai ${isFirstWave ? 1 : 2})`,
    };
  }
  if (stage === 'semifinal') {
    return { partaiNum: 3, label: 'Semifinal (Partai 3)' };
  }
  if (stage === 'final') {
    return { partaiNum: 4, label: 'Final (Partai 4)' };
  }
  if (stage === 'juara_3') {
    return { partaiNum: 4, label: 'Juara 3 (Partai 4)' };
  }

  return { partaiNum: null, label: stage };
}

/**
 * Mengembalikan kode legacy grup PDF untuk U-12 jika diperlukan (A -> W, B -> X, C -> Y, D -> Z)
 */
export function getU12LegacyGroup(group: string | null | undefined): string {
  if (!group) return '';
  const map: Record<string, string> = {
    A: 'W',
    B: 'X',
    C: 'Y',
    D: 'Z',
  };
  return map[group.toUpperCase()] || group;
}

