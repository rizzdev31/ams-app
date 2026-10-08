'use client';

import { useCallback, useRef, useState } from 'react';
import type { MatchWithTeams } from '@/lib/types';
import { formatTime } from '@/lib/utils';
import CategoryMark from './CategoryMark';
import StatusBadge from './StatusBadge';
import ScorePair from './ScoreValue';
import Reveal from './Reveal';
import MatchDetailModal from './MatchDetailModal';
import Monogram from './Monogram';

/**
 * Kartu pertandingan LIVE. Dipakai beranda dan /live — satu sumber supaya
 * bingkai berputar, denyut gol, dan geraknya tidak pernah berbeda antar halaman.
 */
export default function LiveCard({ match, index = 0 }: { match: MatchWithTeams; index?: number }) {
  const [pulse, setPulse] = useState(0);
  const [showDetail, setShowDetail] = useState(false);

  const cheer = useCallback(() => {
    setPulse((k) => k + 1);
  }, []);

  return (
    <>
      <Reveal
        as="article"
        index={index}
        onClick={() => setShowDetail(true)}
        className="group relative isolate overflow-hidden rounded-2xl sm:rounded-[32px] bg-gradient-to-bl from-raise to-ink p-4 sm:p-6 cursor-pointer select-none"
      >
      <span
        aria-hidden
        className="animate-halo pointer-events-none absolute inset-0 -z-10 rounded-2xl sm:rounded-[32px] p-[1.5px]"
        style={{
          background:
            'conic-gradient(from var(--a), transparent 0 60%, var(--color-yellow) 82%, transparent 100%)',
          WebkitMask:
            'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          mask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />
      <span
        key={pulse}
        aria-hidden
        className={
          pulse > 0
            ? 'goal-pulse pointer-events-none absolute inset-0 rounded-2xl sm:rounded-[32px]'
            : 'pointer-events-none absolute inset-0 rounded-2xl sm:rounded-[32px]'
        }
      />

      <div className="relative flex items-center justify-between gap-3">
        {match.category ? (
          <CategoryMark category={match.category} field={match.field} />
        ) : (
          <span className="label text-muted">
            {match.field ? `Lapangan ${match.field}` : ''}
          </span>
        )}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-yellow/80 group-hover:text-yellow transition-colors">
            Detail ↗
          </span>
          <StatusBadge status={match.status} />
        </div>
      </div>

      <div className="relative mt-3 sm:mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
        {/* Tim A */}
        <div className="flex items-center gap-2 min-w-0 text-left">
          <div className="flex-none">
            <Monogram
              name={match.team_a?.name ?? 'A'}
              shortName={match.team_a?.short_name}
              logoUrl={match.team_a?.logo_url}
              color={match.team_a?.color}
              size={34}
            />
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="font-display text-[12px] sm:text-[16px] md:text-[19px] font-bold leading-snug line-clamp-2 break-words"
              title={match.team_a?.name}
            >
              {match.team_a?.name ?? 'Tim A'}
            </p>
          </div>
        </div>

        {/* Skor Tengah */}
        <div className="flex-none flex items-center justify-center px-1">
          <ScorePair
            a={match.score_a ?? 0}
            b={match.score_b ?? 0}
            size="text-2xl sm:text-4xl md:text-[clamp(40px,7vw,64px)] leading-none"
            label={`${match.team_a?.name ?? 'Tim A'} ${match.score_a ?? 0}, ${match.team_b?.name ?? 'Tim B'} ${match.score_b ?? 0}`}
            onGoal={cheer}
          />
        </div>

        {/* Tim B */}
        <div className="flex items-center justify-end gap-2 min-w-0 text-right">
          <div className="min-w-0 flex-1 text-right">
            <p
              className="font-display text-[12px] sm:text-[16px] md:text-[19px] font-bold leading-snug line-clamp-2 break-words text-right"
              title={match.team_b?.name}
            >
              {match.team_b?.name ?? 'Tim B'}
            </p>
          </div>
          <div className="flex-none">
            <Monogram
              name={match.team_b?.name ?? 'B'}
              shortName={match.team_b?.short_name}
              logoUrl={match.team_b?.logo_url}
              color={match.team_b?.color}
              size={34}
            />
          </div>
        </div>
      </div>

      <p className="label relative mt-3 sm:mt-4 text-muted">
        {match.match_date} · {formatTime(match.kickoff_time)}
      </p>
    </Reveal>

    {showDetail && (
      <MatchDetailModal match={match} onClose={() => setShowDetail(false)} />
    )}
  </>
  );
}