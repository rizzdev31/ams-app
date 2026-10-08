import { describe, it, expect } from 'vitest';
import {
  calculateStandings,
  calculateAllStandings,
  getInitials,
  getStatusLabel,
  getMatchPartai,
  getU12LegacyGroup,
} from '@/lib/utils';
import type { Team, Match } from '@/lib/types';

const teams: Team[] = [
  { id: 'a', name: 'Alpha', short_name: 'ALP', group_name: 'A', logo_url: null, color: null, created_at: '' },
  { id: 'b', name: 'Beta', short_name: 'BET', group_name: 'A', logo_url: null, color: null, created_at: '' },
  { id: 'c', name: 'Gamma', short_name: 'GAM', group_name: 'B', logo_url: null, color: null, created_at: '' },
];

const matches: Match[] = [
  { id: '1', team_a_id: 'a', team_b_id: 'b', score_a: 3, score_b: 1, status: 'finished', group_name: 'A', match_date: '', kickoff_time: '', field: '', stage: 'grup', updated_at: '' },
  { id: '2', team_a_id: 'a', team_b_id: 'b', score_a: 0, score_b: 0, status: 'finished', group_name: '', match_date: '', kickoff_time: '', field: '', stage: 'grup', updated_at: '' },
  { id: '3', team_a_id: 'a', team_b_id: 'b', score_a: 2, score_b: 2, status: 'live', group_name: 'A', match_date: '', kickoff_time: '', field: '', stage: 'grup', updated_at: '' },
];

describe('calculateStandings', () => {
  it('menghitung poin (menang=2, seri=1, kalah=0), GD, dan urutan dengan benar', () => {
    const rows = calculateStandings(teams, matches, 'A');
    const alpha = rows.find((r) => r.team.id === 'a')!;
    const beta = rows.find((r) => r.team.id === 'b')!;
    expect(alpha.played).toBe(2);
    expect(alpha.won).toBe(1);
    expect(alpha.drawn).toBe(1);
    expect(alpha.goals_for).toBe(3);
    expect(alpha.goals_against).toBe(1);
    expect(alpha.goal_difference).toBe(2);
    // Menang 1x (2 pt) + Seri 1x (1 pt) = 3 pt
    expect(alpha.points).toBe(3);
    // Kalah 1x (0 pt) + Seri 1x (1 pt) = 1 pt
    expect(beta.points).toBe(1);
    expect(rows[0].team.id).toBe('a');
  });

  it('menggunakan Head-to-Head ketika poin, selisih gol, dan gol masuk sama persis', () => {
    const testTeams: Team[] = [
      { id: 't1', name: 'Team One', short_name: 'TO', group_name: 'X', logo_url: null, color: null, created_at: '' },
      { id: 't2', name: 'Team Two', short_name: 'TT', group_name: 'X', logo_url: null, color: null, created_at: '' },
    ];
    // Kedua tim punya statistik yang sama persis terhadap lawan lain, tapi saling berhadapan Team One menang 2-1
    const testMatches: Match[] = [
      { id: 'm1', team_a_id: 't1', team_b_id: 't2', score_a: 2, score_b: 1, status: 'finished', group_name: 'X', match_date: '', kickoff_time: '', field: '', stage: 'grup', updated_at: '' },
      { id: 'm2', team_a_id: 't2', team_b_id: 't1', score_a: 1, score_b: 0, status: 'finished', group_name: 'X', match_date: '', kickoff_time: '', field: '', stage: 'grup', updated_at: '' },
    ];
    const rows = calculateStandings(testTeams, [testMatches[0]], 'X');
    // Team One menang atas Team Two -> Team One di posisi 1
    expect(rows[0].team.id).toBe('t1');
    expect(rows[1].team.id).toBe('t2');
  });

  it('mengabaikan pertandingan yang belum selesai', () => {
    const rows = calculateStandings(teams, matches, 'A');
    const alpha = rows.find((r) => r.team.id === 'a')!;
    expect(alpha.played).toBe(2); // laga live tidak dihitung
  });

  it('fallback ke grup tim saat match.group_name kosong', () => {
    const rows = calculateStandings(teams, matches, 'A');
    const beta = rows.find((r) => r.team.id === 'b')!;
    expect(beta.played).toBe(2); // match id=2 (group_name kosong) tetap dihitung
  });
});

describe('calculateAllStandings', () => {
  it('memisahkan grup A dan B', () => {
    const groups = calculateAllStandings(teams, matches);
    expect(groups.map((g) => g.group_name)).toEqual(['A', 'B']);
    const b = groups.find((g) => g.group_name === 'B')!;
    expect(b.rows[0].played).toBe(0);
  });
});

describe('helpers', () => {
  it('getInitials', () => {
    expect(getInitials('Annur All Star')).toBe('AA');
  });
  it('getStatusLabel', () => {
    expect(getStatusLabel('live')).toBe('LIVE');
  });
  it('getMatchPartai U10 dan U12 sesuai lembar PDF', () => {
    // U10
    expect(getMatchPartai({ category: 'U10', stage: 'grup', kickoff_time: '07:00:00' }).label).toBe('Partai 1');
    expect(getMatchPartai({ category: 'U10', stage: 'grup', kickoff_time: '11:00:00' }).label).toBe('Partai 9');
    expect(getMatchPartai({ category: 'U10', stage: 'grup', kickoff_time: '12:30:00' }).label).toBe('Partai 10');
    expect(getMatchPartai({ category: 'U10', stage: 'grup', kickoff_time: '13:30:00' }).label).toBe('Partai 12');
    // U12
    expect(getMatchPartai({ category: 'U12', stage: 'grup', kickoff_time: '07:00:00' }).label).toBe('Partai 1');
    expect(getMatchPartai({ category: 'U12', stage: 'grup', kickoff_time: '11:30:00' }).label).toBe('Partai 10');
    expect(getMatchPartai({ category: 'U12', stage: 'grup', kickoff_time: '12:30:00' }).label).toBe('Partai 12');
    // Babak Gugur
    expect(getMatchPartai({ category: 'U10', stage: 'perempat_final', kickoff_time: '14:00:00' }).label).toContain('8 Besar');
    expect(getMatchPartai({ category: 'U10', stage: 'semifinal', kickoff_time: '15:00:00' }).label).toContain('Semifinal');
    expect(getMatchPartai({ category: 'U10', stage: 'final', kickoff_time: '15:30:00' }).label).toBe('Final (Partai 4)');
  });
  it('getU12LegacyGroup mapping W, X, Y, Z', () => {
    expect(getU12LegacyGroup('A')).toBe('W');
    expect(getU12LegacyGroup('B')).toBe('X');
    expect(getU12LegacyGroup('C')).toBe('Y');
    expect(getU12LegacyGroup('D')).toBe('Z');
  });
});
