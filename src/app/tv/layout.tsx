import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Layar TV Live Score · An-Nur Mini Soccer 2026',
  description:
    'Papan skor live resmi dan jadwal berjalan per lapangan untuk tampilan layar TV publik An-Nur Mini Soccer 2026.',
};

export default function TvLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#05070D] text-[#F4F7FC]">{children}</div>;
}
