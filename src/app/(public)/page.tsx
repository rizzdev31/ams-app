'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import type { MatchWithTeams, MatchEvent, Sponsor, TournamentArchive, StandingRow } from '@/lib/types';
import { formatShortDate, formatTime, todayWIB, getMatchPartai, calculateStandings } from '@/lib/utils';
import { buildTournamentBracket } from '@/lib/bracket';
import { useCategory } from '@/hooks/useCategory';
import {
  matchesStore,
  teamsStore,
  sponsorsStore,
  archivesStore,
  settingsStore,
  useResource,
} from '@/lib/live-store';
import Monogram from '@/components/Monogram';
import MatchDetailModal from '@/components/MatchDetailModal';
import MatchPamphletModal from '@/components/MatchPamphletModal';
import TournamentArchiveContainer from '@/components/TournamentArchiveContainer';

export default function DashboardPage() {
  const [matches, online] = useResource(matchesStore);
  const [teams] = useResource(teamsStore);
  const [sponsors] = useResource(sponsorsStore);
  const [archives] = useResource(archivesStore);
  const [settings] = useResource(settingsStore);
  const [category, setCategory] = useCategory();

  // State filter jadwal hari ini di dashboard
  const [selectedField, setSelectedField] = useState<'all' | '1' | '2'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'live' | 'upcoming' | 'finished'>('all');
  const [activeDate, setActiveDate] = useState<string>('');

  // State untuk modal interaktif
  const [detailMatch, setDetailMatch] = useState<MatchWithTeams | null>(null);
  const [pamphletMatch, setPamphletMatch] = useState<MatchWithTeams | null>(null);
  const [pamphletEvents, setPamphletEvents] = useState<MatchEvent[]>([]);

  // State untuk pemutar video modal
  const [activeVideoModal, setActiveVideoModal] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    src: string;
  }>({
    isOpen: false,
    title: '',
    subtitle: '',
    src: '',
  });

  // Ambil daftar tanggal yang ada dalam turnamen
  const tournamentDates = useMemo(() => {
    const list = [...new Set(matches.map((m) => m.match_date).filter(Boolean))].sort();
    return list.length > 0 ? list : ['2026-10-09', '2026-10-10'];
  }, [matches]);

  // Set fokus kategori & tanggal turnamen otomatis dari settings jika ada (misal U-12 besok)
  useEffect(() => {
    if (settings?.active_category) {
      const userChose = typeof window !== 'undefined' ? window.sessionStorage.getItem('annur-user-chose-category') : null;
      if (!userChose) {
        setCategory(settings.active_category);
      }
    }
    if (settings?.active_date) {
      const userChoseDate = typeof window !== 'undefined' ? window.sessionStorage.getItem('annur-user-chose-date') : null;
      if (!userChoseDate) {
        setActiveDate(settings.active_date);
      }
    } else if (!activeDate) {
      const today = todayWIB();
      if (tournamentDates.includes(today)) {
        setActiveDate(today);
      } else if (tournamentDates.length > 0) {
        setActiveDate(tournamentDates[0]);
      }
    }
  }, [settings, tournamentDates, activeDate, setCategory]);

  // Kumpulkan data container arsip (dari database archivesStore atau auto-fallback U-10)
  const displayArchives = useMemo<TournamentArchive[]>(() => {
    if (archives.length > 0) return archives;

    // Fallback: auto-container untuk U-10 jika belum ada container yang disimpan superadmin
    const u10Matches = matches.filter((m) => (m.category ?? 'U10') === 'U10');
    if (u10Matches.length === 0) return [];

    const u10Teams = teams.filter((t) => (t.category ?? 'U10') === 'U10');
    const groupStandings: Record<string, StandingRow[]> = {};
    for (const g of ['A', 'B', 'C', 'D']) {
      groupStandings[g] = calculateStandings(u10Teams, u10Matches, g);
    }

    let champName: string | null = null;
    let runnerName: string | null = null;
    let thirdName: string | null = null;
    let fourthName: string | null = null;
    let bracketSummary = undefined;

    try {
      const b = buildTournamentBracket('U10', u10Teams, u10Matches);
      champName = b.finalMatch.winnerTeam?.name ?? null;
      runnerName = b.finalMatch.loserTeam?.name ?? null;
      thirdName = b.thirdPlaceMatch.winnerTeam?.name ?? null;
      fourthName = b.thirdPlaceMatch.loserTeam?.name ?? null;
      bracketSummary = {
        qf: b.quarterfinals.map((q) => ({
          code: q.code,
          title: q.title,
          score: q.match ? `${q.match.score_a}–${q.match.score_b}` : '–',
          winner: q.winnerTeam?.name,
          byPenalty: q.byPenalty,
        })),
        sf: b.semifinals.map((s) => ({
          code: s.code,
          title: s.title,
          score: s.match ? `${s.match.score_a}–${s.match.score_b}` : '–',
          winner: s.winnerTeam?.name,
          byPenalty: s.byPenalty,
        })),
        final: {
          title: b.finalMatch.title,
          score: b.finalMatch.match ? `${b.finalMatch.match.score_a}–${b.finalMatch.match.score_b}` : '–',
          winner: b.finalMatch.winnerTeam?.name,
          byPenalty: b.finalMatch.byPenalty,
        },
        third_place: {
          title: b.thirdPlaceMatch.title,
          score: b.thirdPlaceMatch.match ? `${b.thirdPlaceMatch.match.score_a}–${b.thirdPlaceMatch.match.score_b}` : '–',
          winner: b.thirdPlaceMatch.winnerTeam?.name,
          byPenalty: b.thirdPlaceMatch.byPenalty,
        },
      };
    } catch {}

    return [
      {
        id: 'auto-u10-container',
        name: 'Arsip Pertandingan U-10 (Selesai Hari 1)',
        category: 'U10',
        match_date: '2026-10-09',
        description: 'Akumulasi seluruh hasil pertandingan dan klasemen akhir kategori U-10.',
        created_at: new Date().toISOString(),
        snapshot_data: {
          archived_at: new Date().toISOString(),
          category: 'U10',
          total_teams: u10Teams.length,
          total_matches: u10Matches.length,
          finished_matches: u10Matches.filter((m) => m.status === 'finished').length,
          champion_name: champName,
          runner_up_name: runnerName,
          third_place_name: thirdName,
          fourth_place_name: fourthName,
          teams: u10Teams,
          matches: u10Matches,
          group_standings: groupStandings,
          bracket_summary: bracketSummary,
        },
      },
    ];
  }, [archives, matches, teams]);

  // Filter pertandingan untuk section Jadwal Hari Ini
  const todayMatches = useMemo(() => {
    return matches
      .filter((m) => {
        // Filter tanggal
        if (activeDate && m.match_date !== activeDate) return false;
        // Filter kategori usia
        if (category !== 'Semua' && m.category !== category) return false;
        // Filter lapangan
        if (selectedField !== 'all' && m.field !== selectedField) return false;
        // Filter status
        if (selectedStatus === 'live' && m.status !== 'live' && m.status !== 'halftime') return false;
        if (selectedStatus === 'upcoming' && m.status !== 'scheduled') return false;
        if (selectedStatus === 'finished' && m.status !== 'finished') return false;
        return true;
      })
      .sort((a, b) => {
        // Live first, then by kickoff time
        if ((a.status === 'live' || a.status === 'halftime') && b.status !== 'live') return -1;
        if ((b.status === 'live' || b.status === 'halftime') && a.status !== 'live') return 1;
        const timeDiff = `${a.kickoff_time}`.localeCompare(`${b.kickoff_time}`);
        if (timeDiff !== 0) return timeDiff;
        return (a.field || '').localeCompare(b.field || '');
      });
  }, [matches, activeDate, category, selectedField, selectedStatus]);

  // Filter sponsor aktif
  const activeSponsors = useMemo(() => {
    return sponsors.filter((s) => s.active);
  }, [sponsors]);

  // Buka pamflet modal
  const handleOpenPamphlet = (match: MatchWithTeams) => {
    fetch(`/api/matches/${match.id}/events`)
      .then((res) => res.json())
      .then((data) => {
        setPamphletEvents(Array.isArray(data) ? data : data.data || []);
      })
      .catch(() => setPamphletEvents([]))
      .finally(() => {
        setPamphletMatch(match);
      });
  };

  return (
    <div className="space-y-12 sm:space-y-16 lg:space-y-20 pb-16">
      {/* ============================================================== */}
      {/* SECTION 1: SAMPUL TURNAMEN RESMI (CLEAN & MINIMALIST COVER)   */}
      {/* ============================================================== */}
      <section className="relative pt-1 sm:pt-2">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-800/80 bg-slate-950 shadow-2xl transition-all duration-300 hover:border-cyan-500/30">
          {/* Ambient Lighting di sekeliling bingkai sampul */}
          <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-cyan-500/15 blur-[90px] pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-emerald-500/15 blur-[90px] pointer-events-none" />

          {/* Banner Sampul Murni & Bersih */}
          <div className="relative aspect-[1440/850] sm:aspect-[1440/900] md:aspect-[1440/1024] w-full overflow-hidden bg-slate-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/Sampul.png"
              alt="Sampul Resmi An-Nur Mini Soccer Championship 2026"
              className="h-full w-full object-cover object-center"
              loading="eager"
            />
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION 2: TENTANG AN-NUR MINI SOCCER (RINGKAS & ELEGAN)       */}
      {/* ============================================================== */}
      <section className="relative">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-800/80 bg-slate-950/80 p-5 sm:p-7 lg:p-8 shadow-xl backdrop-blur-md">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 space-y-5">
            {/* Header Ringkas */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-[11px] font-mono font-bold text-cyan-300 tracking-wider uppercase">
                  <span>⚽</span>
                  <span>TENTANG TURNAMEN</span>
                </span>
                <span className="text-xs text-slate-500 font-mono hidden sm:inline">•</span>
                <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                  9–10 Oktober 2026 · Tanggulangin, Sidoarjo
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white font-display tracking-tight">
                An-Nur Mini Soccer Championship 2026
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-4xl">
                Kompetisi sepak bola usia dini resmi yang diselenggarakan oleh{' '}
                <strong className="text-white font-semibold">Yayasan Pondok Pesantren An-Nur Sidoarjo</strong> bersama{' '}
                <strong className="text-cyan-300 font-semibold">Askab PSSI Sidoarjo (PSSQ)</strong>. Menghadirkan ajang pembinaan talenta muda kategori{' '}
                <span className="text-emerald-400 font-bold">U-10</span> dan{' '}
                <span className="text-amber-400 font-bold">U-12</span> se-Jawa Timur dengan standar kompetisi dan fasilitas lapangan prima.
              </p>
            </div>

            {/* 4 Highlight Ringkas & Futuristik */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-1">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/40 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">🏟️</span>
                  <h3 className="text-xs font-bold text-white font-mono uppercase">
                    2 Lapangan Standar
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Rumput sintetis prima di Lapangan 1 & 2
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/40 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">⚡</span>
                  <h3 className="text-xs font-bold text-white font-mono uppercase">
                    Live Score Digital
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Update real-time & pamflet laga otomatis
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-blue-500/40 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">📜</span>
                  <h3 className="text-xs font-bold text-white font-mono uppercase">
                    Pemandu Bakat PSSI
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Pantauan resmi Askab PSSI Sidoarjo (PSSQ)
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-amber-500/40 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">🎓</span>
                  <h3 className="text-xs font-bold text-white font-mono uppercase">
                    Beasiswa Inden 40%
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Potongan santri MTs Mubosta & MA An-Nur
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION 3: JADWAL PERTANDINGAN HARI INI                        */}
      {/* ============================================================== */}
      <section id="jadwal-hari-ini" className="relative space-y-6 pt-4">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase font-bold tracking-wider mb-1">
              <span>⚡</span>
              <span>MATCHDAY ARENA</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white font-display tracking-tight">
              Jadwal Pertandingan Hari Ini
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Pantau jadwal kickoff, skor live, dan hasil akhir pertandingan terkini
            </p>
            {settings?.active_category && (
              <div className="mt-2.5 inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-500/15 to-cyan-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>
                  Fokus Matchday Hari Ini:{' '}
                  <strong className="text-white font-bold underline decoration-emerald-400 underline-offset-2">
                    {settings.active_category === 'U12' ? 'Kategori U-12' : settings.active_category}
                  </strong>
                </span>
              </div>
            )}
          </div>

          {/* Quick Date Switcher (Hari 1 & Hari 2) */}
          <div className="flex items-center gap-2 font-mono text-xs">
            {tournamentDates.map((d, idx) => (
              <button
                key={d}
                type="button"
                onClick={() => setActiveDate(d)}
                className={`px-3 py-1.5 rounded-xl border transition-all ${
                  activeDate === d
                    ? 'bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-500/20 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Hari {idx + 1} ({formatShortDate(d)})
              </button>
            ))}
          </div>
        </div>

        {/* Filter Bar (Kategori, Lapangan & Status) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
          {/* Filter Kategori Usia */}
          <div className="flex items-center gap-1.5 text-xs font-mono overflow-x-auto scrollbar-hide py-0.5">
            <span className="text-slate-400 text-[11px] pr-1 shrink-0">Kategori:</span>
            {(['Semua', 'U10', 'U12'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-3 py-1 rounded-lg transition-colors font-bold shrink-0 ${
                  category === cat
                    ? 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-300'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-800/50'
                }`}
              >
                {cat === 'Semua' ? 'Semua Usia' : cat}
              </button>
            ))}
          </div>

          {/* Filter Lapangan */}
          <div className="flex items-center gap-1.5 text-xs font-mono overflow-x-auto scrollbar-hide py-0.5">
            <span className="text-slate-400 text-[11px] pr-1 shrink-0">Lapangan:</span>
            {[
              { id: 'all', label: 'Semua' },
              { id: '1', label: 'Lap 1' },
              { id: '2', label: 'Lap 2' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedField(f.id as any)}
                className={`px-2.5 py-1 rounded-lg transition-colors font-bold shrink-0 ${
                  selectedField === f.id
                    ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-300'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-800/50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Filter Status */}
          <div className="flex items-center gap-1.5 text-xs font-mono overflow-x-auto scrollbar-hide py-0.5">
            <span className="text-slate-400 text-[11px] pr-1 shrink-0">Status:</span>
            {[
              { id: 'all', label: 'Semua' },
              { id: 'live', label: 'Live' },
              { id: 'upcoming', label: 'Akan Datang' },
              { id: 'finished', label: 'Selesai' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setSelectedStatus(st.id as any)}
                className={`px-2.5 py-1 rounded-lg transition-colors font-bold shrink-0 ${
                  selectedStatus === st.id
                    ? 'bg-amber-500/20 border border-amber-400/50 text-amber-300'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-800/50'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Daftar Kartu Pertandingan Hari Ini */}
        {todayMatches.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-slate-800 bg-slate-900/40 text-slate-400 space-y-2">
            <p className="text-sm font-semibold">
              Tidak ada pertandingan yang sesuai dengan filter di atas.
            </p>
            <p className="text-xs text-slate-500">
              Silakan ganti pilihan kategori, tanggal, atau lapangan.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {todayMatches.map((m) => {
              const a = m.team_a;
              const b = m.team_b;
              const isLive = m.status === 'live' || m.status === 'halftime';
              const isFinished = m.status === 'finished';
              const partai = getMatchPartai(m);

              return (
                <div
                  key={m.id}
                  className={`p-3.5 sm:p-5 rounded-2xl border transition-all relative overflow-hidden bg-slate-900/90 ${
                    isLive
                      ? 'border-rose-500/60 shadow-lg shadow-rose-500/10'
                      : isFinished
                      ? 'border-slate-800 hover:border-slate-700'
                      : 'border-slate-800/80 hover:border-cyan-500/40'
                  }`}
                >
                  {/* Header Bar Kartu Laga */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-800/80 pb-2.5 mb-3 text-xs font-mono">
                    <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-bold text-[10px] sm:text-[11px]">
                        Lap {m.field || '1'}
                      </span>
                      <span className="text-slate-300 font-semibold text-[11px] sm:text-xs">
                        {formatTime(m.kickoff_time)} WIB
                      </span>
                      <span className="text-slate-500 hidden sm:inline">•</span>
                      <span className="text-slate-400 text-[10px] sm:text-[11px] font-medium">
                        {partai.label || `Grup ${m.group_name || 'A'}`}
                      </span>
                      {m.category && (
                        <span className="px-1.5 py-0.5 rounded border border-slate-700 bg-slate-900 text-[9px] font-bold text-slate-400 uppercase">
                          {m.category}
                        </span>
                      )}
                    </div>

                    {/* Status Badge */}
                    {isLive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/20 border border-rose-400/50 text-rose-300 font-bold text-[10px] animate-pulse whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                        LIVE
                      </span>
                    ) : isFinished ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold text-[10px] whitespace-nowrap">
                        SELESAI (FT)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] whitespace-nowrap">
                        TERJADWAL
                      </span>
                    )}
                  </div>

                  {/* Body: Tim A vs Tim B Showdown */}
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3 py-1">
                    {/* Tim A */}
                    <div className="flex items-center gap-2 sm:gap-3 text-left min-w-0">
                      <div className="flex-none">
                        <Monogram
                          name={a?.name || 'Tim A'}
                          shortName={a?.short_name}
                          logoUrl={a?.logo_url}
                          color={a?.color}
                          size={36}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-bold text-white leading-snug line-clamp-2 break-words">
                          {a?.name || 'Tim A'}
                        </p>
                        <span className="text-[10px] text-slate-400 font-mono hidden sm:inline-block">
                          {a?.category || m.category}
                        </span>
                      </div>
                    </div>

                    {/* Skor Tengah */}
                    <div className="flex flex-col items-center justify-center px-1 sm:px-2 flex-none">
                      {isLive || isFinished ? (
                        <div className="flex items-center gap-1 font-mono text-base sm:text-2xl font-black text-white">
                          <span className={m.score_a != null && m.score_b != null && m.score_a > m.score_b ? 'text-yellow-300' : ''}>
                            {m.score_a ?? 0}
                          </span>
                          <span className="text-slate-500">:</span>
                          <span className={m.score_a != null && m.score_b != null && m.score_b > m.score_a ? 'text-yellow-300' : ''}>
                            {m.score_b ?? 0}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs font-mono font-bold text-slate-400 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                          VS
                        </span>
                      )}

                      {/* Adu Penalti jika ada */}
                      {(m.penalty_score_a != null || m.penalty_score_b != null) && (
                        <span className="text-[9px] font-mono text-amber-300 mt-0.5 whitespace-nowrap">
                          P: {m.penalty_score_a ?? 0}-{m.penalty_score_b ?? 0}
                        </span>
                      )}
                    </div>

                    {/* Tim B */}
                    <div className="flex items-center justify-end gap-2 sm:gap-3 text-right min-w-0">
                      <div className="min-w-0 flex-1 text-right">
                        <p className="text-xs sm:text-sm font-bold text-white leading-snug line-clamp-2 break-words">
                          {b?.name || 'Tim B'}
                        </p>
                        <span className="text-[10px] text-slate-400 font-mono hidden sm:inline-block">
                          {b?.category || m.category}
                        </span>
                      </div>
                      <div className="flex-none">
                        <Monogram
                          name={b?.name || 'Tim B'}
                          shortName={b?.short_name}
                          logoUrl={b?.logo_url}
                          color={b?.color}
                          size={36}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer Bar Kartu: Tombol Detail & Pamflet */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs gap-2">
                    <button
                      type="button"
                      onClick={() => setDetailMatch(m)}
                      className="text-slate-400 hover:text-white font-mono text-[11px] underline underline-offset-2 shrink-0"
                    >
                      Detail Laga ➔
                    </button>

                    {isFinished && (
                      <button
                        type="button"
                        onClick={() => handleOpenPamphlet(m)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600/20 border border-blue-500/40 hover:bg-blue-600/40 text-blue-300 text-[10px] sm:text-[11px] font-mono font-bold transition-all active:scale-95 shrink-0"
                      >
                        <span>🖼️</span>
                        <span className="hidden sm:inline">Pamflet 1080x1350</span>
                        <span className="sm:hidden">Pamflet</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Link Lihat Seluruh Jadwal */}
        <div className="text-center pt-2">
          <Link
            href="/jadwal"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-900 border border-slate-700 hover:border-cyan-400 text-xs font-bold text-slate-200 hover:text-white transition-all shadow-md"
          >
            <span>Lihat Semua Jadwal & Filter Lengkap</span>
            <span>➔</span>
          </Link>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION CONTAINER ARSIP PERTANDINGAN SELESAI (U-10, DLL)      */}
      {/* ============================================================== */}
      <TournamentArchiveContainer archives={displayArchives} />

      {/* ============================================================== */}
      {/* SECTION 4: 2 CARD VIDEO (FUTURISTIC VIDEO HIGHLIGHTS)          */}
      {/* ============================================================== */}
      <section className="relative space-y-6 pt-4">
        <div className="border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase font-bold tracking-wider mb-1">
            <span>🎬</span>
            <span>MULTIMEDIA & DOKUMENTASI</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white font-display tracking-tight">
            Video & Liputan Turnamen
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Saksikan tayangan highlight pertandingan dan profil arena sepak bola Pondok Pesantren An-Nur
          </p>
        </div>

        {/* 2 CARD VIDEO GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CARD VIDEO 1: MATCHDAY HIGHLIGHTS */}
          <div className="relative rounded-3xl overflow-hidden border border-cyan-500/30 bg-slate-950 p-5 shadow-xl flex flex-col justify-between group hover:border-cyan-400 transition-all">
            <div className="space-y-4">
              {/* Video Player Preview Poster */}
              <div
                role="button"
                tabIndex={0}
                onClick={() =>
                  setActiveVideoModal({
                    isOpen: true,
                    title: 'Matchday Teaser & Highlights Laga',
                    subtitle: 'Atmosfer Pertandingan & Gol Spektakuler',
                    src: '/logovid.mp4',
                  })
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setActiveVideoModal({
                      isOpen: true,
                      title: 'Matchday Teaser & Highlights Laga',
                      subtitle: 'Atmosfer Pertandingan & Gol Spektakuler',
                      src: '/logovid.mp4',
                    });
                  }
                }}
                className="relative aspect-video w-full rounded-2xl overflow-hidden bg-gradient-to-tr from-slate-950 via-slate-900 to-cyan-950/60 border border-slate-800 cursor-pointer group/vid"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/Sampul.png"
                  alt="Matchday Teaser"
                  className="w-full h-full object-cover opacity-60 group-hover/vid:scale-105 transition-transform duration-500 filter brightness-90"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/35 pointer-events-none" />

                {/* Badge Atas */}
                <div className="absolute top-3 left-3 z-10">
                  <span className="px-2.5 py-1 rounded-lg bg-black/80 border border-cyan-400/50 text-[10px] font-mono font-bold text-cyan-300">
                    MATCHDAY TEASER
                  </span>
                </div>
                <div className="absolute top-3 right-3 z-10">
                  <span className="px-2 py-1 rounded-lg bg-black/80 border border-slate-700 text-[10px] font-mono font-bold text-slate-300">
                    0:45 • HD
                  </span>
                </div>

                {/* Tombol Play Icon Tengah */}
                <div className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center font-bold text-xl shadow-lg shadow-cyan-500/40 group-hover/vid:scale-110 transition-transform">
                  ▶
                </div>
              </div>

              <div>
                <span className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
                  AKSI LAPANGAN 1 & 2
                </span>
                <h3 className="text-lg font-black text-white font-display mt-0.5">
                  Cuplikan Aksi Terbaik & Atmosfer Turnamen
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Saksikan skill memukau, gol-gol spektakuler, serta perjuangan pantang menyerah para pesepak bola cilik di turnamen An-Nur Mini Soccer 2026.
                </p>
              </div>
            </div>

            <div className="pt-4 mt-2 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">
                Liputan Resmi Panitia
              </span>
              <button
                type="button"
                onClick={() =>
                  setActiveVideoModal({
                    isOpen: true,
                    title: 'Matchday Teaser & Highlights Laga',
                    subtitle: 'Atmosfer Pertandingan & Gol Spektakuler',
                    src: '/logovid.mp4',
                  })
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-600/20 border border-cyan-400/40 hover:bg-cyan-600/40 text-cyan-200 text-xs font-bold transition-all"
              >
                <span>▶ Tonton Video</span>
              </button>
            </div>
          </div>

          {/* CARD VIDEO 2: ARENA & PESANTREN PROFILE */}
          <div className="relative rounded-3xl overflow-hidden border border-emerald-500/30 bg-slate-950 p-5 shadow-xl flex flex-col justify-between group hover:border-emerald-400 transition-all">
            <div className="space-y-4">
              {/* Video Player Preview Poster */}
              <div
                role="button"
                tabIndex={0}
                onClick={() =>
                  setActiveVideoModal({
                    isOpen: true,
                    title: 'Profil Arena & Fasilitas Pesantren An-Nur',
                    subtitle: 'Lingkungan Modern, Nyaman, dan Berstandar Kompetisi',
                    src: '/logovid.mp4',
                  })
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setActiveVideoModal({
                      isOpen: true,
                      title: 'Profil Arena & Fasilitas Pesantren An-Nur',
                      subtitle: 'Lingkungan Modern, Nyaman, dan Berstandar Kompetisi',
                      src: '/logovid.mp4',
                    });
                  }
                }}
                className="relative aspect-video w-full rounded-2xl overflow-hidden bg-gradient-to-tr from-slate-950 via-slate-900 to-emerald-950/60 border border-slate-800 cursor-pointer group/vid"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/Sampul.png"
                  alt="Profil Arena Pesantren An-Nur"
                  className="w-full h-full object-cover opacity-60 group-hover/vid:scale-105 transition-transform duration-500 filter brightness-90 hue-rotate-30"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/35 pointer-events-none" />

                {/* Badge Atas */}
                <div className="absolute top-3 left-3 z-10">
                  <span className="px-2.5 py-1 rounded-lg bg-black/80 border border-emerald-400/50 text-[10px] font-mono font-bold text-emerald-300">
                    PROFIL ARENA
                  </span>
                </div>
                <div className="absolute top-3 right-3 z-10">
                  <span className="px-2 py-1 rounded-lg bg-black/80 border border-slate-700 text-[10px] font-mono font-bold text-slate-300">
                    1:15 • HD
                  </span>
                </div>

                {/* Tombol Play Icon Tengah */}
                <div className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-xl shadow-lg shadow-emerald-500/40 group-hover/vid:scale-110 transition-transform">
                  ▶
                </div>
              </div>

              <div>
                <span className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                  SARANA & PRASARANA
                </span>
                <h3 className="text-lg font-black text-white font-display mt-0.5">
                  Fasilitas Mini Soccer Pesantren An-Nur Sidoarjo
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Menengok fasilitas lapangan mini soccer sintetis berkualitas, tribun penonton, serta lingkungan asri Pondok Pesantren An-Nur Tanggulangin Sidoarjo.
                </p>
              </div>
            </div>

            <div className="pt-4 mt-2 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">
                Profil Yayasan An-Nur
              </span>
              <button
                type="button"
                onClick={() =>
                  setActiveVideoModal({
                    isOpen: true,
                    title: 'Profil Arena & Fasilitas Pesantren An-Nur',
                    subtitle: 'Lingkungan Modern, Nyaman, dan Berstandar Kompetisi',
                    src: '/logovid.mp4',
                  })
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600/20 border border-emerald-400/40 hover:bg-emerald-600/40 text-emerald-200 text-xs font-bold transition-all"
              >
                <span>▶ Tonton Profil</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION 5: SPONSORSHIP RESMI & PARTNERS                        */}
      {/* ============================================================== */}
      <section className="relative space-y-6 pt-4">
        <div className="border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase font-bold tracking-wider mb-1">
            <span>🤝</span>
            <span>KEMITRAAN & SPONSORSHIP</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white font-display tracking-tight">
            Official Sponsors & Education Partners
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Mendukung pembinaan atlet muda dan generasi Qurani berprestasi di Jawa Timur
          </p>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 sm:p-8 space-y-8 backdrop-blur-md">
          {/* Row A: Official Sponsors dari Database */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
                SPONSOR RESMI TURNAMEN
              </span>
              <span className="text-xs font-mono text-emerald-400 font-bold">
                ✓ TERVERIFIKASI
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-8 sm:gap-10">
              {activeSponsors.length === 0 ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logoutama.png"
                    alt="Yayasan An-Nur"
                    className="h-12 max-w-[140px] object-contain filter drop-shadow opacity-90 hover:opacity-100 transition-opacity"
                  />
                  <div>
                    <span className="block text-xs font-bold text-white font-display">Yayasan An-Nur</span>
                    <span className="block text-[10px] text-slate-400 font-mono">Official Main Sponsor</span>
                  </div>
                </div>
              ) : (
                activeSponsors.map((sp) => (
                  <div key={sp.id} className="flex items-center gap-3 group">
                    {sp.logo_url && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={sp.logo_url}
                        alt={sp.name}
                        className="h-12 max-w-[140px] object-contain filter drop-shadow opacity-90 group-hover:opacity-100 transition-opacity"
                      />
                    )}
                    <div>
                      <span className="block text-xs font-bold text-white font-display truncate max-w-[130px]">
                        {sp.name}
                      </span>
                      <span className="block text-[10px] text-cyan-400 font-mono uppercase">
                        {sp.tier} Partner
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Row B: Official Education Partners (MA An-Nur & MTs Mubosta) */}
          <div className="pt-6 border-t border-slate-800/80 space-y-4">
            <span className="block text-xs font-mono font-bold text-emerald-400 uppercase tracking-widest">
              OFFICIAL EDUCATION PARTNERS & REKOMENDASI PSSI
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
              {/* MA An-Nur */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo%20ma.png"
                  alt="Logo MA An-Nur"
                  className="h-12 max-w-[130px] object-contain filter drop-shadow"
                />
                <div>
                  <h4 className="text-xs font-black text-white font-display">MA AN-NUR</h4>
                  <p className="text-[10px] text-emerald-300 font-mono">Unggulan & Qurani</p>
                </div>
              </div>

              {/* MTs Mubosta */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo%20mubosta.png"
                  alt="Logo MTs Mubosta"
                  className="h-12 max-w-[130px] object-contain filter drop-shadow"
                />
                <div>
                  <h4 className="text-xs font-black text-white font-display">MTs MUBOSTA</h4>
                  <p className="text-[10px] text-cyan-300 font-mono">Bilingual Islamic</p>
                </div>
              </div>

              {/* Askab PSSI Sidoarjo / PSSQ */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/pssq.png"
                  alt="Logo Askab PSSI Sidoarjo / PSSQ"
                  className="h-12 max-w-[130px] object-contain filter drop-shadow"
                />
                <div>
                  <h4 className="text-xs font-black text-white font-display">ASKAB PSSI</h4>
                  <p className="text-[10px] text-blue-300 font-mono">Rekomendasi Resmi</p>
                </div>
              </div>
            </div>
          </div>

          {/* Row C: Banner Promosi PPDB Gelombang Inden Potongan 40% */}
          <div
            className="rounded-2xl p-5 sm:p-6 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border"
            style={{
              background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.15) 0%, rgba(56, 189, 248, 0.15) 50%, rgba(245, 158, 11, 0.18) 100%)',
              borderColor: 'rgba(52, 211, 153, 0.4)',
            }}
          >
            <div className="flex items-start sm:items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-slate-950 font-black flex items-center justify-center text-2xl flex-none shadow-lg">
                🎓
              </div>
              <div className="text-left space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 font-mono text-[10px] font-black uppercase tracking-wider border border-emerald-400/40">
                    PPDB 2026 / 2027
                  </span>
                  <span className="text-xs text-yellow-300 font-black uppercase tracking-widest font-mono">
                    ★ POTONGAN JALUR INDEN HINGGA 40% ★
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-black text-white font-display">
                  Pondok Pesantren An-Nur · MTs Bilingual Mubosta · MA Unggulan An-Nur Sidoarjo
                </h4>
                <p className="text-xs text-slate-300">
                  Daftarkan putra-putri Anda sekarang & raih kemudahan beasiswa potongan biaya pendidikan spesial turnamen!
                </p>
              </div>
            </div>

            <div className="flex-none pt-2 md:pt-0">
              <div className="px-4 py-2 rounded-xl bg-slate-950/90 border border-emerald-400/40 font-mono text-center">
                <span className="block text-[9px] uppercase tracking-widest text-emerald-400 font-bold">
                  KONSULTASI PPDB
                </span>
                <span className="block text-xs font-black text-white mt-0.5">
                  Tanggulangin · Sidoarjo
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION 6: FOOTER FUTURISTIK LENGKAP                           */}
      {/* ============================================================== */}
      <footer className="relative pt-8 border-t border-slate-800 space-y-8 text-xs text-slate-400">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Kolom 1: Identitas Turnamen */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logoutama.png"
                alt="Logo Utama"
                className="h-10 w-auto object-contain"
              />
              <div>
                <h4 className="font-display text-sm font-black text-white">
                  An-Nur Mini Soccer
                </h4>
                <p className="text-[10px] font-mono text-cyan-400">
                  Championship 2026
                </p>
              </div>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Turnamen sepak bola usia dini resmi (U-10 & U-12) yang memadukan prestasi atletik, sportivitas, dan pendidikan karakter islami.
            </p>
          </div>

          {/* Kolom 2: Navigasi Cepat */}
          <div className="space-y-2.5">
            <h5 className="font-mono font-bold text-white text-xs uppercase tracking-wider">
              Navigasi Halaman
            </h5>
            <ul className="space-y-1.5 font-mono text-[11px]">
              <li>
                <Link href="/" className="hover:text-cyan-400 transition-colors">
                  ➔ Dashboard Beranda
                </Link>
              </li>
              <li>
                <Link href="/jadwal" className="hover:text-cyan-400 transition-colors">
                  ➔ Jadwal Pertandingan
                </Link>
              </li>
              <li>
                <Link href="/bagan" className="hover:text-cyan-400 transition-colors">
                  ➔ Bagan Babak Gugur
                </Link>
              </li>
              <li>
                <Link href="/klasemen" className="hover:text-cyan-400 transition-colors">
                  ➔ Klasemen Grup
                </Link>
              </li>
              <li>
                <Link href="/tim" className="hover:text-cyan-400 transition-colors">
                  ➔ Daftar Tim Peserta
                </Link>
              </li>
            </ul>
          </div>

          {/* Kolom 3: Area Petugas & Panitia Terproteksi */}
          <div className="space-y-2.5">
            <h5 className="font-mono font-bold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
              <span>🔒</span>
              <span>Akses Panitia & Wasit</span>
            </h5>
            <ul className="space-y-1.5 font-mono text-[11px]">
              <li>
                <Link href="/lapangan/1" className="hover:text-cyan-400 transition-colors flex items-center gap-1">
                  <span>🛡️</span>
                  <span>Konsol Lapangan 1</span>
                </Link>
              </li>
              <li>
                <Link href="/lapangan/2" className="hover:text-emerald-400 transition-colors flex items-center gap-1">
                  <span>🛡️</span>
                  <span>Konsol Lapangan 2</span>
                </Link>
              </li>
              <li>
                <Link href="/updateskor" className="hover:text-amber-400 transition-colors flex items-center gap-1">
                  <span>⏱️</span>
                  <span>Papan Skor Panitia</span>
                </Link>
              </li>
              <li>
                <Link href="/panitia" className="hover:text-blue-400 transition-colors flex items-center gap-1">
                  <span>🔑</span>
                  <span>Portal Masuk Panitia</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Kolom 4: Lokasi & Kontak */}
          <div className="space-y-2.5">
            <h5 className="font-mono font-bold text-white text-xs uppercase tracking-wider">
              Sekretariat & Arena
            </h5>
            <div className="space-y-1 text-[11px] leading-relaxed text-slate-400">
              <p className="text-white font-semibold">
                Yayasan Pondok Pesantren An-Nur
              </p>
              <p>Tanggulangin, Kabupaten Sidoarjo, Jawa Timur</p>
              <p className="text-cyan-400 font-mono pt-1">
                Rekomendasi Resmi Askab PSSI Sidoarjo (PSSQ)
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Copyright Bar */}
        <div className="border-t border-slate-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-mono text-slate-500">
          <p>© 2026 An-Nur Mini Soccer Championship. Hak Cipta Dilindungi.</p>
          <div className="flex items-center gap-4">
            <span>MySQL Real-Time DB</span>
            <span>•</span>
            <span>Hostinger Deploy Ready</span>
          </div>
        </div>
      </footer>

      {/* ============================================================== */}
      {/* MODAL PEMUTAR VIDEO INTERAKTIF                                */}
      {/* ============================================================== */}
      {activeVideoModal.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-reveal"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setActiveVideoModal({ isOpen: false, title: '', subtitle: '', src: '' });
            }
          }}
        >
          <div className="relative w-full max-w-4xl rounded-3xl border border-cyan-500/40 bg-slate-950 overflow-hidden shadow-2xl">
            {/* Header Video Modal */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/80">
              <div>
                <h3 className="text-sm font-bold text-white font-display">
                  {activeVideoModal.title}
                </h3>
                <p className="text-[11px] text-cyan-400 font-mono">
                  {activeVideoModal.subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setActiveVideoModal({ isOpen: false, title: '', subtitle: '', src: '' })
                }
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Pemutar Video */}
            <div className="relative aspect-video w-full bg-black">
              <video
                src={activeVideoModal.src}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal Detail Pertandingan */}
      <MatchDetailModal
        match={detailMatch}
        onClose={() => setDetailMatch(null)}
      />

      {/* Modal Pamflet Resmi (1080x1350) */}
      <MatchPamphletModal
        match={pamphletMatch}
        events={pamphletEvents}
        isOpen={Boolean(pamphletMatch)}
        onClose={() => setPamphletMatch(null)}
      />
    </div>
  );
}