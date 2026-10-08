'use client';

import { useEffect, useState, useCallback } from 'react';
import type { MatchEvent, MatchEventType, MatchWithTeams, Player } from '@/lib/types';
import { announceChangeEverywhere, matchesStore } from '@/lib/live-store';
import { toast } from '@/components/Toast';

interface MatchEventsManagerProps {
  match: MatchWithTeams;
  onMatchUpdated?: () => void;
}

export default function MatchEventsManager({ match, onMatchUpdated }: MatchEventsManagerProps) {
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [playersA, setPlayersA] = useState<Player[]>([]);
  const [playersB, setPlayersB] = useState<Player[]>([]);

  // Form mode: null (tutup form) | 'goal' | 'yellow_card' | 'red_card'
  const [mode, setMode] = useState<MatchEventType | null>(null);

  // Form states
  const [selectedTeamId, setSelectedTeamId] = useState<string>(match.team_a_id);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [customPlayerName, setCustomPlayerName] = useState<string>('');
  const [minute, setMinute] = useState<number>(1);
  const [note, setNote] = useState<string>('');
  const [autoScore, setAutoScore] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  // Load events
  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/matches/${match.id}/events`, { cache: 'no-store' });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setEvents(json.data);
      }
    } catch {
      // Abaikan
    } finally {
      setLoading(false);
    }
  }, [match.id]);

  // Load rosters tim A & tim B
  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(`/api/players?team_id=${match.team_a_id}`).then((r) => r.json()),
      fetch(`/api/players?team_id=${match.team_b_id}`).then((r) => r.json()),
    ])
      .then(([resA, resB]) => {
        if (!active) return;
        if (resA.success && Array.isArray(resA.data)) setPlayersA(resA.data);
        if (resB.success && Array.isArray(resB.data)) setPlayersB(resB.data);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [match.team_a_id, match.team_b_id]);

  useEffect(() => {
    void loadEvents();
    setSelectedTeamId(match.team_a_id);
    setMode(null);
    setMsg(null);
  }, [match.id, match.team_a_id, loadEvents]);

  const activeRoster = selectedTeamId === match.team_a_id ? playersA : playersB;

  const handleOpenForm = (type: MatchEventType) => {
    setMode(type);
    setSelectedPlayerId('');
    setCustomPlayerName('');
    setMinute(Math.max(1, events.length > 0 ? events[events.length - 1].minute : 1));
    setNote('');
    setAutoScore(type === 'goal');
    setMsg(null);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mode) return;

    let finalPlayerName = customPlayerName.trim();
    if (selectedPlayerId && selectedPlayerId !== 'manual') {
      const p = activeRoster.find((item) => item.id === selectedPlayerId);
      if (p) finalPlayerName = p.jersey_number ? `${p.name} (#${p.jersey_number})` : p.name;
    }

    if (!finalPlayerName) {
      const errMsg = 'Nama pemain wajib diisi atau dipilih dari roster.';
      setMsg({ kind: 'error', text: errMsg });
      toast.error(errMsg);
      return;
    }

    setIsSubmitting(true);
    setMsg(null);

    try {
      const res = await fetch(`/api/matches/${match.id}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: selectedTeamId,
          player_id: selectedPlayerId && selectedPlayerId !== 'manual' ? selectedPlayerId : null,
          player_name: finalPlayerName,
          type: mode,
          minute,
          note: note.trim() || null,
          auto_score: mode === 'goal' && autoScore,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menyimpan kejadian.');
      }

      const successMsg = `${mode === 'goal' ? '⚽ Gol' : mode === 'yellow_card' ? '🟨 Kartu Kuning' : '🟥 Kartu Merah'} berhasil dicatat!`;
      setMsg({
        kind: 'success',
        text: successMsg,
      });
      toast.success(successMsg);

      setMode(null);
      await loadEvents();

      if (mode === 'goal' && autoScore) {
        await matchesStore.refresh();
        announceChangeEverywhere();
        if (onMatchUpdated) onMatchUpdated();
      }
    } catch (err: unknown) {
      const errMsg = (err as Error).message || 'Terjadi kesalahan.';
      setMsg({ kind: 'error', text: errMsg });
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (event: MatchEvent) => {
    const isGoal = event.type === 'goal';
    let decrement = false;

    if (isGoal) {
      const ok = window.confirm(`Hapus catatan gol ini? Ingin otomatis mengurangi skor pertandingan sebesar 1?`);
      if (ok === null) return;
      decrement = ok;
    } else {
      const ok = window.confirm(`Hapus catatan ${event.type === 'yellow_card' ? 'kartu kuning' : 'kartu merah'} ini?`);
      if (!ok) return;
    }

    try {
      setLoading(true);
      const res = await fetch(
        `/api/matches/${match.id}/events?event_id=${event.id}${decrement ? '&decrement_score=true' : ''}`,
        { method: 'DELETE' }
      );
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Gagal menghapus');

      toast.success('Catatan kejadian pertandingan berhasil dihapus.');
      await loadEvents();
      if (decrement) {
        await matchesStore.refresh();
        announceChangeEverywhere();
        if (onMatchUpdated) onMatchUpdated();
      }
    } catch (err: unknown) {
      const errMsg = (err as Error).message || 'Gagal menghapus kejadian.';
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-t border-line px-5 py-5 space-y-4">
      {/* Header Bagian Pencatatan Kejadian */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-extrabold text-text flex items-center gap-2">
            <span>⚽</span>
            <span>Pencatatan Gol & Kartu</span>
          </h3>
          <p className="text-xs text-muted">
            Catat siapa yang mencetak gol dan pemberian kartu kuning / kartu merah.
          </p>
        </div>

        {/* Tombol Aksi Cepat */}
        <div className="grid grid-cols-3 gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => handleOpenForm('goal')}
            className={`label h-10 sm:h-9 px-2 sm:px-3.5 rounded-full border text-xs transition-colors flex items-center justify-center gap-1 font-bold ${
              mode === 'goal'
                ? 'bg-blue text-ink border-blue'
                : 'bg-surface border-line text-text hover:border-blue'
            }`}
          >
            <span>⚽</span> <span>+ Gol</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenForm('yellow_card')}
            className={`label h-10 sm:h-9 px-2 sm:px-3.5 rounded-full border text-xs transition-colors flex items-center justify-center gap-1 font-bold ${
              mode === 'yellow_card'
                ? 'bg-yellow text-ink border-yellow'
                : 'bg-surface border-line text-yellow hover:border-yellow'
            }`}
          >
            <span>🟨</span> <span>+ Kuning</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenForm('red_card')}
            className={`label h-10 sm:h-9 px-2 sm:px-3.5 rounded-full border text-xs transition-colors flex items-center justify-center gap-1 font-bold ${
              mode === 'red_card'
                ? 'bg-danger text-text border-danger'
                : 'bg-surface border-line text-danger hover:border-danger'
            }`}
          >
            <span>🟥</span> <span>+ Merah</span>
          </button>
        </div>
      </div>

      {msg && (
        <div
          className={`p-3 rounded-2xl text-xs font-semibold flex items-center justify-between ${
            msg.kind === 'success'
              ? 'bg-blue/15 text-blue border border-blue/30'
              : 'bg-danger/15 text-danger border border-danger/30'
          }`}
        >
          <span>{msg.text}</span>
          <button type="button" onClick={() => setMsg(null)} className="ml-2 text-text opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* FORM INPUT KEJADIAN (Aktif saat tombol di atas ditekan) */}
      {mode && (
        <form onSubmit={handleSaveEvent} className="rounded-2xl border border-line bg-raise/50 p-4 space-y-4 animate-reveal">
          <div className="flex items-center justify-between border-b border-line/60 pb-2.5">
            <span className="font-display text-sm font-bold text-text flex items-center gap-2">
              {mode === 'goal' ? '⚽ Form Catat Gol' : mode === 'yellow_card' ? '🟨 Form Kartu Kuning' : '🟥 Form Kartu Merah'}
            </span>
            <button
              type="button"
              onClick={() => setMode(null)}
              className="text-xs text-muted hover:text-text px-2 py-1"
            >
              Batal ✕
            </button>
          </div>

          {/* 1. Pilih Tim */}
          <div>
            <label className="label mb-1.5 block text-muted">Pilih Tim</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedTeamId(match.team_a_id);
                  setSelectedPlayerId('');
                }}
                className={`label h-11 px-3 rounded-xl border text-center truncate transition-colors ${
                  selectedTeamId === match.team_a_id
                    ? 'border-blue bg-blue/20 text-text font-bold shadow-[inset_0_0_0_1px_rgba(91,141,255,.5)]'
                    : 'border-line bg-surface text-muted hover:text-text'
                }`}
              >
                {match.team_a?.name ?? 'Tim A'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedTeamId(match.team_b_id);
                  setSelectedPlayerId('');
                }}
                className={`label h-11 px-3 rounded-xl border text-center truncate transition-colors ${
                  selectedTeamId === match.team_b_id
                    ? 'border-blue bg-blue/20 text-text font-bold shadow-[inset_0_0_0_1px_rgba(91,141,255,.5)]'
                    : 'border-line bg-surface text-muted hover:text-text'
                }`}
              >
                {match.team_b?.name ?? 'Tim B'}
              </button>
            </div>
          </div>

          {/* 2. Pilih Pemain */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label mb-1.5 block text-muted">Pilih Pemain (Roster)</label>
              <select
                value={selectedPlayerId}
                onChange={(e) => {
                  setSelectedPlayerId(e.target.value);
                  if (e.target.value !== 'manual') setCustomPlayerName('');
                }}
                className="w-full h-11 rounded-xl border border-line bg-surface px-3 text-sm text-text outline-none focus:border-blue"
              >
                <option value="">-- Pilih dari roster ({activeRoster.length} pemain) --</option>
                {activeRoster.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.jersey_number ? `#${p.jersey_number} - ` : ''}
                    {p.name}
                  </option>
                ))}
                <option value="manual">+ Ketik nama manual...</option>
              </select>
            </div>

            {/* Input Manual jika dipilih atau pemain belum terdaftar */}
            {(selectedPlayerId === 'manual' || activeRoster.length === 0 || (!selectedPlayerId && customPlayerName)) && (
              <div>
                <label className="label mb-1.5 block text-muted">Nama Pemain (Ketik Manual)</label>
                <input
                  type="text"
                  value={customPlayerName}
                  onChange={(e) => setCustomPlayerName(e.target.value)}
                  placeholder="Contoh: Budi Santoso (#10)"
                  className="w-full h-11 rounded-xl border border-line bg-surface px-3 text-sm text-text outline-none focus:border-blue"
                />
              </div>
            )}
          </div>

          {/* 3. Menit & Catatan */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label mb-1.5 block text-muted">Menit Ke- (1–60)</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMinute((m) => Math.max(1, m - 1))}
                  className="h-11 w-11 flex-none rounded-xl border border-line bg-surface text-lg font-bold"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={minute}
                  onChange={(e) => setMinute(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full h-11 rounded-xl border border-line bg-surface px-3 text-center font-mono text-base font-bold text-text outline-none focus:border-blue"
                />
                <button
                  type="button"
                  onClick={() => setMinute((m) => m + 1)}
                  className="h-11 w-11 flex-none rounded-xl border border-line bg-surface text-lg font-bold"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="label mb-1.5 block text-muted">Catatan (Opsional)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={mode === 'goal' ? 'Contoh: Penalti / Bebas' : 'Contoh: Pelanggaran keras'}
                className="w-full h-11 rounded-xl border border-line bg-surface px-3 text-sm text-text outline-none focus:border-blue"
              />
            </div>
          </div>

          {/* Khusus Gol: Checkbox Otomatis Tambah Skor */}
          {mode === 'goal' && (
            <label className="flex items-center gap-2.5 text-xs text-text cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={autoScore}
                onChange={(e) => setAutoScore(e.target.checked)}
                className="h-4 w-4 rounded border-line bg-surface text-blue accent-blue"
              />
              <span>Otomatis tambah skor (+1) ke papan skor pertandingan</span>
            </label>
          )}

          {/* Tombol Simpan Form */}
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setMode(null)}
              className="label h-11 px-4 rounded-full border border-line text-muted hover:text-text transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="label h-11 px-6 rounded-full bg-blue text-ink font-bold hover:brightness-110 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? 'Menyimpan…' : 'Simpan Kejadian'}
            </button>
          </div>
        </form>
      )}

      {/* DAFTAR KEJADIAN YANG SUDAH TERCATAT */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>Riwayat Kejadian Pertandingan</span>
          <span>{events.length} item</span>
        </div>

        {loading ? (
          <p className="text-xs text-muted py-2">Memuat kejadian...</p>
        ) : events.length === 0 ? (
          <p className="text-xs text-muted/70 italic py-2">
            Belum ada gol atau kartu yang dicatat. Klik tombol di atas untuk mencatat.
          </p>
        ) : (
          <div className="rounded-2xl border border-line bg-surface divide-y divide-line/50 overflow-hidden">
            {events.map((evt) => {
              const isTeamA = evt.team_id === match.team_a_id;
              const isGoal = evt.type === 'goal';
              const isYellow = evt.type === 'yellow_card';
              const teamName = isTeamA ? match.team_a?.short_name ?? 'Tim A' : match.team_b?.short_name ?? 'Tim B';

              return (
                <div key={evt.id} className="flex items-center justify-between p-3 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono font-bold text-muted px-2 py-0.5 rounded bg-line/60">
                      {evt.minute}&apos;
                    </span>
                    <span className="text-sm">
                      {isGoal ? '⚽' : isYellow ? '🟨' : '🟥'}
                    </span>
                    <div className="min-w-0">
                      <span className="font-bold text-text truncate block">
                        {evt.player_name}
                      </span>
                      <span className="text-[10px] text-muted">
                        {teamName} · {isGoal ? 'Gol' : isYellow ? 'Kartu Kuning' : 'Kartu Merah'}
                        {evt.note ? ` (${evt.note})` : ''}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteEvent(evt)}
                    title="Hapus kejadian ini"
                    className="h-8 w-8 rounded-full border border-line hover:border-danger hover:text-danger text-muted flex items-center justify-center transition-colors flex-none ml-2"
                  >
                    🗑️
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
