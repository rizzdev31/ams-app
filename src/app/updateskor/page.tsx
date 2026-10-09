'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { MatchWithTeams } from '@/lib/types';
import MatchRow from '@/components/MatchRow';
import EmptyState from '@/components/EmptyState';
import MatchEventsManager from '@/components/MatchEventsManager';
import MatchPamphletModal from '@/components/MatchPamphletModal';
import Monogram from '@/components/Monogram';
import { announceChangeEverywhere, matchesStore, useResource } from '@/lib/live-store';
import { toast } from '@/components/Toast';

/** Papan skor lapangan: satu layar untuk wasit di dua lapangan. */
export default function UpdateSkorPage() {
  // Papan wasit memakai store yang sama dengan halaman publik, jadi skor
  // yang diketik di sini muncul seketika di semua tab.
  const [matches, online, reload] = useResource(matchesStore);
  const [selectedField, setSelectedField] = useState<string>('all');
  const [statusTab, setStatusTab] = useState<'live' | 'finished' | 'all'>('live');
  const [revisingIds, setRevisingIds] = useState<string[]>([]);
  const [pamphletMatch, setPamphletMatch] = useState<MatchWithTeams | null>(null);
  const [expandedEvents, setExpandedEvents] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [penaltyMatch, setPenaltyMatch] = useState<MatchWithTeams | null>(null);
  const [penaltyScoreA, setPenaltyScoreA] = useState<number>(0);
  const [penaltyScoreB, setPenaltyScoreB] = useState<number>(0);

  const loading = matches.length === 0 && !online;

  useEffect(() => {
    if (!online) return;
    setLastUpdated(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
  }, [matches, online]);

  const fields = [...new Set(matches.map((m) => m.field).filter(Boolean))] as string[];

  const isRevising = (id: string) => revisingIds.includes(id);
  const toggleRevising = (id: string) => {
    setRevisingIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleEvents = (id: string) => {
    setExpandedEvents((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const shown = matches
    .filter((m) => {
      if (statusTab === 'live') return m.status === 'live' || m.status === 'halftime';
      if (statusTab === 'finished') return m.status === 'finished';
      return true;
    })
    .filter((m) => (selectedField === 'all' ? true : m.field === selectedField))
    .sort((a, b) => {
      if (statusTab === 'finished') {
        return b.kickoff_time.localeCompare(a.kickoff_time);
      }
      return a.kickoff_time.localeCompare(b.kickoff_time);
    });

  const update = async (m: MatchWithTeams, body: Record<string, unknown>) => {
    try {
      setSaving(m.id);
      const res = await fetch(`/api/updateskor?id=${m.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      // Segarkan store lokal lalu siarkan ke semua tab terbuka.
      await matchesStore.refresh();
      announceChangeEverywhere();
      toast.success('Papan skor berhasil diperbarui!');
    } catch {
      toast.error('Gagal memperbarui skor.');
      reload();
    } finally {
      setSaving(null);
    }
  };

  const bump = (m: MatchWithTeams, side: 'a' | 'b', delta: number) => {
    if (m.status === 'finished' && !isRevising(m.id)) return;
    const next = side === 'a' ? m.score_a + delta : m.score_b + delta;
    if (next < 0 || next > 99) return;
    update(m, side === 'a' ? { score_a: next } : { score_b: next });
  };

  const setStatus = (m: MatchWithTeams, status: MatchWithTeams['status']) => {
    if (status === 'finished') {
      // Jika partai babak gugur seri, wajib adu penalti untuk menentukan pemenang
      if (m.stage !== 'grup' && m.score_a === m.score_b) {
        setPenaltyMatch(m);
        setPenaltyScoreA(m.penalty_score_a ?? 0);
        setPenaltyScoreB(m.penalty_score_b ?? 0);
        return;
      }

      const ok = window.confirm(
        `Akhiri ${m.team_a?.name ?? 'Tim A'} ${m.score_a}–${m.score_b} ${m.team_b?.name ?? 'Tim B'}? Skor akhir dikunci di klasemen.`
      );
      if (!ok) return;
      toast.info('Pertandingan dinyatakan Selesai (Full Time).');
    } else if (status === 'live') {
      toast.info('Pertandingan dimulai.');
    } else if (status === 'halftime') {
      toast.info('Waktu Istirahat (Halftime).');
    }
    update(m, { status });
  };

  const handleSavePenalty = async () => {
    if (!penaltyMatch) return;
    if (penaltyScoreA === penaltyScoreB) {
      toast.error('Skor adu penalti tidak boleh imbang! Wajib ada pemenang.');
      return;
    }
    const winnerName = penaltyScoreA > penaltyScoreB ? penaltyMatch.team_a?.name : penaltyMatch.team_b?.name;
    const winnerId = penaltyScoreA > penaltyScoreB ? penaltyMatch.team_a_id : penaltyMatch.team_b_id;
    await update(penaltyMatch, {
      status: 'finished',
      penalty_score_a: penaltyScoreA,
      penalty_score_b: penaltyScoreB,
      winner_team_id: winnerId,
      notes: `Menang Adu Penalti ${penaltyScoreA}-${penaltyScoreB} (${winnerName})`,
    });
    setPenaltyMatch(null);
    toast.success(`Adu penalti selesai! Pemenang: ${winnerName}`);
  };

  return (
    <div className="min-h-screen bg-ink pb-12">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-md">
        <div className="wrap flex h-14 items-center justify-between gap-3">
          <Link href="/" title="Beranda Turnamen" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logoutama.png"
              alt="Logo An-Nur"
              className="h-7 w-auto object-contain flex-none"
            />
            <span className="font-display text-[16px] sm:text-[17px] font-extrabold flex items-center gap-1.5">
              <span>⏱️</span>
              <span>Papan Wasit & Skor</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="label text-muted text-xs" aria-live="polite">
              {saving ? 'Menyimpan…' : lastUpdated ? `Diperbarui ${lastUpdated}` : 'Memuat…'}
            </span>
            <button
              type="button"
              onClick={async () => {
                if (!window.confirm('Kunci papan update skor dan keluar sesi?')) return;
                try {
                  await fetch('/api/auth/passcode', { method: 'DELETE' });
                } catch {}
                window.location.href = '/updateskor/masuk';
              }}
              className="label rounded-full border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-300 hover:bg-rose-500/20 transition-colors flex items-center gap-1"
              title="Kunci papan skor dan keluar sesi"
            >
              <span>🔒</span>
              <span className="hidden sm:inline">Kunci</span>
            </button>
          </div>
        </div>

        {/* Banner Pintas Layar Penjaga Lapangan 1 & 2 */}
        <div className="wrap pb-2.5">
          <div className="rounded-2xl border border-line bg-raise/50 p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-muted flex items-center gap-1.5">
              <span>📍</span> Layar Khusus Penjaga Lapangan:
            </span>
            <div className="flex items-center gap-1.5">
              <Link
                href="/lapangan/1"
                className="label rounded-full bg-blue text-ink px-3 py-1 font-bold hover:brightness-110 transition-all text-xs"
              >
                Layar Lapangan 1 ➜
              </Link>
              <Link
                href="/lapangan/2"
                className="label rounded-full bg-emerald-500 text-ink px-3 py-1 font-bold hover:brightness-110 transition-all text-xs"
              >
                Layar Lapangan 2 ➜
              </Link>
            </div>
          </div>
        </div>

        {/* Tab Filter Status */}
        <div className="wrap pb-2">
          <div className="grid grid-cols-3 gap-1 rounded-full bg-raise/60 p-1 text-xs">
            <button
              onClick={() => setStatusTab('live')}
              className={`rounded-full py-1.5 font-bold transition-all ${
                statusTab === 'live' ? 'bg-blue text-ink shadow-sm' : 'text-muted hover:text-text'
              }`}
            >
              Sedang Main
            </button>
            <button
              onClick={() => setStatusTab('finished')}
              className={`rounded-full py-1.5 font-bold transition-all ${
                statusTab === 'finished' ? 'bg-yellow text-ink shadow-sm' : 'text-muted hover:text-text'
              }`}
            >
              Selesai (Revisi)
            </button>
            <button
              onClick={() => setStatusTab('all')}
              className={`rounded-full py-1.5 font-bold transition-all ${
                statusTab === 'all' ? 'bg-text text-ink shadow-sm' : 'text-muted hover:text-text'
              }`}
            >
              Semua
            </button>
          </div>
        </div>

        {/* Tab Filter Lapangan */}
        <div className="wrap pb-2.5">
          <div className="pill gap-0.5 p-1" role="group" aria-label="Lapangan">
            {['all', ...fields].map((f) => (
              <button
                key={f}
                aria-pressed={selectedField === f}
                onClick={() => setSelectedField(f)}
                className={`label flex-1 rounded-full px-4 py-2 transition-colors text-xs ${
                  selectedField === f ? 'bg-text text-ink' : 'text-muted'
                }`}
              >
                {f === 'all' ? 'Semua Lapangan' : `Lapangan ${f}`}
              </button>
            ))}
          </div>
        </div>
      </header>

      {!online && (
        <div className="wrap pt-3">
          <p className="rounded-full border border-line bg-surface px-5 py-2 text-sm text-muted">
            Koneksi terputus. Menampilkan data terakhir.
          </p>
        </div>
      )}

      <main className="wrap pt-6">
        {loading ? (
          <div className="space-y-2.5">
            {[0, 1].map((i) => (
              <div key={i} className="h-28 animate-skeleton rounded-[26px] bg-raise" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <EmptyState
            title={
              statusTab === 'live'
                ? 'Tidak ada pertandingan berlangsung'
                : statusTab === 'finished'
                ? 'Belum ada pertandingan selesai'
                : 'Tidak ada pertandingan'
            }
            description={
              selectedField !== 'all'
                ? `Tidak ada pertandingan di lapangan ${selectedField}.`
                : statusTab === 'live'
                ? 'Semua pertandingan sudah selesai atau belum dimulai. Buka tab "Selesai (Revisi)" jika ingin mengecek pertandingan sebelumnya.'
                : 'Tidak ada data pertandingan untuk filter yang dipilih.'
            }
          />
        ) : (
          <div className="space-y-4">
            {shown.map((m) => {
              const finished = m.status === 'finished';
              const locked = finished && !isRevising(m.id);

              return (
                <div
                  key={m.id}
                  className="rounded-[26px] border border-line bg-surface/50 p-3 sm:p-4 shadow-sm space-y-3"
                >
                  <MatchRow
                    match={m}
                    code={`Lapangan ${m.field}`}
                    showCategory={Boolean(m.category)}
                  />

                  {/* Banner Adu Penalti jika ada */}
                  {m.penalty_score_a !== null && m.penalty_score_b !== null && (
                    <div className="rounded-2xl border border-yellow/40 bg-yellow/10 p-2 text-center font-mono text-xs font-bold text-yellow flex items-center justify-between px-3">
                      <span className="flex items-center gap-1.5">
                        <span>⚽</span>
                        <span>ADU PENALTI</span>
                      </span>
                      <span className="bg-ink/60 px-2 py-0.5 rounded border border-yellow/30">
                        {m.team_a?.short_name ?? 'A'} {m.penalty_score_a} – {m.penalty_score_b} {m.team_b?.short_name ?? 'B'}
                      </span>
                    </div>
                  )}

                  {/* Accordion Pencatatan Gol & Kartu Wasit */}
                  <div className="rounded-2xl border border-line/80 bg-raise/30 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleEvents(m.id)}
                      className="w-full px-4 py-2.5 text-xs font-bold text-text hover:bg-raise/60 flex items-center justify-between transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <span>⚽</span>
                        <span>Catat Gol & Kartu Lapangan</span>
                      </span>
                      <span className="text-muted flex items-center gap-1 font-normal text-[11px]">
                        {expandedEvents.includes(m.id) ? 'Tutup Panel ▲' : 'Buka Pencatatan ▼'}
                      </span>
                    </button>

                    {expandedEvents.includes(m.id) && (
                      <MatchEventsManager match={m} onMatchUpdated={reload} />
                    )}
                  </div>

                  {/* KONTROL SKOR & STATUS */}
                  {finished && locked ? (
                    <div className="rounded-2xl border border-line bg-surface/80 p-4 text-center space-y-2">
                      <div className="flex items-center justify-center gap-2 font-display text-sm font-bold text-text">
                        <span className="text-base">🔒</span>
                        <span>Pertandingan Selesai · Skor Terkunci</span>
                      </div>
                      <p className="text-xs text-muted max-w-sm mx-auto">
                        Skor akhir ({m.score_a}–{m.score_b}) terkunci. Jika terjadi salah klik &quot;Akhiri&quot; atau protes wasit, buka mode revisi.
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                        {/* Tombol Input Penalti Jika Babak Gugur Seri Belum Memiliki Penalti */}
                        {m.stage !== 'grup' && m.score_a === m.score_b && m.penalty_score_a === null && (
                          <button
                            type="button"
                            onClick={() => {
                              setPenaltyMatch(m);
                              setPenaltyScoreA(0);
                              setPenaltyScoreB(0);
                            }}
                            className="label rounded-full border border-rose-500 bg-rose-500/20 px-3.5 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/30 active:scale-95 transition-all flex items-center gap-1.5 shadow-sm animate-pulse"
                          >
                            <span>⚽</span>
                            <span>Wajib Input Adu Penalti!</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setPamphletMatch(m)}
                          className="label inline-flex items-center gap-2 rounded-full border border-blue/40 bg-blue/15 px-4 py-2 text-xs font-bold text-blue hover:bg-blue/25 transition-all shadow-sm active:scale-95"
                        >
                          <span>🖼️</span> Unduh Pamflet Resmi
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleRevising(m.id)}
                          className="label inline-flex items-center gap-2 rounded-full border border-yellow/50 bg-yellow/15 px-4 py-2 text-xs font-bold text-yellow hover:bg-yellow/25 transition-all"
                        >
                          <span>🔓</span> Buka Kunci / Revisi
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {finished && !locked && (
                        <div className="rounded-2xl border border-yellow/50 bg-yellow/10 p-3.5 space-y-2.5 animate-reveal">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-yellow flex items-center gap-1.5">
                              <span>⚠️</span> MODE REVISI SKOR AKTIF
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleRevising(m.id)}
                              className="label rounded-full bg-blue px-3 py-1.5 text-xs font-bold text-ink"
                            >
                              🔒 Selesai & Kunci Kembali
                            </button>
                          </div>
                          <p className="text-[11px] text-muted">
                            Tombol skor di bawah kini aktif untuk koreksi. Anda juga dapat mengembalikan status ke babak berlangsung:
                          </p>

                          {/* Tombol Khusus Koreksi Penalti di Babak Gugur */}
                          {m.stage !== 'grup' && (
                            <button
                              type="button"
                              onClick={() => {
                                setPenaltyMatch(m);
                                setPenaltyScoreA(m.penalty_score_a ?? 0);
                                setPenaltyScoreB(m.penalty_score_b ?? 0);
                              }}
                              className="label h-10 w-full rounded-xl border border-yellow/60 bg-yellow/20 text-xs font-bold text-yellow hover:bg-yellow/30 active:scale-95 transition-colors flex items-center justify-center gap-1.5"
                            >
                              <span>⚽</span>
                              <span>{m.penalty_score_a !== null ? 'Koreksi Skor Adu Penalti' : 'Input Adu Penalti'}</span>
                            </button>
                          )}
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('Buka kembali pertandingan ini ke babak "Live"?')) {
                                  setStatus(m, 'live');
                                  toggleRevising(m.id);
                                }
                              }}
                              disabled={saving === m.id}
                              className="label h-10 rounded-xl border border-line bg-surface text-xs font-bold text-text hover:border-blue transition-colors"
                            >
                              ▶️ Buka ke Live
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('Buka kembali pertandingan ini ke "Istirahat (Halftime)"?')) {
                                  setStatus(m, 'halftime');
                                  toggleRevising(m.id);
                                }
                              }}
                              disabled={saving === m.id}
                              className="label h-10 rounded-xl border border-line bg-surface text-xs font-bold text-text hover:border-blue transition-colors"
                            >
                              ⏸️ Buka ke Halftime
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          onClick={() => bump(m, 'a', 1)}
                          disabled={saving === m.id}
                          className="label h-14 rounded-full bg-blue text-ink disabled:opacity-50 font-bold"
                        >
                          +1 {m.team_a?.short_name ?? 'Tim A'}
                        </button>
                        <button
                          onClick={() => bump(m, 'b', 1)}
                          disabled={saving === m.id}
                          className="label h-14 rounded-full bg-blue text-ink disabled:opacity-50 font-bold"
                        >
                          +1 {m.team_b?.short_name ?? 'Tim B'}
                        </button>
                        <button
                          onClick={() => bump(m, 'a', -1)}
                          disabled={saving === m.id || m.score_a === 0}
                          className="label h-14 rounded-full border border-line text-muted disabled:opacity-40"
                        >
                          −1 {m.team_a?.short_name ?? 'Tim A'}
                        </button>
                        <button
                          onClick={() => bump(m, 'b', -1)}
                          disabled={saving === m.id || m.score_b === 0}
                          className="label h-14 rounded-full border border-line text-muted disabled:opacity-40"
                        >
                          −1 {m.team_b?.short_name ?? 'Tim B'}
                        </button>

                        {m.status === 'scheduled' && (
                          <button
                            onClick={() => setStatus(m, 'live')}
                            disabled={saving === m.id}
                            className="label col-span-2 h-14 rounded-full bg-blue text-ink font-bold disabled:opacity-50"
                          >
                            Mulai Pertandingan
                          </button>
                        )}

                        {m.status === 'live' && (
                          <>
                            <button
                              onClick={() => setStatus(m, 'halftime')}
                              disabled={saving === m.id}
                              className="label col-span-2 h-14 rounded-full border border-line text-text disabled:opacity-50"
                            >
                              Istirahat (Halftime)
                            </button>
                            <button
                              onClick={() => setStatus(m, 'finished')}
                              disabled={saving === m.id}
                              className="label col-span-2 h-14 rounded-full bg-yellow text-ink font-bold disabled:opacity-50"
                            >
                              Akhiri Pertandingan
                            </button>
                          </>
                        )}

                        {m.status === 'halftime' && (
                          <>
                            <button
                              onClick={() => setStatus(m, 'live')}
                              disabled={saving === m.id}
                              className="label col-span-2 h-14 rounded-full bg-blue text-ink font-bold disabled:opacity-50"
                            >
                              Lanjut Babak 2
                            </button>
                            <button
                              onClick={() => setStatus(m, 'finished')}
                              disabled={saving === m.id}
                              className="label col-span-2 h-14 rounded-full bg-yellow text-ink font-bold disabled:opacity-50"
                            >
                              Akhiri Pertandingan
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal Input Hasil Adu Penalti (Knockout Draw) */}
      {penaltyMatch && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-reveal"
          role="dialog"
          aria-modal="true"
          aria-label="Input Hasil Adu Penalti"
        >
          <div className="w-full max-w-md rounded-[28px] border-2 border-line bg-surface p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚽</span>
                <div>
                  <h3 className="font-display text-base sm:text-lg font-bold text-text">
                    Hasil Adu Penalti
                  </h3>
                  <p className="text-[11px] text-muted">
                    Partai gugur berakhir seri {penaltyMatch.score_a}–{penaltyMatch.score_b}. Tentukan pemenang!
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPenaltyMatch(null)}
                className="h-8 w-8 rounded-full border border-line bg-raise text-muted hover:text-text flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Score Grid Penalti */}
            <div className="grid grid-cols-2 gap-3 py-2">
              {/* TIM A */}
              <div className="rounded-2xl border border-line bg-raise/40 p-3 flex flex-col items-center text-center">
                <Monogram
                  name={penaltyMatch.team_a?.name ?? 'Tim A'}
                  shortName={penaltyMatch.team_a?.short_name}
                  logoUrl={penaltyMatch.team_a?.logo_url}
                  color={penaltyMatch.team_a?.color}
                  size={36}
                />
                <span className="mt-1 font-display text-xs font-bold text-text truncate max-w-full">
                  {penaltyMatch.team_a?.name ?? 'Tim A'}
                </span>
                <span className="font-mono text-4xl sm:text-5xl font-black text-text my-2">
                  {penaltyScoreA}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPenaltyScoreA(Math.max(0, penaltyScoreA - 1))}
                    disabled={penaltyScoreA === 0}
                    className="h-10 w-10 rounded-xl border border-line bg-surface text-lg font-bold text-muted hover:text-text active:scale-95 disabled:opacity-30"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() => setPenaltyScoreA(penaltyScoreA + 1)}
                    className="h-10 w-10 rounded-xl bg-blue text-ink text-lg font-black active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* TIM B */}
              <div className="rounded-2xl border border-line bg-raise/40 p-3 flex flex-col items-center text-center">
                <Monogram
                  name={penaltyMatch.team_b?.name ?? 'Tim B'}
                  shortName={penaltyMatch.team_b?.short_name}
                  logoUrl={penaltyMatch.team_b?.logo_url}
                  color={penaltyMatch.team_b?.color}
                  size={36}
                />
                <span className="mt-1 font-display text-xs font-bold text-text truncate max-w-full">
                  {penaltyMatch.team_b?.name ?? 'Tim B'}
                </span>
                <span className="font-mono text-4xl sm:text-5xl font-black text-text my-2">
                  {penaltyScoreB}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPenaltyScoreB(Math.max(0, penaltyScoreB - 1))}
                    disabled={penaltyScoreB === 0}
                    className="h-10 w-10 rounded-xl border border-line bg-surface text-lg font-bold text-muted hover:text-text active:scale-95 disabled:opacity-30"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() => setPenaltyScoreB(penaltyScoreB + 1)}
                    className="h-10 w-10 rounded-xl bg-blue text-ink text-lg font-black active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Status Pemenang Penalti */}
            <div className="rounded-xl p-2.5 text-center text-xs font-bold">
              {penaltyScoreA === penaltyScoreB ? (
                <div className="text-yellow flex items-center justify-center gap-1.5 bg-yellow/10 py-1.5 rounded-lg border border-yellow/30">
                  <span>⚠️</span>
                  <span>Skor penalti tidak boleh imbang! Wajib ada pemenang.</span>
                </div>
              ) : (
                <div className="text-emerald-400 flex items-center justify-center gap-1.5 bg-emerald-500/10 py-1.5 rounded-lg border border-emerald-500/30">
                  <span>🏆</span>
                  <span>
                    Pemenang: {penaltyScoreA > penaltyScoreB ? penaltyMatch.team_a?.name : penaltyMatch.team_b?.name}
                  </span>
                </div>
              )}
            </div>

            {/* Tombol Aksi Simpan */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPenaltyMatch(null)}
                className="label h-12 rounded-xl border border-line bg-surface text-xs font-bold text-muted hover:text-text active:scale-95"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSavePenalty}
                disabled={penaltyScoreA === penaltyScoreB || Boolean(saving)}
                className="label h-12 rounded-xl bg-blue text-ink text-xs font-bold shadow-md hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving ? 'Menyimpan...' : 'Simpan & Akhiri ➜'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pamflet Hasil Pertandingan */}
      <MatchPamphletModal
        match={pamphletMatch}
        isOpen={Boolean(pamphletMatch)}
        onClose={() => setPamphletMatch(null)}
      />
    </div>
  );
}