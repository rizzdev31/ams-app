'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { name: 'Beranda', path: '/' },
  { name: 'Jadwal', path: '/jadwal' },
  { name: 'Bagan', path: '/bagan' },
  { name: 'Klasemen', path: '/klasemen' },
  { name: 'Tim', path: '/tim' },
];

/** Bar pil di bawah layar untuk navigasi mobile */
export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-2.5 sm:inset-x-4 bottom-[calc(env(safe-area-inset-bottom,0px)+12px)] z-40 mx-auto grid max-w-[520px] grid-cols-5 gap-1 rounded-full border border-line bg-surface/95 p-1.5 backdrop-blur-md lg:hidden shadow-lg"
    >
      {NAV.map((item) => {
        const isActive =
          item.path === '/'
            ? pathname === '/' || pathname === '/dashboard'
            : pathname.startsWith(item.path);
        return (
          <Link
            key={item.path}
            href={item.path}
            aria-current={isActive ? 'page' : undefined}
            className={`label flex h-[42px] items-center justify-center rounded-full text-[11px] sm:text-xs transition-colors ${
              isActive
                ? 'bg-blue/20 text-text shadow-[inset_0_0_0_1px_rgba(91,141,255,.45)] font-bold text-cyan-300'
                : 'text-muted hover:text-text'
            }`}
          >
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}