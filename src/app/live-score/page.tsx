import TvPage from '@/app/tv/page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Live Scoreboard TV · An-Nur Mini Soccer 2026',
  description: 'Papan skor live dan bagan pertandingan otomatis per lapangan untuk layar TV.',
};

export default function LiveScorePage() {
  return <TvPage />;
}
