import { describe, it, expect } from 'vitest';
import { buildTournamentBracket, getGroupLeaders, BRACKET_CONFIG } from '@/lib/bracket';
import type { Team, MatchWithTeams } from '@/lib/types';

describe('Logika Bagan Babak Gugur (Bracket Logic)', () => {
  // Buat mock data untuk 4 grup U-10 (A, B, C, D)
  const mockTeamsU10: Team[] = [
    { id: 't-a1', name: 'TPA', short_name: 'TPA', group_name: 'A', category: 'U10', logo_url: null, color: null, created_at: '' },
    { id: 't-a2', name: 'Singoloyo', short_name: 'SGL', group_name: 'A', category: 'U10', logo_url: null, color: null, created_at: '' },
    { id: 't-b1', name: 'GPD', short_name: 'GPD', group_name: 'B', category: 'U10', logo_url: null, color: null, created_at: '' },
    { id: 't-b2', name: 'Bola FC', short_name: 'BLA', group_name: 'B', category: 'U10', logo_url: null, color: null, created_at: '' },
    { id: 't-c1', name: 'Forsgi', short_name: 'FSG', group_name: 'C', category: 'U10', logo_url: null, color: null, created_at: '' },
    { id: 't-c2', name: 'PS Pemuda', short_name: 'PMD', group_name: 'C', category: 'U10', logo_url: null, color: null, created_at: '' },
    { id: 't-d1', name: 'Sigres', short_name: 'SGR', group_name: 'D', category: 'U10', logo_url: null, color: null, created_at: '' },
    { id: 't-d2', name: 'Baja Putra', short_name: 'BJP', group_name: 'D', category: 'U10', logo_url: null, color: null, created_at: '' },
  ];

  // Mock hasil laga grup: TPA menang di grup A, GPD menang di grup B, Forsgi di C, Sigres di D
  const mockMatchesU10: MatchWithTeams[] = [
    {
      id: 'm-a1', team_a_id: 't-a1', team_b_id: 't-a2', score_a: 3, score_b: 0, status: 'finished',
      stage: 'grup', group_name: 'A', category: 'U10', match_date: '2026-10-09', kickoff_time: '07:00', field: '1', updated_at: '',
      team_a: mockTeamsU10[0], team_b: mockTeamsU10[1],
    },
    {
      id: 'm-b1', team_a_id: 't-b1', team_b_id: 't-b2', score_a: 2, score_b: 1, status: 'finished',
      stage: 'grup', group_name: 'B', category: 'U10', match_date: '2026-10-09', kickoff_time: '07:30', field: '1', updated_at: '',
      team_a: mockTeamsU10[2], team_b: mockTeamsU10[3],
    },
    {
      id: 'm-c1', team_a_id: 't-c1', team_b_id: 't-c2', score_a: 4, score_b: 2, status: 'finished',
      stage: 'grup', group_name: 'C', category: 'U10', match_date: '2026-10-09', kickoff_time: '08:00', field: '1', updated_at: '',
      team_a: mockTeamsU10[4], team_b: mockTeamsU10[5],
    },
    {
      id: 'm-d1', team_a_id: 't-d1', team_b_id: 't-d2', score_a: 1, score_b: 0, status: 'finished',
      stage: 'grup', group_name: 'D', category: 'U10', match_date: '2026-10-09', kickoff_time: '08:30', field: '1', updated_at: '',
      team_a: mockTeamsU10[6], team_b: mockTeamsU10[7],
    },
  ];

  it('menentukan Juara dan Runner-up tiap grup dengan benar', () => {
    const leaders = getGroupLeaders('U10', mockTeamsU10, mockMatchesU10);
    expect(leaders.get('A')?.winner?.name).toBe('TPA');
    expect(leaders.get('A')?.runnerUp?.name).toBe('Singoloyo');
    expect(leaders.get('B')?.winner?.name).toBe('GPD');
    expect(leaders.get('B')?.runnerUp?.name).toBe('Bola FC');
    expect(leaders.get('C')?.winner?.name).toBe('Forsgi');
    expect(leaders.get('C')?.runnerUp?.name).toBe('PS Pemuda');
    expect(leaders.get('D')?.winner?.name).toBe('Sigres');
    expect(leaders.get('D')?.runnerUp?.name).toBe('Baja Putra');
  });

  it('memetakan seeding perempat final U-10 sesuai aturan PDF', () => {
    const bracket = buildTournamentBracket('U10', mockTeamsU10, mockMatchesU10);
    expect(bracket.quarterfinals.length).toBe(4);

    // QF1 (AA): Juara A vs Runner-up B (TPA vs Bola FC)
    const qf1 = bracket.quarterfinals[0];
    expect(qf1.code).toBe('AA');
    expect(qf1.homeSlot.team?.name).toBe('TPA');
    expect(qf1.awaySlot.team?.name).toBe('Bola FC');
    expect(qf1.field).toBe('1');
    expect(qf1.kickoff_time).toBe('14:00');

    // QF2 (BB): Juara B vs Runner-up C (GPD vs PS Pemuda)
    const qf2 = bracket.quarterfinals[1];
    expect(qf2.code).toBe('BB');
    expect(qf2.homeSlot.team?.name).toBe('GPD');
    expect(qf2.awaySlot.team?.name).toBe('PS Pemuda');
    expect(qf2.field).toBe('2');
    expect(qf2.kickoff_time).toBe('14:00');

    // QF3 (CC): Juara C vs Runner-up D (Forsgi vs Baja Putra)
    const qf3 = bracket.quarterfinals[2];
    expect(qf3.code).toBe('CC');
    expect(qf3.homeSlot.team?.name).toBe('Forsgi');
    expect(qf3.awaySlot.team?.name).toBe('Baja Putra');
    expect(qf3.field).toBe('1');
    expect(qf3.kickoff_time).toBe('14:30');

    // QF4 (DD): Juara D vs Runner-up A (Sigres vs Singoloyo)
    const qf4 = bracket.quarterfinals[3];
    expect(qf4.code).toBe('DD');
    expect(qf4.homeSlot.team?.name).toBe('Sigres');
    expect(qf4.awaySlot.team?.name).toBe('Singoloyo');
    expect(qf4.field).toBe('2');
    expect(qf4.kickoff_time).toBe('14:30');
  });

  it('meneruskan pemenang QF ke Semifinal dan ke Final', () => {
    // Tambahkan mock hasil laga QF selesai: TPA menang QF1, GPD menang QF2
    const qfFinishedMatches: MatchWithTeams[] = [
      ...mockMatchesU10,
      {
        id: 'qf-1', team_a_id: 't-a1', team_b_id: 't-b2', score_a: 2, score_b: 0, status: 'finished',
        stage: 'perempat_final', group_name: 'AA', category: 'U10', match_date: '2026-10-09', kickoff_time: '14:00', field: '1', updated_at: '',
        team_a: mockTeamsU10[0], team_b: mockTeamsU10[3],
      },
      {
        id: 'qf-2', team_a_id: 't-b1', team_b_id: 't-c2', score_a: 3, score_b: 1, status: 'finished',
        stage: 'perempat_final', group_name: 'BB', category: 'U10', match_date: '2026-10-09', kickoff_time: '14:00', field: '2', updated_at: '',
        team_a: mockTeamsU10[2], team_b: mockTeamsU10[5],
      },
    ];

    const bracket = buildTournamentBracket('U10', mockTeamsU10, qfFinishedMatches);

    // Semifinal 1 (EE) harus mempertemukan pemenang QF1 (TPA) vs pemenang QF2 (GPD)
    const sf1 = bracket.semifinals[0];
    expect(sf1.code).toBe('EE');
    expect(sf1.homeSlot.team?.name).toBe('TPA');
    expect(sf1.awaySlot.team?.name).toBe('GPD');
  });

  it('memetakan seeding perempat final U-12 sesuai aturan PDF', () => {
    const mockTeamsU12: Team[] = [
      { id: 'u12-a1', name: 'AN-NUR', short_name: 'ANN', group_name: 'A', category: 'U12', logo_url: null, color: null, created_at: '' },
      { id: 'u12-a2', name: 'PTJ', short_name: 'PTJ', group_name: 'A', category: 'U12', logo_url: null, color: null, created_at: '' },
      { id: 'u12-b1', name: 'PORSID', short_name: 'PRD', group_name: 'B', category: 'U12', logo_url: null, color: null, created_at: '' },
      { id: 'u12-b2', name: 'FORSGI', short_name: 'FSG', group_name: 'B', category: 'U12', logo_url: null, color: null, created_at: '' },
      { id: 'u12-c1', name: 'PENDOWO', short_name: 'PDW', group_name: 'C', category: 'U12', logo_url: null, color: null, created_at: '' },
      { id: 'u12-c2', name: 'NSS', short_name: 'NSS', group_name: 'C', category: 'U12', logo_url: null, color: null, created_at: '' },
      { id: 'u12-d1', name: 'BAJA PUTRA', short_name: 'BJP', group_name: 'D', category: 'U12', logo_url: null, color: null, created_at: '' },
      { id: 'u12-d2', name: 'BAJUL NUSANTARA', short_name: 'BJN', group_name: 'D', category: 'U12', logo_url: null, color: null, created_at: '' },
    ];

    const mockMatchesU12: MatchWithTeams[] = [
      { id: 'm1', team_a_id: 'u12-a1', team_b_id: 'u12-a2', score_a: 2, score_b: 0, status: 'finished', stage: 'grup', group_name: 'A', category: 'U12', match_date: '2026-10-10', kickoff_time: '07:00', field: '1', updated_at: '', team_a: mockTeamsU12[0], team_b: mockTeamsU12[1] },
      { id: 'm2', team_a_id: 'u12-b1', team_b_id: 'u12-b2', score_a: 1, score_b: 0, status: 'finished', stage: 'grup', group_name: 'B', category: 'U12', match_date: '2026-10-10', kickoff_time: '07:30', field: '1', updated_at: '', team_a: mockTeamsU12[2], team_b: mockTeamsU12[3] },
      { id: 'm3', team_a_id: 'u12-c1', team_b_id: 'u12-c2', score_a: 3, score_b: 1, status: 'finished', stage: 'grup', group_name: 'C', category: 'U12', match_date: '2026-10-10', kickoff_time: '08:00', field: '1', updated_at: '', team_a: mockTeamsU12[4], team_b: mockTeamsU12[5] },
      { id: 'm4', team_a_id: 'u12-d1', team_b_id: 'u12-d2', score_a: 4, score_b: 2, status: 'finished', stage: 'grup', group_name: 'D', category: 'U12', match_date: '2026-10-10', kickoff_time: '08:30', field: '1', updated_at: '', team_a: mockTeamsU12[6], team_b: mockTeamsU12[7] },
    ];

    const bracket = buildTournamentBracket('U12', mockTeamsU12, mockMatchesU12);
    expect(bracket.quarterfinals.length).toBe(4);

    // QF1: Juara A vs Runner-up B (AN-NUR vs FORSGI), Lap 1, 13:00
    const qf1 = bracket.quarterfinals[0];
    expect(qf1.homeSlot.team?.name).toBe('AN-NUR');
    expect(qf1.awaySlot.team?.name).toBe('FORSGI');
    expect(qf1.kickoff_time).toBe('13:00');
    expect(qf1.field).toBe('1');

    // QF2: Juara B vs Runner-up C (PORSID vs NSS), Lap 2, 13:00
    const qf2 = bracket.quarterfinals[1];
    expect(qf2.homeSlot.team?.name).toBe('PORSID');
    expect(qf2.awaySlot.team?.name).toBe('NSS');
    expect(qf2.kickoff_time).toBe('13:00');
    expect(qf2.field).toBe('2');

    // QF3: Juara C vs Runner-up D (PENDOWO vs BAJUL NUSANTARA), Lap 1, 13:30
    const qf3 = bracket.quarterfinals[2];
    expect(qf3.homeSlot.team?.name).toBe('PENDOWO');
    expect(qf3.awaySlot.team?.name).toBe('BAJUL NUSANTARA');
    expect(qf3.kickoff_time).toBe('13:30');
    expect(qf3.field).toBe('1');

    // QF4: Juara D vs Runner-up A (BAJA PUTRA vs PTJ), Lap 2, 13:30
    const qf4 = bracket.quarterfinals[3];
    expect(qf4.homeSlot.team?.name).toBe('BAJA PUTRA');
    expect(qf4.awaySlot.team?.name).toBe('PTJ');
    expect(qf4.kickoff_time).toBe('13:30');
    expect(qf4.field).toBe('2');
  });

  it('menyelesaikan laga perempat final seri lewat adu penalti dan meloloskan pemenang ke semifinal', () => {
    // QF1 berakhir imbang 1-1, namun adu penalti 4-3 dimenangkan Bola FC (team B)
    const drawQfWithPenalty: MatchWithTeams[] = [
      ...mockMatchesU10,
      {
        id: 'qf-1', team_a_id: 't-a1', team_b_id: 't-b2', score_a: 1, score_b: 1, status: 'finished',
        penalty_score_a: 3, penalty_score_b: 4, winner_team_id: 't-b2', notes: 'Menang Adu Penalti 4-3',
        stage: 'perempat_final', group_name: 'AA', category: 'U10', match_date: '2026-10-09', kickoff_time: '14:00', field: '1', updated_at: '',
        team_a: mockTeamsU10[0], team_b: mockTeamsU10[3],
      },
      {
        id: 'qf-2', team_a_id: 't-b1', team_b_id: 't-c2', score_a: 2, score_b: 0, status: 'finished',
        stage: 'perempat_final', group_name: 'BB', category: 'U10', match_date: '2026-10-09', kickoff_time: '14:00', field: '2', updated_at: '',
        team_a: mockTeamsU10[2], team_b: mockTeamsU10[5],
      },
    ];

    const bracket = buildTournamentBracket('U10', mockTeamsU10, drawQfWithPenalty);
    const qf1 = bracket.quarterfinals[0];
    expect(qf1.byPenalty).toBe(true);
    expect(qf1.winnerTeam?.name).toBe('Bola FC');

    // Semifinal 1 harus menerima Bola FC sebagai pemenang QF1
    const sf1 = bracket.semifinals[0];
    expect(sf1.homeSlot.team?.name).toBe('Bola FC');
    expect(sf1.awaySlot.team?.name).toBe('GPD');
  });

  it('menangani kemenangan walkover (WO) atau keputusan panitia via winner_team_id', () => {
    const qfWithWO: MatchWithTeams[] = [
      ...mockMatchesU10,
      {
        id: 'qf-1', team_a_id: 't-a1', team_b_id: 't-b2', score_a: 3, score_b: 0, status: 'finished',
        winner_team_id: 't-a1', notes: 'Menang WO 3-0',
        stage: 'perempat_final', group_name: 'AA', category: 'U10', match_date: '2026-10-09', kickoff_time: '14:00', field: '1', updated_at: '',
        team_a: mockTeamsU10[0], team_b: mockTeamsU10[3],
      },
    ];

    const bracket = buildTournamentBracket('U10', mockTeamsU10, qfWithWO);
    expect(bracket.quarterfinals[0].winnerTeam?.name).toBe('TPA');
    expect(bracket.semifinals[0].homeSlot.team?.name).toBe('TPA');
  });

  it('mendukung override manual juara/runner-up grup (misal hasil coin toss)', () => {
    // Override grup A: Singoloyo juara, TPA runner-up
    const bracket = buildTournamentBracket('U10', mockTeamsU10, mockMatchesU10, {
      groupOverrides: {
        A: { winnerId: 't-a2', runnerUpId: 't-a1' },
      },
    });

    // QF1 (AA): Juara A vs Runner-up B -> Singoloyo vs Bola FC
    expect(bracket.quarterfinals[0].homeSlot.team?.name).toBe('Singoloyo');
    // QF4 (DD): Juara D vs Runner-up A -> Sigres vs TPA
    expect(bracket.quarterfinals[3].awaySlot.team?.name).toBe('TPA');
  });

  it('mendukung slot override manual di babak sistem gugur oleh superadmin', () => {
    // Panitia menukar tim away di QF1 menjadi Sigres secara manual
    const bracket = buildTournamentBracket('U10', mockTeamsU10, mockMatchesU10, {
      slotOverrides: {
        AA: { awayTeamId: 't-d1' },
      },
    });

    expect(bracket.quarterfinals[0].awaySlot.team?.name).toBe('Sigres');
  });

  it('mendeteksi laga gugur seri tanpa penalti dan bentrok jam via diagnoseTournamentIssues', async () => {
    const { diagnoseTournamentIssues } = await import('@/lib/bracket');
    const problemMatches: MatchWithTeams[] = [
      ...mockMatchesU10,
      {
        id: 'qf-draw-unresolved', team_a_id: 't-a1', team_b_id: 't-b2', score_a: 2, score_b: 2, status: 'finished',
        stage: 'perempat_final', group_name: 'AA', category: 'U10', match_date: '2026-10-09', kickoff_time: '14:00', field: '1', updated_at: '',
        team_a: mockTeamsU10[0], team_b: mockTeamsU10[3],
      },
      {
        id: 'conflict-match', team_a_id: 't-c1', team_b_id: 't-d1', score_a: 0, score_b: 0, status: 'scheduled',
        stage: 'grup', group_name: 'C', category: 'U10', match_date: '2026-10-09', kickoff_time: '14:00', field: '1', updated_at: '',
        team_a: mockTeamsU10[4], team_b: mockTeamsU10[6],
      },
    ];

    const issues = diagnoseTournamentIssues(mockTeamsU10, problemMatches);
    expect(issues.some((i) => i.code === 'DRAW_UNRESOLVED_KNOCKOUT')).toBe(true);
    expect(issues.some((i) => i.code === 'FIELD_TIME_CONFLICT')).toBe(true);
  });

  it('menangani tim yang mengundurkan diri sehingga laga grup berkurang dan tetap mendeteksi grup selesai', () => {
    // Skenario: 1 tim di grup A mengundurkan diri, hanya tersisa 2 tim (1 laga) yang dimainkan dan selesai
    const teamsWithDropout: Team[] = [
      { id: 't-a1', name: 'TPA', short_name: 'TPA', group_name: 'A', category: 'U10', logo_url: null, color: null, created_at: '' },
      { id: 't-a2', name: 'Singoloyo', short_name: 'SGL', group_name: 'A', category: 'U10', logo_url: null, color: null, created_at: '' },
      ...mockTeamsU10.slice(2),
    ];

    // Semua grup memiliki laga selesai
    const leaders = getGroupLeaders('U10', teamsWithDropout, mockMatchesU10);
    expect(leaders.get('A')?.complete).toBe(true);
    expect(leaders.get('A')?.winner?.name).toBe('TPA');
    expect(leaders.get('A')?.runnerUp?.name).toBe('Singoloyo');

    const bracket = buildTournamentBracket('U10', teamsWithDropout, mockMatchesU10);
    expect(bracket.isGroupStageComplete).toBe(true);
    expect(bracket.quarterfinals[0].homeSlot.team?.name).toBe('TPA');
  });

  it('mencocokkan laga gugur berdasarkan kode node unik meskipun jam kickoff digeser oleh panitia', () => {
    // Skenario: Pertandingan AA di database jamnya molor menjadi 14:25 di Lapangan 2 (berbeda dari jadwal default 14:00 di Lap 1)
    const shiftedKnockoutMatches: MatchWithTeams[] = [
      ...mockMatchesU10,
      {
        id: 'qf-1-shifted', team_a_id: 't-a1', team_b_id: 't-b2', score_a: 2, score_b: 1, status: 'finished',
        stage: 'perempat_final', group_name: 'AA', category: 'U10', match_date: '2026-10-09',
        kickoff_time: '14:25', field: '2', updated_at: '',
        team_a: mockTeamsU10[0], team_b: mockTeamsU10[3],
      },
    ];

    const bracket = buildTournamentBracket('U10', mockTeamsU10, shiftedKnockoutMatches);
    const qf1 = bracket.quarterfinals[0];
    // Laga harus tetap terhubung ke node AA
    expect(qf1.match).not.toBeNull();
    expect(qf1.match?.id).toBe('qf-1-shifted');
    // Waktu dan lapangan harus mencerminkan jam aktual database
    expect(qf1.kickoff_time).toBe('14:25');
    expect(qf1.field).toBe('2');
    expect(qf1.winnerTeam?.name).toBe('TPA');
  });

  it('menyelesaikan laga Semifinal dan Final seri lewat adu penalti hingga menentukan Juara 1, 2, 3, dan 4', () => {
    // Skenario: Semua QF selesai
    const qfMatches: MatchWithTeams[] = [
      ...mockMatchesU10,
      {
        id: 'qf-1', team_a_id: 't-a1', team_b_id: 't-b2', score_a: 2, score_b: 0, status: 'finished',
        stage: 'perempat_final', group_name: 'AA', category: 'U10', match_date: '2026-10-09', kickoff_time: '14:00', field: '1', updated_at: '',
        team_a: mockTeamsU10[0], team_b: mockTeamsU10[3], // TPA menang
      },
      {
        id: 'qf-2', team_a_id: 't-b1', team_b_id: 't-c2', score_a: 3, score_b: 1, status: 'finished',
        stage: 'perempat_final', group_name: 'BB', category: 'U10', match_date: '2026-10-09', kickoff_time: '14:00', field: '2', updated_at: '',
        team_a: mockTeamsU10[2], team_b: mockTeamsU10[5], // GPD menang
      },
      {
        id: 'qf-3', team_a_id: 't-c1', team_b_id: 't-d2', score_a: 1, score_b: 0, status: 'finished',
        stage: 'perempat_final', group_name: 'CC', category: 'U10', match_date: '2026-10-09', kickoff_time: '14:30', field: '1', updated_at: '',
        team_a: mockTeamsU10[4], team_b: mockTeamsU10[7], // Forsgi menang
      },
      {
        id: 'qf-4', team_a_id: 't-d1', team_b_id: 't-a2', score_a: 2, score_b: 0, status: 'finished',
        stage: 'perempat_final', group_name: 'DD', category: 'U10', match_date: '2026-10-09', kickoff_time: '14:30', field: '2', updated_at: '',
        team_a: mockTeamsU10[6], team_b: mockTeamsU10[1], // Sigres menang
      },
    ];

    // Semifinal 1 (EE): TPA vs GPD -> Seri 1-1, Adu Penalti 3-4 dimenangkan GPD
    // Semifinal 2 (FF): Forsgi vs Sigres -> Normal 2-0 dimenangkan Forsgi
    const sfMatches: MatchWithTeams[] = [
      ...qfMatches,
      {
        id: 'sf-1', team_a_id: 't-a1', team_b_id: 't-b1', score_a: 1, score_b: 1, status: 'finished',
        penalty_score_a: 3, penalty_score_b: 4, winner_team_id: 't-b1', notes: 'Menang Adu Penalti 4-3',
        stage: 'semifinal', group_name: 'EE', category: 'U10', match_date: '2026-10-09', kickoff_time: '15:00', field: '1', updated_at: '',
        team_a: mockTeamsU10[0], team_b: mockTeamsU10[2],
      },
      {
        id: 'sf-2', team_a_id: 't-c1', team_b_id: 't-d1', score_a: 2, score_b: 0, status: 'finished',
        stage: 'semifinal', group_name: 'FF', category: 'U10', match_date: '2026-10-09', kickoff_time: '15:00', field: '2', updated_at: '',
        team_a: mockTeamsU10[4], team_b: mockTeamsU10[6],
      },
    ];

    const bracketAfterSf = buildTournamentBracket('U10', mockTeamsU10, sfMatches);

    // GPD (pemenang penalti SF1) dan Forsgi (pemenang SF2) harus maju ke Final
    expect(bracketAfterSf.finalMatch.homeSlot.team?.name).toBe('GPD');
    expect(bracketAfterSf.finalMatch.awaySlot.team?.name).toBe('Forsgi');

    // TPA (kalah penalti SF1) dan Sigres (kalah SF2) harus masuk ke Perebutan Juara 3
    expect(bracketAfterSf.thirdPlaceMatch.homeSlot.team?.name).toBe('TPA');
    expect(bracketAfterSf.thirdPlaceMatch.awaySlot.team?.name).toBe('Sigres');

    // Final: GPD vs Forsgi -> Seri 0-0, Adu Penalti 4-5 dimenangkan Forsgi!
    const finalMatches: MatchWithTeams[] = [
      ...sfMatches,
      {
        id: 'final-1', team_a_id: 't-b1', team_b_id: 't-c1', score_a: 0, score_b: 0, status: 'finished',
        penalty_score_a: 4, penalty_score_b: 5, winner_team_id: 't-c1', notes: 'Menang Adu Penalti 5-4',
        stage: 'final', group_name: 'FINAL', category: 'U10', match_date: '2026-10-09', kickoff_time: '15:30', field: '1', updated_at: '',
        team_a: mockTeamsU10[2], team_b: mockTeamsU10[4],
      },
      {
        id: 'third-1', team_a_id: 't-a1', team_b_id: 't-d1', score_a: 2, score_b: 1, status: 'finished',
        stage: 'juara_3', group_name: 'JUARA_3', category: 'U10', match_date: '2026-10-09', kickoff_time: '15:30', field: '2', updated_at: '',
        team_a: mockTeamsU10[0], team_b: mockTeamsU10[6],
      },
    ];

    const fullBracket = buildTournamentBracket('U10', mockTeamsU10, finalMatches);
    expect(fullBracket.finalMatch.byPenalty).toBe(true);
    expect(fullBracket.finalMatch.winnerTeam?.name).toBe('Forsgi'); // Juara 1
    expect(fullBracket.finalMatch.loserTeam?.name).toBe('GPD');     // Juara 2
    expect(fullBracket.thirdPlaceMatch.winnerTeam?.name).toBe('TPA'); // Juara 3
    expect(fullBracket.thirdPlaceMatch.loserTeam?.name).toBe('Sigres'); // Juara 4
  });
});
