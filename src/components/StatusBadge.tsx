import type { MatchStatus } from '@/lib/types';

/**
 * Penanda status pertandingan yang responsif untuk mobile dan web.
 */
export default function StatusBadge({ status }: { status: MatchStatus }) {
  if (status === 'live') {
    return (
      <span className="label inline-flex h-[24px] sm:h-[26px] items-center gap-1.5 rounded-full bg-yellow px-2 sm:px-3 text-[10px] sm:text-xs text-ink font-bold whitespace-nowrap shadow-sm">
        <span className="h-1.5 w-1.5 rounded-full bg-ink animate-dot" aria-hidden />
        Live
      </span>
    );
  }

  if (status === 'finished') {
    return (
      <span className="label inline-flex h-[24px] sm:h-[26px] items-center rounded-full bg-blue/15 px-2 sm:px-3 text-[10px] sm:text-xs text-blue font-bold whitespace-nowrap">
        Selesai
      </span>
    );
  }

  if (status === 'halftime') {
    return (
      <span className="label inline-flex h-[24px] sm:h-[26px] items-center rounded-full bg-yellow/15 px-2 sm:px-3 text-[10px] sm:text-xs text-yellow font-bold whitespace-nowrap">
        Istirahat
      </span>
    );
  }

  return (
    <span className="label inline-flex h-[24px] sm:h-[26px] items-center rounded-full border border-line px-2 sm:px-2.5 text-[10px] sm:text-xs text-muted whitespace-nowrap">
      Terjadwal
    </span>
  );
}