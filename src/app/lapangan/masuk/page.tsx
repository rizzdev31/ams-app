'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from '@/components/Toast';

function LapanganLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTarget = searchParams.get('target') === 'field_2' ? 'field_2' : 'field_1';
  const fromPath = searchParams.get('from');

  const [targetField, setTargetField] = useState<'field_1' | 'field_2'>(initialTarget);
  const [passcode, setPasscode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fromPath === '/lapangan/2') {
      setTargetField('field_2');
    } else if (fromPath === '/lapangan/1') {
      setTargetField('field_1');
    }
  }, [fromPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) {
      const msg = 'Masukkan kode akses lapangan.';
      setError(msg);
      toast.warning(msg);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target: targetField,
          passcode: passcode.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        const errMsg = json.error || 'Kode akses tidak cocok. Hubungi panitia turnamen.';
        setError(errMsg);
        toast.error(errMsg);
        return;
      }

      toast.success('Kode akses terverifikasi! Masuk ke konsol...');
      // Sukses! Redirect ke lapangan tujuan
      const destination =
        fromPath && fromPath.startsWith('/lapangan')
          ? fromPath
          : targetField === 'field_1'
          ? '/lapangan/1'
          : '/lapangan/2';

      router.push(destination);
      router.refresh();
    } catch {
      const connErr = 'Gagal menghubungkan ke server keamanan. Periksa koneksi internet.';
      setError(connErr);
      toast.error(connErr);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between py-8 px-4 sm:px-6 relative overflow-hidden select-none">
      {/* Background Cyber Accents */}
      <div className="absolute top-0 -left-20 w-80 h-80 bg-blue-600/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 -right-20 w-80 h-80 bg-emerald-500/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Header Kecil */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between text-xs font-mono text-slate-400">
        <Link href="/" className="hover:text-white transition-colors flex items-center gap-1.5">
          <span>←</span>
          <span>Beranda Publik</span>
        </Link>
        <span className="px-2.5 py-0.5 rounded-full border border-slate-800 bg-slate-900/80 text-cyan-400 font-bold">
          SECURE GATEWAY
        </span>
      </div>

      {/* Main Card */}
      <main className="max-w-md w-full mx-auto my-auto relative z-10">
        <div className="rounded-[28px] border-2 border-slate-800 bg-slate-900/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Logo & Badge Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-blue-600/20 to-emerald-500/20 border border-slate-700 shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logoutama.png"
                alt="Logo An-Nur"
                className="h-12 w-auto object-contain filter drop-shadow"
              />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white font-display tracking-tight">
              Konsol Petugas Lapangan
            </h1>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              Halaman ini dienkripsi & dilindungi untuk wasit dan pencatat skor pertandingan An-Nur Mini Soccer 2026.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Tab Pemilih Lapangan 1 vs 2 */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-2">
                Pilih Lapangan Tugas:
              </label>
              <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-slate-950 border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setTargetField('field_1');
                    setError(null);
                  }}
                  className={`py-2.5 px-3 rounded-xl font-display text-xs font-black transition-all flex items-center justify-center gap-2 ${
                    targetField === 'field_1'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-blue-300" />
                  <span>Lapangan 1</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTargetField('field_2');
                    setError(null);
                  }}
                  className={`py-2.5 px-3 rounded-xl font-display text-xs font-black transition-all flex items-center justify-center gap-2 ${
                    targetField === 'field_2'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-300" />
                  <span>Lapangan 2</span>
                </button>
              </div>
            </div>

            {/* Input Passcode */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="passcode-input"
                  className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold"
                >
                  Kode Akses {targetField === 'field_1' ? 'Lapangan 1' : 'Lapangan 2'}:
                </label>
                <span className="text-[10px] text-cyan-400 font-mono">Diberikan oleh Panitia</span>
              </div>
              <div className="relative">
                <input
                  id="passcode-input"
                  type="password"
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Contoh: LAP1-2026"
                  autoComplete="current-password"
                  autoFocus
                  className="w-full h-13 px-4 rounded-xl border border-slate-700 bg-slate-950 text-white font-mono text-center text-lg tracking-widest placeholder:tracking-normal placeholder:text-slate-600 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all uppercase"
                />
              </div>
            </div>

            {/* Pesan Error */}
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center font-medium">
                ⚠️ {error}
              </div>
            )}

            {/* Tombol Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full h-12 rounded-xl font-display font-black text-sm tracking-wide transition-all shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] ${
                targetField === 'field_1'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-blue-500/25'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/25'
              } ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Memverifikasi Sandi…</span>
                </>
              ) : (
                <>
                  <span>Buka Konsol {targetField === 'field_1' ? 'Lapangan 1' : 'Lapangan 2'}</span>
                  <span>➔</span>
                </>
              )}
            </button>
          </form>

          {/* Alternatif Login Panitia */}
          <div className="pt-2 border-t border-slate-800 text-center space-y-2">
            <p className="text-xs text-slate-400">
              Anda panitia inti atau superadmin?
            </p>
            <Link
              href="/panitia/masuk"
              className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              <span>🔑</span>
              <span>Masuk dengan Akun Panitia / Superadmin</span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="max-w-md w-full mx-auto text-center text-[11px] font-mono text-slate-400 pt-4">
        Turnamen Resmi An-Nur Mini Soccer 2026 · Proteksi Sesi Terenkripsi
      </footer>
    </div>
  );
}

export default function LapanganMasukPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs font-mono">
          Memuat Gerbang Keamanan Lapangan…
        </div>
      }
    >
      <LapanganLoginForm />
    </Suspense>
  );
}
