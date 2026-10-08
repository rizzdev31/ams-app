'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import MatchCard from '@/components/MatchCard';
import EmptyState from '@/components/EmptyState';
import LiveCard from '@/components/LiveCard';
import { matchesStore, useResource } from '@/lib/live-store';

export default function LivePage() {
  // Store yang sama dengan beranda, jadwal, dan ticker — satu angka untuk semua.
  const [matches, online, reload] = useResource(matchesStore);
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    if (!online) return;
    setLastUpdated(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
  }, [matches, online]);

  const loading = matches.length === 0 && !online;

  const live = matches.filter((m) => m.status === 'live' || m.status === 'halftime');
  const done = matches
    .filter((m) => m.status === 'finished')
    .sort((a, b) =>
      `${b.match_date}${b.kickoff_time}`.localeCompare(`${a.match_date}${a.kickoff_time}`)
    )
    .slice(0, 6);
  const next = matches
    .filter((m) => m.status === 'scheduled')
    .sort((a, b) => `${a.match_date}${a.kickoff_time}`.localeCompare(`${b.match_date}${b.kickoff_time}`))
    .slice(0, 1);

  return (
    <div className="wrap pt-12 pb-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="rule-title font-display text-[30px] font-extrabold md:text-[46px]">
          Skor live
        </h1>
        <div className="flex items-center gap-3">
          <Link
            href="/tv"
            className="label rounded-full bg-gradient-to-r from-blue to-cyan-400 px-4 py-2.5 font-black text-ink shadow-[0_0_15px_rgba(91,141,255,0.4)] hover:brightness-110 transition-all flex items-center gap-1.5"
          >
            <span>📺</span>
            <span>Buka Mode Layar TV</span>
          </Link>
          <button
            onClick={reload}
            className="label rounded-full border border-line px-4 py-2.5 text-muted transition-colors hover:border-blue/50 hover:text-text"
          >
            Muat ulang
          </button>
        </div>
      </div>

      {/* Banner Khusus Mode Layar TV / Scoreboard Display */}
      <div className="mt-6 rounded-3xl border border-blue-500/30 bg-gradient-to-r from-blue-950/40 via-surface to-emerald-950/40 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-xl flex-none">
            📺
          </div>
          <div>
            <h3 className="font-display font-extrabold text-sm sm:text-base text-text">
              Mode Layar TV & Papan Skor Lapangan
            </h3>
            <p className="text-xs text-muted">
              Tampilan fullscreen khusus monitor/TV stadion per lapangan dengan skor raksasa dan auto-refresh instan.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/tv?lapangan=1"
            className="label rounded-full bg-blue text-ink px-3.5 py-2 font-bold hover:brightness-110 transition-all text-xs flex items-center gap-1.5 shadow-sm"
          >
            <span>TV Lap 1</span>
            <span>↗</span>
          </Link>
          <Link
            href="/tv?lapangan=2"
            className="label rounded-full bg-emerald-500 text-ink px-3.5 py-2 font-bold hover:brightness-110 transition-all text-xs flex items-center gap-1.5 shadow-sm"
          >
            <span>TV Lap 2</span>
            <span>↗</span>
          </Link>
          <Link
            href="/tv?lapangan=split"
            className="label rounded-full border border-purple-500/50 bg-purple-500/15 text-purple-300 px-3.5 py-2 font-bold hover:bg-purple-500/25 transition-all text-xs flex items-center gap-1.5"
          >
            <span>Layar Ganda (1 & 2)</span>
            <span>↗</span>
          </Link>
        </div>
      </div>

      {!online && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-full border border-line bg-surface px-5 py-2.5">
          <p className="text-sm text-muted">
            Koneksi terputus. Menampilkan data terakhir
            {lastUpdated ? ` (${lastUpdated})` : ''}.
          </p>
          <button onClick={reload} className="label text-blue">
            Muat ulang
          </button>
        </div>
      )}

      {loading && matches.length === 0 ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-40 animate-skeleton rounded-[32px] bg-raise" />
          ))}
        </div>
      ) : (
        <div className="mt-6 space-y-12">
          <section aria-label="Sedang berlangsung">
            {live.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {live.map((m, i) => (
                  <LiveCard key={m.id} match={m} index={i} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="Tidak ada pertandingan berlangsung"
                description={
                  next.length > 0
                    ? 'Skor akan muncul di sini begitu panitia memulai pertandingan.'
                    : 'Semua pertandingan sudah selesai.'
                }
                action={
                  next.length > 0 ? (
                    <div className="mx-auto max-w-sm text-left">
                      <MatchCard match={next[0]} compact />
                    </div>
                  ) : (
                    <Link
                      href="/jadwal"
                      className="label inline-flex h-12 items-center rounded-full border border-line px-6 text-text"
                    >
                      Lihat jadwal
                    </Link>
                  )
                }
              />
            )}
          </section>

          {done.length > 0 && (
            <section aria-label="Hasil terbaru">
              <div className="flex items-center justify-between gap-3">
                <h2 className="rule-title font-display text-2xl font-extrabold">
                  Hasil terbaru
                </h2>
                <Link href="/klasemen" className="label text-blue">
                  Klasemen
                </Link>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {done.map((m) => (
                  <MatchCard key={m.id} match={m} compact />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}