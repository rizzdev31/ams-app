import { describe, it, expect, beforeAll } from 'vitest';
import { isMySQLConnected, query, queryOne } from '@/lib/mysql';
import { dbTeams, dbMatches, dbSettings, dbSponsors, dbPlayers, dbMatchEvents } from '@/lib/db';
import {
  ensureBootstrapSuperadmin,
  findUserByUsername,
  verifyUserPassword,
} from '@/lib/admin-users';

describe('MySQL End-to-End Integration Tests', () => {
  beforeAll(async () => {
    process.env.DB_DRIVER = 'mysql';
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '3306';
    process.env.DB_USER = 'root';
    process.env.DB_PASSWORD = '';
    process.env.DB_NAME = 'annur_minsoc';
    process.env.ADMIN_PASSWORD = 'annurminsoc2026';
  });

  it('MySQL database server should be reachable', async () => {
    const connected = await isMySQLConnected();
    expect(connected).toBe(true);
  });

  it('should fetch teams from MySQL database (32 teams)', async () => {
    const teams = await dbTeams.getAll();
    expect(teams.length).toBeGreaterThanOrEqual(32);
    expect(teams[0]).toHaveProperty('id');
    expect(teams[0]).toHaveProperty('name');
    expect(teams[0]).toHaveProperty('short_name');
  });

  it('should fetch matches joined with teams from MySQL (at least 48 matches)', async () => {
    const matches = await dbMatches.getAll();
    expect(matches.length).toBeGreaterThanOrEqual(48);
    const firstMatch = matches[0];
    expect(firstMatch).toHaveProperty('id');
    expect(firstMatch).toHaveProperty('team_a');
    expect(firstMatch).toHaveProperty('team_b');
    expect(firstMatch.team_a).toHaveProperty('name');
    expect(firstMatch.team_b).toHaveProperty('name');
  });

  it('should filter matches by status and category', async () => {
    const u10Matches = await dbMatches.getAll({ category: 'U10' });
    expect(u10Matches.length).toBeGreaterThan(0);
    expect(u10Matches.every((m) => m.category === 'U10')).toBe(true);

    const u12Matches = await dbMatches.getAll({ category: 'U12' });
    expect(u12Matches.length).toBeGreaterThan(0);
    expect(u12Matches.every((m) => m.category === 'U12')).toBe(true);
  });

  it('should fetch event settings from MySQL', async () => {
    const settings = await dbSettings.get();
    expect(settings).not.toBeNull();
    expect(settings?.event_name).toBeDefined();
    expect(settings?.location).toBeDefined();
  });

  it('should fetch sponsors from MySQL', async () => {
    const sponsors = await dbSponsors.getAll(true);
    expect(sponsors.length).toBeGreaterThanOrEqual(1);
    expect(sponsors[0]).toHaveProperty('name');
    expect(sponsors[0]).toHaveProperty('tier');
  });

  it('should handle players CRUD on MySQL', async () => {
    const teams = await dbTeams.getAll();
    const testTeam = teams[0];

    // Create player
    const createdPlayer = await dbPlayers.create({
      team_id: testTeam.id,
      name: 'Pemain Uji Integrasi',
      jersey_number: 99,
      position: 'FW',
    });
    expect(createdPlayer.id).toBeDefined();
    expect(createdPlayer.name).toBe('Pemain Uji Integrasi');

    // Read player
    const fetchedPlayer = await dbPlayers.getById(createdPlayer.id);
    expect(fetchedPlayer?.name).toBe('Pemain Uji Integrasi');
    expect(fetchedPlayer?.jersey_number).toBe(99);

    // Update player
    const updated = await dbPlayers.update(createdPlayer.id, {
      jersey_number: 10,
    });
    expect(updated?.jersey_number).toBe(10);

    // Delete player
    const deleted = await dbPlayers.delete(createdPlayer.id);
    expect(deleted).toBe(true);

    const recheck = await dbPlayers.getById(createdPlayer.id);
    expect(recheck).toBeNull();
  });

  it('should bootstrap superadmin and authenticate in MySQL', async () => {
    await ensureBootstrapSuperadmin();

    const user = await findUserByUsername('admin');
    expect(user).not.toBeNull();
    expect(user?.username).toBe('admin');
    expect(user?.role).toBe('superadmin');
    expect(user?.active).toBe(true);

    const isValid = await verifyUserPassword(user!, 'annurminsoc2026');
    expect(isValid).toBe(true);

    const isWrong = await verifyUserPassword(user!, 'password_salah');
    expect(isWrong).toBe(false);
  });
});
