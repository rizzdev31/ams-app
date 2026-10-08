'use client';

import { useEffect, useState } from 'react';
import type { ApiResponse, Player, Team } from '@/lib/types';
import { positionLabel } from '@/lib/utils';
import { toast } from '@/components/Toast';

const POSITIONS = ['GK', 'DF', 'MF', 'FW'];

export default function PemainPanitia() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamId, setTeamId] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [position, setPosition] = useState('');
  const [editing, setEditing] = useState<Player | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const me = await fetch('/api/auth/check', { cache: 'no-store' });
        const meData = await me.json().catch(() => ({}));
        if (!me.ok || meData?.data?.role !== 'superadmin') {
          setAllowed(false);
          return;
        }
        setAllowed(true);
        const t = await fetch('/api/teams', { cache: 'no-store' });
        const tData: ApiResponse<Team[]> = await t.json().catch(() => ({}));
        if (tData.success && tData.data) {
          const sorted = [...tData.data].sort((a, b) => a.name.localeCompare(b.name));
          setTeams(sorted);
          if (sorted[0]) setTeamId(sorted[0].id);
        }
      } catch {
        setAllowed(false);
      }
    };
    init();
  }, []);

  const loadPlayers = async (id: string) => {
    if (!id) {
      setPlayers([]);
      return;
    }
    try {
      const res = await fetch(`/api/players?team_id=${id}`, { cache: 'no-store' });
      const data: ApiResponse<Player[]> = await res.json().catch(() => ({}));
      if (data.success && data.data) setPlayers(data.data);
    } catch {
      setMessage('Gagal memuat pemain.');
    }
  };

  useEffect(() => {
    if (allowed) loadPlayers(teamId);
  }, [teamId, allowed]);

  const resetForm = () => {
    setName('');
    setNumber('');
    setPosition('');
    setEditing(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const isEdit = Boolean(editing);
    try {
      const res = await fetch(editing ? `/api/players/${editing.id}` : '/api/players', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: teamId,
          name: name.trim(),
          jersey_number: number === '' ? null : Number(number),
          position: position === '' ? null : position,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errMsg = data.error || 'Gagal menyimpan pemain.';
        setMessage(errMsg);
        toast.error(errMsg);
        return;
      }
      resetForm();
      loadPlayers(teamId);
      toast.success(isEdit ? 'Data pemain berhasil diperbarui!' : 'Pemain baru berhasil ditambahkan!');
    } catch {
      setMessage('Kesalahan jaringan.');
      toast.error('Kesalahan jaringan.');
    }
  };

  const handleDelete = async (p: Player) => {
    if (!window.confirm(`Hapus ${p.name} dari skuad?`)) return;
    try {
      const res = await fetch(`/api/players/${p.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const errMsg = data.error || 'Gagal menghapus pemain.';
        setMessage(errMsg);
        toast.error(errMsg);
        return;
      }
      loadPlayers(teamId);
      toast.success(`Pemain ${p.name} berhasil dihapus.`);
    } catch {
      setMessage('Kesalahan jaringan.');
      toast.error('Kesalahan jaringan.');
    }
  };

  if (allowed === null) {
    return <div className="h-40 animate-skeleton rounded-[28px] bg-raise" />;
  }

  if (!allowed) {
    return <p className="panel px-5 py-8 text-muted">Halaman ini hanya untuk superadmin.</p>;
  }

  const input =
    'h-12 w-full rounded-full border border-line bg-surface px-4 text-base text-text outline-none transition-colors focus:border-blue';

  return (
    <div className="space-y-6">
      <h1 className="rule-title font-display text-3xl font-extrabold">Pemain</h1>

      {message && (
        <p className="rounded-full border border-danger/40 bg-danger/10 px-5 py-3 text-sm text-danger">
          {message}
        </p>
      )}

      <div>
        <label htmlFor="p-team" className="label mb-1.5 block text-muted">
          Tim
        </label>
        <select
          id="p-team"
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          className={`${input} max-w-md`}
        >
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.category ?? '-'})
            </option>
          ))}
        </select>
      </div>

      <form onSubmit={handleSubmit} className="panel px-5 py-4">
        <h2 className="font-display text-xl font-extrabold">
          {editing ? 'Ubah pemain' : 'Tambah pemain'}
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="p-name" className="label block text-muted">
              Nama pemain
            </label>
            <input
              id="p-name"
              type="text"
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`${input} mt-1.5`}
            />
          </div>
          <div>
            <label htmlFor="p-num" className="label block text-muted">
              Nomor punggung
            </label>
            <input
              id="p-num"
              type="number"
              min={0}
              max={99}
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="Opsional"
              className={`${input} mt-1.5`}
            />
          </div>
          <div>
            <label htmlFor="p-pos" className="label block text-muted">
              Posisi
            </label>
            <select
              id="p-pos"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              className={`${input} mt-1.5`}
            >
              <option value="">Tanpa posisi</option>
              {POSITIONS.map((p) => (
                <option key={p} value={p}>
                  {p} — {positionLabel(p)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          {editing && (
            <button
              type="button"
              onClick={resetForm}
              className="label h-12 flex-1 rounded-full border border-line"
            >
              Batal
            </button>
          )}
          <button type="submit" className="label h-12 flex-1 rounded-full bg-blue text-ink">
            Simpan
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-[28px] border border-line">
        {players.length === 0 ? (
          <p className="bg-surface px-5 py-6 text-muted">Belum ada pemain di tim ini.</p>
        ) : (
          players.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-4 border-b border-line bg-surface px-5 py-3 last:border-0"
            >
              <span className="num w-10 flex-none text-2xl text-blue">
                {p.jersey_number ?? '–'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold">{p.name}</span>
                <span className="label text-muted">{positionLabel(p.position)}</span>
              </span>
              <button
                onClick={() => {
                  setEditing(p);
                  setName(p.name);
                  setNumber(p.jersey_number?.toString() ?? '');
                  setPosition(p.position ?? '');
                }}
                className="label h-11 rounded-full border border-line px-4"
              >
                Ubah
              </button>
              <button
                onClick={() => handleDelete(p)}
                className="label h-11 rounded-full border border-danger/40 px-4 text-danger"
              >
                Hapus
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}