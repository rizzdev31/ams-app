import { NextResponse } from 'next/server';
import {
  dbTeams,
  dbMatches,
  isDatabaseConfigured,
  isDatabaseWritable,
  DB_MISCONFIGURED_MESSAGE,
  DB_READONLY_MESSAGE,
} from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { audit } from '@/lib/admin-users';
import { parseJsonBody } from '@/lib/http';
import {
  diagnoseTournamentIssues,
  buildTournamentBracket,
  getMatchOutcome,
} from '@/lib/bracket';
import type { MatchWithTeams, Team } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/admin/diagnostics
 * Mengembalikan analisis kesehatan dan diagnostik turnamen:
 * - Ringkasan laga (selesai, live, jadwal)
 * - Isu penting (laga gugur imbang belum ada penalti, bentrok jam/lapangan, dependency)
 * - Status bagan U10 & U12
 */
export async function GET(request: Request) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Sesi berakhir, masuk kembali.' }, { status: 401 });
    }

    if (!isDatabaseConfigured()) {
      return NextResponse.json({ success: false, error: DB_MISCONFIGURED_MESSAGE }, { status: 503 });
    }

    const [allTeams, allMatches] = await Promise.all([
      dbTeams.getAll(),
      dbMatches.getAll(),
    ]);

    const issues = diagnoseTournamentIssues(allTeams, allMatches);

    const u10Teams = allTeams.filter((t) => (t.category ?? 'U10') === 'U10');
    const u12Teams = allTeams.filter((t) => t.category === 'U12');
    const u10Matches = allMatches.filter((m) => (m.category ?? 'U10') === 'U10');
    const u12Matches = allMatches.filter((m) => m.category === 'U12');

    const bracketU10 = buildTournamentBracket('U10', u10Teams, u10Matches);
    const bracketU12 = buildTournamentBracket('U12', u12Teams, u12Matches);

    const summary = {
      totalMatches: allMatches.length,
      finishedMatches: allMatches.filter((m) => m.status === 'finished').length,
      liveMatches: allMatches.filter((m) => m.status === 'live' || m.status === 'halftime').length,
      scheduledMatches: allMatches.filter((m) => m.status === 'scheduled').length,
      unresolvedDraws: issues.filter((i) => i.code === 'DRAW_UNRESOLVED_KNOCKOUT').length,
      scheduleConflicts: issues.filter((i) => i.code === 'FIELD_TIME_CONFLICT').length,
      u10GroupComplete: bracketU10.isGroupStageComplete,
      u12GroupComplete: bracketU12.isGroupStageComplete,
    };

    return NextResponse.json({
      success: true,
      summary,
      issues,
      brackets: {
        U10: {
          isComplete: bracketU10.isGroupStageComplete,
          unresolvedCount: bracketU10.unresolvedDrawMatches.length,
        },
        U12: {
          isComplete: bracketU12.isGroupStageComplete,
          unresolvedCount: bracketU12.unresolvedDrawMatches.length,
        },
      },
    });
  } catch (error: unknown) {
    console.error('Diagnostics GET error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'Gagal memuat diagnostik turnamen' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/diagnostics
 * Eksekusi Exception Handling & Aksi Penyesuaian Cepat Superadmin:
 * 
 * 1. action: 'resolve_penalty'
 *    Payload: { match_id, penalty_score_a, penalty_score_b, notes? }
 * 
 * 2. action: 'resolve_wo'
 *    Payload: { match_id, winner_team_id, notes? }
 * 
 * 3. action: 'force_winner'
 *    Payload: { match_id, winner_team_id, notes? }
 */
export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Sesi berakhir, masuk kembali.' }, { status: 401 });
    }

    if (!isDatabaseWritable()) {
      return NextResponse.json({ success: false, error: DB_READONLY_MESSAGE }, { status: 503 });
    }

    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;
    const body = parsedBody.body;

    const action = typeof body?.action === 'string' ? body.action.trim() : '';

    if (action === 'resolve_penalty') {
      const matchId = body?.match_id;
      const penA = body?.penalty_score_a;
      const penB = body?.penalty_score_b;

      if (!matchId || !UUID_RE.test(matchId)) {
        return NextResponse.json({ success: false, error: 'match_id tidak valid.' }, { status: 400 });
      }
      if (!Number.isInteger(penA) || !Number.isInteger(penB) || penA < 0 || penB < 0 || penA === penB) {
        return NextResponse.json({
          success: false,
          error: 'Skor penalti harus bilangan bulat non-negatif dan tidak boleh sama kuat (harus ada pemenang).'
        }, { status: 400 });
      }

      const match = await dbMatches.getById(matchId);
      if (!match) {
        return NextResponse.json({ success: false, error: 'Pertandingan tidak ditemukan.' }, { status: 404 });
      }

      const winnerTeamId = penA > penB ? match.team_a_id : match.team_b_id;
      const winnerName = penA > penB ? match.team_a.name : match.team_b.name;
      const customNotes = body?.notes ? `${body.notes} (Penalti: ${penA}-${penB})` : `Menang Adu Penalti (${penA}-${penB}) - ${winnerName}`;

      const updated = await dbMatches.update(matchId, {
        penalty_score_a: penA,
        penalty_score_b: penB,
        winner_team_id: winnerTeamId,
        notes: customNotes,
        status: 'finished',
      });

      await audit(session, 'resolve_penalty', 'matches', {
        matchId,
        penA,
        penB,
        winnerTeamId,
      });

      return NextResponse.json({
        success: true,
        message: `Pemenang penalti berhasil ditetapkan: ${winnerName} (${penA}-${penB})`,
        data: updated,
      });
    }

    if (action === 'resolve_wo') {
      const matchId = body?.match_id;
      const winnerTeamId = body?.winner_team_id;

      if (!matchId || !UUID_RE.test(matchId)) {
        return NextResponse.json({ success: false, error: 'match_id tidak valid.' }, { status: 400 });
      }
      if (!winnerTeamId || !UUID_RE.test(winnerTeamId)) {
        return NextResponse.json({ success: false, error: 'winner_team_id tidak valid.' }, { status: 400 });
      }

      const match = await dbMatches.getById(matchId);
      if (!match) {
        return NextResponse.json({ success: false, error: 'Pertandingan tidak ditemukan.' }, { status: 404 });
      }

      if (winnerTeamId !== match.team_a_id && winnerTeamId !== match.team_b_id) {
        return NextResponse.json({ success: false, error: 'Pemenang harus salah satu dari Tim A atau Tim B.' }, { status: 400 });
      }

      const isTeamAWinner = winnerTeamId === match.team_a_id;
      const scoreA = isTeamAWinner ? 3 : 0;
      const scoreB = isTeamAWinner ? 0 : 3;
      const winnerName = isTeamAWinner ? match.team_a.name : match.team_b.name;
      const notes = body?.notes || `Menang Walkover (WO 3-0) untuk ${winnerName}`;

      const updated = await dbMatches.update(matchId, {
        score_a: scoreA,
        score_b: scoreB,
        winner_team_id: winnerTeamId,
        penalty_score_a: null,
        penalty_score_b: null,
        status: 'finished',
        notes,
      });

      await audit(session, 'resolve_wo', 'matches', {
        matchId,
        winnerTeamId,
        notes,
      });

      return NextResponse.json({
        success: true,
        message: `Kemenangan Walkover (WO 3-0) berhasil ditetapkan untuk ${winnerName}`,
        data: updated,
      });
    }

    if (action === 'force_winner') {
      const matchId = body?.match_id;
      const winnerTeamId = body?.winner_team_id;

      if (!matchId || !UUID_RE.test(matchId)) {
        return NextResponse.json({ success: false, error: 'match_id tidak valid.' }, { status: 400 });
      }
      if (!winnerTeamId || !UUID_RE.test(winnerTeamId)) {
        return NextResponse.json({ success: false, error: 'winner_team_id tidak valid.' }, { status: 400 });
      }

      const match = await dbMatches.getById(matchId);
      if (!match) {
        return NextResponse.json({ success: false, error: 'Pertandingan tidak ditemukan.' }, { status: 404 });
      }

      if (winnerTeamId !== match.team_a_id && winnerTeamId !== match.team_b_id) {
        return NextResponse.json({ success: false, error: 'Pemenang harus salah satu dari Tim A atau Tim B.' }, { status: 400 });
      }

      const winnerName = winnerTeamId === match.team_a_id ? match.team_a.name : match.team_b.name;
      const notes = body?.notes || `Pemenang Ditetapkan Panitia: ${winnerName}`;

      const updated = await dbMatches.update(matchId, {
        winner_team_id: winnerTeamId,
        status: 'finished',
        notes,
      });

      await audit(session, 'force_winner', 'matches', {
        matchId,
        winnerTeamId,
        notes,
      });

      return NextResponse.json({
        success: true,
        message: `Pemenang pertandingan berhasil ditetapkan untuk ${winnerName}`,
        data: updated,
      });
    }

    return NextResponse.json({
      success: false,
      error: `Action "${action}" tidak dikenal. Gunakan "resolve_penalty", "resolve_wo", atau "force_winner".`,
    }, { status: 400 });
  } catch (error: unknown) {
    console.error('Diagnostics POST error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'Gagal memproses aksi diagnostik' },
      { status: 500 }
    );
  }
}
