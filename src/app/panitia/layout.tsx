'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

const TABS = [
  { name: 'Skor', path: '/panitia' },
  { name: 'Jadwal', path: '/panitia/jadwal' },
  { name: 'Tim', path: '/panitia/tim' },
];

const MORE = [
  { name: 'Pemain', path: '/panitia/pemain', superadmin: true },
  { name: 'Pengaturan', path: '/panitia/pengaturan' },
  { name: 'Pengguna', path: '/panitia/pengguna', superadmin: true },
];

export default function PanitiaLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ username: string; role: string } | null>(null);

  const isMasukPage = pathname === '/panitia/masuk';

  useEffect(() => {
    if (isMasukPage) {
      setIsLoading(false);
      return;
    }

    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/check', { cache: 'no-store' });
        if (res.ok) {
          setIsAuthenticated(true);
          const data = await res.json().catch(() => ({}));
          if (data?.data) setCurrentUser(data.data);
        } else {
          window.location.replace('/panitia/masuk');
          return;
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        window.location.replace('/panitia/masuk');
        return;
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    const refreshId = window.setInterval(() => {
      fetch('/api/auth/check', { cache: 'no-store' }).catch(() => {});
    }, 30 * 60 * 1000);
    const onVisible = () => {
      if (!document.hidden) fetch('/api/auth/check', { cache: 'no-store' }).catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(refreshId);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [router, isMasukPage]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      window.location.href = '/panitia/masuk';
    }
  };

  if (isMasukPage) return <>{children}</>;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-ink p-6 text-center">
        <p className="text-sm text-muted">Sesi berakhir atau belum masuk.</p>
        <button
          onClick={handleLogout}
          className="label inline-flex h-12 items-center rounded-full bg-blue px-6 text-ink hover:opacity-90 transition-opacity"
        >
          Ke halaman masuk
        </button>
      </div>
    );
  }

  const visibleMore = MORE.filter((l) => !l.superadmin || currentUser?.role === 'superadmin');

  return (
    <div className="min-h-screen bg-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-md">
        <div className="wrap flex h-14 items-center justify-between gap-3">
          <Link href="/panitia" className="flex items-center gap-2.5 font-display text-[17px] font-extrabold">
            <Image
              src="/logoutama.png"
              alt="Logo An-Nur"
              width={26}
              height={34}
              className="h-7 w-auto flex-none object-contain"
            />
            Panitia
          </Link>
          <div className="flex items-center gap-3">
            {currentUser && (
              <span className="label text-muted">
                {currentUser.username} · {currentUser.role}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="label h-9 rounded-full border border-danger/40 px-4 text-danger"
            >
              Keluar
            </button>
          </div>
        </div>
        <nav aria-label="Tab panitia" className="wrap">
          <div className="flex gap-1 overflow-x-auto">
            {[...TABS, ...visibleMore].map((link) => {
              const isActive =
                pathname === link.path ||
                (link.path !== '/panitia' && pathname.startsWith(link.path));
              return (
                <Link
                  key={link.path}
                  href={link.path}
                  aria-current={isActive ? 'page' : undefined}
                  className={`label shrink-0 border-b-2 px-4 py-3 transition-colors ${
                    isActive
                      ? 'border-blue text-text'
                      : 'border-transparent text-muted hover:text-text'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      <main className="wrap py-6">{children}</main>
    </div>
  );
}