'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function LayoutFooter() {
  const pathname = usePathname();

  // Jika di Dashboard (Beranda) atau /dashboard, halaman sudah memiliki footer futuristik lengkap
  if (pathname === '/' || pathname === '/dashboard') {
    return null;
  }

  return (
    <footer className="wrap py-9 text-sm text-muted">
      <div className="border-t border-line pt-6">
        <p className="max-w-[65ch]">
          Skor diinput manual oleh panitia. Jika ada selisih, keputusan panitia yang
          berlaku.
        </p>
        <nav aria-label="Tautan lain" className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
          <Link href="/" className="hover:text-blue">
            Dashboard
          </Link>
          <Link href="/jadwal" className="hover:text-blue">
            Jadwal lengkap
          </Link>
          <Link href="/bagan" className="hover:text-blue">
            Bagan turnamen
          </Link>
          <Link href="/live" className="hover:text-blue">
            Skor live
          </Link>
          <Link href="/info" className="hover:text-blue">
            Info
          </Link>
          <Link href="/panitia" className="hover:text-blue">
            Panitia
          </Link>
        </nav>
      </div>
    </footer>
  );
}
