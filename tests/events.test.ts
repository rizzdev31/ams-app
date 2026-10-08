import { describe, it, expect, beforeAll } from 'vitest';
import { dbMatches, dbTeams, dbMatchEvents } from '@/lib/db';

describe('Match Events & Score Revision Flow', () => {
  let matchId: string;
  let teamAId: string;
  let teamBId: string;

  beforeAll(async () => {
    process.env.DB_DRIVER = 'mysql';
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '3306';
    process.env.DB_USER = 'root';
    process.env.DB_PASSWORD = '';
    process.env.DB_NAME = 'annur_minsoc';

    const teams = await dbTeams.getAll();
    teamAId = teams[0].id;
    teamBId = teams[1].id;

    // Buat match uji coba
    const newMatch = await dbMatches.create({
      id: crypto.randomUUID(),
      team_a_id: teamAId,
      team_b_id: teamBId,
      score_a: 0,
      score_b: 0,
      status: 'live',
      match_date: '2026-10-09',
      kickoff_time: '10:00:00',
      field: '1',
      stage: 'grup',
      group_name: 'A',
      category: 'U10',
    });
    matchId = newMatch.id;
  });

  it('should record a GOAL event and increment score', async () => {
    const goalEvent = await dbMatchEvents.create({
      id: crypto.randomUUID(),
      match_id: matchId,
      team_id: teamAId,
      player_name: 'Budi Santoso',
      type: 'goal',
      minute: 12,
      note: 'Tendangan bebas',
    });

    expect(goalEvent.id).toBeDefined();
    expect(goalEvent.type).toBe('goal');
    expect(goalEvent.player_name).toBe('Budi Santoso');

    // Update match score
    await dbMatches.update(matchId, { score_a: 1 });
    const match = await dbMatches.getById(matchId);
    expect(match?.score_a).toBe(1);
  });

  it('should record YELLOW CARD and RED CARD events', async () => {
    const yellowCard = await dbMatchEvents.create({
      id: crypto.randomUUID(),
      match_id: matchId,
      team_id: teamBId,
      player_name: 'Andi Pratama',
      type: 'yellow_card',
      minute: 15,
      note: 'Pelanggaran keras',
    });
    expect(yellowCard.type).toBe('yellow_card');

    const redCard = await dbMatchEvents.create({
      id: crypto.randomUUID(),
      match_id: matchId,
      team_id: teamBId,
      player_name: 'Andi Pratama',
      type: 'red_card',
      minute: 20,
      note: 'Akumulasi kartu',
    });
    expect(redCard.type).toBe('red_card');

    const events = await dbMatchEvents.getByMatchId(matchId);
    expect(events.length).toBe(3); // 1 goal + 1 yellow + 1 red
  });

  it('should support deleting a goal event and undoing score (revisi gol)', async () => {
    // Tambah gol kedua
    const secondGoal = await dbMatchEvents.create({
      id: crypto.randomUUID(),
      match_id: matchId,
      team_id: teamAId,
      player_name: 'Budi Santoso',
      type: 'goal',
      minute: 25,
      note: 'Gol dianulir kemudian',
    });

    await dbMatches.update(matchId, { score_a: 2 });
    let match = await dbMatches.getById(matchId);
    expect(match?.score_a).toBe(2);

    // Hapus gol (simulasi pembatalan wasit / revisi)
    await dbMatchEvents.delete(secondGoal.id);
    await dbMatches.update(matchId, { score_a: Math.max(0, (match?.score_a ?? 0) - 1) });

    match = await dbMatches.getById(matchId);
    expect(match?.score_a).toBe(1);
  });

  it('should support match status transition to finished and revision back to live', async () => {
    // Selesaikan match
    await dbMatches.update(matchId, { status: 'finished' });
    let match = await dbMatches.getById(matchId);
    expect(match?.status).toBe('finished');

    // Revisi kembali ke live
    await dbMatches.update(matchId, { status: 'live' });
    match = await dbMatches.getById(matchId);
    expect(match?.status).toBe('live');

    // Selesaikan kembali setelah revisi
    await dbMatches.update(matchId, { status: 'finished' });
    match = await dbMatches.getById(matchId);
    expect(match?.status).toBe('finished');

    // Bersihkan match uji coba
    await dbMatches.delete(matchId);
  });
});
