'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Monogram from '@/components/Monogram';
import Reveal from '@/components/Reveal';
import { teamsStore, useResource } from '@/lib/live-store';

export default function TimPage() {
  const [allTeams, online, reload] = useResource(teamsStore);

  const teams = useMemo(
    () => [...allTeams].sort((a, b) => a.name.localeCompare(b.name)),
    [allTeams]
  );

  const sections = useMemo(() => {
    const cats = [...new Set(teams.map((t) => t.category).filter(Boolean))] as string[];
    if (cats.length === 0) return [{ title: '', list: teams }];
    return cats.sort().map((c) => ({
      title: c,
      list: teams.filter((t) => (t.category ?? 'U10') === c),
    }));
  }, [teams]);

  return (
    <div className="wrap pt-12">
      <div className="flex items-end justify-between gap-3">
        <h1 className="rule-title font-display text-[30px] font-extrabold md:text-[46px]">
          Tim
        </h1>
        <p className="label text-muted">{teams.length} tim</p>
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
        {sections.map((s) => (
          <section key={s.title || 'all'} aria-label={s.title || 'Daftar tim'}>
            {s.title && (
              <Reveal as="h2" className="rule-title font-display text-2xl font-extrabold">{s.title}</Reveal>
            )}
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {s.list.map((team, i) => (
                <Reveal as="article" key={team.id} index={i} className="team-card">
                  <Link
                    href={`/tim/${team.id}`}
                    className="group flex flex-col items-center gap-3 rounded-[28px] border border-line bg-gradient-to-bl from-raise to-ink p-5 text-center hover:border-blue/50"
                  >
                    <Monogram
                      name={team.name}
                      shortName={team.short_name}
                      logoUrl={team.logo_url}
                      color={team.color}
                      size={64}
                    />
                    <span className="font-display text-[19px] font-bold leading-tight group-hover:text-blue">
                      {team.name}
                    </span>
                    <span className="label text-muted">
                      {team.group_name ? `Grup ${team.group_name}` : ''}
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </section>
        ))}

        {teams.length === 0 && online && (
          <p className="py-8 text-muted">Belum ada tim yang terdaftar.</p>
        )}
      </div>
    </div>
  );
}