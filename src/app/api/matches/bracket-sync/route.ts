import { NextResponse } from 'next/server';
import {
  dbTeams,
  dbMatches,
  isDatabaseWritable,
  DB_READONLY_MESSAGE,
} from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { audit } from '@/lib/admin-users';
import { parseJsonBody } from '@/lib/http';
import { buildTournamentBracket, BracketBuildOptions } from '@/lib/bracket';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Endpoint Sinkronisasi & Penyesuaian Fleksibel Babak Gugur (Knockout).
 * Membaca klasemen grup dan hasil pertandingan gugur sebelumnya, lalu
 * membuat atau memperbarui jadwal babak perempat final, semifinal, dan final.
 * 
 * Mendukung opsi:
 * - category: 'U10' | 'U12'
 * - groupOverrides: { [grp]: { winnerId, runnerUpId } } (misal untuk tiebreak koin-toss)
 * - slotOverrides: { [nodeCode]: { homeTeamId, awayTeamId } } (intervensi superadmin)
 * - force: boolean (tetap update meskipun status pertandingan sudah terjadwal)
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

    const rawCategory = typeof body?.category === 'string' ? body.category.trim().toUpperCase() : 'U10';
    const category = rawCategory === 'U12' ? 'U12' : 'U10';
    const force = Boolean(body?.force);

    const bracketOptions: BracketBuildOptions = {
      groupOverrides: body?.groupOverrides && typeof body.groupOverrides === 'object' ? body.groupOverrides : undefined,
      slotOverrides: body?.slotOverrides && typeof body.slotOverrides === 'object' ? body.slotOverrides : undefined,
    };

    // 1. Ambil data tim & pertandingan
    const [allTeams, allMatches] = await Promise.all([
      dbTeams.getAll(),
      dbMatches.getAll({ category }),
    ]);

    const teams = allTeams.filter((t) => t.category === category);
    const matches = allMatches;

    // 2. Bangun struktur bagan berdasarkan data live + opsi override
    const bracket = buildTournamentBracket(category, teams, matches, bracketOptions);

    // Kumpulkan semua slot pertandingan sistem gugur yang perlu disinkronkan ke database
    const allKnockoutNodes = [
      ...bracket.quarterfinals,
      ...bracket.semifinals,
      bracket.finalMatch,
      bracket.thirdPlaceMatch,
    ];

    let createdCount = 0;
    let updatedCount = 0;
    const skippedList: string[] = [];
    const warnings: string[] = [];

    // Jika ada laga gugur imbang yang belum ditentukan pemenangnya lewat penalti
    if (bracket.unresolvedDrawMatches.length > 0) {
      bracket.unresolvedDrawMatches.forEach((m) => {
        warnings.push(`Partai ${m.title} berakhir imbang tanpa pemenang adu penalti. Babak kelanjutan belum dapat disinkronkan.`);
      });
    }

    for (const node of allKnockoutNodes) {
      const homeTeam = node.homeSlot.team;
      const awayTeam = node.awaySlot.team;

      // Jika kedua tim belum diketahui (grup/ronde sebelumnya belum selesai), lewati dulu
      if (!homeTeam || !awayTeam) {
        skippedList.push(`${node.title}: tim belum ditentukan (${node.homeSlot.label} vs ${node.awaySlot.label})`);
        continue;
      }

      // Cek apakah pertandingan untuk stage, jam, dan lapangan ini sudah ada di DB
      const existing = matches.find(
        (m) =>
          m.stage === node.stage &&
          m.field === node.field &&
          m.kickoff_time.slice(0, 5) === node.kickoff_time.slice(0, 5)
      );

      if (existing) {
        // Jangan timpa laga yang sudah selesai kecuali flag force = true
        if (existing.status === 'finished' && !force) {
          continue;
        }

        // Jika timnya berubah (misal pemenang babak sebelumnya baru saja selesai atau ada override)
        if (existing.team_a_id !== homeTeam.id || existing.team_b_id !== awayTeam.id) {
          await dbMatches.update(existing.id, {
            team_a_id: homeTeam.id,
            team_b_id: awayTeam.id,
            group_name: node.code,
          });
          updatedCount++;
        }
      } else {
        // Buat pertandingan baru
        await dbMatches.create({
          id: crypto.randomUUID(),
          category,
          stage: node.stage,
          group_name: node.code,
          field: node.field,
          match_date: node.match_date,
          kickoff_time: node.kickoff_time,
          team_a_id: homeTeam.id,
          team_b_id: awayTeam.id,
          status: 'scheduled',
          score_a: 0,
          score_b: 0,
        });
        createdCount++;
      }
    }

    await audit(session, 'sync_bracket', 'matches', {
      category,
      createdCount,
      updatedCount,
      hasOverrides: Boolean(bracketOptions.groupOverrides || bracketOptions.slotOverrides),
    });

    return NextResponse.json({
      success: true,
      data: {
        category,
        createdCount,
        updatedCount,
        skippedList,
        warnings,
        isGroupStageComplete: bracket.isGroupStageComplete,
        unresolvedDrawCount: bracket.unresolvedDrawMatches.length,
      },
    });
  } catch (error: unknown) {
    console.error('Bracket sync error:', error);
    const err = error as { message?: string; code?: string };
    const errorMsg = err?.message || 'Gagal menyinkronkan babak gugur';
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
