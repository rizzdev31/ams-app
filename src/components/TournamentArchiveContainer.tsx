'use client';

import { useState } from 'react';
import type { TournamentArchive, StandingRow } from '@/lib/types';
import Monogram from './Monogram';
import { formatTime } from '@/lib/utils';

interface TournamentArchiveContainerProps {
  archives: TournamentArchive[];
}

export default function TournamentArchiveContainer({
  archives,
}: TournamentArchiveContainerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(
    archives.length > 0 ? archives[0].id : null
  );
  const [activeTab, setActiveTab] = useState<'standings' | 'bracket' | 'matches'>('standings');

  if (archives.length === 0) {
    return null;
  }

  return (
    <section aria-label="Container Arsip Turnamen Selesai" className="space-y-6 pt-4">
      {/* Section Header */}
      <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400 uppercase font-bold tracking-wider mb-1">
            <span>📦</span>
            <span>CONTAINER ARSIP & HASIL RESMI</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white font-display tracking-tight">
            Akumulasi & Arsip Pertandingan Selesai
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Wadah arsip data pertandingan yang telah selesai. Data tersimpan rapi dan dapat ditinjau kembali kapan saja.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold">
            {archives.length} Container Tersimpan
          </span>
        </div>
      </div>

      {/* Daftar Container Arsip */}
      <div className="space-y-5">
        {archives.map((archive) => {
          const isExpanded = expandedId === archive.id;
          const snap = archive.snapshot_data;
          const groups = snap?.group_standings ? Object.keys(snap.group_standings).sort() : [];

          return (
            <div
              key={archive.id}
              className={`rounded-3xl border transition-all duration-300 overflow-hidden ${
                isExpanded
                  ? 'border-amber-500/50 bg-slate-950/90 shadow-2xl shadow-amber-500/5 ring-1 ring-amber-500/30'
                  : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
              }`}
            >
              {/* Header Container Card */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setExpandedId(isExpanded ? null : archive.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setExpandedId(isExpanded ? null : archive.id);
                  }
                }}
                className="p-4 sm:p-6 cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 select-none"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/40 text-[10px] font-mono font-black text-amber-300 uppercase tracking-wider">
                      📦 CONTAINER {archive.category}
                    </span>
                    {archive.match_date && (
                      <span className="px-2.5 py-1 rounded-md bg-slate-800 text-[10px] font-mono font-bold text-slate-300">
                        Tanggal: {archive.match_date}
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-400">
                      ✓ Diarsipkan
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-black text-white font-display">
                    {archive.name}
                  </h3>

                  {archive.description && (
                    <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                      {archive.description}
                    </p>
                  )}
                </div>

                {/* Quick Stats Pill & Toggle Button */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="hidden sm:flex items-center gap-2 text-xs font-mono bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
                    <span className="text-slate-400">Laga:</span>
                    <span className="text-white font-bold">
                      {snap?.finished_matches ?? 0}/{snap?.total_matches ?? 0}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400">Tim:</span>
                    <span className="text-cyan-400 font-bold">{snap?.total_teams ?? 0}</span>
                  </div>

                  <button
                    type="button"
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isExpanded
                        ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/30'
                        : 'bg-slate-800 hover:bg-slate-700 text-white'
                    }`}
                  >
                    <span>{isExpanded ? 'Tutup Rekapitulasi ▴' : 'Buka Rekapitulasi ▾'}</span>
                  </button>
                </div>
              </div>

              {/* Isi Detail Snapshot Container ketika di-expand */}
              {isExpanded && snap && (
                <div className="border-t border-slate-800/80 p-4 sm:p-6 bg-slate-950/60 space-y-6 animate-reveal">
                  {/* Highlight Juara & Podium jika ada */}
                  {(snap.champion_name || snap.runner_up_name) && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30">
                      <div className="p-2 text-center border-r border-slate-800/80">
                        <span className="block text-[10px] font-mono text-amber-400 font-bold uppercase">
                          🥇 JUARA 1
                        </span>
                        <span className="block text-xs sm:text-sm font-black text-white truncate mt-1">
                          {snap.champion_name || 'Dalam Proses'}
                        </span>
                      </div>
                      <div className="p-2 text-center border-r border-slate-800/80">
                        <span className="block text-[10px] font-mono text-slate-300 font-bold uppercase">
                          🥈 JUARA 2
                        </span>
                        <span className="block text-xs sm:text-sm font-black text-white truncate mt-1">
                          {snap.runner_up_name || 'Dalam Proses'}
                        </span>
                      </div>
                      <div className="p-2 text-center border-r border-slate-800/80">
                        <span className="block text-[10px] font-mono text-amber-600 font-bold uppercase">
                          🥉 JUARA 3
                        </span>
                        <span className="block text-xs sm:text-sm font-black text-white truncate mt-1">
                          {snap.third_place_name || 'Dalam Proses'}
                        </span>
                      </div>
                      <div className="p-2 text-center">
                        <span className="block text-[10px] font-mono text-slate-400 font-bold uppercase">
                          🏅 JUARA 4
                        </span>
                        <span className="block text-xs sm:text-sm font-black text-white truncate mt-1">
                          {snap.fourth_place_name || 'Dalam Proses'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Tab Selector di dalam Container */}
                  <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('standings')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                        activeTab === 'standings'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'text-slate-400 hover:text-white bg-slate-900'
                      }`}
                    >
                      📊 Klasemen Akhir Grup
                    </button>
                    {snap.bracket_summary && (
                      <button
                        type="button"
                        onClick={() => setActiveTab('bracket')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                          activeTab === 'bracket'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'text-slate-400 hover:text-white bg-slate-900'
                        }`}
                      >
                        🏆 Rekap Babak Gugur
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setActiveTab('matches')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
                        activeTab === 'matches'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'text-slate-400 hover:text-white bg-slate-900'
                      }`}
                    >
                      📋 Hasil Pertandingan ({snap.matches?.length ?? 0})
                    </button>
                  </div>

                  {/* TAB 1: KLASEMEN AKHIR GRUP */}
                  {activeTab === 'standings' && (
                    <div className="space-y-4">
                      {groups.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4">
                          Data klasemen tidak tersedia dalam arsip ini.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {groups.map((grp) => {
                            const rows = snap.group_standings?.[grp] || [];
                            return (
                              <div
                                key={grp}
                                className="rounded-2xl border border-slate-800 bg-slate-900/50 p-3.5 space-y-2.5"
                              >
                                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                  <span className="font-display text-xs font-bold text-cyan-300">
                                    Grup {grp}
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-400">
                                    {rows.length} Tim
                                  </span>
                                </div>

                                <div className="overflow-x-auto text-xs font-mono">
                                  <table className="w-full text-left">
                                    <thead>
                                      <tr className="text-slate-400 border-b border-slate-800/80 text-[10px]">
                                        <th className="py-1">#</th>
                                        <th className="py-1">Tim</th>
                                        <th className="py-1 text-center">M</th>
                                        <th className="py-1 text-center">SG</th>
                                        <th className="py-1 text-center font-bold text-white">Poin</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                      {rows.map((r: StandingRow, idx: number) => (
                                        <tr
                                          key={r.team.id}
                                          className={idx < 2 ? 'bg-emerald-500/5' : ''}
                                        >
                                          <td className="py-1.5 text-slate-400">{idx + 1}</td>
                                          <td className="py-1.5 font-sans font-bold text-white flex items-center gap-1.5">
                                            <Monogram
                                              name={r.team.name}
                                              shortName={r.team.short_name}
                                              logoUrl={r.team.logo_url}
                                              color={r.team.color}
                                              size={18}
                                            />
                                            <span className="truncate max-w-[120px]">
                                              {r.team.name}
                                            </span>
                                          </td>
                                          <td className="py-1.5 text-center text-slate-300">
                                            {r.played}
                                          </td>
                                          <td className="py-1.5 text-center text-slate-300">
                                            {r.goal_difference > 0 ? `+${r.goal_difference}` : r.goal_difference}
                                          </td>
                                          <td className="py-1.5 text-center font-bold text-amber-300">
                                            {r.points}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: REKAP BABAK GUGUR */}
                  {activeTab === 'bracket' && snap.bracket_summary && (
                    <div className="space-y-4">
                      {/* Quarterfinals */}
                      {snap.bracket_summary.qf && snap.bracket_summary.qf.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                            Perempat Final (8 Besar)
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {snap.bracket_summary.qf.map((item) => (
                              <div
                                key={item.code}
                                className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs"
                              >
                                <span className="font-mono text-slate-400">{item.code}</span>
                                <span className="font-mono font-bold text-white px-2 py-0.5 rounded bg-slate-800">
                                  {item.score}
                                </span>
                                <span className="font-sans font-bold text-emerald-400 truncate max-w-[120px]">
                                  {item.winner ? `✓ ${item.winner}` : '–'}
                                  {item.byPenalty && <span className="text-[10px] text-amber-300"> (P)</span>}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Semifinals */}
                      {snap.bracket_summary.sf && snap.bracket_summary.sf.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider">
                            Semifinal
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {snap.bracket_summary.sf.map((item) => (
                              <div
                                key={item.code}
                                className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs"
                              >
                                <span className="font-mono text-slate-400">{item.code}</span>
                                <span className="font-mono font-bold text-white px-2 py-0.5 rounded bg-slate-800">
                                  {item.score}
                                </span>
                                <span className="font-sans font-bold text-emerald-400 truncate max-w-[120px]">
                                  {item.winner ? `✓ ${item.winner}` : '–'}
                                  {item.byPenalty && <span className="text-[10px] text-amber-300"> (P)</span>}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Final & Juara 3 */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {snap.bracket_summary.final && (
                          <div className="p-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 space-y-1">
                            <span className="text-[10px] font-mono font-black text-amber-300 uppercase">
                              🏆 FINAL
                            </span>
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-mono font-bold text-white">
                                Skor: {snap.bracket_summary.final.score}
                              </span>
                              <span className="font-bold text-amber-300">
                                Juara: {snap.bracket_summary.final.winner || '–'}
                              </span>
                            </div>
                          </div>
                        )}
                        {snap.bracket_summary.third_place && (
                          <div className="p-3 rounded-2xl border border-slate-800 bg-slate-900/70 space-y-1">
                            <span className="text-[10px] font-mono font-bold text-slate-300 uppercase">
                              🥉 PEREBUTAN JUARA 3
                            </span>
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-mono font-bold text-white">
                                Skor: {snap.bracket_summary.third_place.score}
                              </span>
                              <span className="font-bold text-slate-300">
                                Juara 3: {snap.bracket_summary.third_place.winner || '–'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: DAFTAR SEMUA PERTANDINGAN */}
                  {activeTab === 'matches' && (
                    <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                      {(!snap.matches || snap.matches.length === 0) ? (
                        <p className="text-xs text-slate-400 text-center py-4">
                          Tidak ada pertandingan dalam arsip ini.
                        </p>
                      ) : (
                        snap.matches.map((m) => (
                          <div
                            key={m.id}
                            className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400 shrink-0">
                              <span>Lap {m.field}</span>
                              <span>•</span>
                              <span>{formatTime(m.kickoff_time)}</span>
                              <span>•</span>
                              <span className="uppercase">{m.stage}</span>
                            </div>

                            <div className="flex items-center justify-center gap-2 flex-1 font-bold text-white px-2 truncate">
                              <span className="truncate">{m.team_a?.name || 'A'}</span>
                              <span className="font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-300">
                                {m.score_a}–{m.score_b}
                                {m.penalty_score_a != null && (
                                  <span className="text-[9px] text-yellow-300 ml-1">
                                    (P: {m.penalty_score_a}-{m.penalty_score_b})
                                  </span>
                                )}
                              </span>
                              <span className="truncate">{m.team_b?.name || 'B'}</span>
                            </div>

                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                                m.status === 'finished'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {m.status === 'finished' ? 'FT' : m.status}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
