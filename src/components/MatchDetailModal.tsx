'use client';

import { useEffect, useState, useMemo } from 'react';
import type { MatchEvent, MatchWithTeams } from '@/lib/types';
import { formatTime, getMatchPartai, getU12LegacyGroup } from '@/lib/utils';
import Monogram from './Monogram';
import StatusBadge from './StatusBadge';
import MatchPamphletModal from './MatchPamphletModal';

interface MatchDetailModalProps {
  match: MatchWithTeams | null;
  onClose: () => void;
}

export default function MatchDetailModal({ match, onClose }: MatchDetailModalProps) {
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPamphlet, setShowPamphlet] = useState(false);

  useEffect(() => {
    if (!match?.id) {
      setEvents([]);
      return;
    }

    let active = true;
    setLoading(true);

    fetch(`/api/matches/${match.id}/events`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (!active) return;
        if (json.success && Array.isArray(json.data)) {
          setEvents(json.data);
        } else {
          setEvents([]);
        }
      })
      .catch(() => {
        if (active) setEvents([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [match?.id]);

  // Tutup dengan tombol Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!match) return null;

  const a = match.team_a;
  const b = match.team_b;
  const isFinished = match.status === 'finished';
  const isLive = match.status === 'live' || match.status === 'halftime';
  const partai = getMatchPartai(match);
  const u12Alias =
    match.category === 'U12' && match.group_name
      ? getU12LegacyGroup(match.group_name)
      : null;

  const scoreA = match.score_a ?? 0;
  const scoreB = match.score_b ?? 0;

  // Gol dan kartu per tim untuk ringkasan cepat
  const teamAEvents = events.filter((e) => e.team_id === match.team_a_id);
  const teamBEvents = events.filter((e) => e.team_id === match.team_b_id);

  const teamAGoals = teamAEvents.filter((e) => e.type === 'goal');
  const teamBGoals = teamBEvents.filter((e) => e.type === 'goal');
  const teamAYellow = teamAEvents.filter((e) => e.type === 'yellow_card');
  const teamBYellow = teamBEvents.filter((e) => e.type === 'yellow_card');
  const teamARed = teamAEvents.filter((e) => e.type === 'red_card');
  const teamBRed = teamBEvents.filter((e) => e.type === 'red_card');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Detail Pertandingan"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/80 backdrop-blur-md animate-reveal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[26px] sm:rounded-[32px] border border-line bg-surface shadow-2xl">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5 bg-raise/50">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="rounded-full bg-blue/15 px-2.5 py-0.5 font-mono text-[11px] font-bold text-blue">
              {partai.label}
            </span>
            <span className="rounded-full border border-line bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-text">
              Lap {match.field}
            </span>
            {match.stage === 'grup' && match.group_name ? (
              <span className="rounded-full bg-line/60 px-2.5 py-0.5 text-[11px] font-medium text-muted">
                Grup {match.group_name}
                {u12Alias && u12Alias !== match.group_name ? ` (${u12Alias})` : ''}
              </span>
            ) : match.stage && match.stage !== 'grup' ? (
              <span className="rounded-full bg-line/60 px-2.5 py-0.5 text-[11px] font-semibold text-text">
                {match.stage === 'perempat_final'
                  ? '8 Besar'
                  : match.stage === 'semifinal'
                  ? 'Semifinal'
                  : match.stage === 'juara_3'
                  ? 'Juara 3'
                  : 'Final'}
              </span>
            ) : null}
            {match.category && (
              <span className="rounded-full border border-line/60 bg-surface px-2 py-0.5 text-[10px] font-bold uppercase text-muted">
                {match.category}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-line hover:text-text transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Match Banner: Papan Skor */}
          <div className="rounded-2xl border border-line bg-gradient-to-b from-raise/60 to-surface p-4 sm:p-5">
            <div className="flex items-center justify-center mb-3">
              <StatusBadge status={match.status} />
              <span className="mx-2 text-muted text-xs">·</span>
              <span className="font-mono text-xs text-muted">
                {formatTime(match.kickoff_time)} WIB
              </span>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              {/* Tim A */}
              <div className="flex flex-col items-center text-center min-w-0">
                <span className="hidden sm:inline-block">
                  <Monogram name={a?.name ?? 'Tim A'} shortName={a?.short_name} logoUrl={a?.logo_url} color={a?.color} size={54} />
                </span>
                <span className="sm:hidden">
                  <Monogram name={a?.name ?? 'Tim A'} shortName={a?.short_name} logoUrl={a?.logo_url} color={a?.color} size={42} />
                </span>
                <span className="mt-2 font-display text-xs sm:text-base font-bold leading-snug line-clamp-2 break-words" title={a?.name}>
                  {a?.name ?? 'Tim A'}
                </span>
                <span className="text-[10px] sm:text-xs text-muted font-mono">{a?.short_name}</span>
              </div>

              {/* Skor Tengah */}
              <div className="flex flex-col items-center px-1 sm:px-2 flex-none">
                {isLive || isFinished ? (
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <span className="num text-3xl sm:text-5xl font-extrabold text-text">
                      {scoreA}
                    </span>
                    <span className="num text-xl sm:text-2xl text-muted font-light">:</span>
                    <span className="num text-3xl sm:text-5xl font-extrabold text-text">
                      {scoreB}
                    </span>
                  </div>
                ) : (
                  <span className="num text-2xl sm:text-3xl font-bold text-muted">VS</span>
                )}
                {isFinished && (
                  <span className="label mt-1 text-[9px] sm:text-[10px] text-muted whitespace-nowrap">Hasil Akhir</span>
                )}
              </div>

              {/* Tim B */}
              <div className="flex flex-col items-center text-center min-w-0">
                <span className="hidden sm:inline-block">
                  <Monogram name={b?.name ?? 'Tim B'} shortName={b?.short_name} logoUrl={b?.logo_url} color={b?.color} size={54} />
                </span>
                <span className="sm:hidden">
                  <Monogram name={b?.name ?? 'Tim B'} shortName={b?.short_name} logoUrl={b?.logo_url} color={b?.color} size={42} />
                </span>
                <span className="mt-2 font-display text-xs sm:text-base font-bold leading-snug line-clamp-2 break-words" title={b?.name}>
                  {b?.name ?? 'Tim B'}
                </span>
                <span className="text-[10px] sm:text-xs text-muted font-mono">{b?.short_name}</span>
              </div>
            </div>

            {/* Rekap Singkat Gol & Kartu (Icon counters) */}
            <div className="mt-4 pt-3 border-t border-line/60 grid grid-cols-2 text-xs text-muted gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {teamAGoals.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-text">
                    ⚽ {teamAGoals.length}
                  </span>
                )}
                {teamAYellow.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-yellow">
                    🟨 {teamAYellow.length}
                  </span>
                )}
                {teamARed.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-danger">
                    🟥 {teamARed.length}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {teamBGoals.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-text">
                    ⚽ {teamBGoals.length}
                  </span>
                )}
                {teamBYellow.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-yellow">
                    🟨 {teamBYellow.length}
                  </span>
                )}
                {teamBRed.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-danger">
                    🟥 {teamBRed.length}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Timeline Kejadian Pertandingan */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-extrabold text-text flex items-center gap-2">
                <span>⏱️</span>
                <span>Kejadian Pertandingan</span>
              </h3>
              <span className="label text-[11px] text-muted">
                {events.length} Catatan
              </span>
            </div>

            {loading ? (
              <div className="rounded-2xl border border-line bg-surface/50 p-6 text-center text-sm text-muted">
                <div className="h-6 w-6 border-2 border-blue border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Memuat data kejadian...
              </div>
            ) : events.length === 0 ? (
              <div className="rounded-2xl border border-line bg-surface/40 p-6 text-center text-sm text-muted">
                <p>Belum ada pencetak gol atau kartu yang dicatat untuk pertandingan ini.</p>
                <p className="text-xs text-muted/70 mt-1">
                  Pencetak gol dan kartu diinput langsung oleh panitia pertandingan.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-line bg-surface/60 divide-y divide-line/60 overflow-hidden">
                {events.map((event) => {
                  const isTeamA = event.team_id === match.team_a_id;
                  const isGoal = event.type === 'goal';
                  const isYellow = event.type === 'yellow_card';
                  const isRed = event.type === 'red_card';

                  return (
                    <div
                      key={event.id}
                      className={`flex items-center justify-between p-3.5 transition-colors ${
                        isTeamA ? 'bg-blue/[0.02]' : 'bg-white/[0.01]'
                      }`}
                    >
                      {/* Sisi Kiri / Info Event */}
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Menit badge */}
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-line text-text flex-none">
                          {event.minute}&apos;
                        </span>

                        {/* Icon Event */}
                        <span className="text-base flex-none">
                          {isGoal ? '⚽' : isYellow ? '🟨' : '🟥'}
                        </span>

                        {/* Nama Pemain & Keterangan */}
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-text truncate">
                            {event.player_name}
                          </p>
                          <p className="text-[11px] text-muted truncate">
                            {isGoal
                              ? 'Gol'
                              : isYellow
                              ? 'Kartu Kuning'
                              : 'Kartu Merah'}
                            {event.note ? ` · ${event.note}` : ''}
                          </p>
                        </div>
                      </div>

                      {/* Nama Tim Penanda */}
                      <div className="flex-none flex items-center gap-2 text-right pl-2">
                        <span className="label text-[10px] text-muted font-bold">
                          {isTeamA ? a?.short_name ?? 'TIM A' : b?.short_name ?? 'TIM B'}
                        </span>
                        <Monogram
                          name={isTeamA ? a?.name ?? 'A' : b?.name ?? 'B'}
                          shortName={isTeamA ? a?.short_name : b?.short_name}
                          logoUrl={isTeamA ? a?.logo_url : b?.logo_url}
                          color={isTeamA ? a?.color : b?.color}
                          size={20}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Modal */}
        <div className="border-t border-line px-5 py-3.5 bg-raise/40 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setShowPamphlet(true)}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-blue/40 bg-blue/15 hover:bg-blue/25 text-blue text-xs font-bold transition-all active:scale-95 shadow-sm"
          >
            <span>🖼️</span>
            <span>Unduh Pamflet Resmi</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="label h-10 px-5 rounded-full border border-line bg-surface hover:bg-raise text-text transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* Modal Pamflet Hasil Pertandingan */}
      <MatchPamphletModal
        match={match}
        events={events}
        isOpen={showPamphlet}
        onClose={() => setShowPamphlet(false)}
      />
    </div>
  );
}
