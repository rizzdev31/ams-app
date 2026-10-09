'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ApiResponse,
  EventSettings,
  MatchWithTeams,
  Player,
  Sponsor,
  Team,
  TournamentArchive,
} from './types';
import { SEED_MATCHES, SEED_SETTINGS, SEED_TEAMS } from './seed';

/**
 * Satu lapisan data untuk seluruh aplikasi.
 *
 *Sebelumnya setiap halaman punya `setInterval` sendiri dengan interval
 * berbeda (3s, 5s, 8s, 10s, 15s, 30s) untuk endpoint yang sama. Akibatnya
 * dua bagian halaman bisa menampilkan data berbeda di detik yang sama, dan
 * tiap pembukaan halaman menembak beberapa permintaan sekaligus.
 *
 * Di sini satu sumber per sumber data. Semua pemanggil berbagi satu
 * permintaan, satu interval, dan satu salinan data. Halaman yang terakhir
 * menutup widget akan menghentikan polling.
 *
 * Setelah committee menyimpan perubahan, tab lain diberi tahu lewat
 * BroadcastChannel supaya Klien tidak menunggu giliran polling.
 */

const POLL_MS = 5_000;

type Listener = () => void;

class Resource<T> {
  private data: T;
  private seed: T;
  private url: string;
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inFlight = false;
  private lastOkAt = 0;

  constructor(url: string, seed: T) {
    this.url = url;
    this.seed = seed;
    this.data = seed;
  }

  get = (): T => this.data;

  subscribe = (fn: Listener): (() => void) => {
    this.listeners.add(fn);
    if (this.listeners.size === 1) {
      void this.refresh();
      this.schedule();
    }
    return () => {
      this.listeners.delete(fn);
      if (this.listeners.size === 0) this.unschedule();
    };
  };

  /** Paksa ambil ulang sekarang — dipakai setelah committee menyimpan. */
  refresh = async (): Promise<void> => {
    if (this.inFlight) return;
    this.inFlight = true;
    try {
      const res = await fetch(this.url, { cache: 'no-store' });
      if (!res.ok) throw new Error(String(res.status));
      const payload = (await res.json()) as ApiResponse<T>;
      if (payload.success && payload.data !== undefined) {
        this.lastOkAt = Date.now();
        let changed = false;
        // Deteksi perubahan isinya, bukan hanya identitas objek, supaya
        // pemanggil tidak dirender ulang saat data tidak berubah.
        if (JSON.stringify(this.data) !== JSON.stringify(payload.data)) {
          this.data = payload.data;
          changed = true;
        }
        if (changed) this.notify();
      }
    } catch {
      // Jaringan putus: pertahankan data terakhir. Layar publik menampilkan
      // strip "koneksi terputus" dari Umur lastOkAt yang lewat ambang.
    } finally {
      this.inFlight = false;
    }
  };

  private schedule() {
    this.unschedule();
    this.timer = setTimeout(async () => {
      await this.refresh();
      if (this.listeners.size > 0) this.schedule();
    }, POLL_MS);
  }

  private unschedule() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private notify() {
    for (const fn of this.listeners) fn();
  }

  /** True kalau data sudah basi lebih dari 20 detik. */
  isStale = (): boolean => this.lastOkAt > 0 && Date.now() - this.lastOkAt > 20_000;
}

export const matchesStore = new Resource<MatchWithTeams[]>('/api/matches', SEED_MATCHES);
export const teamsStore = new Resource<Team[]>('/api/teams', SEED_TEAMS);
export const settingsStore = new Resource<EventSettings>('/api/settings', SEED_SETTINGS);
export const sponsorsStore = new Resource<Sponsor[]>('/api/sponsors', []);
export const archivesStore = new Resource<TournamentArchive[]>('/api/admin/archives', []);

/**
 * Tab lain memberi tahu ada yang berubah (committee menyimpan,
 * wasit mengetik skor). Semua tab langsung ambil ulang, tidak menunggu
 * giliran polling.
 */
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('annur') : null;

export function announceChange() {
  channel?.postMessage({ type: 'changed' });
}

if (channel) {
  channel.onmessage = () => {
    void matchesStore.refresh();
    void teamsStore.refresh();
    void settingsStore.refresh();
    void sponsorsStore.refresh();
    void archivesStore.refresh();
  };
}

if (typeof window !== 'undefined') {
  // Fallback untuk browser tanpa BroadcastChannel: event storage menyeberang
  // antar tab.
  window.addEventListener('storage', (e) => {
    if (e.key === 'annur-ping') {
      void matchesStore.refresh();
      void teamsStore.refresh();
      void settingsStore.refresh();
      void sponsorsStore.refresh();
      void archivesStore.refresh();
    }
  });
}

export function announceChangeEverywhere() {
  announceChange();
  try {
    window.localStorage.setItem('annur-ping', String(Date.now()));
  } catch {
    // penyimpanan diblokir — andalkan BroadcastChannel saja
  }
}

/** Hook: kembalikan data terbaru dari store + status koneksi. */
export function useResource<T>(store: Resource<T>): [T, boolean, () => void] {
  const [data, setData] = useState<T>(store.get());
  const [online, setOnline] = useState(true);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;

    const sync = () => {
      if (!alive.current) return;
      setData(store.get());
      setOnline(!store.isStale());
    };

    sync();
    const unsubscribe = store.subscribe(sync);
    // Indikator "koneksi terputus" dicek berkala secara efisien
    const clock = setInterval(sync, 10_000);

    return () => {
      alive.current = false;
      clearInterval(clock);
      unsubscribe();
    };
  }, [store]);

  const reload = useCallback(() => {
    void store.refresh().then(() => {
      if (!alive.current) return;
      setData(store.get());
      setOnline(!store.isStale());
    });
  }, [store]);

  return [data, online, reload];
}

/** Hook untuk pemain satu tim. */
export function usePlayers(teamId: string): [Player[], boolean, () => void] {
  const [players, setPlayers] = useState<Player[]>([]);
  const [online, setOnline] = useState(true);
  const alive = useRef(true);

  const load = useCallback(async () => {
    if (!teamId) {
      setPlayers([]);
      return;
    }
    try {
      const res = await fetch(`/api/players?team_id=${teamId}`, { cache: 'no-store' });
      const data: ApiResponse<Player[]> = await res.json();
      if (!alive.current) return;
      if (data.success && data.data) setPlayers(data.data);
      setOnline(true);
    } catch {
      if (alive.current) setOnline(false);
    }
  }, [teamId]);

  useEffect(() => {
    alive.current = true;
    void load();

    // Ikut aksi tab lain (wasit menambah pemain, committee mengubah tim).
    const onChange = () => void load();
    channel?.addEventListener('message', onChange);
    const id = setInterval(() => void load(), 10_000);

    return () => {
      alive.current = false;
      clearInterval(id);
      channel?.removeEventListener('message', onChange);
    };
  }, [load]);

  return [players, online, load];
}