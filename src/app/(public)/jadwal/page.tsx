'use client';

import { useEffect, useMemo, useState } from 'react';
import type { MatchWithTeams } from '@/lib/types';
import { formatShortDate, formatTime } from '@/lib/utils';
import { useCategory } from '@/hooks/useCategory';
import { matchesStore, teamsStore, useResource } from '@/lib/live-store';
import MatchRow from '@/components/MatchRow';
import Reveal from '@/components/Reveal';
import KnockoutBracket from '@/components/KnockoutBracket';

const STAGE_LABEL: Record<string, string> = {
  grup: 'Babak Grup',
  perempat_final: '8 Besar',
  semifinal: 'Semifinal',
  juara_3: 'Juara 3',
  final: 'Final',
};

function dayLabel(dateStr: string): string {
  const weekday = new Date(`${dateStr}T12:00:00`).toLocaleDateString('id-ID', {
    weekday: 'long',
  });
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${formatShortDate(dateStr)}`;
}

export default function JadwalPage() {
  const [matches, online, reload] = useResource(matchesStore);
  const [teams] = useResource(teamsStore);
  const [category, setCategory] = useCategory();
  const [date, setDate] = useState('');
  const [stage, setStage] = useState('all');
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'bracket'>('list');

  const loading = matches.length === 0 && !online;

  const categories = useMemo(() => {
    const cats = [...new Set(matches.map((m) => m.category).filter(Boolean))] as string[];
    return cats.sort();
  }, [matches]);
  const activeCategory = categories.includes(category) ? category : 'Semua';

  // Tanggal yang relevan berdasarkan kategori aktif (U10: 9 Okt, U12: 10 Okt, Semua: kedua tanggal)
  const dates = useMemo(() => {
    const pool =
      activeCategory === 'Semua'
        ? matches
        : matches.filter((m) => m.category === activeCategory);
    return [...new Set(pool.map((m) => m.match_date))].sort();
  }, [matches, activeCategory]);

  // Otomatis sinkronkan date bila kategori berubah
  useEffect(() => {
    if (dates.length > 0 && (!date || !dates.includes(date))) {
      setDate(dates[0]);
    }
  }, [dates, date]);

  const stages = useMemo(() => [...new Set(matches.map((m) => m.stage))].sort(), [matches]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = matches
      .filter((m) => (activeCategory === 'Semua' ? true : m.category === activeCategory))
      .filter((m) => (date ? m.match_date === date : true))
      .filter((m) => (stage === 'all' ? true : m.stage === stage))
      .filter((m) => {
        if (!q) return true;
        return (
          m.team_a?.name.toLowerCase().includes(q) ||
          m.team_b?.name.toLowerCase().includes(q) ||
          m.team_a?.short_name.toLowerCase().includes(q) ||
          m.team_b?.short_name.toLowerCase().includes(q) ||
          (m.group_name && m.group_name.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        const timeComp = `${a.match_date}${a.kickoff_time}`.localeCompare(`${b.match_date}${b.kickoff_time}`);
        if (timeComp !== 0) return timeComp;
        return (a.field || '').localeCompare(b.field || '');
      });

    const map = new Map<string, MatchWithTeams[]>();
    for (const m of list) {
      const key = `${m.match_date} ${m.kickoff_time}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    // Pastikan Lapangan 1 selalu sebelum Lapangan 2 di tiap slot jam
    for (const [, items] of map) {
      items.sort((a, b) => (a.field || '').localeCompare(b.field || ''));
    }
    return [...map.entries()];
  }, [matches, activeCategory, date, stage, query]);

  const select =
    'h-12 rounded-full border border-line bg-surface px-4 text-base text-text outline-none transition-colors focus:border-blue';

  return (
    <div className="wrap pt-12 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Reveal as="h1" className="rule-title font-display text-[30px] font-extrabold md:text-[46px]">
          Jadwal
        </Reveal>
        {categories.length > 0 && (
          <div className="pill gap-0.5 p-1 max-w-full overflow-x-auto scrollbar-hide" role="group" aria-label="Kategori">
            {['Semua', ...categories].map((c) => (
              <button
                key={c}
                aria-pressed={activeCategory === c}
                onClick={() => setCategory(c)}
                className={`label shrink-0 rounded-full px-3.5 sm:px-5 py-2 sm:py-2.5 transition-colors ${
                  activeCategory === c ? 'bg-text text-ink font-bold' : 'text-muted hover:text-text'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Switcher Tampilan: Daftar Pertandingan vs Bagan Babak Gugur */}
      <div className="mt-5 flex gap-1 rounded-full border border-line bg-surface p-1 w-full max-w-md">
        <button
          type="button"
          onClick={() => setViewMode('list')}
          className={`label flex-1 rounded-full py-2 sm:py-2.5 text-[11px] sm:text-sm text-center transition-colors whitespace-nowrap ${
            viewMode === 'list' ? 'bg-text text-ink font-bold' : 'text-muted hover:text-text'
          }`}
        >
          Daftar Pertandingan
        </button>
        <button
          type="button"
          onClick={() => setViewMode('bracket')}
          className={`label flex-1 rounded-full py-2 sm:py-2.5 text-[11px] sm:text-sm text-center transition-colors whitespace-nowrap ${
            viewMode === 'bracket' ? 'bg-text text-ink font-bold' : 'text-muted hover:text-text'
          }`}
        >
          Bagan Babak Gugur
        </button>
      </div>

      {viewMode === 'bracket' ? (
        <div className="mt-8">
          <KnockoutBracket
            category={activeCategory === 'U12' ? 'U12' : 'U10'}
            teams={teams}
            matches={matches}
          />
        </div>
      ) : (
        <>
          {dates.length > 1 && (
            <div role="tablist" aria-label="Hari" className="pill mt-5 gap-0.5 p-1 max-w-full overflow-x-auto scrollbar-hide">
              {dates.map((d) => (
                <button
                  key={d}
                  role="tab"
                  aria-selected={date === d}
                  onClick={() => setDate(d)}
                  className={`label shrink-0 rounded-full px-3.5 sm:px-4 py-2 sm:py-2.5 transition-colors ${
                    date === d
                      ? 'bg-blue/20 text-text shadow-[inset_0_0_0_1px_rgba(91,141,255,.45)] font-bold'
                      : 'text-muted hover:text-text'
                  }`}
                >
                  {dayLabel(d)}
                </button>
              ))}
            </div>
          )}

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="j-q" className="label mb-1.5 block text-muted">
                Cari tim
              </label>
              <input
                id="j-q"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nama atau singkatan"
                className={`${select} w-full`}
              />
            </div>
            <div>
              <label htmlFor="j-stage" className="label mb-1.5 block text-muted">
                Fase
              </label>
              <select
                id="j-stage"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className={`${select} w-full`}
              >
                <option value="all">Semua fase</option>
                {stages.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABEL[s] ?? s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!online && (
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-full border border-danger/40 bg-danger/10 px-5 py-3">
              <p className="text-sm text-danger">Data tidak dapat dimuat.</p>
              <button onClick={reload} className="label text-text">
                Coba lagi
              </button>
            </div>
          )}

          <div className="mt-6" aria-live="polite">
            {loading && groups.length === 0 ? (
              <div className="space-y-2.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-24 animate-skeleton rounded-[26px] bg-raise" />
                ))}
              </div>
            ) : groups.length === 0 ? (
              <p className="py-6 text-muted">
                {activeCategory === 'Semua'
                  ? 'Jadwal belum diumumkan.'
                  : `Jadwal ${activeCategory} belum diumumkan.`}
              </p>
            ) : (
              groups.map(([key, list]) => {
                const [d, t] = key.split(' ');
                const isIshomaU10 = d === '2026-10-09' && t.startsWith('12:30');
                return (
                  <div key={key}>
                    {isIshomaU10 && (
                      <div className="my-4 sm:my-6 rounded-2xl border border-yellow/30 bg-yellow/10 p-3 sm:p-3.5 text-center text-[11px] sm:text-xs font-semibold text-yellow leading-relaxed">
                        ☕ 11:30 – 12:30 WIB · Istirahat, Sholat & Makan (ISHOMA)
                      </div>
                    )}
                    <div className="flex items-center gap-2 sm:gap-3.5 pb-2 pt-4 sm:pb-2.5 sm:pt-5">
                      <span className="font-mono text-base sm:text-xl font-bold text-text shrink-0">
                        {formatTime(t)} WIB
                      </span>
                      <span className="slot-dot flex-none" aria-hidden />
                      <span
                        className="h-px flex-1 bg-gradient-to-r from-line to-transparent min-w-[8px]"
                        aria-hidden
                      />
                      <span className="label text-[10px] sm:text-xs text-muted shrink-0 text-right">
                        {dayLabel(d)}
                      </span>
                    </div>
                    {list.map((m, i) => (
                      <MatchRow
                        key={m.id}
                        match={m}
                        showCategory={activeCategory === 'Semua'}
                        index={i}
                      />
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}