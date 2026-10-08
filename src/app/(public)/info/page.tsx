'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { settingsStore, useResource } from '@/lib/live-store';
import Reveal from '@/components/Reveal';
import SponsorSection from '@/components/SponsorSection';

const DEFAULT_RULES = [
  'Sistem pertandingan menggunakan babak penyisihan grup dilanjutkan fase gugur (semifinal dan final).',
  'Waktu pertandingan adalah 2 x 15 menit kotor dengan jeda istirahat 5 menit.',
  'Jumlah pemain di lapangan 7 lawan 7 termasuk penjaga gawang.',
  'Pergantian pemain bebas tanpa batasan.',
  'Tim yang tidak hadir setelah pemanggilan 3 kali dengan jeda 5 menit dinyatakan kalah WO (3-0).',
];

export default function InfoPage() {
  // Pengaturan juga lewat store, jadi ubah dicommittee langsung tampil di sini.
  const [settings, online] = useResource(settingsStore);

  if (!settings && !online) {
    return (
      <div className="wrap pt-12">
        <div className="h-10 w-2/3 rounded-full bg-raise" />
      </div>
    );
  }

  const facts = [
    {
      label: 'Tanggal',
      value:
        settings?.start_date && settings?.end_date
          ? `${formatDate(settings.start_date.split('T')[0])} sampai ${formatDate(settings.end_date.split('T')[0])}`
          : '9–10 Oktober 2026',
      icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    },
    {
      label: 'Lokasi',
      value: settings?.location || 'Lapangan An-Nur',
      icon: 'M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z',
    },
    {
      label: 'Kontak panitia',
      value: settings?.contact_info || 'Hubungi petugas lapangan saat pertandingan berlangsung.',
      icon: 'M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z',
    },
  ];

  const rules = settings?.rules_text
    ? settings.rules_text.split('\n').filter((l) => l.trim().length > 0)
    : DEFAULT_RULES;

  return (
    <div className="wrap pt-12 pb-8">
      <Reveal as="h1" className="rule-title font-display text-[30px] font-extrabold md:text-[46px]">
        {settings?.event_name || 'An-Nur Mini Soccer'}
      </Reveal>

      <dl className="mt-6 overflow-hidden rounded-[28px] border border-line bg-surface">
        {facts.map((f) => (
          <div
            key={f.label}
            className="flex items-start gap-4 border-b border-line px-5 py-4 last:border-0"
          >
            <span className="mt-0.5 flex h-10 w-10 flex-none items-center justify-center rounded-full border border-line text-blue">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
              </svg>
            </span>
            <div className="min-w-0 flex-1">
              <dt className="label text-muted">{f.label}</dt>
              <dd className="mt-1 whitespace-pre-line text-base leading-relaxed">{f.value}</dd>
              {f.label === 'Lokasi' && settings?.map_url && (
                <a
                  href={settings.map_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="label mt-2 inline-block text-blue"
                >
                  Buka peta
                </a>
              )}
            </div>
          </div>
        ))}
      </dl>

      <section aria-label="Peraturan turnamen" className="mt-12">
        <h2 className="rule-title font-display text-2xl font-extrabold">Peraturan turnamen</h2>
        <ol className="mt-4 overflow-hidden rounded-[28px] border border-line">
          {rules.map((r, i) => (
            <li
              key={i}
              className="flex gap-4 border-b border-line bg-white/[0.025] px-5 py-4 last:border-0"
            >
              <span className="num w-8 flex-none text-2xl text-blue">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-base leading-relaxed">{r}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="Urutan tie-break" className="mt-12">
        <h2 className="rule-title font-display text-2xl font-extrabold">Urutan tie-break</h2>
        <div className="mt-4 rounded-[28px] border border-line bg-surface px-5 py-5">
          <p className="font-display text-xl font-extrabold">
            {settings?.tiebreak_rules || 'Poin, selisih gol, gol memasukkan'}
          </p>
          <ol className="mt-3 space-y-1.5 text-sm text-muted">
            <li>1. Poin tertinggi (menang 3, seri 1, kalah 0)</li>
            <li>2. Selisih gol terbanyak</li>
            <li>3. Gol memasukkan terbanyak</li>
          </ol>
          <Link
            href="/klasemen"
            className="label mt-5 inline-flex h-12 items-center rounded-full border border-line px-6"
          >
            Lihat klasemen
          </Link>
        </div>
      </section>

      {/* Official Partners & Sponsors */}
      <SponsorSection className="mt-12" />
    </div>
  );
}