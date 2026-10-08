'use client';

import { useState, useMemo } from 'react';
import type { MatchWithTeams, MatchFormData, MatchStage } from '@/lib/types';
import { formatShortDate, formatTime, todayWIB, getMatchPartai } from '@/lib/utils';
import {
  announceChangeEverywhere,
  matchesStore,
  teamsStore,
  useResource,
} from '@/lib/live-store';
import CategoryMark from '@/components/CategoryMark';
import StatusBadge from '@/components/StatusBadge';
import KnockoutBracket from '@/components/KnockoutBracket';
import Monogram from '@/components/Monogram';

export default function JadwalPanitia() {
  // Sebelumnya halaman ini hanya memuat SEKALI saat dibuka. Kalau committee
  // mengubah jadwal dari perangkat lain, daftar di sini tidak pernah bergerak.
  const [allMatches, online, reload] = useResource(matchesStore);
  const [teams] = useResource(teamsStore);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingMatch, setDeletingMatch] = useState<MatchWithTeams | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'bracket'>('list');
  const [bracketCategory, setBracketCategory] = useState<'U10' | 'U12'>('U10');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);

  const [formData, setFormData] = useState<MatchFormData>({
    team_a_id: '',
    team_b_id: '',
    match_date: todayWIB(),
    kickoff_time: '19:00',
    field: '1',
    stage: 'grup',
    group_name: '',
    category: 'U10',
  });

  const matches = useMemo(
    () =>
      [...allMatches].sort((a, b) => {
        if (a.match_date !== b.match_date) return a.match_date.localeCompare(b.match_date);
        const timeComp = (a.kickoff_time || '').localeCompare(b.kickoff_time || '');
        if (timeComp !== 0) return timeComp;
        return (a.field || '').localeCompare(b.field || '');
      }),
    [allMatches]
  );

  const isLoading = allMatches.length === 0 && !online;

  const categoryTeams = teams.filter((t) => (t.category ?? 'U10') === formData.category);

  const clash = matches.find(
    (m) =>
      m.id !== editingId &&
      m.match_date === formData.match_date &&
      m.kickoff_time.slice(0, 5) === formData.kickoff_time.slice(0, 5) &&
      m.field === formData.field
  );

  const setCategory = (category: string) => {
    setFormData((f) => ({ ...f, category, team_a_id: '', team_b_id: '', group_name: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.team_a_id === formData.team_b_id) {
      setMessage({ type: 'error', text: 'Tim A dan Tim B tidak boleh sama.' });
      return;
    }
    try {
      const url = editingId ? `/api/matches/${editingId}` : '/api/matches';
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        closeForm();
        void matchesStore.refresh();
        announceChangeEverywhere();
        setMessage({
          type: 'success',
          text: editingId ? 'Jadwal berhasil diperbarui.' : 'Jadwal berhasil ditambahkan.',
        });
      } else {
        const err = await res.json().catch(() => ({}));
        setMessage({ type: 'error', text: err.error || 'Gagal menyimpan jadwal.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Kesalahan jaringan, coba lagi.' });
    }
  };

  const confirmDelete = async () => {
    if (!deletingMatch) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/matches/${deletingMatch.id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeletingMatch(null);
        void matchesStore.refresh();
        announceChangeEverywhere();
        setMessage({ type: 'success', text: 'Pertandingan berhasil dihapus.' });
      } else {
        const err = await res.json().catch(() => ({}));
        setMessage({ type: 'error', text: err.error || 'Gagal menghapus pertandingan.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Kesalahan jaringan saat menghapus.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSyncBracket = async (cat: 'U10' | 'U12') => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/matches/bracket-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: cat }),
      });
      const data = await res.json();
      if (res.ok) {
        void matchesStore.refresh();
        announceChangeEverywhere();
        setMessage({
          type: 'success',
          text: `⚡ Bagan ${cat} berhasil disinkronkan! ${data.message || ''}`,
        });
        setSyncModalOpen(false);
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Gagal menyinkronkan bagan babak gugur.',
        });
      }
    } catch {
      setMessage({
        type: 'error',
        text: 'Kesalahan jaringan saat sinkronisasi bagan.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const openForm = (match?: MatchWithTeams) => {
    if (match) {
      setEditingId(match.id);
      const cat = match.category ?? (match.field === '2' ? 'U12' : 'U10');
      setFormData({
        team_a_id: match.team_a_id,
        team_b_id: match.team_b_id,
        match_date: match.match_date,
        kickoff_time: match.kickoff_time,
        field: match.field,
        stage: match.stage,
        group_name: match.group_name || '',
        category: cat,
      });
    } else {
      setEditingId(null);
      const u10 = teams.filter((t) => (t.category ?? 'U10') === 'U10');
      setFormData({
        team_a_id: u10[0]?.id ?? '',
        team_b_id: u10[1]?.id ?? '',
        match_date: todayWIB(),
        kickoff_time: '19:00',
        field: '1',
        stage: 'grup',
        group_name: '',
        category: 'U10',
      });
    }
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  if (isLoading) {
    return <div className="h-40 animate-skeleton rounded-[28px] bg-raise" />;
  }

  const grouped = matches.reduce(
    (acc, m) => {
      if (!acc[m.match_date]) acc[m.match_date] = [];
      acc[m.match_date].push(m);
      return acc;
    },
    {} as Record<string, MatchWithTeams[]>
  );

  const input =
    'h-12 w-full rounded-full border border-line bg-surface px-4 text-base text-text outline-none transition-colors focus:border-blue';

  return (
    <div className="space-y-6">
      {!online && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-full border border-danger/40 bg-danger/10 px-5 py-3">
          <p className="text-sm text-danger">Data tidak dapat dimuat.</p>
          <button onClick={reload} className="label text-text">
            Coba lagi
          </button>
        </div>
      )}
      {message && (
        <p
          className={`rounded-full border border-line px-5 py-3 text-sm ${
            message.type === 'success' ? 'text-blue' : 'text-danger'
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="rule-title font-display text-3xl font-extrabold">Jadwal & Bagan</h1>
          <p className="mt-1 text-sm text-muted">Kelola jadwal babak grup dan bagan fase gugur turnamen</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSyncModalOpen(true)}
            className="label flex h-12 items-center gap-2 rounded-full border border-blue/40 bg-blue/10 px-5 text-blue transition-colors hover:bg-blue/20"
          >
            <span>⚡</span>
            <span>Sinkronkan Bagan</span>
          </button>
          <button
            onClick={() => openForm()}
            className="label h-12 rounded-full bg-blue px-6 text-ink transition-opacity hover:opacity-90"
          >
            + Tambah pertandingan
          </button>
        </div>
      </div>

      {/* Switch View Mode: Daftar vs Bagan */}
      <div className="flex items-center gap-2 border-b border-line pb-4">
        <div className="pill gap-0.5 p-1" role="group" aria-label="Mode Tampilan">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            aria-pressed={viewMode === 'list'}
            className={`label rounded-full px-5 py-2.5 transition-colors ${
              viewMode === 'list' ? 'bg-text text-ink' : 'text-muted hover:text-text'
            }`}
          >
            📋 Daftar Pertandingan
          </button>
          <button
            type="button"
            onClick={() => setViewMode('bracket')}
            aria-pressed={viewMode === 'bracket'}
            className={`label rounded-full px-5 py-2.5 transition-colors ${
              viewMode === 'bracket' ? 'bg-text text-ink' : 'text-muted hover:text-text'
            }`}
          >
            🌳 Bagan Babak Gugur (Bracket)
          </button>
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <h2 className="font-display text-xl font-extrabold">
                {editingId ? 'Ubah jadwal' : 'Tambah jadwal'}
              </h2>
              <button onClick={closeForm} className="label h-9 px-3 text-muted" aria-label="Tutup">
                Tutup
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
              <div>
                <span className="label block text-muted">Kategori</span>
                <div className="pill mt-1.5 w-full gap-0.5 p-1" role="group" aria-label="Kategori">
                  {['U10', 'U12'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      aria-pressed={formData.category === c}
                      className={`label h-11 flex-1 rounded-full ${
                        formData.category === c ? 'bg-text text-ink' : 'text-muted'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="label block text-muted">Lapangan</span>
                <div className="pill mt-1.5 w-full gap-0.5 p-1" role="group" aria-label="Lapangan">
                  {['1', '2'].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, field: f }))}
                      aria-pressed={formData.field === f}
                      className={`label h-11 flex-1 rounded-full ${
                        formData.field === f ? 'bg-text text-ink' : 'text-muted'
                      }`}
                    >
                      Lapangan {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="f-date" className="label block text-muted">
                    Tanggal
                  </label>
                  <input
                    id="f-date"
                    type="date"
                    required
                    value={formData.match_date}
                    onChange={(e) => setFormData({ ...formData, match_date: e.target.value })}
                    className={`${input} mt-1.5`}
                  />
                </div>
                <div>
                  <label htmlFor="f-time" className="label block text-muted">
                    Jam
                  </label>
                  <input
                    id="f-time"
                    type="time"
                    required
                    value={formData.kickoff_time}
                    onChange={(e) => setFormData({ ...formData, kickoff_time: e.target.value })}
                    className={`${input} mt-1.5`}
                  />
                </div>
              </div>

              {clash && (
                <p role="alert" className="rounded-full border border-danger/40 bg-danger/10 px-4 py-2.5 text-sm text-danger">
                  Bentrok dengan {clash.team_a?.short_name}–{clash.team_b?.short_name} jam{' '}
                  {formatTime(clash.kickoff_time)} di lapangan yang sama.
                </p>
              )}

              <div>
                <label htmlFor="f-teama" className="label block text-muted">
                  Tim A ({formData.category})
                </label>
                <select
                  id="f-teama"
                  required
                  value={formData.team_a_id}
                  onChange={(e) => setFormData({ ...formData, team_a_id: e.target.value })}
                  className={`${input} mt-1.5`}
                >
                  <option value="">Pilih tim A</option>
                  {categoryTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="f-teamb" className="label block text-muted">
                  Tim B ({formData.category})
                </label>
                <select
                  id="f-teamb"
                  required
                  value={formData.team_b_id}
                  onChange={(e) => setFormData({ ...formData, team_b_id: e.target.value })}
                  className={`${input} mt-1.5`}
                >
                  <option value="">Pilih tim B</option>
                  {categoryTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="f-stage" className="label block text-muted">
                    Fase
                  </label>
                  <select
                    id="f-stage"
                    value={formData.stage}
                    onChange={(e) => setFormData({ ...formData, stage: e.target.value as MatchStage })}
                    className={`${input} mt-1.5`}
                  >
                    <option value="grup">Babak Grup</option>
                    <option value="perempat_final">8 Besar (Perempat Final)</option>
                    <option value="semifinal">Semifinal</option>
                    <option value="juara_3">Perebutan Juara 3</option>
                    <option value="final">Final</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="f-group" className="label block text-muted">
                    Grup
                  </label>
                  <select
                    id="f-group"
                    value={formData.group_name || ''}
                    onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                    className={`${input} mt-1.5`}
                  >
                    <option value="">Tanpa grup (Fase Gugur)</option>
                    {(formData.category === 'U12' ? ['W', 'X', 'Y', 'Z'] : ['A', 'B', 'C', 'D']).map((g) => (
                      <option key={g} value={g}>
                        Grup {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeForm}
                  className="label h-12 flex-1 rounded-full border border-line"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="label h-12 flex-1 rounded-full bg-blue text-ink"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewMode === 'bracket' ? (
        <div className="space-y-6">
          <div className="panel flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <span className="label block text-muted">Kategori Bagan</span>
              <div className="pill mt-2 gap-0.5 p-1" role="group" aria-label="Pilih Kategori">
                {(['U10', 'U12'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setBracketCategory(cat)}
                    aria-pressed={bracketCategory === cat}
                    className={`label rounded-full px-5 py-2 transition-colors ${
                      bracketCategory === cat ? 'bg-blue text-ink' : 'text-muted hover:text-text'
                    }`}
                  >
                    {cat} ({cat === 'U10' ? "Jum'at, 9 Okt" : 'Sabtu, 10 Okt'})
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                disabled={isSyncing}
                onClick={() => handleSyncBracket(bracketCategory)}
                className="label flex h-11 items-center gap-2 rounded-full bg-blue px-5 text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <span>⚡</span>
                <span>{isSyncing ? 'Menyinkronkan…' : `Update Bagan ${bracketCategory} dari Klasemen`}</span>
              </button>
            </div>
          </div>

          <KnockoutBracket
            matches={matches.filter((m) => (m.category ?? 'U10') === bracketCategory)}
            category={bracketCategory}
            teams={teams}
          />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <p className="panel px-5 py-8 text-muted">Belum ada jadwal pertandingan.</p>
      ) : (
        <div className="space-y-8">
          {Object.keys(grouped)
            .sort()
            .map((date) => (
              <section key={date} aria-label={formatShortDate(date)}>
                <h2 className="rule-title font-display text-xl font-extrabold">
                  {formatShortDate(date)}
                </h2>
                <div className="mt-3 overflow-hidden rounded-[28px] border border-line">
                  {grouped[date].map((m) => {
                    const partai = getMatchPartai(m);
                    return (
                      <div
                        key={m.id}
                        className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-5 py-3.5 last:border-0 hover:bg-raise/30 transition-colors"
                      >
                        <span className="w-16 flex-none font-mono text-xs font-bold text-blue">
                          {partai.label}
                        </span>
                        <span className="w-14 flex-none font-mono text-xs text-muted">
                          {formatTime(m.kickoff_time)}
                        </span>
                        <span className="rounded border border-line bg-surface/80 px-2 py-0.5 text-[11px] font-semibold text-text">
                          Lap {m.field}
                        </span>
                        <span className="rounded bg-line/60 px-2 py-0.5 text-[11px] font-medium text-muted">
                          {m.category} · {m.stage === 'grup' ? `Grup ${m.group_name}` : m.stage}
                        </span>
                        <span className="min-w-0 flex-1 flex items-center gap-2 font-bold text-base">
                          <Monogram
                            name={m.team_a?.name ?? 'A'}
                            shortName={m.team_a?.short_name}
                            logoUrl={m.team_a?.logo_url}
                            color={m.team_a?.color}
                            size={24}
                          />
                          <span className="truncate">{m.team_a?.name}</span>
                          <span className="font-mono text-sm px-1.5 py-0.5 rounded bg-line/80 font-bold">
                            {m.score_a}–{m.score_b}
                          </span>
                          <span className="truncate">{m.team_b?.name}</span>
                          <Monogram
                            name={m.team_b?.name ?? 'B'}
                            shortName={m.team_b?.short_name}
                            logoUrl={m.team_b?.logo_url}
                            color={m.team_b?.color}
                            size={24}
                          />
                        </span>
                        <StatusBadge status={m.status} />
                        <span className="flex gap-2">
                        <button
                          onClick={() => openForm(m)}
                          className="label h-11 rounded-full border border-line px-4"
                        >
                          Ubah
                        </button>
                        <button
                          onClick={() => setDeletingMatch(m)}
                          className="label h-11 rounded-full border border-danger/40 px-4 text-danger"
                        >
                          Hapus
                        </button>
                      </span>
                    </div>
                  );
                })}
                </div>
              </section>
            ))}
        </div>
      )}

      {deletingMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-[28px] border border-line bg-surface p-6 text-center">
            <h3 className="font-display text-xl font-extrabold">Hapus pertandingan?</h3>
            <p className="mt-2 text-sm text-muted">
              {deletingMatch.team_a?.name} lawan {deletingMatch.team_b?.name} akan dihapus
              permanen.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingMatch(null)}
                className="label h-12 flex-1 rounded-full border border-line"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="label h-12 flex-1 rounded-full bg-danger text-white"
              >
                {isDeleting ? 'Menghapus…' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {syncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-[28px] border border-line bg-surface p-6">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="flex items-center gap-2 font-display text-xl font-extrabold">
                <span>⚡</span>
                <span>Sinkronkan Bagan Babak Gugur</span>
              </h3>
              <button
                onClick={() => setSyncModalOpen(false)}
                className="label h-8 px-2 text-muted hover:text-text"
              >
                ✕
              </button>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-muted">
              Sistem akan membaca klasemen babak grup saat ini dan otomatis mengisi peserta babak gugur
              (8 Besar, Semifinal, Final, Juara 3) berdasarkan Juara & Runner-up tiap grup sesuai bagan resmi di rundown PDF.
            </p>

            <div className="mt-6 space-y-3">
              <button
                disabled={isSyncing}
                onClick={() => handleSyncBracket('U10')}
                className="flex w-full items-center justify-between rounded-2xl border border-line bg-raise/50 p-4 text-left transition-colors hover:border-blue/50 disabled:opacity-50"
              >
                <div>
                  <p className="font-bold text-text">Sinkronkan Kategori U10</p>
                  <p className="text-xs text-muted">Jum&apos;at, 9 Okt · Grup A, B, C, D</p>
                </div>
                <span className="label rounded-full bg-blue/15 px-3 py-1.5 text-xs text-blue">
                  {isSyncing ? 'Proses…' : 'Mulai →'}
                </span>
              </button>

              <button
                disabled={isSyncing}
                onClick={() => handleSyncBracket('U12')}
                className="flex w-full items-center justify-between rounded-2xl border border-line bg-raise/50 p-4 text-left transition-colors hover:border-blue/50 disabled:opacity-50"
              >
                <div>
                  <p className="font-bold text-text">Sinkronkan Kategori U12</p>
                  <p className="text-xs text-muted">Sabtu, 10 Okt · Grup W, X, Y, Z</p>
                </div>
                <span className="label rounded-full bg-blue/15 px-3 py-1.5 text-xs text-blue">
                  {isSyncing ? 'Proses…' : 'Mulai →'}
                </span>
              </button>
            </div>

            <div className="mt-6">
              <button
                type="button"
                onClick={() => setSyncModalOpen(false)}
                className="label h-11 w-full rounded-full border border-line text-muted hover:text-text"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}