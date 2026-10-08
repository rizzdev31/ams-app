'use client';

import { useMemo, useState } from 'react';
import type { MatchWithTeams, Team } from '@/lib/types';
import { buildTournamentBracket, KnockoutMatchNode, getGroupLeaders } from '@/lib/bracket';
import StatusBadge from './StatusBadge';
import Monogram from './Monogram';
import MatchDetailModal from './MatchDetailModal';

interface KnockoutBracketProps {
  category: 'U10' | 'U12';
  teams: Team[];
  matches: MatchWithTeams[];
  className?: string;
}

function MatchNodeCard({
  node,
  onOpenDetail,
}: {
  node: KnockoutMatchNode;
  onOpenDetail: (m: MatchWithTeams) => void;
}) {
  const m = node.match;
  const isFinished = m?.status === 'finished';
  const isLive = m?.status === 'live' || m?.status === 'halftime';
  const hasDbMatch = Boolean(m);

  const isHomeWinner = Boolean(
    isFinished &&
    node.winnerTeam &&
    node.homeSlot.team &&
    node.winnerTeam.id === node.homeSlot.team.id
  );
  const isAwayWinner = Boolean(
    isFinished &&
    node.winnerTeam &&
    node.awaySlot.team &&
    node.winnerTeam.id === node.awaySlot.team.id
  );

  const renderTeamRow = (
    team: Team | null,
    placeholderLabel: string,
    score: number | undefined,
    isWinner: boolean,
    isOpponentWinner: boolean
  ) => {
    return (
      <div
        className={`flex items-center justify-between gap-2.5 rounded-xl px-3 py-2.5 transition-all ${
          isWinner
            ? 'bg-blue/15 border border-blue/30 font-bold text-text shadow-sm'
            : isOpponentWinner
            ? 'text-muted/60 opacity-80'
            : 'text-text'
        }`}
      >
        <div className="flex min-w-0 items-center gap-2.5 flex-1">
          {team ? (
            <>
              <Monogram
                name={team.name}
                shortName={team.short_name}
                logoUrl={team.logo_url}
                color={team.color}
                size={30}
              />
              <div className="min-w-0 flex-1">
                <span
                  className="block text-[12px] sm:text-sm font-bold leading-snug line-clamp-2 break-words"
                  title={team.name}
                >
                  {team.name}
                </span>
                <span className="block text-[10px] text-muted truncate">
                  {team.short_name} · {placeholderLabel}
                </span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <span className="h-6 w-6 rounded-full border border-dashed border-line bg-surface/50 text-center text-[10px] leading-6 text-muted flex-none">
                ?
              </span>
              <span className="truncate text-xs italic text-muted/70">
                {placeholderLabel}
              </span>
            </div>
          )}
        </div>

        <div className="shrink-0 pl-2 text-right">
          {team && (isFinished || isLive) ? (
            <span
              className={`font-mono text-base sm:text-lg font-black px-2 py-0.5 rounded-md ${
                isWinner
                  ? 'bg-blue text-ink'
                  : isLive
                  ? 'bg-yellow/20 text-yellow'
                  : 'bg-line/50 text-text'
              }`}
            >
              {score ?? 0}
            </span>
          ) : (
            <span className="text-xs text-muted/40 font-mono">–</span>
          )}
        </div>
      </div>
    );
  };

  const isFinalNode = node.code === 'FINAL';
  const isThirdPlace = node.code === 'JUARA_3';

  return (
    <div
      onClick={() => {
        if (m) onOpenDetail(m);
      }}
      className={`group relative flex flex-col rounded-2xl border transition-all duration-200 ${
        hasDbMatch ? 'cursor-pointer hover:scale-[1.01] hover:shadow-lg' : 'cursor-default'
      } ${
        isFinalNode
          ? 'border-yellow/50 bg-gradient-to-b from-yellow/[0.08] via-surface/90 to-surface/90 hover:border-yellow'
          : isThirdPlace
          ? 'border-line/80 bg-surface/85 hover:border-line'
          : 'border-line bg-surface/85 hover:border-blue/50'
      } p-3 sm:p-3.5 shadow-sm backdrop-blur-sm`}
    >
      {/* Header Info Pertandingan */}
      <div className="mb-2.5 flex items-center justify-between border-b border-line/50 pb-2 text-xs">
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-muted">
          <span className="font-bold text-text">{node.kickoff_time} WIB</span>
          <span>·</span>
          <span className="rounded bg-line/60 px-1.5 py-0.2 text-[10px] text-text">
            Lap {node.field}
          </span>
          <span className="rounded bg-blue/10 px-1.5 py-0.2 text-[10px] uppercase font-sans font-bold text-blue">
            {node.code}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {m ? (
            <>
              <StatusBadge status={m.status} />
              <span className="text-[11px] text-muted group-hover:text-blue transition-colors">
                Detail ↗
              </span>
            </>
          ) : (
            <span className="label text-[10px] text-muted">Belum Dimulai</span>
          )}
        </div>
      </div>

      {/* Baris Tim A & Tim B */}
      <div className="space-y-1.5">
        {renderTeamRow(
          node.homeSlot.team,
          node.homeSlot.label,
          m?.score_a,
          isHomeWinner,
          isAwayWinner
        )}
        {renderTeamRow(
          node.awaySlot.team,
          node.awaySlot.label,
          m?.score_b,
          isAwayWinner,
          isHomeWinner
        )}
      </div>

      {/* Informasi Adu Penalti jika ada */}
      {isFinished && node.byPenalty && m?.penalty_score_a !== null && m?.penalty_score_b !== null && (
        <div className="mt-2 flex items-center justify-between rounded-lg bg-blue/10 px-2 py-1 text-[11px] font-mono text-blue font-bold">
          <span>Adu Penalti</span>
          <span>{m.penalty_score_a} - {m.penalty_score_b}</span>
        </div>
      )}

      {/* Peringatan jika pertandingan selesai imbang tanpa pemenang */}
      {node.isDrawWithoutWinner && (
        <div className="mt-2 flex items-center justify-between rounded-lg bg-red/10 border border-red/30 px-2 py-1 text-[11px] font-bold text-red">
          <span>⚠️ Seri {m?.score_a}-{m?.score_b}</span>
          <span className="text-[10px] uppercase tracking-wide">Perlu Adu Penalti</span>
        </div>
      )}

      {/* Catatan Khusus Laga (WO, dll) */}
      {m?.notes && (
        <div className="mt-1.5 text-[10px] text-muted italic truncate px-0.5">
          📝 {m.notes}
        </div>
      )}

      {/* Catatan footer bila tim ditentukan otomatis dari hasil klasemen */}
      {!hasDbMatch && node.homeSlot.team && node.awaySlot.team && (
        <div className="mt-2 text-[10px] text-blue/90 flex items-center justify-between pt-1 border-t border-line/30">
          <span>⚡ Otomatis dari klasemen grup</span>
          <span>Menunggu jadwal panitia</span>
        </div>
      )}
    </div>
  );
}

export default function KnockoutBracket({
  category,
  teams,
  matches,
  className = '',
}: KnockoutBracketProps) {
  const [selectedMatch, setSelectedMatch] = useState<MatchWithTeams | null>(null);
  const [activeRound, setActiveRound] = useState<'all' | 'qf' | 'sf' | 'final'>('all');

  const bracket = useMemo(
    () => buildTournamentBracket(category, teams, matches),
    [category, teams, matches]
  );

  const groupLeaders = useMemo(
    () => getGroupLeaders(category, teams, matches),
    [category, teams, matches]
  );

  const championTeam = bracket.finalMatch.winnerTeam;
  const runnerUpTeam = bracket.finalMatch.loserTeam;
  const thirdPlaceTeam = bracket.thirdPlaceMatch.winnerTeam;

  // Hitung jumlah laga sistem gugur yang aktif di database
  const knockoutMatchesCount = matches.filter(
    (m) => (m.category ?? 'U10') === category && m.stage !== 'grup'
  ).length;

  return (
    <div className={`w-full space-y-6 ${className}`}>
      {/* Banner Juara Turnamen (Jika Final sudah tuntas) */}
      {championTeam && (
        <div className="relative overflow-hidden rounded-3xl border-2 border-yellow/60 bg-gradient-to-r from-yellow/20 via-surface to-yellow/10 p-5 sm:p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="flex-none p-3 rounded-2xl bg-yellow/20 border border-yellow/40">
              <Monogram
                name={championTeam.name}
                shortName={championTeam.short_name}
                logoUrl={championTeam.logo_url}
                color={championTeam.color}
                size={64}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-center sm:justify-start gap-2 text-xs font-bold uppercase tracking-wider text-yellow">
                <span>🏆</span>
                <span>JUARA TURNAMEN AN-NUR MINI SOCCER {category}</span>
              </div>
              <h2 className="mt-1 font-display text-2xl sm:text-3xl font-black text-text">
                {championTeam.name}
              </h2>
              <div className="mt-2 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-muted">
                {runnerUpTeam && (
                  <span>🥈 Runner-up: <b className="text-text">{runnerUpTeam.name}</b></span>
                )}
                {thirdPlaceTeam && (
                  <span>🥉 Juara 3: <b className="text-text">{thirdPlaceTeam.name}</b></span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bar Header & Status Auto-Sinkronisasi */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface/70 px-4 sm:px-5 py-3.5 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs sm:text-sm font-bold text-text">
            Bagan Babak Gugur {category}
          </span>
          <span className="hidden sm:inline text-xs text-muted">
            ({category === 'U10' ? "Jum'at, 9 Oktober 2026" : 'Sabtu, 10 Oktober 2026'})
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted font-mono">
          <span className="px-2 py-0.5 rounded-full bg-line/60 text-text">
            {knockoutMatchesCount} Laga Terjadwal
          </span>
          <span className="text-emerald-400 font-sans font-semibold">
            ✓ Auto-Sinkron
          </span>
        </div>
      </div>

      {/* Ringkasan Tim Lolos dari Babak Grup */}
      <div className="rounded-2xl border border-line/70 bg-raise/40 p-3 sm:p-4">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-xs font-bold text-muted uppercase tracking-wider">
            Posisi Klasemen Lolos ke 8 Besar (Juara & Runner-up)
          </span>
          <span className="text-[11px] text-muted">
            {bracket.isGroupStageComplete ? '✓ Babak grup tuntas' : '⏳ Fase grup berjalan'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {(['A', 'B', 'C', 'D'] as const).map((g) => {
            const data = groupLeaders.get(g);
            return (
              <div
                key={g}
                className="rounded-xl border border-line/50 bg-surface/80 p-2.5 flex flex-col gap-1"
              >
                <div className="flex items-center justify-between font-bold text-muted text-[11px]">
                  <span>Grup {g}</span>
                  {data?.complete && <span className="text-emerald-400">✓ Selesai</span>}
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <span className="h-4 w-4 rounded-full bg-blue/20 text-blue text-[10px] font-bold inline-flex items-center justify-center flex-none">
                    1
                  </span>
                  <span className="truncate font-semibold text-text">
                    {data?.winner?.name ?? <span className="text-muted/60 italic">Juara Grup {g}</span>}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 truncate">
                  <span className="h-4 w-4 rounded-full bg-line text-muted text-[10px] font-bold inline-flex items-center justify-center flex-none">
                    2
                  </span>
                  <span className="truncate text-muted">
                    {data?.runnerUp?.name ?? <span className="italic">Runner-up {g}</span>}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Switcher Ronde di Layar Mobile (Tabs) */}
      <div className="flex lg:hidden gap-1 rounded-full border border-line bg-surface p-1 max-w-full overflow-x-auto scrollbar-hide">
        {[
          { key: 'all', label: 'Semua Babak' },
          { key: 'qf', label: '8 Besar (4)' },
          { key: 'sf', label: 'Semifinal (2)' },
          { key: 'final', label: '🏆 Final & Juara 3' },
        ].map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setActiveRound(r.key as typeof activeRound)}
            className={`label shrink-0 rounded-full px-3.5 py-2 text-xs transition-colors ${
              activeRound === r.key
                ? 'bg-text text-ink font-bold'
                : 'text-muted hover:text-text'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Grid Bagan Turnamen (Responsive: 1 kolom di mobile saat filter aktif, 3 kolom di desktop) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Kolom 1: Perempat Final (8 Besar) */}
        {(activeRound === 'all' || activeRound === 'qf') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue/20 text-xs font-bold text-blue">
                  1
                </span>
                <h3 className="font-display text-base font-extrabold text-text">
                  Perempat Final (8 Besar)
                </h3>
              </div>
              <span className="text-xs font-mono text-muted">4 Pertandingan</span>
            </div>
            <div className="space-y-3.5">
              {bracket.quarterfinals.map((node) => (
                <MatchNodeCard
                  key={node.code}
                  node={node}
                  onOpenDetail={setSelectedMatch}
                />
              ))}
            </div>
          </div>
        )}

        {/* Kolom 2: Semifinal */}
        {(activeRound === 'all' || activeRound === 'sf') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue/20 text-xs font-bold text-blue">
                  2
                </span>
                <h3 className="font-display text-base font-extrabold text-text">
                  Semifinal
                </h3>
              </div>
              <span className="text-xs font-mono text-muted">2 Pertandingan</span>
            </div>
            <div className="space-y-3.5 lg:pt-10">
              {bracket.semifinals.map((node) => (
                <div key={node.code} className="lg:mb-16">
                  <MatchNodeCard
                    node={node}
                    onOpenDetail={setSelectedMatch}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Kolom 3: Grand Final & Perebutan Juara 3 */}
        {(activeRound === 'all' || activeRound === 'final') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow/20 text-xs font-bold text-yellow">
                  🏆
                </span>
                <h3 className="font-display text-base font-extrabold text-text">
                  Final & Juara 3
                </h3>
              </div>
              <span className="text-xs font-mono text-yellow font-bold">Laga Puncak</span>
            </div>

            <div className="space-y-5 lg:pt-6">
              {/* Laga Grand Final (Juara 1 & 2) */}
              <div className="rounded-2xl border-2 border-yellow/50 bg-gradient-to-b from-yellow/15 to-transparent p-1.5 shadow-md">
                <div className="px-3 pt-2 pb-1.5 flex items-center justify-between font-display text-xs font-black tracking-wider text-yellow uppercase">
                  <span>🥇 Perebutan Juara 1 & 2</span>
                  <span>🏆 TROFI UTAMA</span>
                </div>
                <MatchNodeCard
                  node={bracket.finalMatch}
                  onOpenDetail={setSelectedMatch}
                />
              </div>

              {/* Laga Juara 3 (Perebutan Juara 3 & 4) */}
              <div className="rounded-2xl border border-line bg-surface/50 p-1.5">
                <div className="px-3 pt-2 pb-1.5 flex items-center justify-between font-display text-xs font-extrabold tracking-wider text-muted uppercase">
                  <span>🥉 Perebutan Juara 3 & 4</span>
                  <span>MEDALI PERUNGGU</span>
                </div>
                <MatchNodeCard
                  node={bracket.thirdPlaceMatch}
                  onOpenDetail={setSelectedMatch}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Detail Pertandingan saat diklik */}
      {selectedMatch && (
        <MatchDetailModal
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
        />
      )}
    </div>
  );
}
