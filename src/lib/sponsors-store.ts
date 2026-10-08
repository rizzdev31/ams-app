import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Sponsor } from './types';

const DATA_DIR = join(process.cwd(), 'data');
const SPONSORS_FILE = join(DATA_DIR, 'sponsors.json');

export const DEFAULT_SPONSORS: Sponsor[] = [
  {
    id: 's-annur-platinum',
    name: 'Yayasan An-Nur',
    logo_url: '/logoutama.png',
    tier: 'platinum',
    website_url: null,
    display_order: 1,
    active: true,
    created_at: '2026-10-07T00:00:00.000Z',
  },
];

export function getLocalSponsors(): Sponsor[] {
  try {
    if (!existsSync(SPONSORS_FILE)) {
      if (!existsSync(DATA_DIR)) {
        mkdirSync(DATA_DIR, { recursive: true });
      }
      writeFileSync(SPONSORS_FILE, JSON.stringify(DEFAULT_SPONSORS, null, 2), 'utf8');
      return DEFAULT_SPONSORS;
    }
    const raw = readFileSync(SPONSORS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as Sponsor[];
    return DEFAULT_SPONSORS;
  } catch (err) {
    console.warn('Gagal membaca data/sponsors.json:', err);
    return DEFAULT_SPONSORS;
  }
}

export function saveLocalSponsors(sponsors: Sponsor[]): void {
  try {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }
    writeFileSync(SPONSORS_FILE, JSON.stringify(sponsors, null, 2), 'utf8');
  } catch (err) {
    console.error('Gagal menulis data/sponsors.json:', err);
  }
}

export function addLocalSponsor(
  input: Omit<Sponsor, 'id' | 'created_at'>
): Sponsor {
  const sponsors = getLocalSponsors();
  const newSponsor: Sponsor = {
    ...input,
    id: `sp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    created_at: new Date().toISOString(),
  };
  sponsors.push(newSponsor);
  saveLocalSponsors(sponsors);
  return newSponsor;
}

export function updateLocalSponsor(
  id: string,
  input: Partial<Omit<Sponsor, 'id' | 'created_at'>>
): Sponsor | null {
  const sponsors = getLocalSponsors();
  const idx = sponsors.findIndex((s) => s.id === id);
  if (idx === -1) return null;

  sponsors[idx] = {
    ...sponsors[idx],
    ...input,
  };
  saveLocalSponsors(sponsors);
  return sponsors[idx];
}

export function deleteLocalSponsor(id: string): boolean {
  const sponsors = getLocalSponsors();
  const next = sponsors.filter((s) => s.id !== id);
  if (next.length === sponsors.length) return false;
  saveLocalSponsors(next);
  return true;
}
