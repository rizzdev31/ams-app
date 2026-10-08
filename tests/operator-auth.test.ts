import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createOperatorToken,
  verifyOperatorToken,
  generateQuickAuthUrl,
  verifyPasscode,
  getSystemPasscodes,
} from '@/lib/operator-auth';

// Mock dbSettings to test passcode verification independently
vi.mock('@/lib/db', () => ({
  dbSettings: {
    get: vi.fn().mockResolvedValue({
      id: 'default',
      app_name: 'Annur Mini Soccer 2026',
      hero_title: 'ANNUR CUP 2026',
      hero_subtitle: 'Turnamen Mini Soccer',
      maintenance_mode: false,
      passcode_field_1: 'LAP1-2026',
      passcode_field_2: 'LAP2-SPECIAL',
      passcode_scorer: 'WASIT-SUPER',
      updated_at: '2026-10-08T00:00:00Z',
    }),
    update: vi.fn().mockResolvedValue({}),
  },
}));

describe('Operator Auth Module', () => {
  describe('createOperatorToken & verifyOperatorToken', () => {
    it('membuat token JWT yang valid untuk petugas Lapangan 1', async () => {
      const token = await createOperatorToken('field_1');
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(20);

      const payload = await verifyOperatorToken(token);
      expect(payload).not.toBeNull();
      expect(payload?.scope).toBe('field_1');
      expect(payload?.field).toBe('1');
      expect(payload?.title).toBe('Petugas Lapangan 1');
    });

    it('membuat token JWT yang valid untuk petugas Lapangan 2', async () => {
      const token = await createOperatorToken('field_2');
      const payload = await verifyOperatorToken(token);
      expect(payload).not.toBeNull();
      expect(payload?.scope).toBe('field_2');
      expect(payload?.field).toBe('2');
      expect(payload?.title).toBe('Petugas Lapangan 2');
    });

    it('membuat token JWT yang valid untuk panitia scorer (update skor)', async () => {
      const token = await createOperatorToken('scorer');
      const payload = await verifyOperatorToken(token);
      expect(payload).not.toBeNull();
      expect(payload?.scope).toBe('scorer');
      expect(payload?.field).toBeUndefined();
      expect(payload?.title).toBe('Panitia Update Skor');
    });

    it('menolak token palsu atau rusak', async () => {
      const invalid = await verifyOperatorToken('invalid.token.here');
      expect(invalid).toBeNull();
    });

    it('menolak token yang kosong', async () => {
      const invalid = await verifyOperatorToken('');
      expect(invalid).toBeNull();
    });
  });

  describe('generateQuickAuthUrl', () => {
    it('menghasilkan tautan akses cepat dengan parameter JWT auth yang tepat untuk Lapangan 1', async () => {
      const origin = 'https://tournament.example.com';
      const url = await generateQuickAuthUrl('field_1', origin);

      expect(url).toContain('https://tournament.example.com/lapangan/1?auth=');
      const urlObj = new URL(url);
      const authParam = urlObj.searchParams.get('auth');
      expect(authParam).toBeTruthy();

      // Verifikasi token di dalam URL
      const payload = await verifyOperatorToken(authParam!);
      expect(payload?.scope).toBe('field_1');
    });

    it('menghasilkan tautan akses cepat untuk update skor panitia', async () => {
      const origin = 'https://tournament.example.com';
      const url = await generateQuickAuthUrl('scorer', origin);

      expect(url).toContain('https://tournament.example.com/updateskor?auth=');
    });
  });

  describe('verifyPasscode & getSystemPasscodes', () => {
    it('mengambil passcode dari database', async () => {
      const passcodes = await getSystemPasscodes();
      expect(passcodes.field1).toBe('LAP1-2026');
      expect(passcodes.field2).toBe('LAP2-SPECIAL');
      expect(passcodes.scorer).toBe('WASIT-SUPER');
    });

    it('memvalidasi passcode yang benar dengan case-insensitive', async () => {
      const validLap1 = await verifyPasscode('field_1', 'lap1-2026');
      expect(validLap1).toBe(true);

      const validLap2 = await verifyPasscode('field_2', 'LAP2-SPECIAL');
      expect(validLap2).toBe(true);

      const validScorer = await verifyPasscode('scorer', 'wasit-super');
      expect(validScorer).toBe(true);
    });

    it('menolak passcode yang salah', async () => {
      const wrong = await verifyPasscode('field_1', 'SALAH-PIN');
      expect(wrong).toBe(false);

      const empty = await verifyPasscode('field_1', '');
      expect(empty).toBe(false);
    });
  });
});
