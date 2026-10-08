'use client';

import React, { forwardRef } from 'react';
import type { MatchWithTeams, MatchEvent, Sponsor } from '@/lib/types';
import { formatTime, getMatchPartai, getU12LegacyGroup, getInitials } from '@/lib/utils';

interface MatchPamphletProps {
  match: MatchWithTeams;
  events?: MatchEvent[];
  sponsors?: Sponsor[];
}

/**
 * Komponen Pamflet Resmi Hasil Pertandingan An-Nur Mini Soccer 2026.
 * Rasio Golden Standard Media Sosial 4:5 (Resolusi Tepat 1080px x 1350px).
 * Desain Futuristik Cyber-Sport Tanpa Rectangle Kaku Pada Logo (Semua Logo Mengapung Alami).
 */
export const MatchPamphlet = forwardRef<HTMLDivElement, MatchPamphletProps>(
  ({ match, events = [], sponsors = [] }, ref) => {
    const a = match.team_a;
    const b = match.team_b;
    const isFinished = match.status === 'finished';
    const partai = getMatchPartai(match);
    const u12Alias =
      match.category === 'U12' && match.group_name
        ? getU12LegacyGroup(match.group_name)
        : null;

    const scoreA = match.score_a ?? 0;
    const scoreB = match.score_b ?? 0;

    const isWinnerA =
      isFinished &&
      (match.winner_team_id === match.team_a_id ||
        (match.winner_team_id == null && scoreA > scoreB));
    const isWinnerB =
      isFinished &&
      (match.winner_team_id === match.team_b_id ||
        (match.winner_team_id == null && scoreB > scoreA));

    // Filter gol & kartu per tim
    const teamAEvents = events.filter((e) => e.team_id === match.team_a_id);
    const teamBEvents = events.filter((e) => e.team_id === match.team_b_id);

    const teamAGoals = teamAEvents.filter((e) => e.type === 'goal');
    const teamBGoals = teamBEvents.filter((e) => e.type === 'goal');
    const teamACards = teamAEvents.filter((e) => e.type === 'yellow_card' || e.type === 'red_card');
    const teamBCards = teamBEvents.filter((e) => e.type === 'yellow_card' || e.type === 'red_card');

    // Label babak / stage
    const stageLabel =
      match.stage === 'perempat_final'
        ? 'PEREMPAT FINAL (8 BESAR)'
        : match.stage === 'semifinal'
        ? 'SEMIFINAL'
        : match.stage === 'juara_3'
        ? 'PEREBUTAN JUARA 3'
        : match.stage === 'final'
        ? 'GRAND FINAL'
        : `BABAK PENYISIHAN GRUP ${match.group_name || 'A'}${u12Alias && u12Alias !== match.group_name ? ` (${u12Alias})` : ''}`;

    // Format tanggal resmi Indonesia
    const formattedDate = match.match_date
      ? new Date(match.match_date + 'T00:00:00+07:00').toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : "Jum'at, 9 Oktober 2026";

    // Filter sponsor aktif
    const activeSponsors = sponsors.filter((s) => s.active);

    return (
      <div
        ref={ref}
        id="match-pamphlet-node"
        className="w-[1080px] h-[1350px] min-w-[1080px] min-h-[1350px] max-w-[1080px] max-h-[1350px] text-slate-100 relative overflow-hidden flex flex-col justify-between font-sans select-none"
        style={{
          boxSizing: 'border-box',
          background: 'radial-gradient(ellipse 110% 80% at 50% -10%, #0c1c3f 0%, #050a18 45%, #020409 100%)',
          border: '2px solid rgba(56, 189, 248, 0.35)',
          boxShadow: '0 30px 80px -15px rgba(0, 0, 0, 0.95), 0 0 60px rgba(56, 189, 248, 0.15)',
        }}
      >
        {/* ============================================================== */}
        {/* BACKGROUND ACCENTS: Cyber-Pitch Beams, Lights & Stadium Grids  */}
        {/* ============================================================== */}
        {/* Stadium Floodlight Cones dari Kiri Atas & Kanan Atas */}
        <div
          className="absolute -top-24 -left-20 w-[450px] h-[450px] rounded-full pointer-events-none opacity-40 blur-[130px]"
          style={{ background: 'radial-gradient(circle, #38bdf8 0%, #0284c7 40%, transparent 70%)' }}
        />
        <div
          className="absolute -top-24 -right-20 w-[450px] h-[450px] rounded-full pointer-events-none opacity-40 blur-[130px]"
          style={{ background: 'radial-gradient(circle, #10b981 0%, #059669 40%, transparent 70%)' }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none opacity-20 blur-[160px]"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 65%)' }}
        />
        <div
          className="absolute -bottom-24 left-1/3 w-[500px] h-[500px] rounded-full pointer-events-none opacity-25 blur-[140px]"
          style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 65%)' }}
        />

        {/* Subtle Pitch Vector Linework (Geometric Stadium Lines) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-10"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="grid-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          {/* Halfway Arc & Center Circle Accent */}
          <circle cx="540" cy="620" r="280" fill="none" stroke="url(#grid-grad)" strokeWidth="1.5" strokeDasharray="6 6" />
          <circle cx="540" cy="620" r="12" fill="#38bdf8" opacity="0.3" />
          <line x1="80" y1="620" x2="1000" y2="620" stroke="url(#grid-grad)" strokeWidth="1" strokeDasharray="8 8" />
          {/* Diagonal Speed Vectors */}
          <line x1="0" y1="200" x2="300" y2="0" stroke="#38bdf8" strokeWidth="1" opacity="0.2" />
          <line x1="1080" y1="200" x2="780" y2="0" stroke="#10b981" strokeWidth="1" opacity="0.2" />
        </svg>

        {/* ============================================================== */}
        {/* 1. TOP HEADER / NAVBAR (MURNI LOGO SAJA - TANPA TEKS TAMBAHAN) */}
        {/* ============================================================== */}
        <div className="relative z-10 px-12 pt-10 pb-5">
          <div className="flex items-center justify-between gap-6">
            {/* Logo Pesantren (Kiri) - Murni Logo Saja */}
            <div className="relative flex-none">
              <div className="absolute -inset-3 bg-emerald-500/20 rounded-full blur-xl pointer-events-none" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo%20pesantren1.png"
                alt="Logo Pesantren An-Nur"
                className="h-20 max-w-[280px] object-contain filter drop-shadow-[0_6px_22px_rgba(16,185,129,0.5)] relative z-10"
                crossOrigin="anonymous"
              />
            </div>

            {/* Logo Utama Turnamen (Tengah) - Murni Logo Saja */}
            <div className="flex flex-col items-center justify-center relative px-4">
              <div className="relative">
                <div className="absolute -inset-6 bg-gradient-to-b from-cyan-500/35 to-blue-600/30 rounded-full blur-2xl pointer-events-none" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logoutama.png"
                  alt="Logo Utama An-Nur Mini Soccer"
                  className="h-32 max-w-[190px] object-contain filter drop-shadow-[0_10px_35px_rgba(56,189,248,0.65)] relative z-10"
                  crossOrigin="anonymous"
                />
              </div>
            </div>

            {/* Logo PSSQ / Askab PSSI Sidoarjo (Kanan) - Murni Logo Saja */}
            <div className="relative flex-none">
              <div className="absolute -inset-3 bg-blue-500/20 rounded-full blur-xl pointer-events-none" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/pssq.png"
                alt="Logo PSSQ / Askab PSSI"
                className="h-20 max-w-[260px] object-contain filter drop-shadow-[0_6px_22px_rgba(59,130,246,0.5)] relative z-10"
                crossOrigin="anonymous"
              />
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. MATCH STAGE & METADATA RIBBON                              */}
        {/* ============================================================== */}
        <div className="relative z-10 px-12">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-900/90 border border-cyan-500/30 p-4 shadow-xl backdrop-blur-md">
            {/* Luminous laser highlight bar on top */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

            <div className="flex items-center justify-between gap-4">
              {/* Kiri: Kategori & Babak */}
              <div className="flex items-center gap-3">
                <span
                  className={`px-3.5 py-1.5 rounded-xl font-mono text-xs font-black tracking-widest shadow-md ${
                    match.category === 'U12'
                      ? 'bg-amber-500/20 border border-amber-400/50 text-amber-300'
                      : 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-300'
                  }`}
                >
                  KATEGORI {match.category || 'U10'}
                </span>
                <div>
                  <h3 className="text-base font-black tracking-wide text-white font-display uppercase">
                    {stageLabel}
                  </h3>
                  {partai.label && (
                    <span className="text-[11px] font-mono text-cyan-300 font-bold uppercase tracking-wider">
                      {partai.label}
                    </span>
                  )}
                </div>
              </div>

              {/* Kanan: Tanggal, Lapangan & Kickoff */}
              <div className="flex items-center gap-5 text-right font-mono">
                <div>
                  <span className="block text-[11px] text-slate-400 uppercase tracking-widest font-semibold">
                    VENUE & KICKOFF
                  </span>
                  <span className="block text-sm font-bold text-slate-200">
                    Lapangan {match.field || '1'} · {formatTime(match.kickoff_time)} WIB
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-700/80" />
                <div>
                  <span className="block text-[11px] text-slate-400 uppercase tracking-widest font-semibold">
                    TANGGAL
                  </span>
                  <span className="block text-sm font-bold text-white">
                    {formattedDate}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 3. SHOWDOWN ARENA: FLOATING TEAMS & GIANT CYBER SCOREBOARD     */}
        {/* ============================================================== */}
        <div className="relative z-10 px-12 py-3 flex-1 flex flex-col justify-center">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-8">
            {/* ----------------- TIM A (KIRI) ----------------- */}
            <div className="flex flex-col items-center text-center">
              {/* Logo / Monogram Mengapung Alami Dengan Halo Cahaya */}
              <div className="relative flex items-center justify-center mb-4">
                {/* Circular Halo Backlight */}
                <div
                  className="absolute -inset-6 rounded-full blur-2xl pointer-events-none opacity-50"
                  style={{
                    background: a?.color
                      ? `radial-gradient(circle, ${a.color} 0%, transparent 70%)`
                      : 'radial-gradient(circle, #10b981 0%, transparent 70%)',
                  }}
                />

                {a?.logo_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={a.logo_url}
                    alt={a.name}
                    className="w-36 h-36 object-contain filter drop-shadow-[0_16px_35px_rgba(0,0,0,0.85)] relative z-10 transition-transform"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div
                    className="w-36 h-36 rounded-full flex items-center justify-center relative z-10 border-2 shadow-2xl"
                    style={{
                      borderColor: a?.color || '#10b981',
                      background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.15), rgba(15,23,42,0.95))',
                      boxShadow: `0 0 35px ${(a?.color || '#10b981')}40`,
                    }}
                  >
                    <span
                      className="text-4xl font-black font-display tracking-tight drop-shadow-md"
                      style={{ color: a?.color || '#10b981' }}
                    >
                      {a?.short_name || getInitials(a?.name || 'TMA')}
                    </span>
                  </div>
                )}
              </div>

              {/* Nama Tim */}
              <h2 className="text-3xl font-black text-white font-display tracking-wide uppercase line-clamp-2 max-w-[320px] drop-shadow-md">
                {a?.name || 'Tim A'}
              </h2>
              <span className="text-xs font-mono text-slate-400 font-bold uppercase tracking-widest mt-1">
                {a?.category || match.category} · {a?.group_name ? `Grup ${a.group_name}` : 'Peserta'}
              </span>

              {/* Status Pemenang */}
              {isWinnerA && (
                <div className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/25 via-yellow-400/30 to-amber-500/25 border border-yellow-400/60 shadow-lg shadow-yellow-500/20 animate-pulse">
                  <span className="text-yellow-300 text-sm">👑</span>
                  <span className="text-xs font-black tracking-widest text-yellow-200 font-mono uppercase">
                    WINNER / MENANG
                  </span>
                </div>
              )}
            </div>

            {/* ----------------- SCOREBOARD CENTER ----------------- */}
            <div className="flex flex-col items-center text-center px-6">
              {/* Status Match Pill */}
              <div className="mb-2">
                <span className="inline-flex items-center gap-2 px-5 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-[11px] font-mono font-black tracking-[0.25em] text-slate-300 uppercase shadow-inner">
                  <span className={`w-2 h-2 rounded-full ${isFinished ? 'bg-emerald-400 animate-ping' : 'bg-blue-400'}`} />
                  {isFinished ? 'FULL TIME (SELESAI)' : 'SKOR SEMENTARA'}
                </span>
              </div>

              {/* Big Cyber Score Display */}
              <div className="flex items-center gap-5 my-1">
                {/* Skor A */}
                <span
                  className={`text-[120px] font-black font-mono leading-none tracking-tight transition-all ${
                    isWinnerA
                      ? 'text-yellow-300 drop-shadow-[0_0_40px_rgba(250,204,21,0.55)]'
                      : 'text-white drop-shadow-[0_0_35px_rgba(56,189,248,0.45)]'
                  }`}
                >
                  {scoreA}
                </span>

                {/* Titik Dua / Separator */}
                <div className="flex flex-col gap-3 items-center justify-center opacity-60">
                  <span className="w-3.5 h-3.5 rounded-full bg-cyan-400 shadow-[0_0_12px_#38bdf8]" />
                  <span className="w-3.5 h-3.5 rounded-full bg-cyan-400 shadow-[0_0_12px_#38bdf8]" />
                </div>

                {/* Skor B */}
                <span
                  className={`text-[120px] font-black font-mono leading-none tracking-tight transition-all ${
                    isWinnerB
                      ? 'text-yellow-300 drop-shadow-[0_0_40px_rgba(250,204,21,0.55)]'
                      : 'text-white drop-shadow-[0_0_35px_rgba(56,189,248,0.45)]'
                  }`}
                >
                  {scoreB}
                </span>
              </div>

              {/* Adu Penalti Pill (Jika Ada) */}
              {(match.penalty_score_a != null || match.penalty_score_b != null) && (
                <div className="mt-2 inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/50 shadow-md">
                  <span className="text-xs font-mono font-black tracking-widest text-amber-300 uppercase">
                    ADU PENALTI: {match.penalty_score_a ?? 0} - {match.penalty_score_b ?? 0}
                  </span>
                </div>
              )}
            </div>

            {/* ----------------- TIM B (KANAN) ----------------- */}
            <div className="flex flex-col items-center text-center">
              {/* Logo / Monogram Mengapung Alami Dengan Halo Cahaya */}
              <div className="relative flex items-center justify-center mb-4">
                {/* Circular Halo Backlight */}
                <div
                  className="absolute -inset-6 rounded-full blur-2xl pointer-events-none opacity-50"
                  style={{
                    background: b?.color
                      ? `radial-gradient(circle, ${b.color} 0%, transparent 70%)`
                      : 'radial-gradient(circle, #38bdf8 0%, transparent 70%)',
                  }}
                />

                {b?.logo_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={b.logo_url}
                    alt={b.name}
                    className="w-36 h-36 object-contain filter drop-shadow-[0_16px_35px_rgba(0,0,0,0.85)] relative z-10 transition-transform"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div
                    className="w-36 h-36 rounded-full flex items-center justify-center relative z-10 border-2 shadow-2xl"
                    style={{
                      borderColor: b?.color || '#38bdf8',
                      background: 'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.15), rgba(15,23,42,0.95))',
                      boxShadow: `0 0 35px ${(b?.color || '#38bdf8')}40`,
                    }}
                  >
                    <span
                      className="text-4xl font-black font-display tracking-tight drop-shadow-md"
                      style={{ color: b?.color || '#38bdf8' }}
                    >
                      {b?.short_name || getInitials(b?.name || 'TMB')}
                    </span>
                  </div>
                )}
              </div>

              {/* Nama Tim */}
              <h2 className="text-3xl font-black text-white font-display tracking-wide uppercase line-clamp-2 max-w-[320px] drop-shadow-md">
                {b?.name || 'Tim B'}
              </h2>
              <span className="text-xs font-mono text-slate-400 font-bold uppercase tracking-widest mt-1">
                {b?.category || match.category} · {b?.group_name ? `Grup ${b.group_name}` : 'Peserta'}
              </span>

              {/* Status Pemenang */}
              {isWinnerB && (
                <div className="mt-3.5 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/25 via-yellow-400/30 to-amber-500/25 border border-yellow-400/60 shadow-lg shadow-yellow-500/20 animate-pulse">
                  <span className="text-yellow-300 text-sm">👑</span>
                  <span className="text-xs font-black tracking-widest text-yellow-200 font-mono uppercase">
                    WINNER / MENANG
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ============================================================== */}
          {/* 4. MATCH EVENTS BREAKDOWN (GOALS & CARDS - CLEAN MODERN LIST)  */}
          {/* ============================================================== */}
          <div className="mt-6 pt-5 border-t border-slate-800/80">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-6 text-xs">
              {/* Gol & Kartu Tim A (Kiri) */}
              <div className="space-y-2 text-right pr-4">
                {teamAGoals.length > 0 && (
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {teamAGoals.map((g, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 font-mono text-xs font-bold"
                      >
                        <span>⚽</span>
                        <span className="text-white font-extrabold">{g.player_name || 'Gol'}</span>
                        {g.minute != null && <span className="text-emerald-400 text-[11px]">{g.minute}&apos;</span>}
                      </span>
                    ))}
                  </div>
                )}
                {teamACards.length > 0 && (
                  <div className="flex flex-wrap items-center justify-end gap-1.5 mt-1">
                    {teamACards.map((c, idx) => (
                      <span
                        key={idx}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                          c.type === 'red_card'
                            ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                            : 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                        }`}
                      >
                        <span>{c.type === 'red_card' ? '🟥' : '🟨'}</span>
                        <span>{c.player_name || 'Pemain'}</span>
                        {c.minute != null && <span>{c.minute}&apos;</span>}
                      </span>
                    ))}
                  </div>
                )}
                {teamAGoals.length === 0 && teamACards.length === 0 && (
                  <span className="text-[11px] text-slate-500 font-mono italic">Tidak ada catatan gol / kartu</span>
                )}
              </div>

              {/* Garis Pembatas Luminous Tengah */}
              <div className="h-full w-px bg-gradient-to-b from-cyan-500/40 via-slate-700/60 to-transparent" />

              {/* Gol & Kartu Tim B (Kanan) */}
              <div className="space-y-2 text-left pl-4">
                {teamBGoals.length > 0 && (
                  <div className="flex flex-wrap items-center justify-start gap-2">
                    {teamBGoals.map((g, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 font-mono text-xs font-bold"
                      >
                        <span>⚽</span>
                        <span className="text-white font-extrabold">{g.player_name || 'Gol'}</span>
                        {g.minute != null && <span className="text-emerald-400 text-[11px]">{g.minute}&apos;</span>}
                      </span>
                    ))}
                  </div>
                )}
                {teamBCards.length > 0 && (
                  <div className="flex flex-wrap items-center justify-start gap-1.5 mt-1">
                    {teamBCards.map((c, idx) => (
                      <span
                        key={idx}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                          c.type === 'red_card'
                            ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                            : 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                        }`}
                      >
                        <span>{c.type === 'red_card' ? '🟥' : '🟨'}</span>
                        <span>{c.player_name || 'Pemain'}</span>
                        {c.minute != null && <span>{c.minute}&apos;</span>}
                      </span>
                    ))}
                  </div>
                )}
                {teamBGoals.length === 0 && teamBCards.length === 0 && (
                  <span className="text-[11px] text-slate-500 font-mono italic">Tidak ada catatan gol / kartu</span>
                )}
              </div>
            </div>

            {/* Catatan Khusus Laga (Jika Ada) */}
            {match.notes && (
              <div className="mt-4 flex items-center justify-center text-center">
                <div className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-slate-900/80 border border-yellow-500/30 text-xs text-yellow-300 font-mono shadow-md backdrop-blur-sm">
                  <span>📝</span>
                  <span className="font-bold">Catatan Laga:</span>
                  <span>{match.notes}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* 5. FOOTER: SPONSORS, EDUCATION PARTNERS & PPDB INDEN BANNER    */}
        {/* ============================================================== */}
        <div className="relative z-10 border-t border-cyan-500/20 bg-slate-950/90 backdrop-blur-md px-12 pt-6 pb-8 space-y-5">
          {/* Row A: Sponsorship & Education Partners (Murni Logo Saja, Tanpa Teks) */}
          <div className="grid grid-cols-[1.3fr_1fr] gap-8 items-center border-b border-slate-800/90 pb-5">
            {/* OFFICIAL SPONSORS (Murni Logo Saja) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] uppercase tracking-[0.25em] text-cyan-400 font-mono font-bold">
                  OFFICIAL TOURNAMENT SPONSORS
                </span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">
                  ✓ TERVERIFIKASI
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-7">
                {activeSponsors.length === 0 ? (
                  /* Fallback sponsor default jika DB kosong */
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src="/logoutama.png"
                    alt="Yayasan An-Nur"
                    className="h-12 max-w-[130px] object-contain filter drop-shadow-[0_4px_14px_rgba(255,255,255,0.25)]"
                    crossOrigin="anonymous"
                  />
                ) : (
                  activeSponsors.slice(0, 5).map((sp) => (
                    sp.logo_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        key={sp.id}
                        src={sp.logo_url}
                        alt={sp.name}
                        className="h-12 max-w-[140px] object-contain filter drop-shadow-[0_4px_14px_rgba(255,255,255,0.25)]"
                        crossOrigin="anonymous"
                      />
                    ) : (
                      <span key={sp.id} className="text-xs font-bold text-slate-200 font-mono">
                        {sp.name}
                      </span>
                    )
                  ))
                )}
              </div>
            </div>

            {/* EDUCATION PARTNERS (MA AN-NUR & MTS MUBOSTA - Murni Logo Saja) */}
            <div className="border-l border-slate-800/90 pl-8">
              <span className="block text-[10px] uppercase tracking-[0.25em] text-emerald-400 font-mono font-bold mb-3">
                OFFICIAL EDUCATION PARTNERS
              </span>
              <div className="flex items-center gap-8">
                {/* MA An-Nur (Murni Logo Saja) */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo%20ma.png"
                  alt="Logo MA An-Nur"
                  className="h-12 max-w-[160px] object-contain filter drop-shadow-[0_4px_16px_rgba(16,185,129,0.4)]"
                  crossOrigin="anonymous"
                />

                {/* MTs Mubosta (Murni Logo Saja) */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo%20mubosta.png"
                  alt="Logo MTs Mubosta"
                  className="h-12 max-w-[160px] object-contain filter drop-shadow-[0_4px_16px_rgba(56,189,248,0.4)]"
                  crossOrigin="anonymous"
                />
              </div>
            </div>
          </div>

          {/* Row B: BANNER PROMOSI PPDB GELOMBANG INDEN (POTONGAN 40%) */}
          <div
            className="rounded-2xl p-4 relative overflow-hidden flex items-center justify-between border"
            style={{
              background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.18) 0%, rgba(56, 189, 248, 0.18) 50%, rgba(245, 158, 11, 0.22) 100%)',
              borderColor: 'rgba(52, 211, 153, 0.45)',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4), inset 0 0 20px rgba(52, 211, 153, 0.1)',
            }}
          >
            {/* Glow Light Ambient Inside Banner */}
            <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-yellow-500/20 blur-3xl pointer-events-none" />

            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-slate-950 font-black flex items-center justify-center text-2xl flex-none shadow-lg shadow-emerald-500/30">
                🎓
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 font-mono text-[10px] font-black uppercase tracking-wider border border-emerald-400/40">
                    PPDB 2026 / 2027
                  </span>
                  <span className="text-xs text-yellow-300 font-black uppercase tracking-widest font-mono drop-shadow">
                    ★ POTONGAN GELOMBANG INDEN HINGGA 40% ★
                  </span>
                </div>
                <p className="text-sm font-black text-white font-display mt-0.5">
                  Pondok Pesantren An-Nur · MTs Bilingual Mubosta · MA Unggulan An-Nur Sidoarjo
                </p>
                <p className="text-[11px] text-slate-300">
                  Daftarkan putra-putri Anda segera & nikmati fasilitas beasiswa potongan biaya khusus turnamen!
                </p>
              </div>
            </div>

            {/* Tombol Info / Info Callout */}
            <div className="flex-none pl-6 text-right relative z-10 font-mono">
              <div className="px-4 py-2 rounded-xl bg-slate-950/80 border border-emerald-400/40 shadow-inner">
                <span className="block text-[9px] uppercase tracking-widest text-emerald-400 font-bold">
                  INFORMASI & KONSULTASI
                </span>
                <span className="block text-xs font-black text-white font-mono mt-0.5">
                  Tanggulangin · Sidoarjo
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

MatchPamphlet.displayName = 'MatchPamphlet';

export default MatchPamphlet;
