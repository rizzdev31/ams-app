'use client';

import { useState, useEffect } from 'react';
import type {
  EventSettings,
  Sponsor,
  SponsorFormData,
  SponsorTier,
  TournamentArchive,
  TournamentArchiveFormData,
} from '@/lib/types';
import { announceChangeEverywhere } from '@/lib/live-store';
import { toast } from '@/components/Toast';

const DEFAULT_SPONSOR_FORM: SponsorFormData = {
  name: '',
  logo_url: '',
  tier: 'gold',
  website_url: '',
  display_order: 0,
  active: true,
};

const TIER_META: Record<
  SponsorTier,
  { label: string; badgeClass: string; desc: string; icon: string }
> = {
  platinum: {
    label: 'Platinum / Utama',
    badgeClass: 'bg-amber-500/10 text-amber-400 border border-amber-500/30',
    desc: 'Sponsor utama, logo paling besar di posisi puncak.',
    icon: '🌟',
  },
  gold: {
    label: 'Gold (Emas)',
    badgeClass: 'bg-yellow/10 text-yellow border border-yellow/30',
    desc: 'Sponsor tier emas, tampil di grid utama.',
    icon: '🥇',
  },
  silver: {
    label: 'Silver (Perak)',
    badgeClass: 'bg-slate-300/10 text-slate-200 border border-slate-400/30',
    desc: 'Sponsor tier perak, tampil di grid sekunder.',
    icon: '🥈',
  },
  partner: {
    label: 'Official Partner',
    badgeClass: 'bg-blue/10 text-blue border border-blue/30',
    desc: 'Mitra resmi & media partner pendukung.',
    icon: '🤝',
  },
};

export default function PengaturanPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'archives' | 'sponsors' | 'danger'>('general');

  // General tournament settings state
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Security management state
  const [securityData, setSecurityData] = useState<{
    passcodes: { field1: string; field2: string; scorer: string };
    quickLinks: { field1: string; field2: string; scorer: string };
    currentUserRole: string;
  } | null>(null);
  const [isLoadingSecurity, setIsLoadingSecurity] = useState(false);
  const [showCode, setShowCode] = useState({ field1: false, field2: false, scorer: false });
  const [editPasscode, setEditPasscode] = useState({ field1: '', field2: '', scorer: '' });
  const [savingPasscode, setSavingPasscode] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Danger zone reset state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Sponsorship management state
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [isLoadingSponsors, setIsLoadingSponsors] = useState(true);
  const [isSponsorModalOpen, setIsSponsorModalOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
  const [sponsorFormData, setSponsorFormData] = useState<SponsorFormData>(DEFAULT_SPONSOR_FORM);
  const [isSavingSponsor, setIsSavingSponsor] = useState(false);
  const [sponsorActionMessage, setSponsorActionMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Tournament archives & matchday focus state
  const [archives, setArchives] = useState<TournamentArchive[]>([]);
  const [isLoadingArchives, setIsLoadingArchives] = useState(false);
  const [isSavingFocus, setIsSavingFocus] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [editingArchive, setEditingArchive] = useState<TournamentArchive | null>(null);
  const [archiveFormData, setArchiveFormData] = useState<TournamentArchiveFormData>({
    name: '',
    category: 'U10',
    match_date: '2026-10-09',
    description: '',
  });
  const [isSavingArchive, setIsSavingArchive] = useState(false);
  const [archiveActionMessage, setArchiveActionMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const fetchSecurityData = async () => {
    setIsLoadingSecurity(true);
    try {
      const res = await fetch('/api/admin/security', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success && data.data) {
        setSecurityData(data.data);
        setEditPasscode({
          field1: data.data.passcodes.field1,
          field2: data.data.passcodes.field2,
          scorer: data.data.passcodes.scorer,
        });
      }
    } catch (e) {
      console.error('Gagal mengambil data keamanan:', e);
    } finally {
      setIsLoadingSecurity(false);
    }
  };

  const handleSavePasscode = async (target: 'field_1' | 'field_2' | 'scorer') => {
    const key = target === 'field_1' ? 'field1' : target === 'field_2' ? 'field2' : 'scorer';
    const newCode = editPasscode[key].trim().toUpperCase();
    if (!newCode || newCode.length < 4) {
      setMessage({ type: 'error', text: 'Kode sandi minimal 4 karakter.' });
      toast.error('Kode sandi minimal 4 karakter!');
      return;
    }
    setSavingPasscode(target);
    try {
      const res = await fetch('/api/admin/security', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, newPasscode: newCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        const msg = data.message || 'Kode sandi berhasil diperbarui!';
        setMessage({ type: 'success', text: msg });
        toast.success(msg);
        await fetchSecurityData();
        setTimeout(() => setMessage(null), 3500);
      } else {
        const err = data.error || 'Gagal memperbarui kode sandi.';
        setMessage({ type: 'error', text: err });
        toast.error(err);
      }
    } catch {
      setMessage({ type: 'error', text: 'Gagal terhubung ke server.' });
      toast.error('Gagal terhubung ke server.');
    } finally {
      setSavingPasscode(null);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(label);
      toast.success(`Tautan WhatsApp ${label} berhasil disalin!`);
      setTimeout(() => setCopiedKey(null), 2500);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));

      if (data.success && data.data) {
        setSettings(data.data);
      }

      if (!res.ok || !data.success) {
        setLoadError(data.error || `Gagal memuat pengaturan (HTTP ${res.status}).`);
      } else {
        setLoadError(null);
      }
    } catch (err) {
      console.error('Gagal memuat pengaturan:', err);
      setLoadError('Tidak dapat memuat pengaturan acara. Periksa koneksi lalu coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSponsors = async () => {
    setIsLoadingSponsors(true);
    try {
      const res = await fetch('/api/sponsors?all=true', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (data.success && Array.isArray(data.data)) {
        setSponsors(data.data);
      }
    } catch (err) {
      console.error('Gagal memuat data sponsor:', err);
    } finally {
      setIsLoadingSponsors(false);
    }
  };

  const fetchArchives = async () => {
    setIsLoadingArchives(true);
    try {
      const res = await fetch('/api/admin/archives', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (data.success && Array.isArray(data.data)) {
        setArchives(data.data);
      }
    } catch (err) {
      console.error('Gagal memuat arsip turnamen:', err);
    } finally {
      setIsLoadingArchives(false);
    }
  };

  useEffect(() => {
    void fetchSettings();
    void fetchSponsors();
    void fetchArchives();
  }, []);

  const handleSaveFocus = async (cat: string, date: string) => {
    if (!settings) return;
    setIsSavingFocus(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          active_category: cat,
          active_date: date,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setSettings((prev) => (prev ? { ...prev, active_category: cat, active_date: date } : null));
        announceChangeEverywhere();
        toast.success(`Fokus turnamen berhasil diubah ke ${cat === 'Semua' ? 'Semua Kategori' : cat} (${date})!`);
      } else {
        toast.error(data.error || 'Gagal menyimpan fokus turnamen.');
      }
    } catch {
      toast.error('Koneksi gagal saat mengubah fokus turnamen.');
    } finally {
      setIsSavingFocus(false);
    }
  };

  const handleQuickArchiveU10 = async () => {
    setIsSavingArchive(true);
    try {
      const res = await fetch('/api/admin/archives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Arsip Pertandingan U-10 (Selesai Hari 1)',
          category: 'U10',
          match_date: '2026-10-09',
          description: 'Container arsip resmi hasil pertandingan dan klasemen akhir kategori U-10 Hari 1 (9 Oktober 2026).',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        await fetchArchives();
        announceChangeEverywhere();
        toast.success('Container arsip U-10 berhasil dibuat dan disimpan!');
      } else {
        toast.error(data.error || 'Gagal membuat arsip U-10.');
      }
    } catch {
      toast.error('Koneksi gagal saat membuat arsip.');
    } finally {
      setIsSavingArchive(false);
    }
  };

  const openAddArchiveModal = () => {
    setEditingArchive(null);
    setArchiveFormData({
      name: '',
      category: (settings?.active_category as any) || 'U10',
      match_date: settings?.active_date || '2026-10-09',
      description: '',
    });
    setArchiveActionMessage(null);
    setIsArchiveModalOpen(true);
  };

  const openEditArchiveModal = (arc: TournamentArchive) => {
    setEditingArchive(arc);
    setArchiveFormData({
      name: arc.name,
      category: arc.category,
      match_date: arc.match_date || '',
      description: arc.description || '',
    });
    setArchiveActionMessage(null);
    setIsArchiveModalOpen(true);
  };

  const closeArchiveModal = () => {
    setIsArchiveModalOpen(false);
    setEditingArchive(null);
    setArchiveActionMessage(null);
  };

  const handleArchiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archiveFormData.name.trim()) {
      setArchiveActionMessage({ type: 'error', text: 'Nama container arsip wajib diisi.' });
      return;
    }
    setIsSavingArchive(true);
    try {
      let res: Response;
      if (editingArchive) {
        res = await fetch('/api/admin/archives', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingArchive.id,
            name: archiveFormData.name,
            description: archiveFormData.description,
          }),
        });
      } else {
        res = await fetch('/api/admin/archives', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(archiveFormData),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        await fetchArchives();
        announceChangeEverywhere();
        closeArchiveModal();
        toast.success(editingArchive ? 'Container arsip berhasil diperbarui!' : 'Container arsip baru berhasil dibuat!');
      } else {
        setArchiveActionMessage({ type: 'error', text: data.error || 'Gagal menyimpan arsip.' });
        toast.error(data.error || 'Gagal menyimpan arsip.');
      }
    } catch {
      setArchiveActionMessage({ type: 'error', text: 'Koneksi gagal saat menyimpan arsip.' });
      toast.error('Koneksi gagal saat menyimpan arsip.');
    } finally {
      setIsSavingArchive(false);
    }
  };

  const handleDeleteArchive = async (arc: TournamentArchive) => {
    const confirmed = window.confirm(
      `Hapus container arsip "${arc.name}"?\nData snapshot tersimpan untuk container ini akan dihapus.`
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/admin/archives?id=${arc.id}`, { method: 'DELETE' });
      if (res.ok) {
        setArchives((prev) => prev.filter((a) => a.id !== arc.id));
        announceChangeEverywhere();
        toast.success(`Container "${arc.name}" berhasil dihapus.`);
      } else {
        toast.error('Gagal menghapus container arsip.');
      }
    } catch {
      toast.error('Koneksi gagal saat menghapus container arsip.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setIsSaving(true);
    setMessage(null);

    const payload = {
      event_name: settings.event_name,
      start_date: settings.start_date,
      end_date: settings.end_date,
      location: settings.location,
      map_url: settings.map_url,
      rules_text: settings.rules_text,
      tiebreak_rules: settings.tiebreak_rules,
      contact_info: settings.contact_info,
      active_category: settings.active_category,
      active_date: settings.active_date,
      points_per_win: settings.points_per_win ?? 3,
    };

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        if (data.data) setSettings(data.data);
        announceChangeEverywhere();
        setMessage({ type: 'success', text: 'Pengaturan turnamen berhasil disimpan!' });
        toast.success('Pengaturan turnamen berhasil disimpan!');
        setTimeout(() => setMessage(null), 3500);
      } else {
        const err = data.error || 'Gagal menyimpan pengaturan.';
        setMessage({
          type: 'error',
          text: err,
        });
        toast.error(err);
      }
    } catch {
      const err = 'Tidak dapat menghubungi server. Periksa koneksi lalu coba lagi.';
      setMessage({
        type: 'error',
        text: err,
      });
      toast.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (resetCode !== 'RESET') {
      setMessage({ type: 'error', text: "Ketik 'RESET' untuk mengonfirmasi" });
      toast.warning("Ketik 'RESET' untuk mengonfirmasi");
      return;
    }

    setIsResetting(true);
    try {
      const res = await fetch('/api/settings/reset', { method: 'POST' });
      if (res.ok) {
        announceChangeEverywhere();
        setMessage({ type: 'success', text: 'Semua data turnamen berhasil direset!' });
        toast.success('Semua data turnamen berhasil direset!');
        setTimeout(() => {
          setMessage(null);
          window.location.reload();
        }, 1500);
      } else {
        setMessage({ type: 'error', text: 'Gagal mereset data turnamen.' });
        toast.error('Gagal mereset data turnamen.');
      }
    } catch {
      setMessage({ type: 'error', text: 'Terjadi kesalahan saat mereset data.' });
      toast.error('Terjadi kesalahan saat mereset data.');
    } finally {
      setIsResetting(false);
      setShowResetConfirm(false);
      setResetCode('');
    }
  };

  // === Sponsorship Actions ===

  const openAddSponsorModal = () => {
    setEditingSponsor(null);
    setSponsorFormData({
      ...DEFAULT_SPONSOR_FORM,
      display_order: sponsors.length + 1,
    });
    setSponsorActionMessage(null);
    setIsSponsorModalOpen(true);
  };

  const openEditSponsorModal = (sponsor: Sponsor) => {
    setEditingSponsor(sponsor);
    setSponsorFormData({
      name: sponsor.name,
      logo_url: sponsor.logo_url,
      tier: sponsor.tier,
      website_url: sponsor.website_url || '',
      display_order: sponsor.display_order ?? 0,
      active: sponsor.active,
    });
    setSponsorActionMessage(null);
    setIsSponsorModalOpen(true);
  };

  const closeSponsorModal = () => {
    setIsSponsorModalOpen(false);
    setEditingSponsor(null);
    setSponsorFormData(DEFAULT_SPONSOR_FORM);
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert('Ukuran file maksimal 3MB.');
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      const maxDim = 240;
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        // Kompres WebP mempertahankan transparansi
        const compressedDataUrl = canvas.toDataURL('image/webp', 0.9);
        setSponsorFormData((prev) => ({ ...prev, logo_url: compressedDataUrl }));
      }
    };
    img.src = objectUrl;
  };

  const handleSponsorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sponsorFormData.name.trim()) {
      setSponsorActionMessage({ type: 'error', text: 'Nama sponsor wajib diisi.' });
      return;
    }
    if (!sponsorFormData.logo_url.trim()) {
      setSponsorActionMessage({ type: 'error', text: 'Logo sponsor wajib diisi/diunggah.' });
      return;
    }

    setIsSavingSponsor(true);
    setSponsorActionMessage(null);

    const isEdit = Boolean(editingSponsor);
    const url = isEdit ? `/api/sponsors/${editingSponsor!.id}` : '/api/sponsors';
    const method = isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sponsorFormData),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        await fetchSponsors();
        announceChangeEverywhere();
        closeSponsorModal();
        const successMsg = isEdit ? 'Sponsor berhasil diperbarui!' : 'Sponsor baru berhasil ditambahkan!';
        setMessage({
          type: 'success',
          text: successMsg,
        });
        toast.success(successMsg);
        setTimeout(() => setMessage(null), 3500);
      } else {
        const err = data.error || 'Gagal menyimpan sponsor.';
        setSponsorActionMessage({
          type: 'error',
          text: err,
        });
        toast.error(err);
      }
    } catch {
      const err = 'Tidak dapat menghubungi server. Periksa koneksi internet Anda.';
      setSponsorActionMessage({
        type: 'error',
        text: err,
      });
      toast.error(err);
    } finally {
      setIsSavingSponsor(false);
    }
  };

  const handleToggleSponsorActive = async (sponsor: Sponsor) => {
    const nextActive = !sponsor.active;
    // Optimistic UI update
    setSponsors((prev) =>
      prev.map((s) => (s.id === sponsor.id ? { ...s, active: nextActive } : s))
    );

    try {
      const res = await fetch(`/api/sponsors/${sponsor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: nextActive }),
      });

      if (res.ok) {
        announceChangeEverywhere();
        toast.success(nextActive ? `Sponsor "${sponsor.name}" diaktifkan.` : `Sponsor "${sponsor.name}" dinonaktifkan.`);
      } else {
        // Rollback if failed
        await fetchSponsors();
        setMessage({ type: 'error', text: 'Gagal mengubah status sponsor.' });
        toast.error('Gagal mengubah status sponsor.');
      }
    } catch {
      await fetchSponsors();
      setMessage({ type: 'error', text: 'Koneksi gagal saat mengubah status sponsor.' });
      toast.error('Koneksi gagal saat mengubah status sponsor.');
    }
  };

  const handleDeleteSponsor = async (sponsor: Sponsor) => {
    const confirmed = window.confirm(`Hapus sponsor "${sponsor.name}"?`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/sponsors/${sponsor.id}`, { method: 'DELETE' });
      if (res.ok) {
        setSponsors((prev) => prev.filter((s) => s.id !== sponsor.id));
        announceChangeEverywhere();
        const msg = `Sponsor "${sponsor.name}" berhasil dihapus.`;
        setMessage({ type: 'success', text: msg });
        toast.success(msg);
        setTimeout(() => setMessage(null), 3500);
      } else {
        setMessage({ type: 'error', text: 'Gagal menghapus sponsor.' });
        toast.error('Gagal menghapus sponsor.');
      }
    } catch {
      setMessage({ type: 'error', text: 'Koneksi gagal saat menghapus sponsor.' });
      toast.error('Koneksi gagal saat menghapus sponsor.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-9 h-9 border-4 border-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="mx-auto max-w-lg py-10 text-center">
        <div className="rounded-[28px] border border-danger/40 bg-danger/10 px-6 py-8">
          <h2 className="text-lg font-semibold text-danger">Gagal memuat pengaturan</h2>
          <p className="mt-1.5 text-sm text-danger">
            {loadError ?? 'Respons dari server tidak berisi data acara.'}
          </p>
          <button
            onClick={() => {
              setIsLoading(true);
              setLoadError(null);
              fetchSettings();
            }}
            className="mt-5 rounded-full bg-danger px-5 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
          >
            Coba lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Toast Alert */}
      {message && (
        <div
          className={`p-4 rounded-full font-medium transition-all ${
            message.type === 'success'
              ? 'bg-blue/10 text-blue border border-blue/40 shadow-sm'
              : 'bg-danger/10 text-danger border border-danger/40'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Header & Tabs */}
      <div className="space-y-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-text tracking-tight">
            Pengaturan & Sponsorship
          </h1>
          <p className="mt-1 text-sm text-muted">
            Kelola identitas acara, regulasi pertandingan, serta kemitraan dan sponsorship resmi.
          </p>
        </div>

        {/* Tab Buttons */}
        <div
          className="pill w-full sm:w-auto inline-flex gap-1 p-1 bg-surface border border-line rounded-full"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'general'}
            onClick={() => setActiveTab('general')}
            className={`label flex-1 sm:flex-none px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'general'
                ? 'bg-text text-ink shadow-sm'
                : 'text-muted hover:text-text'
            }`}
          >
            <span>⚙️ Informasi Turnamen</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'security'}
            onClick={() => {
              setActiveTab('security');
              fetchSecurityData();
            }}
            className={`label flex-1 sm:flex-none px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'security'
                ? 'bg-text text-ink shadow-sm'
                : 'text-muted hover:text-text'
            }`}
          >
            <span>🛡️ Keamanan & Sandi Lapangan</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'archives'}
            onClick={() => {
              setActiveTab('archives');
              fetchArchives();
            }}
            className={`label flex-1 sm:flex-none px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'archives'
                ? 'bg-text text-ink shadow-sm'
                : 'text-muted hover:text-text'
            }`}
          >
            <span>📦 Container Arsip & Fokus Hari</span>
            <span
              className={`ml-2 px-2 py-0.5 rounded-full text-[11px] ${
                activeTab === 'archives'
                  ? 'bg-ink/20 text-ink'
                  : 'bg-raise text-muted'
              }`}
            >
              {archives.length}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'sponsors'}
            onClick={() => setActiveTab('sponsors')}
            className={`label flex-1 sm:flex-none px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'sponsors'
                ? 'bg-text text-ink shadow-sm'
                : 'text-muted hover:text-text'
            }`}
          >
            <span>🤝 Sponsorship & Partner</span>
            <span
              className={`ml-2 px-2 py-0.5 rounded-full text-[11px] ${
                activeTab === 'sponsors'
                  ? 'bg-ink/20 text-ink'
                  : 'bg-raise text-muted'
              }`}
            >
              {sponsors.length}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'danger'}
            onClick={() => setActiveTab('danger')}
            className={`label flex-1 sm:flex-none px-4 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'danger'
                ? 'bg-danger text-white shadow-sm'
                : 'text-muted hover:text-danger'
            }`}
          >
            <span>⚠️ Zona Bahaya</span>
          </button>
        </div>
      </div>

      {/* ================= TAB 1: INFORMASI TURNAMEN ================= */}
      {activeTab === 'general' && (
        <div className="bg-surface rounded-[28px] border border-line overflow-hidden shadow-sm">
          {loadError && (
            <div className="m-6 rounded-2xl border border-yellow/40 bg-yellow/10 p-4 text-xs sm:text-sm text-yellow">
              {loadError} Form di bawah menampilkan nilai bawaan — perubahan belum dapat disimpan.
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-text">Nama Acara</label>
                <input
                  type="text"
                  value={settings.event_name}
                  onChange={(e) => setSettings({ ...settings, event_name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-line bg-surface rounded-full focus:ring-2 focus:ring-blue focus:border-blue outline-none text-text text-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-text">Lokasi</label>
                <input
                  type="text"
                  value={settings.location}
                  onChange={(e) => setSettings({ ...settings, location: e.target.value })}
                  className="w-full px-4 py-2.5 border border-line bg-surface rounded-full focus:ring-2 focus:ring-blue focus:border-blue outline-none text-text text-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-text">Tanggal Mulai</label>
                <input
                  type="date"
                  value={settings.start_date.slice(0, 10)}
                  onChange={(e) => setSettings({ ...settings, start_date: e.target.value })}
                  className="w-full px-4 py-2.5 border border-line bg-surface rounded-full focus:ring-2 focus:ring-blue focus:border-blue outline-none text-text text-sm"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-text">Tanggal Selesai</label>
                <input
                  type="date"
                  value={settings.end_date.slice(0, 10)}
                  onChange={(e) => setSettings({ ...settings, end_date: e.target.value })}
                  className="w-full px-4 py-2.5 border border-line bg-surface rounded-full focus:ring-2 focus:ring-blue focus:border-blue outline-none text-text text-sm"
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-semibold text-text">
                  URL Peta (Google Maps embed / link)
                </label>
                <input
                  type="url"
                  value={settings.map_url || ''}
                  onChange={(e) => setSettings({ ...settings, map_url: e.target.value })}
                  className="w-full px-4 py-2.5 border border-line bg-surface rounded-full focus:ring-2 focus:ring-blue focus:border-blue outline-none text-text text-sm"
                  placeholder="https://maps.google.com/..."
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-semibold text-text">
                  Kontak Panitia (No HP / WhatsApp)
                </label>
                <input
                  type="text"
                  value={settings.contact_info || ''}
                  onChange={(e) => setSettings({ ...settings, contact_info: e.target.value })}
                  className="w-full px-4 py-2.5 border border-line bg-surface rounded-full focus:ring-2 focus:ring-blue focus:border-blue outline-none text-text text-sm"
                  placeholder="Contoh: 081234567890 (Panitia Lapangan)"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-semibold text-text">Aturan Main</label>
                <textarea
                  value={settings.rules_text || ''}
                  onChange={(e) => setSettings({ ...settings, rules_text: e.target.value })}
                  className="w-full p-4 border border-line bg-surface rounded-2xl focus:ring-2 focus:ring-blue focus:border-blue outline-none h-32 text-text text-sm"
                  placeholder="Detail aturan turnamen per baris..."
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-semibold text-text">
                  Aturan Tie-Break Klasemen
                </label>
                <textarea
                  value={settings.tiebreak_rules}
                  onChange={(e) => setSettings({ ...settings, tiebreak_rules: e.target.value })}
                  className="w-full p-4 border border-line bg-surface rounded-2xl focus:ring-2 focus:ring-blue focus:border-blue outline-none h-24 text-text text-sm"
                  placeholder="Contoh: poin → selisih gol → gol masuk"
                  required
                />
              </div>

              {/* Sistem Poin Kemenangan Fase Grup */}
              <div className="space-y-2 md:col-span-2 pt-2 border-t border-line/60">
                <label className="block text-sm font-semibold text-text">
                  Sistem Poin Kemenangan (Fase Grup)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, points_per_win: 3 })}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      (settings.points_per_win ?? 3) === 3
                        ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30'
                        : 'border-line bg-raise/40 hover:bg-raise'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-emerald-400 font-mono">STANDAR RESMI (AKTIF)</span>
                      {(settings.points_per_win ?? 3) === 3 && (
                        <span className="text-xs text-emerald-400 font-bold">✓ Terpilih</span>
                      )}
                    </div>
                    <div className="font-display font-black text-sm text-text mt-1">3 Poin untuk Menang</div>
                    <p className="text-[11px] text-muted mt-0.5 leading-snug">
                      Regulasi resmi sepak bola (Menang: 3, Seri: 1, Kalah: 0). Klasemen langsung menghitung ulang seketika.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, points_per_win: 2 })}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      settings.points_per_win === 2
                        ? 'border-blue bg-blue/10 ring-2 ring-blue/30'
                        : 'border-line bg-raise/40 hover:bg-raise'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-blue font-mono">TRADISIONAL</span>
                      {settings.points_per_win === 2 && (
                        <span className="text-xs text-blue font-bold">✓ Terpilih</span>
                      )}
                    </div>
                    <div className="font-display font-black text-sm text-text mt-1">2 Poin untuk Menang</div>
                    <p className="text-[11px] text-muted mt-0.5 leading-snug">
                      Sistem turnamen 2 poin (Menang: 2, Seri: 1, Kalah: 0).
                    </p>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-3 bg-blue hover:bg-blue-light text-ink font-bold rounded-full transition-colors flex items-center space-x-2 min-w-[150px] justify-center shadow-md hover:opacity-95"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-ink border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Simpan Perubahan</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= TAB 2: KEAMANAN & SANDI LAPANGAN ================= */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Status Keamanan Global Banner */}
          <div className="rounded-3xl border border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 via-surface to-blue-500/10 p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 text-2xl flex-none border border-emerald-500/30">
                  🛡️
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-lg font-bold text-text">
                      Pusat Keamanan & Proteksi Akses Terenkripsi
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[10px] font-mono font-bold">
                      ENKRIPSI AKTIF
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-1 max-w-2xl leading-relaxed">
                    Konsol lapangan, papan skor, dan portal panitia telah dikunci secara kriptografis. Publik di luar panitia tidak dapat membuka atau mengubah skor tanpa kode akses resmi yang terverifikasi.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={fetchSecurityData}
                disabled={isLoadingSecurity}
                className="label px-4 py-2 rounded-full border border-line bg-surface text-xs font-semibold text-text hover:border-blue transition-colors flex items-center justify-center gap-2 self-start sm:self-auto flex-none"
              >
                <span>🔄</span>
                <span>{isLoadingSecurity ? 'Memuat…' : 'Segarkan Status'}</span>
              </button>
            </div>

            {/* Matrix Status Indikator */}
            <div className="mt-5 pt-4 border-t border-line/60 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-surface/70 border border-line">
                <span className="text-muted block text-[10px] uppercase font-mono">Konsol Lapangan 1</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Terproteksi Sandi
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface/70 border border-line">
                <span className="text-muted block text-[10px] uppercase font-mono">Konsol Lapangan 2</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Terproteksi Sandi
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface/70 border border-line">
                <span className="text-muted block text-[10px] uppercase font-mono">Papan Update Skor</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Terproteksi Sesi
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface/70 border border-line">
                <span className="text-muted block text-[10px] uppercase font-mono">API Update Skor</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> Akses Publik Diblokir
                </span>
              </div>
            </div>
          </div>

          {/* Kartu Manajemen Kode Sandi Lapangan 1, 2, & Update Skor */}
          <div className="grid gap-5">
            {/* KARTU 1: LAPANGAN 1 */}
            <div className="rounded-3xl border border-line bg-surface p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="px-3 py-1 rounded-full bg-blue text-ink font-display text-xs font-black uppercase">
                    Lapangan 1
                  </span>
                  <div>
                    <h3 className="font-display text-base font-bold text-text">
                      Kode Akses Konsol Lapangan 1
                    </h3>
                    <p className="text-[11px] text-muted">
                      Rute: <code>/lapangan/1</code>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted font-mono">Kode Saat Ini:</span>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-raise border border-line font-mono font-bold text-sm text-blue">
                    <span>
                      {showCode.field1
                        ? securityData?.passcodes.field1 || 'LAP1-2026'
                        : '••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setShowCode((prev) => ({ ...prev, field1: !prev.field1 }))
                      }
                      className="text-xs text-muted hover:text-text ml-1"
                      title={showCode.field1 ? 'Sembunyikan' : 'Lihat'}
                    >
                      {showCode.field1 ? '👁️' : '🔒'}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        securityData?.passcodes.field1 || 'LAP1-2026',
                        'code_field1'
                      )
                    }
                    className="label px-3 py-1 rounded-xl border border-line text-xs hover:border-blue transition-colors"
                  >
                    {copiedKey === 'code_field1' ? '✓ Tersalin' : 'Salin Kode'}
                  </button>
                </div>
              </div>

              {/* Form Ganti Sandi (Khusus Superadmin) */}
              <div className="grid sm:grid-cols-12 gap-3 items-end pt-1">
                <div className="sm:col-span-8">
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-muted font-bold mb-1">
                    Ubah Kode Akses Baru Lapangan 1:
                  </label>
                  <input
                    type="text"
                    value={editPasscode.field1}
                    onChange={(e) =>
                      setEditPasscode((prev) => ({ ...prev, field1: e.target.value }))
                    }
                    placeholder="Contoh: LAP1-2026"
                    className="w-full px-4 py-2 border border-line bg-raise/50 rounded-xl font-mono text-sm uppercase text-text focus:border-blue outline-none"
                  />
                </div>
                <div className="sm:col-span-4">
                  <button
                    type="button"
                    onClick={() => handleSavePasscode('field_1')}
                    disabled={savingPasscode === 'field_1'}
                    className="w-full h-10 rounded-xl bg-blue text-ink font-bold text-xs hover:brightness-110 transition-all flex items-center justify-center gap-2"
                  >
                    {savingPasscode === 'field_1' ? (
                      <span className="w-3.5 h-3.5 border-2 border-ink border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>💾 Simpan Sandi Baru</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Tautan Akses Instan WhatsApp */}
              <div className="rounded-2xl border border-blue/20 bg-blue/5 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-blue flex items-center gap-1.5">
                    <span>📲</span> Tautan Akses Cepat WhatsApp (Auto-Login Terenkripsi):
                  </span>
                  <span className="text-[10px] text-muted">Petugas tidak perlu ketik PIN</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={securityData?.quickLinks.field1 || ''}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-line bg-surface font-mono text-xs text-muted truncate select-all"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        securityData?.quickLinks.field1 || '',
                        'link_field1'
                      )
                    }
                    className="label px-3.5 py-1.5 rounded-lg bg-blue text-ink font-bold text-xs hover:brightness-110 transition-all shrink-0 flex items-center gap-1"
                  >
                    <span>📋</span>
                    <span>{copiedKey === 'link_field1' ? '✓ Tersalin!' : 'Salin Link WA'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* KARTU 2: LAPANGAN 2 */}
            <div className="rounded-3xl border border-line bg-surface p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="px-3 py-1 rounded-full bg-emerald-500 text-ink font-display text-xs font-black uppercase">
                    Lapangan 2
                  </span>
                  <div>
                    <h3 className="font-display text-base font-bold text-text">
                      Kode Akses Konsol Lapangan 2
                    </h3>
                    <p className="text-[11px] text-muted">
                      Rute: <code>/lapangan/2</code>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted font-mono">Kode Saat Ini:</span>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-raise border border-line font-mono font-bold text-sm text-emerald-400">
                    <span>
                      {showCode.field2
                        ? securityData?.passcodes.field2 || 'LAP2-2026'
                        : '••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setShowCode((prev) => ({ ...prev, field2: !prev.field2 }))
                      }
                      className="text-xs text-muted hover:text-text ml-1"
                      title={showCode.field2 ? 'Sembunyikan' : 'Lihat'}
                    >
                      {showCode.field2 ? '👁️' : '🔒'}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        securityData?.passcodes.field2 || 'LAP2-2026',
                        'code_field2'
                      )
                    }
                    className="label px-3 py-1 rounded-xl border border-line text-xs hover:border-emerald-500 transition-colors"
                  >
                    {copiedKey === 'code_field2' ? '✓ Tersalin' : 'Salin Kode'}
                  </button>
                </div>
              </div>

              {/* Form Ganti Sandi Lapangan 2 */}
              <div className="grid sm:grid-cols-12 gap-3 items-end pt-1">
                <div className="sm:col-span-8">
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-muted font-bold mb-1">
                    Ubah Kode Akses Baru Lapangan 2:
                  </label>
                  <input
                    type="text"
                    value={editPasscode.field2}
                    onChange={(e) =>
                      setEditPasscode((prev) => ({ ...prev, field2: e.target.value }))
                    }
                    placeholder="Contoh: LAP2-2026"
                    className="w-full px-4 py-2 border border-line bg-raise/50 rounded-xl font-mono text-sm uppercase text-text focus:border-emerald-500 outline-none"
                  />
                </div>
                <div className="sm:col-span-4">
                  <button
                    type="button"
                    onClick={() => handleSavePasscode('field_2')}
                    disabled={savingPasscode === 'field_2'}
                    className="w-full h-10 rounded-xl bg-emerald-500 text-ink font-bold text-xs hover:brightness-110 transition-all flex items-center justify-center gap-2"
                  >
                    {savingPasscode === 'field_2' ? (
                      <span className="w-3.5 h-3.5 border-2 border-ink border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>💾 Simpan Sandi Baru</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Tautan Akses Instan WhatsApp Lapangan 2 */}
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <span>📲</span> Tautan Akses Cepat WhatsApp (Auto-Login Terenkripsi):
                  </span>
                  <span className="text-[10px] text-muted">Petugas tidak perlu ketik PIN</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={securityData?.quickLinks.field2 || ''}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-line bg-surface font-mono text-xs text-muted truncate select-all"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        securityData?.quickLinks.field2 || '',
                        'link_field2'
                      )
                    }
                    className="label px-3.5 py-1.5 rounded-lg bg-emerald-500 text-ink font-bold text-xs hover:brightness-110 transition-all shrink-0 flex items-center gap-1"
                  >
                    <span>📋</span>
                    <span>{copiedKey === 'link_field2' ? '✓ Tersalin!' : 'Salin Link WA'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* KARTU 3: PAPAN UPDATE SKOR */}
            <div className="rounded-3xl border border-line bg-surface p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="px-3 py-1 rounded-full bg-amber-500 text-ink font-display text-xs font-black uppercase">
                    Update Skor
                  </span>
                  <div>
                    <h3 className="font-display text-base font-bold text-text">
                      Kode Akses Papan Update Skor Panitia
                    </h3>
                    <p className="text-[11px] text-muted">
                      Rute: <code>/updateskor</code>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted font-mono">Kode Saat Ini:</span>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-raise border border-line font-mono font-bold text-sm text-amber-400">
                    <span>
                      {showCode.scorer
                        ? securityData?.passcodes.scorer || 'WASIT-2026'
                        : '••••••••'}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setShowCode((prev) => ({ ...prev, scorer: !prev.scorer }))
                      }
                      className="text-xs text-muted hover:text-text ml-1"
                      title={showCode.scorer ? 'Sembunyikan' : 'Lihat'}
                    >
                      {showCode.scorer ? '👁️' : '🔒'}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        securityData?.passcodes.scorer || 'WASIT-2026',
                        'code_scorer'
                      )
                    }
                    className="label px-3 py-1 rounded-xl border border-line text-xs hover:border-amber-500 transition-colors"
                  >
                    {copiedKey === 'code_scorer' ? '✓ Tersalin' : 'Salin Kode'}
                  </button>
                </div>
              </div>

              {/* Form Ganti Sandi Update Skor */}
              <div className="grid sm:grid-cols-12 gap-3 items-end pt-1">
                <div className="sm:col-span-8">
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-muted font-bold mb-1">
                    Ubah Kode Akses Baru Papan Update Skor:
                  </label>
                  <input
                    type="text"
                    value={editPasscode.scorer}
                    onChange={(e) =>
                      setEditPasscode((prev) => ({ ...prev, scorer: e.target.value }))
                    }
                    placeholder="Contoh: WASIT-2026"
                    className="w-full px-4 py-2 border border-line bg-raise/50 rounded-xl font-mono text-sm uppercase text-text focus:border-amber-400 outline-none"
                  />
                </div>
                <div className="sm:col-span-4">
                  <button
                    type="button"
                    onClick={() => handleSavePasscode('scorer')}
                    disabled={savingPasscode === 'scorer'}
                    className="w-full h-10 rounded-xl bg-amber-500 text-ink font-bold text-xs hover:brightness-110 transition-all flex items-center justify-center gap-2"
                  >
                    {savingPasscode === 'scorer' ? (
                      <span className="w-3.5 h-3.5 border-2 border-ink border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>💾 Simpan Sandi Baru</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Tautan Akses Instan WhatsApp Update Skor */}
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-400 flex items-center gap-1.5">
                    <span>📲</span> Tautan Akses Cepat WhatsApp (Auto-Login Terenkripsi):
                  </span>
                  <span className="text-[10px] text-muted">Panitia tidak perlu ketik PIN</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={securityData?.quickLinks.scorer || ''}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-line bg-surface font-mono text-xs text-muted truncate select-all"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        securityData?.quickLinks.scorer || '',
                        'link_scorer'
                      )
                    }
                    className="label px-3.5 py-1.5 rounded-lg bg-amber-500 text-ink font-bold text-xs hover:brightness-110 transition-all shrink-0 flex items-center gap-1"
                  >
                    <span>📋</span>
                    <span>{copiedKey === 'link_scorer' ? '✓ Tersalin!' : 'Salin Link WA'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB: CONTAINER ARSIP & FOKUS HARI ================= */}
      {activeTab === 'archives' && (
        <div className="space-y-6">
          {/* Card 1: Pengaturan Fokus Matchday (Besok U-12) */}
          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider mb-1">
                  <span>🎯</span>
                  <span>FOKUS MATCHDAY BERANDA & PANITIA</span>
                </div>
                <h2 className="font-display text-xl font-black text-text">
                  Kategori & Hari Pertandingan Aktif
                </h2>
                <p className="text-xs text-muted mt-1">
                  Tentukan kategori dan tanggal yang langsung menjadi fokus saat pengunjung membuka beranda atau panitia membuka konsol skor.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted font-mono">Fokus Saat Ini:</span>
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-bold text-xs">
                  {settings.active_category || 'U12'} ({settings.active_date || '2026-10-10'})
                </span>
              </div>
            </div>

            {/* Quick Switch Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Option 1: U-12 (Besok / Hari 2) */}
              <button
                type="button"
                onClick={() => handleSaveFocus('U12', '2026-10-10')}
                disabled={isSavingFocus}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  (settings.active_category === 'U12' || !settings.active_category) &&
                  settings.active_date === '2026-10-10'
                    ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30'
                    : 'border-line bg-raise/40 hover:bg-raise hover:border-line'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-emerald-400 uppercase">
                    🔥 REKOMENDASI BESOK
                  </span>
                  {settings.active_category === 'U12' && (
                    <span className="text-xs text-emerald-400 font-bold">✓ Aktif</span>
                  )}
                </div>
                <h3 className="font-display font-extrabold text-base text-text mt-1">
                  Kategori U-12 (Hari 2)
                </h3>
                <p className="text-[11px] text-muted mt-1 leading-snug">
                  Fokus penuh pada turnamen U-12 tanggal 10 Oktober 2026. Data U-10 akan tersimpan rapi di container arsip.
                </p>
                <div className="mt-3">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono text-[11px] font-bold">
                    Terapkan U-12 (10 Okt) ➔
                  </span>
                </div>
              </button>

              {/* Option 2: U-10 (Hari 1) */}
              <button
                type="button"
                onClick={() => handleSaveFocus('U10', '2026-10-09')}
                disabled={isSavingFocus}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  settings.active_category === 'U10' && settings.active_date === '2026-10-09'
                    ? 'border-blue bg-blue/10 ring-2 ring-blue/30'
                    : 'border-line bg-raise/40 hover:bg-raise hover:border-line'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-blue uppercase">HARI 1</span>
                  {settings.active_category === 'U10' && (
                    <span className="text-xs text-blue font-bold">✓ Aktif</span>
                  )}
                </div>
                <h3 className="font-display font-extrabold text-base text-text mt-1">
                  Kategori U-10 (Hari 1)
                </h3>
                <p className="text-[11px] text-muted mt-1 leading-snug">
                  Tampilkan jadwal dan skor kategori U-10 tanggal 9 Oktober 2026 sebagai fokus utama.
                </p>
                <div className="mt-3">
                  <span className="px-2.5 py-1 rounded-lg bg-blue/20 text-blue font-mono text-[11px] font-bold">
                    Terapkan U-10 (9 Okt) ➔
                  </span>
                </div>
              </button>

              {/* Option 3: Semua Kategori */}
              <button
                type="button"
                onClick={() => handleSaveFocus('Semua', '2026-10-10')}
                disabled={isSavingFocus}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  settings.active_category === 'Semua'
                    ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/30'
                    : 'border-line bg-raise/40 hover:bg-raise hover:border-line'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-amber-400 uppercase">
                    SEMUA USIA
                  </span>
                  {settings.active_category === 'Semua' && (
                    <span className="text-xs text-amber-400 font-bold">✓ Aktif</span>
                  )}
                </div>
                <h3 className="font-display font-extrabold text-base text-text mt-1">
                  Tampilkan Semua
                </h3>
                <p className="text-[11px] text-muted mt-1 leading-snug">
                  Tidak membatasi filter usia default pada dashboard publik dan konsol skor panitia.
                </p>
                <div className="mt-3">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-mono text-[11px] font-bold">
                    Terapkan Semua ➔
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Card 2: Container Arsip Turnamen Selesai */}
          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-amber-400 font-bold uppercase tracking-wider mb-1">
                  <span>📦</span>
                  <span>CONTAINER ARSIP HASIL PERTANDINGAN</span>
                </div>
                <h2 className="font-display text-xl font-black text-text">
                  Daftar Container Arsip Tersimpan
                </h2>
                <p className="text-xs text-muted mt-1">
                  Akumulasi data kategori pertandingan yang telah selesai dibekukan dalam container arsip dengan nama kustom, sehingga data tetap aman dan dapat diakses publik.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {archives.length === 0 && (
                  <button
                    type="button"
                    onClick={handleQuickArchiveU10}
                    disabled={isSavingArchive}
                    className="label inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold hover:bg-emerald-500/30 transition-all shadow-sm"
                  >
                    <span>⚡</span>
                    <span>Arsipkan U-10 Otomatis</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={openAddArchiveModal}
                  className="label inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-blue text-ink text-xs font-bold hover:opacity-90 transition-all shadow-sm"
                >
                  <span>➕</span>
                  <span>Buat Container Baru</span>
                </button>
              </div>
            </div>

            {/* List Containers */}
            {isLoadingArchives ? (
              <div className="flex justify-center py-10">
                <div className="w-7 h-7 border-3 border-blue border-t-transparent rounded-full animate-spin" />
              </div>
            ) : archives.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-line bg-raise/20">
                <span className="text-4xl">📦</span>
                <h3 className="font-display font-bold text-base text-text mt-2">
                  Belum Ada Container Arsip Manual yang Dibuat
                </h3>
                <p className="text-xs text-muted max-w-md mx-auto mt-1">
                  Sistem saat ini otomatis menyediakan fallback container U-10 di beranda publik. Anda dapat membuat container arsip dengan nama kustom sekarang agar tersimpan permanen di database.
                </p>
                <div className="mt-4 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleQuickArchiveU10}
                    disabled={isSavingArchive}
                    className="label inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-emerald-500 text-ink text-xs font-bold hover:opacity-90 transition-all shadow-sm"
                  >
                    <span>⚡ Buat Container Arsip U-10 Sekarang</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {archives.map((arc) => {
                  const snap = arc.snapshot_data;
                  return (
                    <div
                      key={arc.id}
                      className="rounded-2xl border border-line bg-raise/30 p-5 flex flex-col justify-between hover:border-amber-400/40 transition-all group"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono text-[11px] font-bold uppercase border border-amber-500/30">
                            {arc.category} • {arc.match_date}
                          </span>
                          <span className="text-[10px] text-muted font-mono">
                            Dibuat: {new Date(arc.created_at).toLocaleDateString('id-ID')}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-display font-black text-base text-text group-hover:text-amber-300 transition-colors">
                            {arc.name}
                          </h4>
                          {arc.description && (
                            <p className="text-xs text-muted mt-1 leading-relaxed">
                              {arc.description}
                            </p>
                          )}
                        </div>

                        {/* Ringkasan Snapshot Data */}
                        <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-surface/80 border border-line text-center text-xs font-mono">
                          <div>
                            <span className="text-[10px] text-muted block">Total Tim</span>
                            <strong className="text-text font-bold">
                              {snap?.total_teams ?? '–'}
                            </strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted block">Laga Selesai</span>
                            <strong className="text-emerald-400 font-bold">
                              {snap?.finished_matches ?? '–'}/{snap?.total_matches ?? '–'}
                            </strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted block">Juara 1</span>
                            <strong className="text-amber-300 font-bold truncate block">
                              {snap?.champion_name || '–'}
                            </strong>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-muted font-mono">
                          Status: <span className="text-emerald-400 font-semibold">Tersimpan di DB</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditArchiveModal(arc)}
                            className="label px-3 py-1.5 rounded-full border border-line bg-surface text-xs font-semibold text-text hover:border-amber-400 hover:text-amber-300 transition-colors"
                          >
                            ✏️ Ubah Nama
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteArchive(arc)}
                            className="label px-3 py-1.5 rounded-full border border-danger/30 bg-danger/10 text-xs font-semibold text-danger hover:bg-danger/20 transition-colors"
                          >
                            🗑️ Hapus
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 3: SPONSORSHIP & PARTNER ================= */}
      {activeTab === 'sponsors' && (
        <div className="space-y-6">
          {/* Action bar & Summary */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-line bg-surface p-5">
            <div>
              <h2 className="font-display text-lg font-bold text-text">
                Daftar Sponsor & Official Partner
              </h2>
              <p className="text-xs text-muted mt-0.5">
                Total {sponsors.length} sponsor terdaftar ({sponsors.filter((s) => s.active).length} aktif ditampilkan di publik).
              </p>
            </div>

            <button
              type="button"
              onClick={openAddSponsorModal}
              className="label inline-flex items-center gap-2 rounded-full bg-blue px-5 py-2.5 text-xs font-bold text-ink hover:opacity-90 transition-all shadow-sm"
            >
              <span>➕</span>
              <span>Tambah Sponsor Baru</span>
            </button>
          </div>

          {/* Sponsors List */}
          {isLoadingSponsors ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sponsors.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-line bg-surface/50 p-10 text-center">
              <div className="text-4xl mb-3">🤝</div>
              <h3 className="font-display text-base font-bold text-text">
                Belum Ada Sponsor Ditambahkan
              </h3>
              <p className="text-xs sm:text-sm text-muted mt-1 max-w-[45ch] mx-auto">
                Tambahkan logo dan identitas sponsor turnamen untuk ditampilkan di halaman publik secara elegan dan profesional.
              </p>
              <button
                type="button"
                onClick={openAddSponsorModal}
                className="mt-4 label inline-flex items-center gap-2 rounded-full bg-blue px-5 py-2 text-xs font-bold text-ink hover:opacity-90 transition-all"
              >
                <span>➕ Tambah Sponsor Sekarang</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sponsors.map((sponsor) => {
                const meta = TIER_META[sponsor.tier] || TIER_META.gold;
                return (
                  <div
                    key={sponsor.id}
                    className={`rounded-2xl border transition-all p-4.5 bg-surface ${
                      sponsor.active ? 'border-line shadow-sm' : 'border-line/40 opacity-70'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Logo Preview box (transparency friendly) */}
                      <div className="flex-none w-18 h-18 sm:w-20 sm:h-20 rounded-xl border border-line/70 bg-ink/30 p-2 flex items-center justify-center overflow-hidden">
                        {sponsor.logo_url ? (
                          <img
                            src={sponsor.logo_url}
                            alt={sponsor.name}
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <span className="text-xs text-muted">No Logo</span>
                        )}
                      </div>

                      {/* Sponsor Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`label text-[10px] px-2.5 py-0.5 rounded-full font-bold ${meta.badgeClass}`}
                          >
                            {meta.icon} {meta.label}
                          </span>
                          <span className="text-[11px] font-mono text-muted">
                            #{sponsor.display_order ?? 0}
                          </span>
                        </div>

                        <h3 className="font-display text-base font-bold text-text truncate mt-1">
                          {sponsor.name}
                        </h3>

                        {sponsor.website_url ? (
                          <a
                            href={sponsor.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue hover:underline truncate block mt-0.5"
                          >
                            🔗 {sponsor.website_url}
                          </a>
                        ) : (
                          <span className="text-xs text-muted block mt-0.5">
                            Tanpa tautan eksternal
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom controls */}
                    <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between gap-3">
                      {/* Toggle Active status */}
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={sponsor.active}
                          onChange={() => handleToggleSponsorActive(sponsor)}
                          className="h-4 w-4 rounded border-line text-blue focus:ring-blue"
                        />
                        <span
                          className={`text-xs font-semibold ${
                            sponsor.active ? 'text-blue' : 'text-muted'
                          }`}
                        >
                          {sponsor.active ? 'Aktif (Tampil)' : 'Nonaktif (Disembunyikan)'}
                        </span>
                      </label>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditSponsorModal(sponsor)}
                          className="label px-3 py-1.5 rounded-full border border-line bg-surface text-xs font-semibold text-text hover:border-blue hover:text-blue transition-colors"
                        >
                          ✏️ Ubah
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSponsor(sponsor)}
                          className="label px-3 py-1.5 rounded-full border border-danger/30 bg-danger/10 text-xs font-semibold text-danger hover:bg-danger/20 transition-colors"
                        >
                          🗑️ Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: ZONA BERBAHAYA ================= */}
      {activeTab === 'danger' && (
        <div className="bg-danger/10 rounded-[28px] border border-danger/40 overflow-hidden">
          <div className="p-6 md:p-8">
            <h2 className="text-lg font-bold text-danger mb-2">Zona Berbahaya Turnamen</h2>
            <p className="text-sm text-danger mb-4">
              Mereset data akan menghapus semua tim dan jadwal pertandingan secara permanen. Tindakan ini tidak bisa dibatalkan.
            </p>

            {!showResetConfirm ? (
              <button
                onClick={() => {
                  setShowResetConfirm(true);
                  setMessage(null);
                }}
                className="px-5 py-2.5 bg-danger hover:opacity-90 text-white font-bold rounded-full transition-colors text-sm shadow-md"
              >
                Reset Semua Data Turnamen
              </button>
            ) : (
              <div className="bg-surface p-5 rounded-2xl border border-red-300 space-y-3">
                <p className="font-bold text-text">
                  Apakah Anda benar-benar yakin ingin mereset data?
                </p>
                <p className="text-xs sm:text-sm text-text">
                  Ketik <strong className="text-danger font-mono font-bold">RESET</strong> untuk mengonfirmasi.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.toUpperCase())}
                    placeholder="RESET"
                    className="px-4 py-2 border border-line bg-surface rounded-full focus:ring-red-500 focus:border-red-500 outline-none w-28 uppercase font-mono text-center font-bold"
                  />
                  <button
                    onClick={handleReset}
                    disabled={resetCode !== 'RESET' || isResetting}
                    className="px-5 py-2 bg-danger hover:opacity-90 disabled:opacity-50 text-white font-bold rounded-full transition-colors text-sm"
                  >
                    {isResetting ? 'Mereset Data...' : 'Konfirmasi Reset'}
                  </button>
                  <button
                    onClick={() => {
                      setShowResetConfirm(false);
                      setResetCode('');
                    }}
                    className="px-4 py-2 bg-raise hover:bg-line text-text font-semibold rounded-full transition-colors text-sm"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL TAMBAH / UBAH SPONSOR ================= */}
      {isSponsorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-line bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <h2 className="font-display text-xl font-extrabold text-text">
                {editingSponsor ? 'Ubah Data Sponsor' : 'Tambah Sponsor Baru'}
              </h2>
              <button
                type="button"
                onClick={closeSponsorModal}
                className="label h-8 w-8 rounded-full border border-line flex items-center justify-center text-muted hover:text-text hover:border-text transition-colors"
                aria-label="Tutup modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSponsorSubmit} className="space-y-5 p-6">
              {sponsorActionMessage && (
                <div
                  className={`p-3.5 rounded-2xl text-xs sm:text-sm font-semibold ${
                    sponsorActionMessage.type === 'success'
                      ? 'bg-blue/10 text-blue border border-blue/40'
                      : 'bg-danger/10 text-danger border border-danger/40'
                  }`}
                >
                  {sponsorActionMessage.text}
                </div>
              )}

              {/* Nama Sponsor */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                  Nama Sponsor / Brand *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: PT Sumber Berkah / Bank Mandiri"
                  value={sponsorFormData.name}
                  onChange={(e) =>
                    setSponsorFormData({ ...sponsorFormData, name: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-line bg-surface rounded-xl focus:ring-2 focus:ring-blue focus:border-blue outline-none text-text text-sm"
                />
              </div>

              {/* Kategori / Tier */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-2">
                  Tingkatan Sponsor (Tier)
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {(['platinum', 'gold', 'silver', 'partner'] as SponsorTier[]).map((t) => {
                    const meta = TIER_META[t];
                    const isSelected = sponsorFormData.tier === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSponsorFormData({ ...sponsorFormData, tier: t })}
                        className={`text-left p-3 rounded-xl border transition-all ${
                          isSelected
                            ? 'border-blue bg-blue/10 ring-1 ring-blue'
                            : 'border-line bg-surface/70 hover:border-line hover:bg-raise'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-xs font-bold text-text">
                          <span>{meta.icon}</span>
                          <span>{meta.label}</span>
                        </div>
                        <p className="text-[11px] text-muted mt-1 leading-snug">
                          {meta.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Logo Sponsor Upload & Preview */}
              <div className="rounded-2xl border border-line bg-raise/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted">
                    Logo Sponsor (Transparan) *
                  </label>
                  {sponsorFormData.logo_url && (
                    <button
                      type="button"
                      onClick={() => setSponsorFormData({ ...sponsorFormData, logo_url: '' })}
                      className="text-[11px] text-danger hover:underline"
                    >
                      Hapus Logo
                    </button>
                  )}
                </div>

                {/* Live Preview */}
                {sponsorFormData.logo_url ? (
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-20 rounded-xl border border-line bg-ink/40 p-2 flex items-center justify-center overflow-hidden">
                      <img
                        src={sponsorFormData.logo_url}
                        alt="Preview Logo"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="text-xs text-muted">
                      <p className="font-semibold text-text">Logo Siap Dipasang</p>
                      <p className="text-[11px] mt-0.5">
                        Format terkompresi otomatis menjaga transparansi dan responsivitas.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-line p-3 text-center text-xs text-muted">
                    Pilih file gambar atau masukkan URL logo di bawah.
                  </div>
                )}

                {/* Upload File Button */}
                <div className="flex flex-wrap items-center gap-2">
                  <label className="label cursor-pointer rounded-full border border-line bg-surface px-4 py-2 text-xs font-semibold text-text hover:border-blue hover:text-blue transition-colors">
                    📁 Unggah Gambar Logo (PNG / WebP / SVG)
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoFileUpload}
                    />
                  </label>
                </div>

                {/* URL Input */}
                <div>
                  <input
                    type="text"
                    placeholder="Atau URL logo (misal: /logoutama.png atau https://...)"
                    value={sponsorFormData.logo_url}
                    onChange={(e) =>
                      setSponsorFormData({ ...sponsorFormData, logo_url: e.target.value })
                    }
                    className="w-full px-3.5 py-2 border border-line bg-surface rounded-xl text-xs text-text outline-none focus:border-blue"
                  />
                </div>
              </div>

              {/* Website URL */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                  Tautan Website / Instagram Resmi (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="https://sponsor.com atau https://instagram.com/..."
                  value={sponsorFormData.website_url || ''}
                  onChange={(e) =>
                    setSponsorFormData({ ...sponsorFormData, website_url: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-line bg-surface rounded-xl focus:ring-2 focus:ring-blue focus:border-blue outline-none text-text text-sm"
                />
              </div>

              {/* Urutan Tampilan & Status Aktif */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    Urutan Tampilan
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={sponsorFormData.display_order ?? 0}
                    onChange={(e) =>
                      setSponsorFormData({
                        ...sponsorFormData,
                        display_order: parseInt(e.target.value, 10) || 0,
                      })
                    }
                    className="w-full px-4 py-2.5 border border-line bg-surface rounded-xl focus:ring-2 focus:ring-blue focus:border-blue outline-none text-text text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    Status Tampilan
                  </label>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={sponsorFormData.active}
                      onChange={(e) =>
                        setSponsorFormData({ ...sponsorFormData, active: e.target.checked })
                      }
                      className="h-4 w-4 rounded border-line text-blue focus:ring-blue"
                    />
                    <span className="text-xs font-semibold text-text">
                      {sponsorFormData.active ? 'Aktif di Beranda' : 'Nonaktif'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-line flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={closeSponsorModal}
                  className="px-5 py-2.5 rounded-full border border-line text-xs font-semibold text-text hover:bg-raise transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingSponsor}
                  className="px-6 py-2.5 rounded-full bg-blue text-ink font-bold text-xs hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm"
                >
                  {isSavingSponsor ? (
                    <div className="w-4 h-4 border-2 border-ink border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>{editingSponsor ? 'Simpan Perubahan' : 'Tambahkan Sponsor'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL TAMBAH / UBAH CONTAINER ARSIP ================= */}
      {isArchiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-line bg-surface shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <h2 className="font-display text-xl font-extrabold text-text">
                {editingArchive ? 'Ubah Container Arsip' : 'Buat Container Arsip Baru'}
              </h2>
              <button
                type="button"
                onClick={closeArchiveModal}
                className="label h-8 w-8 rounded-full border border-line flex items-center justify-center text-muted hover:text-text hover:border-text transition-colors"
                aria-label="Tutup modal"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleArchiveSubmit} className="space-y-5 p-6">
              {archiveActionMessage && (
                <div
                  className={`p-3.5 rounded-2xl text-xs sm:text-sm font-semibold ${
                    archiveActionMessage.type === 'success'
                      ? 'bg-blue/10 text-blue border border-blue/40'
                      : 'bg-danger/10 text-danger border border-danger/40'
                  }`}
                >
                  {archiveActionMessage.text}
                </div>
              )}

              {/* Custom Nama Container */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                  Nama Kustom Container Arsip *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Arsip Pertandingan U-10 (Selesai Hari 1)"
                  value={archiveFormData.name}
                  onChange={(e) =>
                    setArchiveFormData({ ...archiveFormData, name: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-line bg-surface rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none text-text text-sm"
                />
                <p className="text-[11px] text-muted mt-1">
                  Nama ini akan ditampilkan sebagai judul container di beranda publik.
                </p>
              </div>

              {/* Kategori & Tanggal (hanya bisa diubah saat pembuatan baru) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    Kategori Usia
                  </label>
                  <select
                    disabled={!!editingArchive}
                    value={archiveFormData.category}
                    onChange={(e) =>
                      setArchiveFormData({ ...archiveFormData, category: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-line bg-surface rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none text-text text-sm disabled:opacity-60"
                  >
                    <option value="U10">U-10 (Usia 10)</option>
                    <option value="U12">U-12 (Usia 12)</option>
                    <option value="Semua">Semua Kategori</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                    Tanggal Pertandingan
                  </label>
                  <input
                    type="date"
                    disabled={!!editingArchive}
                    value={archiveFormData.match_date}
                    onChange={(e) =>
                      setArchiveFormData({ ...archiveFormData, match_date: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-line bg-surface rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none text-text text-sm disabled:opacity-60 font-mono"
                  />
                </div>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">
                  Catatan / Deskripsi Tambahan
                </label>
                <textarea
                  rows={3}
                  placeholder="Catatan turnamen: Seluruh laga U-10 telah diselesaikan, juara diraih oleh..."
                  value={archiveFormData.description}
                  onChange={(e) =>
                    setArchiveFormData({ ...archiveFormData, description: e.target.value })
                  }
                  className="w-full px-4 py-2.5 border border-line bg-surface rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none text-text text-sm"
                />
              </div>

              {!editingArchive && (
                <div className="rounded-xl border border-blue/20 bg-blue/5 p-3 text-xs text-muted leading-relaxed">
                  💡 <strong className="text-text">Snapshot Otomatis:</strong> Saat container disimpan, sistem akan secara otomatis mengumpulkan seluruh skor laga, klasemen grup, dan bracket bagan gugur untuk kategori ini dan membekukannya.
                </div>
              )}

              {/* Buttons */}
              <div className="pt-3 border-t border-line flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={closeArchiveModal}
                  className="px-5 py-2.5 rounded-full border border-line text-xs font-semibold text-text hover:bg-raise transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingArchive}
                  className="px-6 py-2.5 rounded-full bg-amber-400 text-ink font-bold text-xs hover:brightness-110 transition-opacity flex items-center gap-2 shadow-sm"
                >
                  {isSavingArchive ? (
                    <div className="w-4 h-4 border-2 border-ink border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>{editingArchive ? 'Simpan Perubahan' : 'Bekukan & Buat Container'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
