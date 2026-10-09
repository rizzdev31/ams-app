import { NextResponse } from 'next/server';
import { dbArchives, dbMatches, dbTeams, isDatabaseConfigured } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { audit } from '@/lib/admin-users';
import { calculateStandings } from '@/lib/utils';
import { buildTournamentBracket, BRACKET_CONFIG } from '@/lib/bracket';
import type { StandingRow, TournamentArchive, TournamentArchiveSnapshot } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const archives = await dbArchives.getAll();
    return NextResponse.json({
      success: true,
      data: archives,
    });
  } catch (error) {
    console.error('Gagal mengambil daftar arsip turnamen:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memuat container arsip.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Sesi berakhir atau tidak memiliki izin.' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Format data tidak valid.' },
        { status: 400 }
      );
    }

    const name = String(body.name || '').trim();
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Nama container arsip wajib diisi.' },
        { status: 400 }
      );
    }

    const category = (body.category || 'U10') as string;
    const match_date = body.match_date ? String(body.match_date).trim() : null;
    const description = body.description ? String(body.description).trim() : null;

    // Jika snapshot_data tidak disediakan secara eksplisit, generate otomatis dari DB
    let snapshotData: TournamentArchiveSnapshot;
    if (body.snapshot_data && typeof body.snapshot_data === 'object') {
      snapshotData = body.snapshot_data;
    } else {
      const allTeams = await dbTeams.getAll();
      const allMatches = await dbMatches.getAll();

      const scopedTeams = category === 'Semua'
        ? allTeams
        : allTeams.filter((t) => (t.category ?? 'U10') === category);

      const scopedMatches = allMatches.filter((m) => {
        if (category !== 'Semua' && (m.category ?? 'U10') !== category) return false;
        if (match_date && m.match_date !== match_date) return false;
        return true;
      });

      // Hitung klasemen grup
      const groupStandings: Record<string, StandingRow[]> = {};
      const targetCategory = (category === 'U12' ? 'U12' : 'U10') as 'U10' | 'U12';
      const cfg = BRACKET_CONFIG[targetCategory];

      for (const grp of cfg.groups) {
        groupStandings[grp] = calculateStandings(scopedTeams, scopedMatches, grp);
      }

      // Hitung bagan gugur
      let championName: string | null = null;
      let runnerUpName: string | null = null;
      let thirdPlaceName: string | null = null;
      let fourthPlaceName: string | null = null;
      let bracketSummary: TournamentArchiveSnapshot['bracket_summary'] = undefined;

      try {
        const bracket = buildTournamentBracket(targetCategory, scopedTeams, scopedMatches);
        championName = bracket.finalMatch.winnerTeam?.name ?? null;
        runnerUpName = bracket.finalMatch.loserTeam?.name ?? null;
        thirdPlaceName = bracket.thirdPlaceMatch.winnerTeam?.name ?? null;
        fourthPlaceName = bracket.thirdPlaceMatch.loserTeam?.name ?? null;

        bracketSummary = {
          qf: bracket.quarterfinals.map((q) => ({
            code: q.code,
            title: q.title,
            score: q.match ? `${q.match.score_a}–${q.match.score_b}` : '–',
            winner: q.winnerTeam?.name,
            byPenalty: q.byPenalty,
          })),
          sf: bracket.semifinals.map((s) => ({
            code: s.code,
            title: s.title,
            score: s.match ? `${s.match.score_a}–${s.match.score_b}` : '–',
            winner: s.winnerTeam?.name,
            byPenalty: s.byPenalty,
          })),
          final: {
            title: bracket.finalMatch.title,
            score: bracket.finalMatch.match
              ? `${bracket.finalMatch.match.score_a}–${bracket.finalMatch.match.score_b}`
              : '–',
            winner: bracket.finalMatch.winnerTeam?.name,
            byPenalty: bracket.finalMatch.byPenalty,
          },
          third_place: {
            title: bracket.thirdPlaceMatch.title,
            score: bracket.thirdPlaceMatch.match
              ? `${bracket.thirdPlaceMatch.match.score_a}–${bracket.thirdPlaceMatch.match.score_b}`
              : '–',
            winner: bracket.thirdPlaceMatch.winnerTeam?.name,
            byPenalty: bracket.thirdPlaceMatch.byPenalty,
          },
        };
      } catch (err) {
        console.warn('Tidak dapat menghitung ringkasan bracket untuk arsip:', err);
      }

      snapshotData = {
        archived_at: new Date().toISOString(),
        category,
        total_teams: scopedTeams.length,
        total_matches: scopedMatches.length,
        finished_matches: scopedMatches.filter((m) => m.status === 'finished').length,
        champion_name: championName,
        runner_up_name: runnerUpName,
        third_place_name: thirdPlaceName,
        fourth_place_name: fourthPlaceName,
        teams: scopedTeams,
        matches: scopedMatches,
        group_standings: groupStandings,
        bracket_summary: bracketSummary,
      };
    }

    const created = await dbArchives.create({
      name,
      category,
      match_date,
      description,
      snapshot_data: snapshotData,
    });

    try {
      await audit(session, 'CREATE_ARCHIVE_CONTAINER', name, {
        archive_id: created.id,
        category,
      });
    } catch {}

    return NextResponse.json({
      success: true,
      data: created,
    });
  } catch (error) {
    console.error('Gagal membuat container arsip:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal membuat container arsip turnamen.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Sesi berakhir atau tidak memiliki izin.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const body = await request.json().catch(() => null);
    const id = searchParams.get('id') || body?.id;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID container arsip wajib disertakan.' },
        { status: 400 }
      );
    }

    const patch: Partial<TournamentArchive> = {};
    if (typeof body?.name === 'string' && body.name.trim()) {
      patch.name = body.name.trim();
    }
    if (typeof body?.description === 'string') {
      patch.description = body.description.trim() || null;
    }

    const updated = await dbArchives.update(id, patch);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Container arsip tidak ditemukan.' },
        { status: 404 }
      );
    }

    try {
      await audit(session, 'UPDATE_ARCHIVE_CONTAINER', updated.name, {
        archive_id: id,
      });
    } catch {}

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Gagal memperbarui container arsip:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memperbarui container arsip.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Sesi berakhir atau tidak memiliki izin.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID container arsip wajib disertakan.' },
        { status: 400 }
      );
    }

    const existing = await dbArchives.getById(id);
    const success = await dbArchives.delete(id);

    if (existing) {
      try {
        await audit(session, 'DELETE_ARCHIVE_CONTAINER', existing.name, {
          archive_id: id,
        });
      } catch {}
    }

    return NextResponse.json({
      success,
    });
  } catch (error) {
    console.error('Gagal menghapus container arsip:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menghapus container arsip.' },
      { status: 500 }
    );
  }
}
