'use client';

import { useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function UpdateSkorLoginForm() {
  const router = useRouter();
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setError('Masukkan kode akses update skor.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: 'scorer',
          passcode: passcode.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || 'Kode akses tidak cocok. Hubungi panitia turnamen.');
        return;
      }

      router.push('/updateskor');
      router.refresh();
    } catch {
      setError('Gagal menghubungkan ke server keamanan. Periksa koneksi internet.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between py-8 px-4 sm:px-6 relative overflow-hidden select-none">
      {/* Background Cyber Accents */}
      <div className="absolute top-0 -left-20 w-80 h-80 bg-amber-500/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 -right-20 w-80 h-80 bg-rose-500/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Header Kecil */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between text-xs font-mono text-slate-400">
        <Link href="/" className="hover:text-white transition-colors flex items-center gap-1.5">
          <span>←</span>
          <span>Beranda Publik</span>
        </Link>
        <span className="px-2.5 py-0.5 rounded-full border border-slate-800 bg-slate-900/80 text-amber-400 font-bold">
          PANITIA ONLY
        </span>
      </div>

      {/* Main Card */}
      <main className="max-w-md w-full mx-auto my-auto relative z-10">
        <div className="rounded-[28px] border-2 border-slate-800 bg-slate-900/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Logo & Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-rose-500/20 border border-slate-700 shadow-inner">
              <span className="text-3xl">⏱️</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white font-display tracking-tight">
              Papan Update Skor Panitia
            </h1>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              Konsol sentral wasit & panitia untuk mengontrol skor seluruh pertandingan live An-Nur Mini Soccer 2026.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="scorer-passcode"
                  className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold"
                >
                  Kode Akses Wasit / Panitia:
                </label>
                <span className="text-[10px] text-amber-400 font-mono">Terenkripsi</span>
              </div>
              <input
                id="scorer-passcode"
                type="password"
                value={passcode}
                onChange={(e) => {
                  setPasscode(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Contoh: WASIT-2026"
                autoComplete="current-password"
                autoFocus
                className="w-full h-13 px-4 rounded-xl border border-slate-700 bg-slate-950 text-white font-mono text-center text-lg tracking-widest placeholder:tracking-normal placeholder:text-slate-600 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all uppercase"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center font-medium">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full h-12 rounded-xl font-display font-black text-sm tracking-wide transition-all shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white shadow-amber-500/25 ${
                loading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Memverifikasi Sandi…</span>
                </>
              ) : (
                <>
                  <span>Buka Papan Update Skor</span>
                  <span>➔</span>
                </>
              )}
            </button>
          </form>

          {/* Alternatif Login Panitia / Superadmin */}
          <div className="pt-2 border-t border-slate-800 text-center space-y-2">
            <p className="text-xs text-slate-400">
              Atau masuk menggunakan akun resmi:
            </p>
            <Link
              href="/panitia/masuk"
              className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400 hover:text-amber-300 transition-colors"
            >
              <span>🔑</span>
              <span>Login Panitia / Superadmin Portal</span>
            </Link>
          </div>
        </div>
      </main>

      <footer className="max-w-md w-full mx-auto text-center text-[11px] font-mono text-slate-400 pt-4">
        Turnamen Resmi An-Nur Mini Soccer 2026 · Proteksi Sesi Terenkripsi
      </footer>
    </div>
  );
}

export default function UpdateSkorMasukPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs font-mono">
          Memuat Gerbang Keamanan Skor…
        </div>
      }
    >
      <UpdateSkorLoginForm />
    </Suspense>
  );
}
