import Image from 'next/image';
import Link from 'next/link';
import BottomNav from '@/components/BottomNav';
import MatchdayRail from '@/components/MatchdayRail';
import ScrollProgress from '@/components/ScrollProgress';
import LayoutFooter from '@/components/LayoutFooter';

const NAV = [
  { name: 'Dashboard', path: '/' },
  { name: 'Jadwal', path: '/jadwal' },
  { name: 'Bagan', path: '/bagan' },
  { name: 'Klasemen', path: '/klasemen' },
  { name: 'Tim', path: '/tim' },
];

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ScrollProgress />
      <div className="flex min-h-screen flex-col bg-ink">
        <header className="sticky top-[calc(env(safe-area-inset-top,0px)+10px)] z-40 mt-2.5">
          <div className="wrap">
            <div className="flex h-14 items-center justify-between gap-3 rounded-full border border-line bg-surface/95 pl-3.5 pr-2.5 sm:pl-4 backdrop-blur-md shadow-sm">
              <Link href="/" className="flex items-center gap-2.5 whitespace-nowrap">
                <Image
                  src="/logoutama.png"
                  alt="Logo An-Nur Mini Soccer"
                  width={32}
                  height={42}
                  className="h-8 w-auto flex-none object-contain"
                  priority
                />
                <span className="font-display text-[16px] sm:text-[17px] font-extrabold tracking-tight">
                  An-Nur Mini Soccer
                </span>
              </Link>

              <nav aria-label="Navigasi utama" className="hidden items-center gap-1 md:flex">
                {NAV.map((item) => (
                  <Link
                    key={item.path}
                    href={item.path}
                    className="label rounded-full px-4 py-2.5 text-muted transition-colors hover:text-text"
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </header>

        <div className="wrap relative z-20 mt-2">
          <MatchdayRail />
        </div>

        <main className="wrap flex-1 pb-safe lg:pb-12">{children}</main>

        <LayoutFooter />

        <BottomNav />
      </div>
    </>
  );
}