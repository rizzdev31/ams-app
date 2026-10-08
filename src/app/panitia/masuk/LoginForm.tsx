'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const from = useSearchParams().get('from');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        const dest = from && from.startsWith('/') && !from.startsWith('//') ? from : '/panitia';
        window.location.href = dest;
        return;
      }

      const data = await res.json().catch(() => ({}));
      setError(data?.error || 'Nama pengguna atau kata sandi salah.');
    } catch {
      setError('Tidak dapat menghubungi server. Coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const input =
    'h-12 w-full rounded-full border border-line bg-surface px-5 text-base text-text outline-none transition-colors focus:border-blue';

  return (
    <div className="w-full max-w-[360px]">
      <p className="label text-blue">Masuk Panitia</p>
      <h1 className="mt-2 font-display text-4xl font-extrabold">An-Nur</h1>

      <form onSubmit={handleLogin} className="mt-7">
        <label htmlFor="username" className="label mb-1.5 block text-muted">
          Nama pengguna
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoFocus
          className={input}
        />

        <label htmlFor="password" className="label mb-1.5 mt-4 block text-muted">
          Kata sandi
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className={input}
        />
        {error && (
          <p role="alert" className="mt-3 flex items-center gap-2 text-sm text-danger">
            <svg
              className="h-5 w-5 flex-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading || password.length === 0 || username.trim().length === 0}
          className="mt-6 h-14 w-full rounded-full bg-blue font-display text-base font-bold uppercase text-ink disabled:opacity-50"
        >
          {isLoading ? 'Memeriksa…' : 'Masuk'}
        </button>
      </form>

      <Link href="/" className="label mt-6 inline-block text-muted hover:text-blue">
        ← Kembali ke jadwal
      </Link>
    </div>
  );
}