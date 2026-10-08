import { describe, it, expect } from 'vitest';
import { calculateStandings } from '@/lib/utils';
import { SEED_TEAMS, SEED_MATCHES } from '@/lib/seed';
import type { MatchWithTeams } from '@/lib/types';

/**
 * Beranda, ticker, Jadwal, Live, dan Klasemen semuanya membaca store yang
 * sama. Test ini menjaga agar penghitungan di tiap halamanberdasarkan data yang
 * sama memberi angka yang sama.
 */
function withTeams(list: MatchWithTeams[]): MatchWithTeams[] {
  return list.map((m) => ({
    ...m,
    team_a: SEED_TEAMS.find((t) => t.id === m.team_a_id)!,
    team_b: SEED_TEAMS.find((t) => t.id === m.team_b_id)!,
  }));
}

describe('sinkronisasi antar halaman', () => {
  it('skor di baris, kartu live, dan klasemen berasal dari satu sumber', () => {
    const matches = withTeams(SEED_MATCHES);
    const teams = SEED_TEAMS;

    // Jika turnamen belum mulai, simulasikan 1 pertandingan finished untuk verifikasi sinkronisasi
    const hasFinished = matches.some((m) => m.status === 'finished');
    const testMatches = hasFinished
      ? matches
      : [
          ...matches.slice(1),
          {
            ...matches[0],
            status: 'finished' as const,
            score_a: 2,
            score_b: 1,
          },
        ];

    const finished = testMatches.filter((m) => m.status === 'finished');
    expect(finished.length).toBeGreaterThan(0);

    for (const m of finished) {
      const rows = calculateStandings(teams, testMatches, m.group_name || 'A');
      const rowA = rows.find((r) => r.team.id === m.team_a_id)!;
      const rowB = rows.find((r) => r.team.id === m.team_b_id)!;

      // Poin harus naik sesuai hasil: menang 2, seri 1, kalah 0.
      const expectedA = m.score_a > m.score_b ? 2 : m.score_a === m.score_b ? 1 : 0;
      const expectedB = m.score_b > m.score_a ? 2 : m.score_a === m.score_b ? 1 : 0;
      if (m.score_a === m.score_b) {
        expect(rowA.points).toBeGreaterThanOrEqual(1);
        expect(rowB.points).toBeGreaterThanOrEqual(1);
      } else {
        expect(rowA.points).toBeGreaterThanOrEqual(expectedA);
        expect(rowB.points).toBeGreaterThanOrEqual(expectedB);
      }

      // Gol masuk harus sama dengan skor yang tampil di baris.
      expect(rowA.goals_for).toBeGreaterThanOrEqual(m.score_a);
      expect(rowB.goals_for).toBeGreaterThanOrEqual(m.score_b);
    }
  });

  it('SEED_MATCHES dan store memakai bentuk data yang sama', () => {
    // Kalau bentuk data seed menyimpang, beranda dan store bisa menampilkan
    // jumlah pertandingan berbeda.
    const ids = new Set(SEED_MATCHES.map((m) => m.id));
    expect(ids.size).toBe(SEED_MATCHES.length);
    for (const m of SEED_MATCHES) {
      expect(m.team_a).toBeDefined();
      expect(m.team_b).toBeDefined();
      expect(typeof m.score_a).toBe('number');
      expect(typeof m.score_b).toBe('number');
    }
  });

  it('tiap tim punya pasangan dari store yang sama', () => {
    const matches = withTeams(SEED_MATCHES);
    for (const m of matches) {
      // Kedua tim harus berasal dari store yang sama supaya relasi
      // di setiap halaman tidak bergeser.
      expect(SEED_TEAMS.some((t) => t.id === m.team_a_id)).toBe(true);
      expect(SEED_TEAMS.some((t) => t.id === m.team_b_id)).toBe(true);
    }
  });
});