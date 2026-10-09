'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import type { MatchWithTeams } from '@/lib/types';
import { formatTime, todayWIB, getMatchPartai } from '@/lib/utils';
import {
  announceChangeEverywhere,
  matchesStore,
  settingsStore,
  useResource,
} from '@/lib/live-store';
import CategoryMark from '@/components/CategoryMark';
import StatusBadge from '@/components/StatusBadge';
import MatchEventsManager from '@/components/MatchEventsManager';
import Monogram from '@/components/Monogram';
import { toast } from '@/components/Toast';

const FIELDS = ['1', '2'];

function stamp(date: Date): string {
  return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

interface UndoState {
  matchId: string;
  snapshot: { score_a: number; score_b: number; status: MatchWithTeams['status'] };
}

export default function SkorTab() {
  // Committee membaca store yang sama dengan halaman publik. Skor yang diinput
  // langsung terlihat di semua tab tanpa menunggu polling.
  const [matches, online, reload] = useResource(matchesStore);
  const [settings] = useResource(settingsStore);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState('Semua');

  // Sinkronkan filter awal dengan fokus turnamen aktif dari pengaturan (misal U-12)
  useEffect(() => {
    if (settings?.active_category && (settings.active_category === 'U10' || settings.active_category === 'U12')) {
      setFilter(settings.active_category);
    }
  }, [settings?.active_category]);
  const [isRevising, setIsRevising] = useState<boolean>(false);
  const [saveState, setSaveState] = useState<{ kind: 'idle' | 'saving' | 'saved' | 'error'; time: string }>({
    kind: 'idle',
    time: '',
  });
  const [undo, setUndo] = useState<UndoState | null>(null);
  const [lastChange, setLastChange] = useState<string>('');
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsRevising(false);
  }, [selectedId]);

  const isLoading = matches.length === 0 && !online;

  const slotMatch = (field: string): MatchWithTeams | undefined => {
    const inField = matches.filter(
      (m) => m.field === field && (filter === 'Semua' || (m.category ?? 'U10') === filter)
    );
    const live = inField
      .filter((m) => m.status === 'live' || m.status === 'halftime')
      .sort((a, b) => a.kickoff_time.localeCompare(b.kickoff_time))[0];
    if (live) return live;
    return inField
      .filter((m) => m.status === 'scheduled')
      .sort((a, b) =>
        `${a.match_date}${a.kickoff_time}`.localeCompare(`${b.match_date}${b.kickoff_time}`)
      )[0];
  };

  const selected = matches.find((m) => m.id === selectedId) ?? null;

  const todayList = useMemo(() => {
    const today = todayWIB();
    const pool = matches.filter((m) => m.match_date === today);
    const source = pool.length > 0 ? pool : matches;
    const list = filter === 'Semua' ? source : source.filter((m) => m.category === filter);
    return [...list].sort((a, b) => {
      const liveA = a.status === 'live' || a.status === 'halftime';
      const liveB = b.status === 'live' || b.status === 'halftime';
      if (liveA !== liveB) return liveA ? -1 : 1;
      const timeComp = `${a.match_date}${a.kickoff_time}`.localeCompare(`${b.match_date}${b.kickoff_time}`);
      if (timeComp !== 0) return timeComp;
      return (a.field || '').localeCompare(b.field || '');
    });
  }, [matches, filter]);

  const showUndo = (u: UndoState) => {
    setUndo(u);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), 6000);
  };

  const push = async (id: string, body: Record<string, unknown>, undoable?: UndoState) => {
    setSaveState({ kind: 'saving', time: '' });
    try {
      const res = await fetch(`/api/matches/${id}/score`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      setSaveState({ kind: 'saved', time: stamp(new Date()) });
      if (undoable) showUndo(undoable);
      
      if (body.status) {
        const statusLabels: Record<string, string> = {
          scheduled: 'Jadwal',
          live: 'Babak 1 (Live)',
          halftime: 'Turun Minum (Halftime)',
          finished: 'Selesai (Finished)',
        };
        toast.info(`Status pertandingan diubah: ${statusLabels[body.status as string] || body.status}`);
      } else if (body.score_a !== undefined || body.score_b !== undefined) {
        toast.success(`Skor pertandingan diperbarui: ${body.score_a ?? ''} - ${body.score_b ?? ''}`);
      }

      // Segarkan store lokal lalu beritahukan SEMUA tab (publik dan panitia
      // lain) supaya angka berubah seketika, bukan setelah giliran polling.
      await matchesStore.refresh();
      announceChangeEverywhere();
    } catch {
      setSaveState({ kind: 'error', time: '' });
      toast.error('Gagal memperbarui data pertandingan ke server!');
      reload();
    }
  };

  const changeScore = (m: MatchWithTeams, team: 'a' | 'b', delta: number) => {
    if (m.status === 'finished' && !isRevising) return;
    const next = team === 'a' ? m.score_a + delta : m.score_b + delta;
    if (next < 0 || next > 99) return;
    const teamId = team === 'a' ? m.team_a_id : m.team_b_id;
    const body = team === 'a' ? { score_a: next } : { score_b: next };
    const undoable =
      delta < 0
        ? {
            matchId: m.id,
            snapshot: { score_a: m.score_a, score_b: m.score_b, status: m.status },
          }
        : undefined;
    setLastChange(`${m.id}:${teamId}:${next}`);
    push(m.id, body, undoable);
  };

  const changeStatus = (m: MatchWithTeams, status: MatchWithTeams['status']) => {
    if (status === 'finished') {
      const ok = window.confirm(
        `Akhiri ${m.team_a?.name ?? 'Tim A'} ${m.score_a}–${m.score_b} ${m.team_b?.name ?? 'Tim B'}? Skor akhir dikunci di klasemen.`
      );
      if (!ok) return;
      push(
        m.id,
        { status },
        {
          matchId: m.id,
          snapshot: { score_a: m.score_a, score_b: m.score_b, status: m.status },
        }
      );
      return;
    }
    push(m.id, { status });
  };

  const doUndo = async () => {
    if (!undo) return;
    const { matchId, snapshot } = undo;
    setUndo(null);
    toast.info('Membatalkan perubahan skor (Undo)...');
    await push(matchId, snapshot);
  };

  if (isLoading) {
    return (
      <div className="h-40 animate-skeleton rounded-[28px] bg-raise" />
    );
  }

  const btn =
    'label h-14 rounded-full disabled:opacity-40';

  return (
    <div className="space-y-6 pb-20">
      {/* Banner Tautan Penjaga Lapangan 1 & 2 */}
      <div className="rounded-2xl border border-line bg-surface/80 p-3.5 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <span className="font-semibold text-muted flex items-center gap-1.5">
          <span>📍</span> Layar Khusus Penjaga Lapangan (Bisa dikirim ke HP wasit/petugas):
        </span>
        <div className="flex items-center gap-2">
          <Link
            href="/lapangan/1"
            target="_blank"
            className="label rounded-full bg-blue text-ink px-3.5 py-1.5 font-bold hover:brightness-110 flex items-center gap-1 transition-all"
          >
            <span>Layar Lap 1</span>
            <span>↗</span>
          </Link>
          <Link
            href="/lapangan/2"
            target="_blank"
            className="label rounded-full bg-emerald-500 text-ink px-3.5 py-1.5 font-bold hover:brightness-110 flex items-center gap-1 transition-all"
          >
            <span>Layar Lap 2</span>
            <span>↗</span>
          </Link>
          <Link
            href="/tv"
            target="_blank"
            className="label rounded-full border border-cyan-500/50 bg-cyan-500/10 text-cyan-300 px-3.5 py-1.5 font-bold hover:bg-cyan-500/20 flex items-center gap-1 transition-all"
          >
            <span>📺 Layar TV Scoreboard</span>
            <span>↗</span>
          </Link>
        </div>
      </div>

      {/* Dua slot lapangan */}
      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map((field) => {
          const m = slotMatch(field);
          const active = m && selected?.id === m.id;
          const categoryLabel = m?.category ?? (filter !== 'Semua' ? filter : 'U10');
          return (
            <button
              key={field}
              onClick={() => m && setSelectedId(m.id)}
              disabled={!m}
              className={`panel px-5 py-4 text-left transition-colors ${
                active ? 'border-blue/60 bg-blue/10' : ''
              } disabled:opacity-40`}
            >
              <span className="label text-muted">
                Lapangan {field} · {categoryLabel}
              </span>
              {m ? (
                <>
                  <span className="num mt-1.5 block text-2xl">
                    {m.team_a?.short_name ?? '?'} {m.score_a}–{m.score_b} {m.team_b?.short_name ?? '?'}
                  </span>
                  <span className="mt-1.5 flex items-center gap-2">
                    <StatusBadge status={m.status} />
                    <span className="label text-muted">{formatTime(m.kickoff_time)}</span>
                  </span>
                </>
              ) : (
                <span className="mt-1.5 block text-sm text-muted">Tidak ada pertandingan.</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Layar input */}
      {selected ? (
        <section aria-label="Input skor" className="panel">
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line px-5 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue/15 px-2.5 py-1 font-mono text-xs font-bold text-blue">
                {getMatchPartai(selected).label}
              </span>
              <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-text">
                Lap {selected.field}
              </span>
              <span className="rounded-full bg-line/60 px-2.5 py-1 text-xs font-medium text-muted">
                {selected.category} · {selected.stage === 'grup' ? `Grup ${selected.group_name}` : selected.stage}
              </span>
            </div>
            <StatusBadge status={selected.status} />
          </div>

          <div className="grid grid-cols-2" role="group" aria-label="Pilih lapangan">
            {FIELDS.map((field) => {
              const m = slotMatch(field);
              const on = selected.id === m?.id;
              const cat = m?.category ?? (filter !== 'Semua' ? filter : 'U10');
              return (
                <button
                  key={field}
                  disabled={!m}
                  onClick={() => m && setSelectedId(m.id)}
                  aria-pressed={on}
                  className={`label h-12 disabled:opacity-40 ${
                    on ? 'bg-blue text-ink' : 'text-muted'
                  }`}
                >
                  L{field} · {cat}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2">
            {(['a', 'b'] as const).map((side) => {
              const team = side === 'a' ? selected.team_a : selected.team_b;
              const score = side === 'a' ? selected.score_a : selected.score_b;
              return (
                <div
                  key={side}
                  className="flex flex-col items-center border-r border-line px-2 py-6 last:border-0"
                >
                  <Monogram
                    name={team?.name ?? (side === 'a' ? 'Tim A' : 'Tim B')}
                    shortName={team?.short_name}
                    logoUrl={team?.logo_url}
                    color={team?.color}
                    size={48}
                  />
                  <p className="mt-2 line-clamp-2 min-h-[3rem] text-center font-display text-lg sm:text-xl font-bold">
                    {team?.name ?? (side === 'a' ? 'Tim A' : 'Tim B')}
                  </p>
                  <span className="relative my-2 block text-[96px] leading-none" aria-live="polite">
                    <span key={score} className="num block animate-flip">
                      {score}
                    </span>
                    {lastChange === `${selected.id}:${team?.id ?? ''}:${score}` && (
                      <span
                        aria-hidden
                        className="animate-flash absolute inset-x-6 -bottom-1 h-1 rounded-full bg-yellow"
                      />
                    )}
                  </span>
                  <div className="flex gap-3">
                    <button
                      onClick={() => changeScore(selected, side, -1)}
                      disabled={score <= 0 || (selected.status === 'finished' && !isRevising)}
                      aria-label={`Kurangi skor ${team?.name ?? ''}`}
                      className="num flex h-16 w-16 items-center justify-center rounded-full border border-line text-2xl font-bold disabled:opacity-20 disabled:cursor-not-allowed"
                    >
                      −
                    </button>
                    <button
                      onClick={() => changeScore(selected, side, 1)}
                      disabled={selected.status === 'finished' && !isRevising}
                      aria-label={`Tambah skor ${team?.name ?? ''}`}
                      className={`num flex h-16 w-16 items-center justify-center rounded-full text-3xl font-bold transition-all ${
                        selected.status === 'finished' && !isRevising
                          ? 'border border-line bg-surface text-muted opacity-30 cursor-not-allowed'
                          : 'bg-blue text-ink'
                      }`}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-line px-5 py-4">
            {selected.status === 'scheduled' && (
              <button onClick={() => changeStatus(selected, 'live')} className={`${btn} w-full bg-blue text-ink`}>
                Mulai pertandingan
              </button>
            )}
            {selected.status === 'live' && (
              <button onClick={() => changeStatus(selected, 'finished')} className={`${btn} w-full bg-blue text-ink`}>
                Akhiri pertandingan
              </button>
            )}
            {selected.status === 'halftime' && (
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => changeStatus(selected, 'live')} className={`${btn} bg-blue text-ink`}>
                  Lanjut babak 2
                </button>
                <button onClick={() => changeStatus(selected, 'finished')} className={`${btn} border border-line`}>
                  Akhiri
                </button>
              </div>
            )}
            {selected.status === 'finished' && !isRevising && (
              <div className="rounded-2xl border border-line bg-surface/80 p-4 text-center space-y-2">
                <div className="flex items-center justify-center gap-2 font-display text-sm font-bold text-text">
                  <span className="text-base">🔒</span>
                  <span>Pertandingan Selesai · Skor Terkunci</span>
                </div>
                <p className="text-xs text-muted max-w-md mx-auto">
                  Skor akhir telah dikunci di klasemen. Jika terjadi koreksi wasit atau protes di lapangan, buka mode revisi untuk mengoreksi skor atau melanjutkan laga.
                </p>
                <button
                  type="button"
                  onClick={() => setIsRevising(true)}
                  className="label inline-flex items-center gap-2 rounded-full border border-yellow/50 bg-yellow/15 px-5 py-2.5 text-xs font-bold text-yellow hover:bg-yellow/25 transition-all"
                >
                  <span>🔓</span> Buka Kunci / Revisi Skor & Status
                </button>
              </div>
            )}
            {selected.status === 'finished' && isRevising && (
              <div className="rounded-2xl border border-yellow/50 bg-yellow/10 p-4 space-y-3 animate-reveal">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-display text-sm font-bold text-yellow">
                    <span className="text-base">⚠️</span>
                    <span>Mode Revisi Aktif</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsRevising(false)}
                    className="label rounded-full bg-blue px-4 py-1.5 text-xs font-bold text-ink hover:brightness-110"
                  >
                    🔒 Selesai & Kunci Skor
                  </button>
                </div>
                <p className="text-xs text-muted">
                  Tombol skor (+ / −) di atas kini terbuka untuk koreksi. Anda juga dapat mengembalikan status laga jika pertandingan belum seharusnya selesai:
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Kembalikan status pertandingan ini ke "Berlangsung (Live)"?')) {
                        changeStatus(selected, 'live');
                        setIsRevising(false);
                      }
                    }}
                    className="label h-11 rounded-xl border border-line bg-surface px-3 text-xs font-bold text-text hover:border-blue transition-colors"
                  >
                    ▶️ Kembalikan ke Live
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Kembalikan status pertandingan ini ke "Istirahat (Halftime)"?')) {
                        changeStatus(selected, 'halftime');
                        setIsRevising(false);
                      }
                    }}
                    className="label h-11 rounded-xl border border-line bg-surface px-3 text-xs font-bold text-text hover:border-blue transition-colors"
                  >
                    ⏸️ Kembalikan ke Halftime
                  </button>
                </div>
              </div>
            )}
            <p className="label mt-3 text-center text-muted" aria-live="polite">
              {saveState.kind === 'saving' && 'Menyimpan…'}
              {saveState.kind === 'saved' && `Tersimpan ${saveState.time}`}
              {saveState.kind === 'error' && (
                <>
                  Gagal menyimpan.{' '}
                  <button onClick={reload} className="text-blue underline">
                    Coba lagi
                  </button>
                </>
              )}
            </p>
          </div>

          {/* Pencatatan Gol & Kartu Pertandingan */}
          <MatchEventsManager match={selected} onMatchUpdated={reload} />
        </section>
      ) : (
        <p className="panel px-5 py-6 text-muted">
          Pilih pertandingan pada slot lapangan atau daftar di bawah untuk membuka input skor.
        </p>
      )}

      {/* Daftar hari ini */}
      <section aria-label="Pertandingan hari ini">
        <div className="flex items-center justify-between gap-3">
          <h2 className="rule-title font-display text-2xl font-extrabold">Hari ini</h2>
          <div className="pill gap-0.5 p-1" role="group" aria-label="Kategori">
            {['Semua', 'U10', 'U12'].map((c) => (
              <button
                key={c}
                onClick={() => setFilter(c)}
                aria-pressed={filter === c}
                className={`label rounded-full px-4 py-2.5 ${
                  filter === c ? 'bg-text text-ink' : 'text-muted'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 overflow-hidden rounded-[28px] border border-line">
          {todayList.length === 0 ? (
            <p className="bg-surface px-5 py-6 text-muted">Tidak ada pertandingan.</p>
          ) : (
            todayList.map((m) => {
              const partai = getMatchPartai(m);
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedId(m.id)}
                  className={`flex w-full flex-wrap items-center gap-3 border-b border-line bg-surface px-5 py-3.5 text-left last:border-0 hover:bg-raise/40 transition-colors ${
                    selectedId === m.id ? 'border-l-4 border-l-blue bg-blue/5' : ''
                  }`}
                >
                  <span className="w-16 flex-none font-mono text-xs font-bold text-blue">
                    {partai.label}
                  </span>
                  <span className="w-14 flex-none font-mono text-xs text-muted">
                    {formatTime(m.kickoff_time)}
                  </span>
                  <span className="rounded border border-line bg-surface/80 px-2 py-0.5 text-[11px] font-semibold text-text">
                    Lap {m.field}
                  </span>
                  <span className="rounded bg-line/60 px-2 py-0.5 text-[11px] font-medium text-muted">
                    {m.category} · {m.stage === 'grup' ? `Grup ${m.group_name}` : m.stage}
                  </span>
                  <span className="min-w-0 flex-1 flex items-center gap-2 font-bold text-base">
                    <Monogram
                      name={m.team_a?.name ?? 'A'}
                      shortName={m.team_a?.short_name}
                      logoUrl={m.team_a?.logo_url}
                      color={m.team_a?.color}
                      size={22}
                    />
                    <span className="truncate">{m.team_a?.name ?? m.team_a?.short_name ?? '?'}</span>
                    <span className="font-mono text-sm px-1.5 py-0.5 rounded bg-line/80 font-bold flex-none">
                      {m.score_a}–{m.score_b}
                    </span>
                    <span className="truncate">{m.team_b?.name ?? m.team_b?.short_name ?? '?'}</span>
                    <Monogram
                      name={m.team_b?.name ?? 'B'}
                      shortName={m.team_b?.short_name}
                      logoUrl={m.team_b?.logo_url}
                      color={m.team_b?.color}
                      size={22}
                    />
                  </span>
                  <StatusBadge status={m.status} />
                </button>
              );
            })
          )}
        </div>
      </section>

      {undo && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-surface px-5 py-3">
          <div className="wrap flex items-center justify-between gap-3">
            <p className="text-sm text-muted">Perubahan terakhir bisa dibatalkan.</p>
            <button
              onClick={doUndo}
              className="label h-11 flex-none rounded-full bg-yellow px-5 text-ink"
            >
              Urungkan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}