'use client';

import { useMemo } from 'react';
import { useCategory } from '@/hooks/useCategory';
import { matchesStore, teamsStore, useResource } from '@/lib/live-store';
import KnockoutBracket from '@/components/KnockoutBracket';
import Reveal from '@/components/Reveal';

export default function BaganPage() {
  const [matches, online, reload] = useResource(matchesStore);
  const [teams] = useResource(teamsStore);
  const [category, setCategory] = useCategory('U10');

  const categories = useMemo(() => {
    const cats = [...new Set(teams.map((t) => t.category).filter(Boolean))] as string[];
    return cats.sort();
  }, [teams]);

  const activeCategory = (category === 'U12' ? 'U12' : 'U10') as 'U10' | 'U12';

  return (
    <div className="wrap pt-10 sm:pt-12 pb-12">
      {/* Header Utama */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue mb-1">
            <span>🏆</span>
            <span>FASE GUGUR TURNAMEN</span>
          </div>
          <Reveal as="h1" className="rule-title font-display text-[30px] font-extrabold md:text-[46px] leading-tight">
            Bagan Babak Gugur
          </Reveal>
          <p className="mt-1 text-sm text-muted max-w-[60ch]">
            Skema 8 Besar, Semifinal, dan Final. Terhubung langsung secara otomatis dengan hasil pertandingan dan klasemen grup.
          </p>
        </div>

        {/* Pemilih Kategori U-10 & U-12 */}
        <div className="pill gap-1 p-1 max-w-full overflow-x-auto scrollbar-hide flex-none" role="group" aria-label="Kategori">
          {(categories.length > 0 ? categories : ['U10', 'U12']).map((c) => (
            <button
              key={c}
              aria-pressed={activeCategory === c}
              onClick={() => setCategory(c)}
              className={`label shrink-0 rounded-full px-4 sm:px-5 py-2 sm:py-2.5 transition-all text-xs sm:text-sm ${
                activeCategory === c
                  ? 'bg-text text-ink font-bold shadow-sm'
                  : 'text-muted hover:text-text'
              }`}
            >
              {c} {c === 'U10' ? "(Jum'at)" : '(Sabtu)'}
            </button>
          ))}
        </div>
      </div>

      {!online && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-danger/40 bg-danger/10 px-5 py-3">
          <p className="text-sm text-danger">Koneksi data terputus. Menampilkan bagan terakhir.</p>
          <button onClick={reload} className="label text-text text-xs border border-line rounded-full px-3 py-1">
            Coba lagi
          </button>
        </div>
      )}

      {/* Konten Bagan Turnamen */}
      <div className="mt-8">
        <KnockoutBracket
          category={activeCategory}
          teams={teams}
          matches={matches}
        />
      </div>
    </div>
  );
}
