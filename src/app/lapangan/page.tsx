'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { matchesStore, useResource } from '@/lib/live-store';
import { formatTime, todayWIB, getMatchPartai } from '@/lib/utils';
import StatusBadge from '@/components/StatusBadge';
import Monogram from '@/components/Monogram';

export default function PortalLapanganPage() {
  const [matches, online] = useResource(matchesStore);

  const today = todayWIB();
  const todayMatches = useMemo(() => {
    const pool = matches.filter((m) => m.match_date === today);
    return pool.length > 0 ? pool : matches;
  }, [matches, today]);

  const fieldData = (field: string) => {
    const list = todayMatches
      .filter((m) => m.field === field)
      .sort((a, b) => a.kickoff_time.localeCompare(b.kickoff_time));

    const liveMatch = list.find((m) => m.status === 'live' || m.status === 'halftime');
    const nextMatch = list.find((m) => m.status === 'scheduled');
    const finishedCount = list.filter((m) => m.status === 'finished').length;

    return { list, liveMatch, nextMatch, finishedCount };
  };

  const f1 = fieldData('1');
  const f2 = fieldData('2');

  return (
    <div className="min-h-screen bg-ink pb-20 touch-manipulation">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-md">
        <div className="wrap flex h-14 items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚽</span>
            <span className="font-display text-[16px] sm:text-[17px] font-extrabold tracking-tight">
              Portal Penjaga Lapangan
            </span>
          </div>
          <Link
            href="/updateskor"
            className="label text-[11px] sm:text-xs text-muted hover:text-text transition-colors bg-raise/80 px-2.5 py-1 rounded-full border border-line/60"
          >
            Papan Wasit ➜
          </Link>
        </div>
      </header>

      <main className="wrap pt-4 sm:pt-6 max-w-xl mx-auto space-y-4 sm:space-y-6">
        <div>
          <h1 className="font-display text-xl sm:text-3xl font-extrabold text-text">
            Pilih Lapangan Tugas Anda
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted">
            Setiap petugas lapangan fokus menginput skor, waktu kickoff, dan kejadian laga di lapangannya masing-masing sesuai urutan jadwal.
          </p>
        </div>

        <div className="grid gap-3.5 sm:gap-4 sm:grid-cols-2">
          {/* KARTU LAPANGAN 1 */}
          <div className="rounded-[24px] sm:rounded-[28px] border-2 border-blue/40 bg-gradient-to-b from-blue/10 to-surface/90 p-4 sm:p-5 shadow-lg flex flex-col justify-between space-y-3.5 sm:space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-blue text-ink px-3 py-1 font-display text-xs font-black tracking-wide uppercase">
                  Lapangan 1
                </span>
                <span className="font-mono text-[11px] sm:text-xs text-muted font-bold">
                  {f1.list.length} Partai Laga
                </span>
              </div>

              {/* Status Laga Terkini */}
              <div className="mt-4 rounded-2xl border border-line bg-surface/80 p-3.5 space-y-2">
                {f1.liveMatch ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-yellow animate-pulse">
                        <span className="h-2 w-2 rounded-full bg-yellow" /> SEDANG MAIN
                      </span>
                      <span className="font-mono text-xs text-muted">
                        {getMatchPartai(f1.liveMatch).label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm font-bold pt-1">
                      <span className="truncate">{f1.liveMatch.team_a?.short_name ?? 'A'}</span>
                      <span className="font-mono text-base px-2 py-0.5 rounded bg-line font-black">
                        {f1.liveMatch.score_a}–{f1.liveMatch.score_b}
                      </span>
                      <span className="truncate">{f1.liveMatch.team_b?.short_name ?? 'B'}</span>
                    </div>
                  </>
                ) : f1.nextMatch ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted">JADWAL BERIKUTNYA</span>
                      <span className="font-mono text-xs text-blue font-bold">
                        {formatTime(f1.nextMatch.kickoff_time)} WIB
                      </span>
                    </div>
                    <p className="text-xs font-bold text-text truncate pt-1">
                      {f1.nextMatch.team_a?.short_name ?? 'Tim A'} vs {f1.nextMatch.team_b?.short_name ?? 'Tim B'}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-muted italic">
                    {f1.finishedCount > 0 ? 'Semua pertandingan telah selesai.' : 'Belum ada jadwal pertandingan.'}
                  </p>
                )}
              </div>
            </div>

            <Link
              href="/lapangan/1"
              className="label h-12 w-full rounded-full bg-blue text-ink font-bold flex items-center justify-center gap-2 hover:brightness-110 shadow-md transition-all text-sm"
            >
              <span>Buka Layar Lapangan 1</span>
              <span>➜</span>
            </Link>
          </div>

          {/* KARTU LAPANGAN 2 */}
          <div className="rounded-[24px] sm:rounded-[28px] border-2 border-emerald-500/40 bg-gradient-to-b from-emerald-500/10 to-surface/90 p-4 sm:p-5 shadow-lg flex flex-col justify-between space-y-3.5 sm:space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-emerald-500 text-ink px-3 py-1 font-display text-xs font-black tracking-wide uppercase">
                  Lapangan 2
                </span>
                <span className="font-mono text-[11px] sm:text-xs text-muted font-bold">
                  {f2.list.length} Partai Laga
                </span>
              </div>

              {/* Status Laga Terkini */}
              <div className="mt-4 rounded-2xl border border-line bg-surface/80 p-3.5 space-y-2">
                {f2.liveMatch ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-yellow animate-pulse">
                        <span className="h-2 w-2 rounded-full bg-yellow" /> SEDANG MAIN
                      </span>
                      <span className="font-mono text-xs text-muted">
                        {getMatchPartai(f2.liveMatch).label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm font-bold pt-1">
                      <span className="truncate">{f2.liveMatch.team_a?.short_name ?? 'A'}</span>
                      <span className="font-mono text-base px-2 py-0.5 rounded bg-line font-black">
                        {f2.liveMatch.score_a}–{f2.liveMatch.score_b}
                      </span>
                      <span className="truncate">{f2.liveMatch.team_b?.short_name ?? 'B'}</span>
                    </div>
                  </>
                ) : f2.nextMatch ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted">JADWAL BERIKUTNYA</span>
                      <span className="font-mono text-xs text-emerald-400 font-bold">
                        {formatTime(f2.nextMatch.kickoff_time)} WIB
                      </span>
                    </div>
                    <p className="text-xs font-bold text-text truncate pt-1">
                      {f2.nextMatch.team_a?.short_name ?? 'Tim A'} vs {f2.nextMatch.team_b?.short_name ?? 'Tim B'}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-muted italic">
                    {f2.finishedCount > 0 ? 'Semua pertandingan telah selesai.' : 'Belum ada jadwal pertandingan.'}
                  </p>
                )}
              </div>
            </div>

            <Link
              href="/lapangan/2"
              className="label h-12 w-full rounded-full bg-emerald-500 text-ink font-bold flex items-center justify-center gap-2 hover:brightness-110 shadow-md transition-all text-sm"
            >
              <span>Buka Layar Lapangan 2</span>
              <span>➜</span>
            </Link>
          </div>
        </div>

        {/* Info Petugas */}
        <div className="rounded-2xl border border-line bg-surface p-4 text-xs text-muted space-y-1.5">
          <p className="font-bold text-text flex items-center gap-1.5">
            <span>ℹ️</span> Petunjuk untuk Petugas Lapangan:
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted">
            <li>Kirimkan tautan <code>/lapangan/1</code> atau <code>/lapangan/2</code> langsung ke HP/tablet petugas di masing-masing lapangan.</li>
            <li>Tombol skor telah dioptimalkan untuk layar sentuh dengan satu ketukan per gol.</li>
            <li>Ketika pertandingan selesai, skor otomatis terkunci di klasemen untuk mencegah salah klik. Jika terjadi revisi, gunakan tombol <strong>Buka Kunci</strong>.</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
