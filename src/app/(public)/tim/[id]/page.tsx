'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { calculateStandings, positionLabel } from '@/lib/utils';
import { matchesStore, teamsStore, usePlayers, useResource } from '@/lib/live-store';
import Monogram from '@/components/Monogram';
import CategoryMark from '@/components/CategoryMark';
import MatchRow from '@/components/MatchRow';

export default function TeamDetailPage() {
  const { id } = useParams<{ id: string }>();

  // Sama seperti halaman lain: satu store, satu salinan data.
  const [allTeams] = useResource(teamsStore);
  const [allMatches, online] = useResource(matchesStore);
  const [players] = usePlayers(id);

  const team = useMemo(() => allTeams.find((t) => t.id === id) ?? null, [allTeams, id]);

  const matches = useMemo(
    () =>
      allMatches
        .filter((m) => m.team_a_id === id || m.team_b_id === id)
        .sort((a, b) =>
          `${b.match_date}${b.kickoff_time}`.localeCompare(`${a.match_date}${a.kickoff_time}`)
        ),
    [allMatches, id]
  );

  if (!online && !team) {
    return (
      <div className="wrap pt-12">
        <div className="h-10 w-2/3 rounded-full bg-raise" />
        <div className="mt-4 h-4 w-1/3 rounded-full bg-raise" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="wrap pt-12">
        <p className="py-8 text-muted">Tim tidak ditemukan.</p>
        <Link href="/tim" className="label text-blue">
          ← Kembali ke daftar tim
        </Link>
      </div>
    );
  }

  const row = calculateStandings(
    allTeams.filter((t) => t.group_name === team.group_name),
    allMatches,
    team.group_name
  ).find((r) => r.team.id === team.id);

  return (
    <div className="wrap pt-12 pb-8">
      <Link href="/tim" className="label text-blue">
        ← Semua tim
      </Link>

      <header className="mt-4 flex flex-wrap items-center gap-5 rounded-[28px] border border-line bg-gradient-to-bl from-raise to-ink p-6">
        <Monogram name={team.name} shortName={team.short_name} logoUrl={team.logo_url} color={team.color} size={80} />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-extrabold md:text-4xl">{team.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {team.category && <CategoryMark category={team.category} />}
            <span className="label text-muted">
              {team.group_name ? `Grup ${team.group_name}` : ''}
            </span>
            <span className="label text-muted">{team.short_name}</span>
          </div>
        </div>

        {row && (
          <dl className="grid w-full grid-cols-4 gap-2 sm:w-auto">
            {[
              { label: 'Main', value: String(row.played) },
              { label: 'Menang', value: String(row.won) },
              {
                label: 'Selisih gol',
                value: `${row.goal_difference > 0 ? '+' : ''}${row.goal_difference}`,
              },
              { label: 'Poin', value: String(row.points) },
            ].map((f) => (
              <div key={f.label} className="rounded-2xl border border-line px-3 py-2.5 text-center">
                <dd className="num text-2xl">{f.value}</dd>
                <dt className="label mt-1 text-muted">{f.label}</dt>
              </div>
            ))}
          </dl>
        )}
      </header>

      <section aria-label="Skuad pemain" className="mt-10">
        <h2 className="rule-title font-display text-2xl font-extrabold">Skuad pemain</h2>
        {players.length > 0 ? (
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {players.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-2xl border border-line bg-white/[0.025] px-4 py-3"
              >
                <span className="num w-9 text-2xl text-blue">{p.jersey_number ?? '–'}</span>
                <span className="min-w-0 flex-1 truncate text-base font-bold">{p.name}</span>
                <span className="label text-muted">{positionLabel(p.position)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 py-6 text-muted">Squad belum diumumkan.</p>
        )}
      </section>

      <section aria-label="Jadwal dan hasil" className="mt-10">
        <h2 className="rule-title font-display text-2xl font-extrabold">Jadwal dan hasil</h2>
        <div className="mt-4">
          {matches.length > 0 ? (
            matches.map((m, i) => (
              <MatchRow
                key={m.id}
                match={m}
                code={`M-${String(i + 1).padStart(2, '0')}`}
                showCategory={false}
              />
            ))
          ) : (
            <p className="py-6 text-muted">Tim ini belum punya jadwal pertandingan.</p>
          )}
        </div>
      </section>
    </div>
  );
}