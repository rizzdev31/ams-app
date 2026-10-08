'use client';

import React, { useState, useEffect, useMemo, useRef, Suspense, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import type { MatchWithTeams, MatchEvent } from '@/lib/types';
import { formatTime, getMatchPartai, getStageLabel } from '@/lib/utils';
import { matchesStore, useResource } from '@/lib/live-store';
import Monogram from '@/components/Monogram';

type FieldMode = '1' | '2' | 'split';

function TvScoreboardContent() {
  const searchParams = useSearchParams();
  const fieldParam = searchParams.get('lapangan') || searchParams.get('field');

  const [selectedField, setSelectedField] = useState<FieldMode>(() => {
    if (fieldParam === '2') return '2';
    if (fieldParam === '1') return '1';
    if (fieldParam === 'split' || fieldParam === 'all') return 'split';
    return '1';
  });

  const [matches, online] = useResource(matchesStore);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [eventsMap, setEventsMap] = useState<Record<string, MatchEvent[]>>({});
  const [scorePulse, setScorePulse] = useState<Record<string, boolean>>({});

  const prevScoresRef = useRef<Record<string, { a: number; b: number }>>({});

  // 1. Sinkronisasi parameter URL jika ada perubahan
  useEffect(() => {
    if (fieldParam === '1' || fieldParam === '2' || fieldParam === 'split') {
      setSelectedField(fieldParam as FieldMode);
    }
  }, [fieldParam]);

  // 2. Jam digital realtime WIB & tanggal lokal
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
      setCurrentDate(
        now.toLocaleDateString('id-ID', {
          timeZone: 'Asia/Jakarta',
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // 3. Screen Wake Lock API agar layar TV tidak padam / sleep saat live
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch {
        // Didiamkan jika browser TV tidak mengizinkan wakelock
      }
    };
    requestWakeLock();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      try {
        wakeLock?.release();
      } catch {}
    };
  }, []);

  // 4. Fallback polling berkala (4 detik) untuk memastikan sinkronisasi instan
  useEffect(() => {
    const pollTimer = setInterval(() => {
      void matchesStore.refresh();
    }, 4000);
    return () => clearInterval(pollTimer);
  }, []);

  // 5. Cek Fullscreen State
  useEffect(() => {
    const checkFs = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', checkFs);
    return () => document.removeEventListener('fullscreenchange', checkFs);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // 6. Logika pemilihan laga aktif per lapangan (Live -> Next Scheduled -> Finished)
  const getFieldData = useCallback(
    (fieldId: '1' | '2') => {
      const fieldMatches = matches.filter((m) => m.field === fieldId);

      // Cari pertandingan live atau halftime
      const live = fieldMatches
        .filter((m) => m.status === 'live' || m.status === 'halftime')
        .sort((a, b) => (a.kickoff_time || '').localeCompare(b.kickoff_time || ''))[0];

      if (live) {
        const queue = fieldMatches
          .filter((m) => m.status === 'scheduled')
          .sort((a, b) =>
            `${a.match_date}${a.kickoff_time}`.localeCompare(`${b.match_date}${b.kickoff_time}`)
          );
        return { active: live, queue, type: 'live' as const };
      }

      // Jika tidak ada live, cari pertandingan terjadwal berikutnya
      const scheduled = fieldMatches
        .filter((m) => m.status === 'scheduled')
        .sort((a, b) =>
          `${a.match_date}${a.kickoff_time}`.localeCompare(`${b.match_date}${b.kickoff_time}`)
        );

      if (scheduled.length > 0) {
        return {
          active: scheduled[0],
          queue: scheduled.slice(1),
          type: 'scheduled' as const,
        };
      }

      // Jika semua sudah selesai, cari laga terakhir yang selesai
      const finished = fieldMatches
        .filter((m) => m.status === 'finished')
        .sort((a, b) =>
          `${b.match_date}${b.kickoff_time}`.localeCompare(`${a.match_date}${a.kickoff_time}`)
        );

      if (finished.length > 0) {
        return {
          active: finished[0],
          queue: [],
          type: 'finished' as const,
        };
      }

      return { active: null, queue: [], type: 'none' as const };
    },
    [matches]
  );

  const field1Data = useMemo(() => getFieldData('1'), [getFieldData]);
  const field2Data = useMemo(() => getFieldData('2'), [getFieldData]);

  // 7. Ambil daftar kejadian (gol/kartu) untuk pertandingan aktif
  const activeMatches = useMemo(() => {
    const list: MatchWithTeams[] = [];
    if (field1Data.active) list.push(field1Data.active);
    if (field2Data.active && field2Data.active.id !== field1Data.active?.id) {
      list.push(field2Data.active);
    }
    return list;
  }, [field1Data.active, field2Data.active]);

  useEffect(() => {
    activeMatches.forEach((m) => {
      fetch(`/api/matches/${m.id}/events`, { cache: 'no-store' })
        .then((res) => res.json())
        .then((json) => {
          if (json.success && Array.isArray(json.data)) {
            setEventsMap((prev) => ({ ...prev, [m.id]: json.data }));
          }
        })
        .catch(() => {});
    });
  }, [activeMatches]);

  // 8. Efek pulsa visual saat skor bertambah
  useEffect(() => {
    activeMatches.forEach((m) => {
      const prev = prevScoresRef.current[m.id];
      const curA = m.score_a ?? 0;
      const curB = m.score_b ?? 0;

      if (prev && (prev.a !== curA || prev.b !== curB)) {
        setScorePulse((p) => ({ ...p, [m.id]: true }));
        setTimeout(() => {
          setScorePulse((p) => ({ ...p, [m.id]: false }));
        }, 1800);
      }
      prevScoresRef.current[m.id] = { a: curA, b: curB };
    });
  }, [activeMatches]);

  return (
    <div className="min-h-screen bg-[#05070D] text-[#F4F7FC] flex flex-col justify-between selection:bg-blue-600/40 select-none overflow-x-hidden font-sans">
      {/* ============================================================== */}
      {/* 1. TOP HEADER TV SCOREBOARD                                    */}
      {/* ============================================================== */}
      <header className="border-b border-[#1C2740]/80 bg-[#0A0E18]/90 backdrop-blur-md px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-50 shadow-lg">
        {/* Logo & Judul Turnamen */}
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/" title="Kembali ke Beranda" className="flex items-center gap-3 group">
            <Image
              src="/logoutama.png"
              alt="Logo Resmi An-Nur"
              width={42}
              height={52}
              className="h-9 sm:h-11 w-auto object-contain filter drop-shadow-[0_0_12px_rgba(91,141,255,0.4)] group-hover:scale-105 transition-transform"
              priority
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-base sm:text-xl font-extrabold tracking-tight text-white uppercase">
                  An-Nur Mini Soccer 2026
                </span>
                <span className="hidden md:inline-flex rounded-full bg-blue-500/15 border border-blue-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-blue-400">
                  TV SCOREBOARD
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 font-mono hidden sm:block">
                {currentDate || 'Jumat, 9 Oktober 2026'}
              </p>
            </div>
          </Link>
        </div>

        {/* Tab Pemilih Lapangan (Lap 1 / Lap 2 / Split) */}
        <div className="flex items-center gap-1 sm:gap-1.5 p-1 rounded-full bg-[#101729] border border-[#1C2740]">
          <button
            type="button"
            onClick={() => setSelectedField('1')}
            className={`px-3 sm:px-4 py-1.5 rounded-full font-display text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 ${
              selectedField === '1'
                ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(91,141,255,0.5)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-300" />
            <span>Lapangan 1</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedField('2')}
            className={`px-3 sm:px-4 py-1.5 rounded-full font-display text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 ${
              selectedField === '2'
                ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-300" />
            <span>Lapangan 2</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedField('split')}
            className={`px-3 sm:px-4 py-1.5 rounded-full font-display text-xs sm:text-sm font-black transition-all flex items-center gap-1.5 ${
              selectedField === 'split'
                ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-purple-300" />
            <span>Layar Ganda (1 & 2)</span>
          </button>
        </div>

        {/* Jam Realtime & Tombol Fullscreen */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Indikator Online Auto-Refresh */}
          <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-[#101729] border border-[#1C2740] text-[11px] sm:text-xs font-mono font-bold text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="hidden sm:inline">LIVE</span>
          </div>

          {/* Jam Digital WIB */}
          <div className="font-mono text-xs sm:text-base font-black text-cyan-300 tracking-wider bg-black/40 px-3 py-1 rounded-lg border border-cyan-500/20">
            {currentTime ? `${currentTime} WIB` : '...'}
          </div>

          {/* Tombol Fullscreen Layar TV */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 sm:px-3 sm:py-1 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs text-slate-300 hover:text-white transition-all flex items-center gap-1.5"
            title="Layar Penuh (F11)"
          >
            <span className="text-sm">⛶</span>
            <span className="hidden md:inline font-mono">{isFullscreen ? 'Kecilkan' : 'Layar Penuh'}</span>
          </button>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. AREA UTAMA KONTEN TV (SINGLE ATAU SPLIT)                    */}
      {/* ============================================================== */}
      <main className="flex-1 p-3 sm:p-6 lg:p-8 flex flex-col justify-center max-w-[1780px] w-full mx-auto">
        {selectedField === 'split' ? (
          /* TAMPILAN DUA LAPANGAN SEKALIGUS (SPLIT SCREEN) */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 w-full items-stretch">
            <FieldTvCard
              fieldId="1"
              fieldData={field1Data}
              events={field1Data.active ? eventsMap[field1Data.active.id] || [] : []}
              pulse={Boolean(field1Data.active && scorePulse[field1Data.active.id])}
              isSplit
            />
            <FieldTvCard
              fieldId="2"
              fieldData={field2Data}
              events={field2Data.active ? eventsMap[field2Data.active.id] || [] : []}
              pulse={Boolean(field2Data.active && scorePulse[field2Data.active.id])}
              isSplit
            />
          </div>
        ) : (
          /* TAMPILAN SATU LAPANGAN PENUH (FULL BROADCAST HERO) */
          <div className="w-full">
            {selectedField === '1' ? (
              <FieldTvCard
                fieldId="1"
                fieldData={field1Data}
                events={field1Data.active ? eventsMap[field1Data.active.id] || [] : []}
                pulse={Boolean(field1Data.active && scorePulse[field1Data.active.id])}
                isSplit={false}
              />
            ) : (
              <FieldTvCard
                fieldId="2"
                fieldData={field2Data}
                events={field2Data.active ? eventsMap[field2Data.active.id] || [] : []}
                pulse={Boolean(field2Data.active && scorePulse[field2Data.active.id])}
                isSplit={false}
              />
            )}
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* 3. FOOTER MINIMALIS TV                                         */}
      {/* ============================================================== */}
      <footer className="border-t border-[#1C2740]/60 bg-[#0A0E18]/60 px-4 sm:px-8 py-2.5 flex flex-wrap items-center justify-between text-[11px] sm:text-xs text-slate-500 font-mono">
        <div className="flex items-center gap-3">
          <span>📍 An-Nur Sports Center</span>
          <span>·</span>
          <span>Sistem Papan Skor Realtime Panitia & Wasit</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/jadwal" className="hover:text-blue-400 transition-colors">
            Jadwal Lengkap ↗
          </Link>
          <Link href="/klasemen" className="hover:text-blue-400 transition-colors">
            Klasemen ↗
          </Link>
          <Link href="/lapangan/1" className="hover:text-blue-400 transition-colors">
            Konsol Wasit ↗
          </Link>
        </div>
      </footer>
    </div>
  );
}

/* ==================================================================== */
/* SUB-KOMPONEN KARTU SCOREBOARD TV PER LAPANGAN                        */
/* ==================================================================== */
interface FieldTvCardProps {
  fieldId: '1' | '2';
  fieldData: {
    active: MatchWithTeams | null;
    queue: MatchWithTeams[];
    type: 'live' | 'scheduled' | 'finished' | 'none';
  };
  events: MatchEvent[];
  pulse: boolean;
  isSplit: boolean;
}

function FieldTvCard({ fieldId, fieldData, events, pulse, isSplit }: FieldTvCardProps) {
  const isField1 = fieldId === '1';
  const { active, queue, type } = fieldData;

  const goalsA = useMemo(() => {
    if (!active) return [];
    return events.filter((e) => e.team_id === active.team_a_id && e.type === 'goal');
  }, [active, events]);

  const goalsB = useMemo(() => {
    if (!active) return [];
    return events.filter((e) => e.team_id === active.team_b_id && e.type === 'goal');
  }, [active, events]);

  const partai = active ? getMatchPartai(active) : null;

  return (
    <div
      className={`rounded-[28px] sm:rounded-[36px] border-2 bg-gradient-to-b from-[#0D1322] to-[#080B12] shadow-2xl overflow-hidden flex flex-col justify-between transition-all ${
        isField1
          ? 'border-blue-500/40 shadow-blue-950/20'
          : 'border-emerald-500/40 shadow-emerald-950/20'
      } ${isSplit ? 'p-4 sm:p-6' : 'p-6 sm:p-10 lg:p-12'}`}
    >
      {/* 1. Header Lapangan & Status Pertandingan */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1C2740]/80 pb-3 sm:pb-4">
        {/* Badge Lapangan & Partai */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <span
            className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full font-display text-xs sm:text-base font-black tracking-wider uppercase text-black shadow-md ${
              isField1 ? 'bg-blue-400' : 'bg-emerald-400'
            }`}
          >
            LAPANGAN {fieldId}
          </span>

          {partai && (
            <span className="font-mono text-xs sm:text-sm font-bold text-slate-300 bg-[#162036] px-3 py-1 rounded-full border border-slate-700">
              {partai.label}
            </span>
          )}

          {active && (
            <span className="font-display text-xs sm:text-sm font-bold text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/25">
              {active.category} · {active.stage === 'grup' ? `Grup ${active.group_name}` : getStageLabel(active.stage)}
            </span>
          )}
        </div>

        {/* Status Laga Aktif (LIVE / TURUN MINUM / SELESAI / AKAN DATANG) */}
        <div>
          {type === 'live' && active?.status === 'live' && (
            <div className="flex items-center gap-2 px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-400 font-display font-black text-xs sm:text-sm animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.3)]">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>SEDANG BERTANDING · LIVE</span>
            </div>
          )}

          {type === 'live' && active?.status === 'halftime' && (
            <div className="flex items-center gap-2 px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 font-display font-black text-xs sm:text-sm shadow-[0_0_15px_rgba(245,158,11,0.3)]">
              <span>⏸️</span>
              <span>TURUN MINUM (ISTIRAHAT)</span>
            </div>
          )}

          {type === 'scheduled' && (
            <div className="flex items-center gap-2 px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 font-display font-black text-xs sm:text-sm shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <span>⏳</span>
              <span>KICKOFF JAM {active?.kickoff_time ? formatTime(active.kickoff_time) : '00:00'} WIB</span>
            </div>
          )}

          {type === 'finished' && (
            <div className="flex items-center gap-2 px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full bg-slate-500/20 border border-slate-500/40 text-slate-300 font-display font-black text-xs sm:text-sm">
              <span>🏁</span>
              <span>HASIL AKHIR (SELESAI)</span>
            </div>
          )}

          {type === 'none' && (
            <span className="text-xs text-slate-500 font-mono">Belum ada jadwal pertandingan</span>
          )}
        </div>
      </div>

      {/* 2. PUSAT SCOREBOARD TV (TIM A - SKOR - TIM B) */}
      {active ? (
        <div className="my-6 sm:my-10 lg:my-12">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6 lg:gap-10">
            {/* SISI TIM A */}
            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
              <div className="p-2 sm:p-3 rounded-2xl sm:rounded-3xl bg-slate-900 border border-slate-700/80 shadow-xl group">
                <Monogram
                  name={active.team_a?.name ?? 'A'}
                  shortName={active.team_a?.short_name}
                  logoUrl={active.team_a?.logo_url}
                  color={active.team_a?.color || '#3B82F6'}
                  size={isSplit ? 60 : 96}
                />
              </div>

              <div>
                <h2
                  className={`font-display font-black text-white tracking-tight uppercase line-clamp-2 leading-tight ${
                    isSplit
                      ? 'text-lg sm:text-2xl lg:text-3xl'
                      : 'text-2xl sm:text-4xl lg:text-5xl max-w-md'
                  }`}
                >
                  {active.team_a?.name ?? 'TIM A'}
                </h2>
                <span className="font-mono text-xs sm:text-sm font-bold text-slate-400 uppercase mt-0.5 inline-block">
                  {active.team_a?.short_name || 'TMA'}
                </span>
              </div>

              {/* Pencetak Gol Tim A */}
              {goalsA.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-xs">
                  {goalsA.map((g, idx) => (
                    <span
                      key={g.id || idx}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-[11px] sm:text-xs text-blue-300 font-medium"
                    >
                      <span>⚽</span>
                      <span>{g.player_name}</span>
                      <span className="font-mono text-[10px] text-blue-400">({g.minute}&apos;)</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* SISI SKOR TENGAH */}
            <div className="flex flex-col items-center justify-center px-2 sm:px-6">
              <div
                className={`font-mono font-black tracking-tighter flex items-center justify-center select-none transition-all duration-300 ${
                  pulse ? 'scale-110 text-yellow-300 drop-shadow-[0_0_40px_rgba(245,196,0,0.8)]' : 'text-white'
                } ${
                  isSplit
                    ? 'text-5xl sm:text-7xl lg:text-8xl gap-2 sm:gap-4'
                    : 'text-7xl sm:text-[110px] lg:text-[145px] gap-3 sm:gap-8'
                }`}
              >
                <span className="tabular-nums animate-flip">{active.score_a ?? 0}</span>
                <span className="text-slate-600 font-light select-none pb-2 sm:pb-4">:</span>
                <span className="tabular-nums animate-flip">{active.score_b ?? 0}</span>
              </div>

              {/* Sub-label Waktu / Menit */}
              <div className="mt-1 sm:mt-2">
                {type === 'live' ? (
                  <span className="font-mono text-xs sm:text-sm font-bold text-rose-400 bg-rose-950/60 border border-rose-500/30 px-3 py-0.5 rounded-full flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    <span>Laga Sedang Berlangsung</span>
                  </span>
                ) : type === 'scheduled' ? (
                  <span className="font-mono text-xs sm:text-sm font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-500/30 px-3 py-0.5 rounded-full">
                    Kickoff {active.kickoff_time ? formatTime(active.kickoff_time) : ''} WIB
                  </span>
                ) : (
                  <span className="font-mono text-xs sm:text-sm font-bold text-slate-400 bg-slate-900 border border-slate-700 px-3 py-0.5 rounded-full">
                    Pertandingan Telah Selesai
                  </span>
                )}
              </div>
            </div>

            {/* SISI TIM B */}
            <div className="flex flex-col items-center text-center space-y-2 sm:space-y-4">
              <div className="p-2 sm:p-3 rounded-2xl sm:rounded-3xl bg-slate-900 border border-slate-700/80 shadow-xl group">
                <Monogram
                  name={active.team_b?.name ?? 'B'}
                  shortName={active.team_b?.short_name}
                  logoUrl={active.team_b?.logo_url}
                  color={active.team_b?.color || '#10B981'}
                  size={isSplit ? 60 : 96}
                />
              </div>

              <div>
                <h2
                  className={`font-display font-black text-white tracking-tight uppercase line-clamp-2 leading-tight ${
                    isSplit
                      ? 'text-lg sm:text-2xl lg:text-3xl'
                      : 'text-2xl sm:text-4xl lg:text-5xl max-w-md'
                  }`}
                >
                  {active.team_b?.name ?? 'TIM B'}
                </h2>
                <span className="font-mono text-xs sm:text-sm font-bold text-slate-400 uppercase mt-0.5 inline-block">
                  {active.team_b?.short_name || 'TMB'}
                </span>
              </div>

              {/* Pencetak Gol Tim B */}
              {goalsB.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-xs">
                  {goalsB.map((g, idx) => (
                    <span
                      key={g.id || idx}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[11px] sm:text-xs text-emerald-300 font-medium"
                    >
                      <span>⚽</span>
                      <span>{g.player_name}</span>
                      <span className="font-mono text-[10px] text-emerald-400">({g.minute}&apos;)</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="my-16 text-center text-slate-500 py-12">
          <p className="text-lg font-medium">Tidak ada pertandingan aktif di Lapangan {fieldId}.</p>
          <p className="text-xs mt-1">Skor akan muncul otomatis begitu wasit/panitia memulai pertandingan.</p>
        </div>
      )}

      {/* 3. ANTREAN JADWAL PERTANDINGAN BERIKUTNYA DI LAPANGAN INI */}
      <div className="border-t border-[#1C2740]/80 pt-3 sm:pt-4">
        <div className="flex items-center justify-between mb-2 sm:mb-2.5">
          <span className="text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <span>📋</span>
            <span>Antrean Pertandingan Berikutnya di Lapangan {fieldId}:</span>
          </span>
          <span className="text-[11px] font-mono text-slate-500">
            {queue.length > 0 ? `${queue.length} laga tersisa` : 'Tidak ada laga lanjutan'}
          </span>
        </div>

        {queue.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-2.5">
            {queue.slice(0, 3).map((match) => {
              const p = getMatchPartai(match);
              return (
                <div
                  key={match.id}
                  className="rounded-2xl border border-[#1C2740] bg-[#0E1526]/80 p-2.5 sm:p-3 flex items-center justify-between gap-2.5 hover:border-slate-600 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono text-cyan-400 font-semibold mb-0.5">
                      <span className="bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                        {p.label}
                      </span>
                      <span>Jam {formatTime(match.kickoff_time)}</span>
                      <span>·</span>
                      <span className="text-amber-300 font-bold">{match.category}</span>
                    </div>

                    <p className="text-xs sm:text-sm font-bold text-slate-200 truncate">
                      {match.team_a?.name ?? 'Tim A'} <span className="text-slate-500 font-normal">vs</span>{' '}
                      {match.team_b?.name ?? 'Tim B'}
                    </p>
                  </div>

                  <span className="text-[10px] sm:text-[11px] font-mono text-slate-400 flex-none px-2 py-1 rounded bg-slate-800/60 border border-slate-700/60">
                    {match.stage === 'grup' ? `Grup ${match.group_name}` : getStageLabel(match.stage)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-500 font-mono italic">
            Semua pertandingan terjadwal di lapangan ini telah selesai atau belum ditambahkan.
          </p>
        )}
      </div>
    </div>
  );
}

export default function TvPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#05070D] flex items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      }
    >
      <TvScoreboardContent />
    </Suspense>
  );
}
