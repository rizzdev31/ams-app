import type { MatchWithTeams } from '@/lib/types';
import { formatTime } from '@/lib/utils';
import Monogram from './Monogram';
import StatusBadge from './StatusBadge';
import ScorePair from './ScoreValue';
import Link from 'next/link';

/** Kartu ringkas untuk daftar hasil terbaru. */
export default function MatchCard({
  match,
  compact = false,
}: {
  match: MatchWithTeams;
  compact?: boolean;
}) {
  const isLive = match.status === 'live' || match.status === 'halftime';
  const showScore = isLive || match.status === 'finished';

  return (
    <article className="rounded-[24px] border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="label text-muted">
          {formatTime(match.kickoff_time)}
          {match.field ? ` · Lapangan ${match.field}` : ''}
        </span>
        <StatusBadge status={match.status} />
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
        {/* Tim A */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2.5 text-right min-w-0">
          <Link href={`/tim/${match.team_a_id}`} className="min-w-0 flex-1 text-right">
            <span
              className={`block font-display leading-snug line-clamp-2 break-words font-bold ${
                compact ? 'text-[11px] sm:text-xs' : 'text-[12px] sm:text-sm md:text-base'
              }`}
              title={match.team_a?.name}
            >
              {match.team_a?.name ?? 'Tim A'}
            </span>
          </Link>
          <div className="flex-none">
            <span className="hidden sm:inline-block">
              <Monogram
                name={match.team_a?.name ?? 'A'}
                shortName={match.team_a?.short_name}
                logoUrl={match.team_a?.logo_url}
                color={match.team_a?.color}
                size={compact ? 30 : 38}
              />
            </span>
            <span className="sm:hidden">
              <Monogram
                name={match.team_a?.name ?? 'A'}
                shortName={match.team_a?.short_name}
                logoUrl={match.team_a?.logo_url}
                color={match.team_a?.color}
                size={compact ? 26 : 30}
              />
            </span>
          </div>
        </div>

        {/* Skor Tengah */}
        <div className="flex-none flex items-center justify-center px-1 sm:px-2">
          {showScore ? (
            <ScorePair
              a={match.score_a ?? 0}
              b={match.score_b ?? 0}
              size="text-base sm:text-2xl"
              label={`${match.team_a?.name ?? 'Tim A'} ${match.score_a ?? 0}, ${match.team_b?.name ?? 'Tim B'} ${match.score_b ?? 0}`}
            />
          ) : (
            <p className="num text-xs sm:text-base text-muted font-bold px-1.5 py-0.5 rounded bg-surface border border-line">
              vs
            </p>
          )}
        </div>

        {/* Tim B */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 text-left min-w-0">
          <div className="flex-none">
            <span className="hidden sm:inline-block">
              <Monogram
                name={match.team_b?.name ?? 'B'}
                shortName={match.team_b?.short_name}
                logoUrl={match.team_b?.logo_url}
                color={match.team_b?.color}
                size={compact ? 30 : 38}
              />
            </span>
            <span className="sm:hidden">
              <Monogram
                name={match.team_b?.name ?? 'B'}
                shortName={match.team_b?.short_name}
                logoUrl={match.team_b?.logo_url}
                color={match.team_b?.color}
                size={compact ? 26 : 30}
              />
            </span>
          </div>
          <Link href={`/tim/${match.team_b_id}`} className="min-w-0 flex-1 text-left">
            <span
              className={`block font-display leading-snug line-clamp-2 break-words font-bold ${
                compact ? 'text-[11px] sm:text-xs' : 'text-[12px] sm:text-sm md:text-base'
              }`}
              title={match.team_b?.name}
            >
              {match.team_b?.name ?? 'Tim B'}
            </span>
          </Link>
        </div>
      </div>
    </article>
  );
}