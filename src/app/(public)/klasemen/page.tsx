'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Monogram from '@/components/Monogram';
import { calculateStandings, getU12LegacyGroup } from '@/lib/utils';
import { useCategory } from '@/hooks/useCategory';
import { matchesStore, teamsStore, settingsStore, useResource } from '@/lib/live-store';

const COLS: { key: string; label: string; title: string }[] = [
  { key: 'played', label: 'Mn', title: 'Main' },
  { key: 'won', label: 'M', title: 'Menang' },
  { key: 'drawn', label: 'S', title: 'Seri' },
  { key: 'lost', label: 'K', title: 'Kalah' },
];

export default function KlasemenPage() {
  // Klasemen dihitung dari store yang sama dengan halaman lain, jadi
  // angka Poin di sini dijamin cocok dengan skor di Beranda dan Jadwal.
  const [teams] = useResource(teamsStore);
  const [matches, online, reload] = useResource(matchesStore);
  const [settings] = useResource(settingsStore);
  const [category, setCategory] = useCategory('U10');

  const categories = useMemo(() => {
    const cats = [...new Set(teams.map((t) => t.category).filter(Boolean))] as string[];
    return cats.sort();
  }, [teams]);

  const activeCategory = categories.includes(category) ? category : (categories[0] ?? '');

  // Hanya tim kategori aktif yang dihitung — dua kategori tidak pernah tercampur.
  const visible = useMemo(() => {
    if (!activeCategory) return [];
    const scoped = teams.filter((t) => (t.category ?? 'U10') === activeCategory);
    const groupNames = [...new Set(scoped.map((t) => t.group_name))].sort();
    const winPoints = settings?.points_per_win ?? 3;
    return groupNames.map((g) => ({
      group_name: g,
      rows: calculateStandings(scoped, matches, g, winPoints),
    }));
  }, [teams, matches, activeCategory, settings?.points_per_win]);

  return (
    <div className="wrap pt-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="rule-title font-display text-[30px] font-extrabold md:text-[46px]">
          Klasemen
        </h1>
        {categories.length > 0 && (
          <div className="pill gap-0.5 p-1 max-w-full overflow-x-auto scrollbar-hide" role="group" aria-label="Kategori">
            {categories.map((c) => (
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

      {!online && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-full border border-danger/40 bg-danger/10 px-5 py-3">
          <p className="text-sm text-danger">Data tidak dapat dimuat.</p>
          <button onClick={reload} className="label text-text">
            Coba lagi
          </button>
        </div>
      )}

      <div className="mt-6 space-y-10 pb-8">
        {visible.map((group) => (
          <section key={group.group_name} aria-label={`Grup ${group.group_name}`}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-2xl font-extrabold">
                Grup {group.group_name}
                {activeCategory === 'U12' && getU12LegacyGroup(group.group_name) !== group.group_name ? (
                  <span className="ml-2 text-base font-normal text-muted">
                    ({getU12LegacyGroup(group.group_name)})
                  </span>
                ) : null}
              </h2>
              <p className="label text-muted">{group.rows.length} tim</p>
            </div>

            <div className="mt-3 overflow-x-auto rounded-2xl sm:rounded-[28px] border border-line bg-surface scrollbar-hide">
              <table className="w-full min-w-[500px] border-collapse">
                <thead>
                  <tr className="border-b border-line text-xs">
                    <th scope="col" className="label w-12 sm:w-14 px-2.5 sm:px-4 py-3.5 text-center text-muted">
                      #
                    </th>
                    <th
                      scope="col"
                      className="label px-2.5 sm:px-4 py-3.5 text-left text-muted"
                    >
                      Tim
                    </th>
                    {COLS.map((c, i) => (
                      <th
                        key={`${c.label}${i}`}
                        scope="col"
                        title={c.title}
                        className="label w-8 sm:w-9 px-1 py-3.5 text-center text-muted"
                      >
                        {c.label}
                      </th>
                    ))}
                    <th
                      scope="col"
                      className="label hidden w-10 px-1 py-3.5 text-center text-muted md:table-cell"
                    >
                      GM
                    </th>
                    <th
                      scope="col"
                      className="label hidden w-10 px-1 py-3.5 text-center text-muted md:table-cell"
                    >
                      GK
                    </th>
                    <th scope="col" className="label w-10 sm:w-11 px-1 py-3.5 text-center text-muted">
                      SG
                    </th>
                    <th
                      scope="col"
                      className="label px-3 sm:px-4 py-3.5 text-right text-muted"
                    >
                      Poin
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((row, i) => (
                    <tr
                      key={row.team.id}
                      style={{ ['--i' as string]: i }}
                      className={`animate-reveal border-b border-line transition-colors last:border-0 hover:bg-raise ${
                        i === 0 ? 'bg-[#0E1832]' : ''
                      }`}
                    >
                      <td className="num w-12 sm:w-14 px-2.5 sm:px-4 py-3 sm:py-3.5 text-center text-base sm:text-lg">
                        <span className="inline-flex items-center gap-1.5">
                          {i === 0 && (
                            <span
                              className="inline-block h-2 w-2 rounded-full bg-yellow"
                              aria-hidden
                            />
                          )}
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-2.5 sm:px-4 py-3 sm:py-3.5">
                        <Link
                          href={`/tim/${row.team.id}`}
                          className="inline-flex items-center gap-2 sm:gap-2.5 font-display text-[15px] sm:text-[18px] font-bold leading-tight hover:text-blue group"
                        >
                          <Monogram
                            name={row.team.name}
                            shortName={row.team.short_name}
                            logoUrl={row.team.logo_url}
                            color={row.team.color}
                            size={26}
                          />
                          <span className="truncate">{row.team.name}</span>
                        </Link>
                      </td>
                      {COLS.map((c, k) => (
                        <td key={k} className="num px-1 py-3 sm:py-3.5 text-center text-sm sm:text-base text-text">
                          {row[c.key as keyof typeof row] as number}
                        </td>
                      ))}
                      <td className="num hidden px-1 py-3 sm:py-3.5 text-center text-sm sm:text-base text-muted md:table-cell">
                        {row.goals_for}
                      </td>
                      <td className="num hidden px-1 py-3 sm:py-3.5 text-center text-sm sm:text-base text-muted md:table-cell">
                        {row.goals_against}
                      </td>
                      <td className="num px-1 py-3 sm:py-3.5 text-center text-sm sm:text-base text-text">
                        {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                      </td>
                      <td className="num px-3 sm:px-4 py-3 sm:py-3.5 text-right text-[22px] sm:text-[28px] font-bold text-yellow sm:text-text">
                        {row.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}

        {visible.length === 0 && online && (
          <p className="py-8 text-muted">
            Klasemen muncul setelah pertandingan pertama selesai.
          </p>
        )}

        {/* Aturan Poin & Tiebreaker Fase Grup */}
        <div className="rounded-3xl border border-line bg-surface/70 p-5 sm:p-6 backdrop-blur-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line/60 pb-4">
            <div>
              <h3 className="font-display text-base sm:text-lg font-extrabold text-text flex items-center gap-2">
                <span>📋</span>
                <span>Regulasi & Aturan Klasemen Fase Grup</span>
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Setiap tim bermain 3 kali di fase grup. Peringkat 1 & 2 melaju ke Babak 8 Besar (Bagan Sistem Gugur).
              </p>
            </div>
            <Link
              href="/bagan"
              className="label inline-flex items-center gap-2 rounded-full border border-blue/40 bg-blue/10 px-4 py-2 text-xs font-bold text-blue hover:bg-blue/20 transition-colors w-fit flex-none"
            >
              <span>🏆</span>
              <span>Lihat Bagan 8 Besar</span>
              <span>→</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Box 1: Sistem Poin */}
            <div className="rounded-2xl border border-line/60 bg-raise/40 p-4 space-y-2">
              <span className="font-bold text-text uppercase tracking-wider text-[11px] block text-blue">
                1. Sistem Perhitungan Poin
              </span>
              <ul className="space-y-1.5 text-muted">
                <li className="flex items-center justify-between">
                  <span>Menang (Win)</span>
                  <span className="font-mono font-bold text-text bg-line/60 px-2 py-0.5 rounded">
                    {settings?.points_per_win ?? 3} Poin
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Seri (Draw)</span>
                  <span className="font-mono font-bold text-text bg-line/60 px-2 py-0.5 rounded">1 Poin</span>
                </li>
                <li className="flex items-center justify-between">
                  <span>Kalah (Loss)</span>
                  <span className="font-mono font-bold text-text bg-line/60 px-2 py-0.5 rounded">0 Poin</span>
                </li>
              </ul>
            </div>

            {/* Box 2: Hierarki Tiebreaker */}
            <div className="rounded-2xl border border-line/60 bg-raise/40 p-4 space-y-2">
              <span className="font-bold text-text uppercase tracking-wider text-[11px] block text-yellow">
                2. Penentu Peringkat (Tiebreaker)
              </span>
              <ol className="list-decimal list-inside space-y-1 text-muted">
                <li><b className="text-text">Akumulasi Poin Tertinggi</b></li>
                <li><b className="text-text">Selisih Gol (SG)</b>: GM dikurangi GK</li>
                <li><b className="text-text">Produktivitas Gol (GM)</b>: Gol dicetak</li>
                <li><b className="text-text">Head-to-Head (H2H)</b>: Laga langsung</li>
                <li><b className="text-text">Kebobolan Tersedikit (GK)</b></li>
              </ol>
            </div>

            {/* Box 3: Kelolosan Babak Gugur */}
            <div className="rounded-2xl border border-line/60 bg-raise/40 p-4 space-y-2">
              <span className="font-bold text-text uppercase tracking-wider text-[11px] block text-emerald-400">
                3. Tiket Lolos ke 8 Besar
              </span>
              <ul className="space-y-1.5 text-muted">
                <li className="flex items-start gap-2">
                  <span className="h-4 w-4 rounded-full bg-yellow text-ink font-black text-[10px] inline-flex items-center justify-center flex-none mt-0.5">1</span>
                  <span><b className="text-text">Juara Grup</b>: Lolos otomatis ke 8 Besar</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="h-4 w-4 rounded-full bg-line text-text font-black text-[10px] inline-flex items-center justify-center flex-none mt-0.5">2</span>
                  <span><b className="text-text">Runner-up Grup</b>: Lolos otomatis ke 8 Besar</span>
                </li>
                <li className="text-[11px] text-muted/70 pt-1 border-t border-line/30">
                  Total 8 tim terbaik melaju ke Perempat Final sistem gugur.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}