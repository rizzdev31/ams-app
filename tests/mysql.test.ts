import { describe, it, expect } from 'vitest';
import { isMySQLConnected, query, queryOne } from '@/lib/mysql';

describe('MySQL Connection & Query Test', () => {
  it('berhasil terhubung ke database MySQL lokal', async () => {
    const connected = await isMySQLConnected();
    expect(connected).toBe(true);
  });

  it('dapat membaca daftar tim dari MySQL', async () => {
    const teams = await query<{ id: string; name: string }>('SELECT id, name FROM teams LIMIT 5');
    expect(Array.isArray(teams)).toBe(true);
    expect(teams.length).toBeGreaterThan(0);
  });

  it('dapat membaca pengaturan turnamen dari MySQL', async () => {
    const settings = await queryOne<{ event_name: string }>('SELECT event_name FROM event_settings LIMIT 1');
    expect(settings).not.toBeNull();
    expect(settings?.event_name).toBe('An-Nur Mini Soccer');
  });

  it('dapat membaca jadwal pertandingan beserta relasi tim dari MySQL', async () => {
    const matches = await query<{ id: string; team_a_name: string; team_b_name: string }>(`
      SELECT m.id, ta.name as team_a_name, tb.name as team_b_name
      FROM matches m
      JOIN teams ta ON m.team_a_id = ta.id
      JOIN teams tb ON m.team_b_id = tb.id
      LIMIT 3
    `);
    expect(Array.isArray(matches)).toBe(true);
    expect(matches.length).toBe(3);
    expect(matches[0].team_a_name).toBeDefined();
    expect(matches[0].team_b_name).toBeDefined();
  });

  it('dapat membaca daftar sponsor dari MySQL', async () => {
    const sponsors = await query<{ id: string; name: string; tier: string }>('SELECT id, name, tier FROM sponsors');
    expect(Array.isArray(sponsors)).toBe(true);
    expect(sponsors.length).toBeGreaterThan(0);
  });
});
