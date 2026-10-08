'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { MatchWithTeams } from '@/lib/types';
import { formatTime, getMatchPartai, getU12LegacyGroup } from '@/lib/utils';
import Monogram from './Monogram';
import ScorePair from './ScoreValue';
import Reveal from './Reveal';
import StatusBadge from './StatusBadge';
import MatchDetailModal from './MatchDetailModal';

/**
 * Baris pertandingan yang responsif untuk mobile dan web desktop.
 * Mencegah teks terpotong di layar ponsel dengan multi-line clamp dan ukuran adaptif.
 */
export default function MatchRow({
  match,
  code,
  showCategory = true,
  index = 0,
}: {
  match: MatchWithTeams;
  code?: string;
  showCategory?: boolean;
  index?: number;
}) {
  const [showDetail, setShowDetail] = useState(false);
  const a = match.team_a;
  const b = match.team_b;
  const isLive = match.status === 'live' || match.status === 'halftime';
  const isFinished = match.status === 'finished';

  const scoreA = match.score_a ?? 0;
  const scoreB = match.score_b ?? 0;

  const partai = getMatchPartai(match);
  const u12Alias =
    match.category === 'U12' && match.group_name
      ? getU12LegacyGroup(match.group_name)
      : null;

  let toneA = 'font-bold text-text';
  let toneB = 'font-bold text-text';
  if (isFinished) {
    if (scoreA > scoreB) {
      toneA = 'font-extrabold text-text';
      toneB = 'font-medium text-muted';
    } else if (scoreB > scoreA) {
      toneA = 'font-medium text-muted';
      toneB = 'font-extrabold text-text';
    }
  }

  return (
    <>
      <Reveal
        as="article"
        index={index}
        onClick={() => setShowDetail(true)}
        className={`row group mb-2 sm:mb-2.5 rounded-[18px] sm:rounded-[26px] border cursor-pointer select-none transition-all ${
          isLive
            ? 'row-live border-yellow/35 bg-gradient-to-r from-yellow/10 to-blue/5'
            : 'border-line bg-white/[0.025] hover:border-blue/35 hover:bg-blue/[0.07]'
        }`}
      >
        <div className="px-3 py-2.5 sm:px-5 sm:py-4">
          {/* Header Bar Metadata Pertandingan */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
            <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 text-xs">
              {/* Badge Partai */}
              <span className="rounded-full bg-blue/15 px-2 py-0.5 sm:px-2.5 sm:py-1 font-mono text-[10px] sm:text-[11px] font-bold text-blue tracking-tight whitespace-nowrap shrink-0">
                {partai.label}
              </span>

              {/* Badge Lapangan */}
              <span className="rounded-full border border-line bg-surface/80 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] font-semibold text-text whitespace-nowrap shrink-0">
                Lap {match.field}
              </span>

              {/* Badge Grup atau Tahap */}
              {match.stage === 'grup' && match.group_name ? (
                <span className="rounded-full bg-line/60 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] font-medium text-muted whitespace-nowrap shrink-0">
                  Grup {match.group_name}
                  {u12Alias && u12Alias !== match.group_name ? ` (${u12Alias})` : ''}
                </span>
              ) : match.stage && match.stage !== 'grup' ? (
                <span className="rounded-full bg-line/60 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px] font-semibold text-text whitespace-nowrap shrink-0">
                  {match.stage === 'perempat_final'
                    ? '8 Besar'
                    : match.stage === 'semifinal'
                    ? 'Semifinal'
                    : match.stage === 'juara_3'
                    ? 'Juara 3'
                    : 'Final'}
                </span>
              ) : null}

              {/* Kategori U10 / U12 */}
              {match.category && (
                <span className="rounded-full border border-line/60 bg-surface px-1.5 py-0.5 sm:px-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-muted whitespace-nowrap shrink-0">
                  {match.category}
                </span>
              )}

              {/* Jam Kickoff */}
              <span className="font-mono text-[10px] sm:text-xs text-muted/90 font-medium whitespace-nowrap shrink-0">
                {formatTime(match.kickoff_time)} WIB
              </span>
            </div>

            <div className="flex-none flex items-center gap-1.5 sm:gap-2">
              <span className="hidden sm:inline-block text-[11px] font-medium text-muted/60 group-hover:text-blue transition-colors">
                Detail ↗
              </span>
              <StatusBadge status={match.status} />
            </div>
          </div>

          {/* Showdown Tim A vs Tim B */}
          <div className="mt-2 sm:mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
            {/* Tim A (Kiri) */}
            <div className={`flex items-center gap-2 sm:gap-3 text-left min-w-0 ${toneA}`}>
              <Link
                href={`/tim/${match.team_a_id}`}
                onClick={(e) => e.stopPropagation()}
                className="min-w-0 flex-none"
              >
                <span className="hidden sm:inline-block">
                  <Monogram name={a?.name ?? 'Tim A'} shortName={a?.short_name} logoUrl={a?.logo_url} color={a?.color} size={38} />
                </span>
                <span className="sm:hidden">
                  <Monogram name={a?.name ?? 'Tim A'} shortName={a?.short_name} logoUrl={a?.logo_url} color={a?.color} size={30} />
                </span>
              </Link>
              <Link
                href={`/tim/${match.team_a_id}`}
                onClick={(e) => e.stopPropagation()}
                className="min-w-0 flex-1 hover:text-blue transition-colors"
                title={a?.name}
              >
                <span className="block font-display text-[12px] sm:text-[16px] md:text-[18px] leading-snug line-clamp-2 break-words">
                  {a?.name ?? 'Tim A'}
                </span>
              </Link>
            </div>

            {/* Skor Tengah */}
            <div className="flex-none flex flex-col items-center justify-center px-1 sm:px-2">
              {isLive || isFinished ? (
                <ScorePair
                  a={scoreA}
                  b={scoreB}
                  size="text-lg sm:text-2xl md:text-[28px]"
                  label={`${a?.name ?? 'Tim A'} ${scoreA}, ${b?.name ?? 'Tim B'} ${scoreB}`}
                />
              ) : (
                <span className="font-mono text-xs sm:text-sm font-bold text-muted px-1.5 py-0.5 rounded bg-surface border border-line">
                  vs
                </span>
              )}
              {(match.penalty_score_a != null || match.penalty_score_b != null) && (
                <span className="text-[9px] sm:text-[10px] font-mono text-yellow font-bold mt-0.5 whitespace-nowrap">
                  P: {match.penalty_score_a}-{match.penalty_score_b}
                </span>
              )}
            </div>

            {/* Tim B (Kanan) */}
            <div className={`flex items-center justify-end gap-2 sm:gap-3 text-right min-w-0 ${toneB}`}>
              <Link
                href={`/tim/${match.team_b_id}`}
                onClick={(e) => e.stopPropagation()}
                className="min-w-0 flex-1 text-right hover:text-blue transition-colors"
                title={b?.name}
              >
                <span className="block text-right font-display text-[12px] sm:text-[16px] md:text-[18px] leading-snug line-clamp-2 break-words">
                  {b?.name ?? 'Tim B'}
                </span>
              </Link>
              <Link
                href={`/tim/${match.team_b_id}`}
                onClick={(e) => e.stopPropagation()}
                className="min-w-0 flex-none"
              >
                <span className="hidden sm:inline-block">
                  <Monogram name={b?.name ?? 'Tim B'} shortName={b?.short_name} logoUrl={b?.logo_url} color={b?.color} size={38} />
                </span>
                <span className="sm:hidden">
                  <Monogram name={b?.name ?? 'Tim B'} shortName={b?.short_name} logoUrl={b?.logo_url} color={b?.color} size={30} />
                </span>
              </Link>
            </div>
          </div>
        </div>
      </Reveal>

      {showDetail && (
        <MatchDetailModal match={match} onClose={() => setShowDetail(false)} />
      )}
    </>
  );
}