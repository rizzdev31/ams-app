'use client';

import { useEffect, useState } from 'react';

interface AdminUserRow {
  id: string;
  username: string;
  role: string;
  active: boolean;
  created_at: string;
}

export default function PenggunaPage() {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ username: '', password: '', role: 'admin' });
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = async () => {
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || `Gagal memuat daftar pengguna (HTTP ${res.status}).`);
        return;
      }
      setUsers(data.data ?? []);
      setError(null);
    } catch {
      setError('Tidak dapat memuat daftar pengguna.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Gagal membuat pengguna.' });
        return;
      }
      setMessage({ type: 'success', text: `Pengguna "${form.username}" dibuat.` });
      setForm({ username: '', password: '', role: 'admin' });
      await load();
    } catch {
      setMessage({ type: 'error', text: 'Tidak dapat terhubung ke server.' });
    } finally {
      setCreating(false);
    }
  };

  const patch = async (id: string, role: string, active: boolean) => {
    setMessage(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, role, active }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Gagal memperbarui.' });
        return;
      }
      await load();
    } catch {
      setMessage({ type: 'error', text: 'Tidak dapat terhubung ke server.' });
    }
  };

  const remove = async (id: string, username?: string) => {
    if (!window.confirm(`Hapus pengguna "${username ?? id}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Gagal menghapus.' });
        return;
      }
      await load();
    } catch {
      setMessage({ type: 'error', text: 'Tidak dapat terhubung ke server.' });
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 font-display text-3xl font-bold uppercase tracking-wide text-text">Kelola Pengguna</h1>
      <p className="mb-6 text-sm text-muted">Khusus superadmin. Buat, ubah role, nonaktifkan, atau hapus akun.</p>

      {error && <p className="mb-4 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">{error}</p>}
      {message && (
        <p className={`mb-4 rounded-full border px-4 py-2 text-sm ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-danger/40 bg-danger/10 text-danger'}`}>
          {message.text}
        </p>
      )}

      <form onSubmit={create} className="mb-8 grid gap-3 rounded-[28px] border border-line bg-surface p-5 sm:grid-cols-4">
        <input
          className="rounded-full border border-line px-3 py-2 text-sm"
          placeholder="Username"
          value={form.username}
          onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
          autoComplete="off"
        />
        <input
          className="rounded-full border border-line px-3 py-2 text-sm"
          type="password"
          placeholder="Password (min 8)"
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
          autoComplete="new-password"
        />
        <select
          className="rounded-full border border-line px-3 py-2 text-sm"
          value={form.role}
          onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
        >
          <option value="admin">Admin</option>
          <option value="superadmin">Superadmin</option>
        </select>
        <button
          type="submit"
          disabled={creating || !form.username.trim() || form.password.length < 8}
          className="rounded-full bg-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {creating ? 'Memproses…' : 'Tambah'}
        </button>
      </form>

      <div className="overflow-hidden rounded-[28px] border border-line bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-surface">
            <tr className="text-left text-muted">
              <th className="px-4 py-3 font-medium">Username</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Aktif</th>
              <th className="px-4 py-3 font-medium">Dibuat</th>
              <th className="px-4 py-3 font-medium text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-medium text-text">{u.username}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.role === 'superadmin' ? 'bg-blue/15 text-blue' : 'bg-blue/15 text-blue'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">{u.active ? <span className="text-emerald-600">Ya</span> : <span className="text-red-500">Tidak</span>}</td>
                <td className="px-4 py-3 text-muted">{u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID') : '-'}</td>
                <td className="px-4 py-3 text-right space-x-1">
                  <button onClick={() => patch(u.id, u.role === 'superadmin' ? 'admin' : 'superadmin', u.active)} className="rounded-full border border-line px-2 py-1 text-xs hover:bg-surface">
                    Tukar role
                  </button>
                  <button onClick={() => patch(u.id, u.role, !u.active)} className="rounded-full border border-line px-2 py-1 text-xs hover:bg-surface">
                    {u.active ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                  <button onClick={() => remove(u.id, u.username)} className="rounded-full border border-danger/40 px-2 py-1 text-xs text-danger hover:bg-danger/10">
                    Hapus
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td className="px-4 py-6 text-center text-muted" colSpan={5}>Belum ada pengguna.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
