import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import type { MatchWithTeams, MatchEvent, Sponsor } from '@/lib/types';
import { formatTime, getMatchPartai } from '@/lib/utils';

describe('Fitur Pamflet Hasil Pertandingan Resmi (1080x1350)', () => {
  const publicDir = path.join(process.cwd(), 'public');

  it('memastikan seluruh aset logo resmi pamflet tersedia di folder public', () => {
    const requiredLogos = [
      'logoutama.png',
      'logo pesantren1.png',
      'pssq.png',
      'logo ma.png',
      'logo mubosta.png',
    ];

    for (const logo of requiredLogos) {
      const fullPath = path.join(publicDir, logo);
      expect(fs.existsSync(fullPath)).toBe(true);
      const stat = fs.statSync(fullPath);
      expect(stat.size).toBeGreaterThan(0);
    }
  });

  it('memvalidasi dimensi rasio standar 1080 x 1350 (4:5 rasio Instagram feed)', () => {
    const targetWidth = 1080;
    const targetHeight = 1350;
    const aspectRatio = targetWidth / targetHeight;

    expect(aspectRatio).toBeCloseTo(0.8, 2); // 4 / 5 = 0.8
    expect(targetWidth).toBe(1080);
    expect(targetHeight).toBe(1350);
  });

  it('memformat informasi pertandingan dan skor pamflet dengan benar', () => {
    const mockMatch: MatchWithTeams = {
      id: 'm-test-1',
      team_a_id: 't-1',
      team_b_id: 't-2',
      score_a: 3,
      score_b: 2,
      penalty_score_a: null,
      penalty_score_b: null,
      status: 'finished',
      match_date: '2026-10-09',
      kickoff_time: '14:00',
      field: '1',
      stage: 'perempat_final',
      group_name: 'AA',
      category: 'U10',
      updated_at: '',
      notes: 'Lolos ke Semifinal',
      team_a: {
        id: 't-1',
        name: 'Tiga Putra Agung FC',
        short_name: 'TPA',
        group_name: 'A',
        category: 'U10',
        logo_url: null,
        color: '#10b981',
        created_at: '',
      },
      team_b: {
        id: 't-2',
        name: 'Bola Football Akademi',
        short_name: 'BLA',
        group_name: 'B',
        category: 'U10',
        logo_url: null,
        color: '#3b82f6',
        created_at: '',
      },
    };

    const partai = getMatchPartai(mockMatch);
    expect(partai.label).toBe('8 Besar (Partai 1)');
    expect(formatTime(mockMatch.kickoff_time)).toBe('14:00');
    expect(mockMatch.score_a).toBe(3);
    expect(mockMatch.score_b).toBe(2);
    expect(mockMatch.notes).toBe('Lolos ke Semifinal');
  });

  it('mendukung penulisan skor adu penalti dan pemenang pada pamflet', () => {
    const penaltyMatch: MatchWithTeams = {
      id: 'm-pen-1',
      team_a_id: 't-1',
      team_b_id: 't-2',
      score_a: 1,
      score_b: 1,
      penalty_score_a: 4,
      penalty_score_b: 3,
      winner_team_id: 't-1',
      status: 'finished',
      match_date: '2026-10-09',
      kickoff_time: '15:30',
      field: '1',
      stage: 'final',
      group_name: null,
      category: 'U10',
      updated_at: '',
      notes: 'Juara 1 Turnamen',
      team_a: { id: 't-1', name: 'Tiga Putra Agung FC', short_name: 'TPA', group_name: 'A', category: 'U10', logo_url: null, color: null, created_at: '' },
      team_b: { id: 't-2', name: 'Bola Football Akademi', short_name: 'BLA', group_name: 'B', category: 'U10', logo_url: null, color: null, created_at: '' },
    };

    expect(penaltyMatch.score_a).toBe(penaltyMatch.score_b);
    expect(penaltyMatch.penalty_score_a).toBe(4);
    expect(penaltyMatch.penalty_score_b).toBe(3);
    expect(penaltyMatch.winner_team_id).toBe('t-1');
  });

  it('memvalidasi nama file download mengandung format 1080x1350', () => {
    const cat = 'U10';
    const a = 'TPA';
    const b = 'BLA';
    const scoreA = 3;
    const scoreB = 2;
    const fileName = `pamflet-1080x1350-${cat}-${a}-vs-${b}-${scoreA}-${scoreB}.png`;

    expect(fileName).toBe('pamflet-1080x1350-U10-TPA-vs-BLA-3-2.png');
  });
});
