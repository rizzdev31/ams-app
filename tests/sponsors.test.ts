import { describe, it, expect, afterAll } from 'vitest';
import {
  getLocalSponsors,
  addLocalSponsor,
  updateLocalSponsor,
  deleteLocalSponsor,
  saveLocalSponsors,
  DEFAULT_SPONSORS,
} from '@/lib/sponsors-store';
import type { Sponsor, SponsorTier } from '@/lib/types';

describe('Sponsors Store and Logic', () => {
  afterAll(() => {
    saveLocalSponsors(DEFAULT_SPONSORS);
  });
  it('berhasil memuat sponsor default bila file belum ada', () => {
    const list = getLocalSponsors();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0].tier).toBe('platinum');
  });

  it('dapat menambahkan sponsor baru ke penyimpanan lokal', () => {
    const newSponsor = addLocalSponsor({
      name: 'Bank BNI',
      logo_url: '/logo-bni.png',
      tier: 'gold',
      website_url: 'https://bni.co.id',
      display_order: 2,
      active: true,
    });

    expect(newSponsor.id).toBeDefined();
    expect(newSponsor.name).toBe('Bank BNI');
    expect(newSponsor.tier).toBe('gold');

    const updatedList = getLocalSponsors();
    const found = updatedList.find((s) => s.id === newSponsor.id);
    expect(found).toBeDefined();
    expect(found?.website_url).toBe('https://bni.co.id');
  });

  it('dapat memperbarui (edit) data sponsor', () => {
    const sponsor = addLocalSponsor({
      name: 'Aqua Mineral',
      logo_url: '/aqua.png',
      tier: 'silver',
      website_url: null,
      display_order: 5,
      active: true,
    });

    const updated = updateLocalSponsor(sponsor.id, {
      name: 'Danone Aqua',
      active: false,
      tier: 'gold',
    });

    expect(updated).not.toBeNull();
    expect(updated?.name).toBe('Danone Aqua');
    expect(updated?.active).toBe(false);
    expect(updated?.tier).toBe('gold');

    const found = getLocalSponsors().find((s) => s.id === sponsor.id);
    expect(found?.name).toBe('Danone Aqua');
    expect(found?.active).toBe(false);
  });

  it('dapat menghapus sponsor', () => {
    const sponsor = addLocalSponsor({
      name: 'Sponsor Sementara',
      logo_url: '/temp.png',
      tier: 'partner',
      website_url: null,
      display_order: 10,
      active: true,
    });

    const deleted = deleteLocalSponsor(sponsor.id);
    expect(deleted).toBe(true);

    const found = getLocalSponsors().find((s) => s.id === sponsor.id);
    expect(found).toBeUndefined();
  });

  it('urutan hierarki tier: platinum -> gold -> silver -> partner', () => {
    const TIER_WEIGHT: Record<SponsorTier, number> = {
      platinum: 1,
      gold: 2,
      silver: 3,
      partner: 4,
    };

    const mockSponsors: Sponsor[] = [
      { id: '1', name: 'Z Partner', logo_url: '', tier: 'partner', website_url: null, display_order: 1, active: true },
      { id: '2', name: 'A Gold', logo_url: '', tier: 'gold', website_url: null, display_order: 2, active: true },
      { id: '3', name: 'B Silver', logo_url: '', tier: 'silver', website_url: null, display_order: 1, active: true },
      { id: '4', name: 'Main Sponsor', logo_url: '', tier: 'platinum', website_url: null, display_order: 1, active: true },
    ];

    const sorted = [...mockSponsors].sort((a, b) => {
      const wa = TIER_WEIGHT[a.tier] ?? 99;
      const wb = TIER_WEIGHT[b.tier] ?? 99;
      if (wa !== wb) return wa - wb;
      return (a.display_order ?? 0) - (b.display_order ?? 0);
    });

    expect(sorted[0].tier).toBe('platinum');
    expect(sorted[1].tier).toBe('gold');
    expect(sorted[2].tier).toBe('silver');
    expect(sorted[3].tier).toBe('partner');
  });
});
