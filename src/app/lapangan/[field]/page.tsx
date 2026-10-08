'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { MatchWithTeams } from '@/lib/types';
import {
  announceChangeEverywhere,
  matchesStore,
  useResource,
} from '@/lib/live-store';
import { formatTime, todayWIB, getMatchPartai } from '@/lib/utils';
import Monogram from '@/components/Monogram';
import StatusBadge from '@/components/StatusBadge';
import MatchEventsManager from '@/components/MatchEventsManager';
import MatchPamphletModal from '@/components/MatchPamphletModal';
import { toast } from '@/components/Toast';

export default function PetugasLapanganPage() {
  const params = useParams<{ field: string }>();
  const field = params?.field === '2' ? '2' : '1';
  const otherField = field === '1' ? '2' : '1';

  const isField1 = field === '1';

  const [matches, online, reload] = useResource(matchesStore);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isRevising, setIsRevising] = useState<boolean>(false);
  const [showPamphlet, setShowPamphlet] = useState<boolean>(false);
  const [expandedEvents, setExpandedEvents] = useState<boolean>(false);
  const [filterTab, setFilterTab] = useState<'all' | 'live' | 'scheduled' | 'finished'>('all');
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);
  const [lastSaved, setLastSaved] = useState<string>('');

  const today = todayWIB();

  // Jam digital live (WIB)
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          timeZone: 'Asia/Jakarta',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Daftar tanggal unik turnamen
  const tournamentDates = useMemo(() => {
    return [...new Set(matches.map((m) => m.match_date).filter(Boolean))].sort();
  }, [matches]);

  // Set default filter tanggal ke hari ini jika ada di jadwal
  useEffect(() => {
    if (tournamentDates.length > 0 && selectedDate === 'all') {
      if (tournamentDates.includes(today)) {
        setSelectedDate(today);
      }
    }
  }, [tournamentDates, today, selectedDate]);

  // Filter khusus pertandingan lapangan ini
  const fieldMatches = useMemo(() => {
    return matches
      .filter((m) => String(m.field) === field)
      .filter((m) => (selectedDate === 'all' ? true : m.match_date === selectedDate))
      .sort((a, b) => {
        const timeDiff = a.kickoff_time.localeCompare(b.kickoff_time);
        if (timeDiff !== 0) return timeDiff;
        return a.match_date.localeCompare(b.match_date);
      });
  }, [matches, field, selectedDate]);

  // Otomatis pilih pertandingan yang sedang live / jadwal terdekat jika belum dipilih
  useEffect(() => {
    if (fieldMatches.length === 0) return;

    // Jika selectedId masih ada dalam daftar lapangan ini, pertahankan
    if (selectedId && fieldMatches.some((m) => m.id === selectedId)) {
      return;
    }

    // Prioritas 1: Laga yang sedang berlangsung (live / halftime)
    const activeMatch = fieldMatches.find((m) => m.status === 'live' || m.status === 'halftime');
    if (activeMatch) {
      setSelectedId(activeMatch.id);
      return;
    }

    // Prioritas 2: Laga terjadwal (scheduled) paling awal
    const nextMatch = fieldMatches.find((m) => m.status === 'scheduled');
    if (nextMatch) {
      setSelectedId(nextMatch.id);
      return;
    }

    // Prioritas 3: Laga terakhir jika semua sudah selesai
    setSelectedId(fieldMatches[0].id);
  }, [fieldMatches, selectedId]);

  // Reset mode revisi saat ganti match yang dipilih
  useEffect(() => {
    setIsRevising(false);
  }, [selectedId]);

  const selected = useMemo(() => {
    return fieldMatches.find((m) => m.id === selectedId) ?? null;
  }, [fieldMatches, selectedId]);

  // Cari match terjadwal berikutnya di lapangan ini
  const upcomingMatch = useMemo(() => {
    if (!selected) return null;
    const currentIndex = fieldMatches.findIndex((m) => m.id === selected.id);
    return fieldMatches.slice(currentIndex + 1).find((m) => m.status === 'scheduled') ?? null;
  }, [fieldMatches, selected]);

  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(25);
      } catch {
        // Abaikan jika tidak didukung browser
      }
    }
  };

  const update = async (id: string, body: Record<string, unknown>) => {
    try {
      setSaving(true);
      const res = await fetch(`/api/updateskor?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      setLastSaved(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
      await matchesStore.refresh();
      announceChangeEverywhere();
      toast.success('Skor Lapangan berhasil diperbarui!');
    } catch {
      toast.error('Gagal memperbarui skor. Periksa koneksi internet.');
      reload();
    } finally {
      setSaving(false);
    }
  };

  const bumpScore = (side: 'a' | 'b', delta: number) => {
    if (!selected) return;
    if (selected.status === 'finished' && !isRevising) return;
    const next = side === 'a' ? selected.score_a + delta : selected.score_b + delta;
    if (next < 0 || next > 99) return;
    triggerHaptic();
    update(selected.id, side === 'a' ? { score_a: next } : { score_b: next });
  };

  const handleStatusChange = (status: MatchWithTeams['status']) => {
    if (!selected) return;
    if (status === 'finished') {
      const ok = window.confirm(
        `Akhiri ${selected.team_a?.name ?? 'Tim A'} ${selected.score_a}–${selected.score_b} ${selected.team_b?.name ?? 'Tim B'}? Skor akhir dikunci di klasemen.`
      );
      if (!ok) return;
      toast.info('Pertandingan dinyatakan Selesai (Full Time).');
    } else if (status === 'live') {
      toast.info('Pertandingan dimulai (Babak Berjalan).');
    } else if (status === 'halftime') {
      toast.info('Waktu Istirahat Babak Pertama (Halftime).');
    }
    triggerHaptic();
    update(selected.id, { status });
  };

  const isFinished = selected?.status === 'finished';
  const isScoreLocked = isFinished && !isRevising;

  // Filter daftar jadwal
  const filteredSchedule = useMemo(() => {
    if (filterTab === 'live') {
      return fieldMatches.filter((m) => m.status === 'live' || m.status === 'halftime');
    }
    if (filterTab === 'scheduled') {
      return fieldMatches.filter((m) => m.status === 'scheduled');
    }
    if (filterTab === 'finished') {
      return fieldMatches.filter((m) => m.status === 'finished');
    }
    return fieldMatches;
  }, [fieldMatches, filterTab]);

  const scrollToHero = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-ink pb-24 touch-manipulation">
      {/* HEADER KHUSUS PENJAGA LAPANGAN (Mobile Optimized) */}
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-md">
        <div className="wrap flex h-14 items-center justify-between gap-1.5 sm:gap-3">
          {/* Identitas Lapangan & Logo Utama Turnamen */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link href="/" className="flex items-center gap-1.5 shrink-0" title="Beranda Turnamen">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logoutama.png"
                alt="Logo An-Nur"
                className="h-7 w-auto object-contain flex-none"
              />
            </Link>
            <span
              className={`rounded-full px-2.5 sm:px-3 py-1 font-display text-[11px] sm:text-xs font-black tracking-wider uppercase text-ink shadow-sm ${
                isField1 ? 'bg-blue' : 'bg-emerald-500'
              }`}
            >
              Lap {field}
            </span>
            <span className="font-mono text-[11px] sm:text-xs font-bold text-text bg-raise/80 px-2 sm:px-2.5 py-0.5 rounded-full border border-line/60">
              {currentTime ? `${currentTime} WIB` : '...'}
            </span>
          </div>

          {/* Status Sinkronisasi & Switcher Lapangan Sebelah */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-[10px] sm:text-[11px] font-medium text-muted hidden xs:inline" aria-live="polite">
              {saving ? 'Menyimpan…' : lastSaved ? `Tersimpan ${lastSaved}` : '🟢 Realtime'}
            </span>

            {/* Tombol Pindah Lapangan Sebelah */}
            <Link
              href={`/lapangan/${otherField}`}
              className="label rounded-full border border-line bg-raise px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs text-muted hover:text-text transition-colors flex items-center gap-1"
            >
              <span>Lap {otherField}</span>
              <span>➜</span>
            </Link>

            {/* Tombol Buka Layar TV Lapangan */}
            <Link
              href={`/tv?lapangan=${field}`}
              target="_blank"
              className="label rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2 sm:px-2.5 py-1 sm:py-1.5 text-[11px] text-cyan-300 hover:bg-cyan-500/20 transition-colors flex items-center gap-1"
              title="Buka Layar TV Scoreboard untuk Lapangan ini"
            >
              <span>📺</span>
              <span className="hidden sm:inline">Layar TV</span>
            </Link>

            {/* Tombol Kunci Konsol */}
            <button
              type="button"
              onClick={async () => {
                if (!window.confirm('Kunci konsol lapangan ini dan keluar sesi?')) return;
                try {
                  await fetch('/api/auth/passcode', { method: 'DELETE' });
                } catch {}
                window.location.href = '/lapangan/masuk';
              }}
              className="label rounded-full border border-rose-500/40 bg-rose-500/10 px-2 sm:px-2.5 py-1 sm:py-1.5 text-[11px] text-rose-300 hover:bg-rose-500/20 transition-colors flex items-center gap-1"
              title="Kunci konsol dan keluar sesi"
            >
              <span>🔒</span>
              <span className="hidden sm:inline">Kunci</span>
            </button>
          </div>
        </div>

        {/* Tab Pemilih Tanggal Turnamen (Jika lebih dari 1 hari) */}
        {tournamentDates.length > 1 && (
          <div className="wrap pb-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setSelectedDate('all')}
              className={`label flex-none rounded-full px-3 py-1 text-[11px] font-bold transition-all ${
                selectedDate === 'all' ? 'bg-text text-ink' : 'bg-raise/60 text-muted hover:text-text'
              }`}
            >
              Semua Hari
            </button>
            {tournamentDates.map((d, idx) => (
              <button
                key={d}
                onClick={() => setSelectedDate(d)}
                className={`label flex-none rounded-full px-3 py-1 text-[11px] font-bold transition-all ${
                  selectedDate === d
                    ? isField1
                      ? 'bg-blue text-ink'
                      : 'bg-emerald-500 text-ink'
                    : 'bg-raise/60 text-muted hover:text-text'
                }`}
              >
                Hari {idx + 1} ({d.slice(5)})
              </button>
            ))}
          </div>
        )}
      </header>

      {!online && (
        <div className="wrap pt-2">
          <p className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted text-center">
            Koneksi terputus. Menggunakan data lokal terakhir.
          </p>
        </div>
      )}

      <main className="wrap pt-3 sm:pt-5 max-w-xl mx-auto space-y-4 sm:space-y-5">
        {/* LAYAR UTAMA (HERO ACTIVE MATCH) */}
        {selected ? (
          <section
            aria-label={`Skor Pertandingan Lapangan ${field}`}
            className="rounded-[24px] sm:rounded-[32px] border-2 border-line bg-surface/90 p-3.5 sm:p-5 shadow-xl space-y-3 sm:space-y-4"
          >
            {/* Header Laga Aktif (Responsif Mobile) */}
            <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 border-b border-line/60 pb-2.5 sm:pb-3">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="rounded-full bg-blue/15 px-2.5 py-0.5 font-mono text-[11px] font-bold text-blue">
                  {getMatchPartai(selected).label}
                </span>
                <span className="rounded-full border border-line bg-raise px-2.5 py-0.5 text-[11px] font-bold text-text">
                  Jam {formatTime(selected.kickoff_time)} WIB
                </span>
                <span className="rounded-full bg-line/60 px-2 py-0.5 text-[10px] sm:text-[11px] font-medium text-muted">
                  {selected.category} · {selected.stage === 'grup' ? `Grup ${selected.group_name}` : selected.stage}
                </span>
              </div>
              <StatusBadge status={selected.status} />
            </div>

            {/* Papan Skor Besar 2 Tim (Mobile Grid & Touch-Target) */}
            <div className="grid grid-cols-2 divide-x divide-line/60 py-1 sm:py-2">
              {/* SISI TIM A */}
              <div className="flex flex-col items-center px-1.5 sm:px-3 text-center">
                <Monogram
                  name={selected.team_a?.name ?? 'Tim A'}
                  shortName={selected.team_a?.short_name}
                  logoUrl={selected.team_a?.logo_url}
                  color={selected.team_a?.color}
                  size={46}
                />
                <span className="mt-1.5 line-clamp-2 min-h-[2.5rem] font-display text-xs sm:text-base font-bold text-text">
                  {selected.team_a?.name ?? 'Tim A'}
                </span>
                <span className="font-mono text-5xl sm:text-7xl font-black text-text my-1.5 sm:my-2 animate-flip">
                  {selected.score_a}
                </span>

                {/* Tombol Sentuh Skor Tim A */}
                <div className="flex w-full max-w-[140px] items-center justify-center gap-1.5 sm:gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => bumpScore('a', -1)}
                    disabled={isScoreLocked || selected.score_a === 0 || saving}
                    aria-label={`Kurangi skor ${selected.team_a?.short_name ?? 'Tim A'}`}
                    className="h-12 w-12 flex-none rounded-2xl border border-line bg-surface text-xl font-bold text-muted hover:text-text active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() => bumpScore('a', 1)}
                    disabled={isScoreLocked || saving}
                    aria-label={`Tambah skor ${selected.team_a?.short_name ?? 'Tim A'}`}
                    className={`h-12 flex-1 rounded-2xl text-xl font-black text-ink shadow-md active:scale-95 transition-all flex items-center justify-center ${
                      isScoreLocked
                        ? 'bg-line text-muted opacity-30 cursor-not-allowed shadow-none'
                        : isField1
                        ? 'bg-blue hover:brightness-110'
                        : 'bg-emerald-500 hover:brightness-110'
                    }`}
                  >
                    +1
                  </button>
                </div>
              </div>

              {/* SISI TIM B */}
              <div className="flex flex-col items-center px-1.5 sm:px-3 text-center">
                <Monogram
                  name={selected.team_b?.name ?? 'Tim B'}
                  shortName={selected.team_b?.short_name}
                  logoUrl={selected.team_b?.logo_url}
                  color={selected.team_b?.color}
                  size={46}
                />
                <span className="mt-1.5 line-clamp-2 min-h-[2.5rem] font-display text-xs sm:text-base font-bold text-text">
                  {selected.team_b?.name ?? 'Tim B'}
                </span>
                <span className="font-mono text-5xl sm:text-7xl font-black text-text my-1.5 sm:my-2 animate-flip">
                  {selected.score_b}
                </span>

                {/* Tombol Sentuh Skor Tim B */}
                <div className="flex w-full max-w-[140px] items-center justify-center gap-1.5 sm:gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => bumpScore('b', -1)}
                    disabled={isScoreLocked || selected.score_b === 0 || saving}
                    aria-label={`Kurangi skor ${selected.team_b?.short_name ?? 'Tim B'}`}
                    className="h-12 w-12 flex-none rounded-2xl border border-line bg-surface text-xl font-bold text-muted hover:text-text active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() => bumpScore('b', 1)}
                    disabled={isScoreLocked || saving}
                    aria-label={`Tambah skor ${selected.team_b?.short_name ?? 'Tim B'}`}
                    className={`h-12 flex-1 rounded-2xl text-xl font-black text-ink shadow-md active:scale-95 transition-all flex items-center justify-center ${
                      isScoreLocked
                        ? 'bg-line text-muted opacity-30 cursor-not-allowed shadow-none'
                        : isField1
                        ? 'bg-blue hover:brightness-110'
                        : 'bg-emerald-500 hover:brightness-110'
                    }`}
                  >
                    +1
                  </button>
                </div>
              </div>
            </div>

            {/* KONTROL ALUR STATUS PERTANDINGAN */}
            <div className="border-t border-line/60 pt-3 space-y-2.5">
              {selected.status === 'scheduled' && (
                <button
                  type="button"
                  onClick={() => handleStatusChange('live')}
                  disabled={saving}
                  className={`label h-13 w-full rounded-full font-bold text-ink text-sm sm:text-base shadow-md active:scale-[0.98] transition-all ${
                    isField1 ? 'bg-blue hover:brightness-110' : 'bg-emerald-500 hover:brightness-110'
                  }`}
                >
                  ▶️ Mulai Pertandingan (Kickoff)
                </button>
              )}

              {selected.status === 'live' && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleStatusChange('halftime')}
                    disabled={saving}
                    className="label h-12 sm:h-13 rounded-full border border-line bg-surface text-xs sm:text-sm font-bold text-text hover:border-blue active:scale-[0.98] transition-colors"
                  >
                    ⏸️ Istirahat (Halftime)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange('finished')}
                    disabled={saving}
                    className="label h-12 sm:h-13 rounded-full bg-yellow text-ink text-xs sm:text-sm font-bold shadow-md hover:brightness-110 active:scale-[0.98] transition-all"
                  >
                    🏁 Akhiri Pertandingan
                  </button>
                </div>
              )}

              {selected.status === 'halftime' && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleStatusChange('live')}
                    disabled={saving}
                    className="label h-12 sm:h-13 rounded-full bg-blue text-ink text-xs sm:text-sm font-bold shadow-md hover:brightness-110 active:scale-[0.98] transition-all"
                  >
                    ▶️ Lanjut Babak 2
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange('finished')}
                    disabled={saving}
                    className="label h-12 sm:h-13 rounded-full border border-line bg-surface text-xs sm:text-sm font-bold text-text hover:bg-raise active:scale-[0.98] transition-colors"
                  >
                    🏁 Akhiri Pertandingan
                  </button>
                </div>
              )}

              {/* JIKA PERTANDINGAN SELESAI */}
              {isFinished && !isRevising && (
                <div className="rounded-2xl border border-line bg-raise/50 p-3.5 sm:p-4 text-center space-y-2">
                  <div className="flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold text-text">
                    <span>🔒</span>
                    <span>Pertandingan Selesai · Skor Terkunci</span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-muted max-w-sm mx-auto">
                    Skor final {selected.score_a}–{selected.score_b} terkunci di klasemen.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    {/* Tombol Unduh Pamflet Resmi */}
                    <button
                      type="button"
                      onClick={() => setShowPamphlet(true)}
                      className="label rounded-full border border-blue/40 bg-blue/15 px-4 py-2 text-xs font-bold text-blue hover:bg-blue/25 active:scale-95 transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <span>🖼️</span>
                      <span>Unduh Pamflet Resmi</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsRevising(true)}
                      className="label rounded-full border border-yellow/50 bg-yellow/15 px-4 py-2 text-xs font-bold text-yellow hover:bg-yellow/25 active:scale-95 transition-all"
                    >
                      🔓 Buka Kunci / Mode Revisi
                    </button>

                    {/* Tombol Lanjut ke Jadwal Berikutnya */}
                    {upcomingMatch && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(upcomingMatch.id);
                          scrollToHero();
                        }}
                        className="label rounded-full bg-text text-ink px-4 py-2 text-xs font-bold hover:brightness-110 active:scale-95 transition-all"
                      >
                        Partai Berikutnya ⏭️
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* JIKA MODE REVISI AKTIF */}
              {isFinished && isRevising && (
                <div className="rounded-2xl border border-yellow/50 bg-yellow/10 p-3 sm:p-3.5 space-y-2.5 animate-reveal">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-yellow flex items-center gap-1.5">
                      <span>⚠️</span> MODE REVISI AKTIF
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsRevising(false)}
                      className="label rounded-full bg-blue px-3 py-1.5 text-xs font-bold text-ink active:scale-95"
                    >
                      🔒 Selesai & Kunci
                    </button>
                  </div>
                  <p className="text-[11px] text-muted">
                    Tombol skor (+ / −) di atas kini terbuka untuk koreksi. Anda juga dapat mengembalikan status laga:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Buka kembali pertandingan ini ke babak "Live"?')) {
                          handleStatusChange('live');
                          setIsRevising(false);
                        }
                      }}
                      className="label h-10 rounded-xl border border-line bg-surface text-xs font-bold text-text hover:border-blue active:scale-95 transition-colors"
                    >
                      ▶️ Buka ke Live
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Buka kembali pertandingan ini ke "Halftime"?')) {
                          handleStatusChange('halftime');
                          setIsRevising(false);
                        }
                      }}
                      className="label h-10 rounded-xl border border-line bg-surface text-xs font-bold text-text hover:border-blue active:scale-95 transition-colors"
                    >
                      ⏸️ Buka ke Halftime
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* PENCATATAN GOL & KARTU WASIT LAPANGAN */}
            <div className="border-t border-line/60 pt-2.5 sm:pt-3">
              <button
                type="button"
                onClick={() => setExpandedEvents(!expandedEvents)}
                className="w-full rounded-2xl border border-line/80 bg-raise/40 px-3.5 py-2.5 text-xs font-bold text-text hover:bg-raise/80 active:scale-[0.99] flex items-center justify-between transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span>⚽</span>
                  <span>Pencatatan Gol & Kartu (Wasit)</span>
                </span>
                <span className="text-muted text-[11px] font-normal">
                  {expandedEvents ? 'Tutup ▲' : 'Buka Pencatatan ▼'}
                </span>
              </button>

              {expandedEvents && (
                <div className="mt-2.5">
                  <MatchEventsManager match={selected} onMatchUpdated={reload} />
                </div>
              )}
            </div>
          </section>
        ) : (
          <div className="rounded-[28px] border border-line bg-surface p-8 text-center text-muted">
            <p className="text-sm">Tidak ada jadwal pertandingan di Lapangan {field} untuk tanggal ini.</p>
          </div>
        )}

        {/* TIMELINE JADWAL KHUSUS LAPANGAN INI MENGIKUTI JAM MAIN */}
        <section aria-label={`Jadwal Pertandingan Lapangan ${field}`} className="space-y-2.5 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base sm:text-lg font-bold text-text flex items-center gap-1.5">
                <span>⏱️</span>
                <span>Jadwal Main Lapangan {field}</span>
              </h2>
              <p className="text-[11px] text-muted">
                Ketuk jadwal untuk beralih input skor ke partai tersebut.
              </p>
            </div>

            {/* Tab Filter Jadwal */}
            <div className="pill gap-0.5 p-0.5 text-xs">
              {(
                [
                  { key: 'all', label: `Semua (${fieldMatches.length})` },
                  { key: 'live', label: 'Main' },
                  { key: 'scheduled', label: 'Jadwal' },
                  { key: 'finished', label: 'Selesai' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilterTab(tab.key)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${
                    filterTab === tab.key ? 'bg-text text-ink' : 'text-muted hover:text-text'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {filteredSchedule.length === 0 ? (
              <p className="rounded-2xl border border-line bg-surface p-5 text-center text-xs text-muted">
                Tidak ada pertandingan untuk filter ini.
              </p>
            ) : (
              filteredSchedule.map((m) => {
                const isCurrent = selected?.id === m.id;
                const partai = getMatchPartai(m);
                const isLive = m.status === 'live' || m.status === 'halftime';

                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(m.id);
                      scrollToHero();
                    }}
                    className={`w-full rounded-2xl border p-3 text-left transition-all active:scale-[0.99] space-y-1.5 ${
                      isCurrent
                        ? isField1
                          ? 'border-blue bg-blue/15 shadow-sm ring-1 ring-blue/50'
                          : 'border-emerald-500 bg-emerald-500/15 shadow-sm ring-1 ring-emerald-500/50'
                        : isLive
                        ? 'border-yellow/40 bg-yellow/5'
                        : 'border-line bg-surface hover:bg-raise/60'
                    }`}
                  >
                    {/* Baris Atas: Partai · Jam Kickoff · Status */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-blue text-[11px] bg-blue/10 px-2 py-0.5 rounded">
                          {partai.label}
                        </span>
                        <span className="font-mono text-text font-bold text-[11px]">
                          {formatTime(m.kickoff_time)} WIB
                        </span>
                        <span className="rounded bg-line/60 px-1.5 py-0.5 text-[10px] text-muted hidden xs:inline">
                          {m.category} · {m.stage === 'grup' ? `Grup ${m.group_name}` : m.stage}
                        </span>
                      </div>
                      <StatusBadge status={m.status} />
                    </div>

                    {/* Baris Bawah: Tim A vs Tim B & Skor */}
                    <div className="flex items-center justify-between pt-0.5">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1">
                        <Monogram
                          name={m.team_a?.name ?? 'A'}
                          shortName={m.team_a?.short_name}
                          logoUrl={m.team_a?.logo_url}
                          color={m.team_a?.color}
                          size={20}
                        />
                        <span className="text-xs sm:text-sm font-bold text-text truncate">
                          {m.team_a?.name ?? m.team_a?.short_name ?? 'A'}
                        </span>
                      </div>

                      <div className="font-mono font-black text-xs sm:text-sm px-2.5 py-0.5 rounded bg-line/80 mx-2 flex-none">
                        {m.score_a}–{m.score_b}
                      </div>

                      <div className="flex items-center justify-end gap-1.5 min-w-0 flex-1 text-right">
                        <span className="text-xs sm:text-sm font-bold text-text truncate">
                          {m.team_b?.name ?? m.team_b?.short_name ?? 'B'}
                        </span>
                        <Monogram
                          name={m.team_b?.name ?? 'B'}
                          shortName={m.team_b?.short_name}
                          logoUrl={m.team_b?.logo_url}
                          color={m.team_b?.color}
                          size={20}
                        />
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>
      </main>

      {/* Modal Pamflet Hasil Pertandingan Resmi */}
      <MatchPamphletModal
        match={selected}
        isOpen={showPamphlet}
        onClose={() => setShowPamphlet(false)}
      />
    </div>
  );
}
