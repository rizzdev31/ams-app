'use client';

import { useState } from 'react';
import type { Team, TeamFormData } from '@/lib/types';
import Monogram from '@/components/Monogram';
import CategoryMark from '@/components/CategoryMark';
import { announceChangeEverywhere, teamsStore, useResource } from '@/lib/live-store';
import { toast } from '@/components/Toast';

const EMPTY: TeamFormData = {
  name: '',
  short_name: '',
  group_name: 'A',
  color: '#5B8DFF',
  logo_url: '',
  category: 'U10',
};

export default function TimPanitia() {
  //. Store yang sama dengan halaman Tim publik: ubah tim di sini, daftar
  // publik ikut berubah seketika.
  const [teams, online, reload] = useResource(teamsStore);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState<TeamFormData>(EMPTY);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isLoading = teams.length === 0 && !online;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.short_name.trim().length !== 3) {
      const err = 'Singkatan tim harus tepat 3 huruf.';
      setMessage({ type: 'error', text: err });
      toast.error(err);
      return;
    }
    try {
      const url = editingId ? `/api/teams/${editingId}` : '/api/teams';
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, short_name: formData.short_name.toUpperCase() }),
      });
      if (res.ok) {
        closeForm();
        void teamsStore.refresh();
        announceChangeEverywhere();
        const successMsg = editingId ? 'Tim berhasil diperbarui.' : 'Tim berhasil ditambahkan.';
        setMessage({
          type: 'success',
          text: successMsg,
        });
        toast.success(successMsg);
      } else {
        const err = await res.json().catch(() => ({}));
        const errMsg = err.error || 'Terjadi kesalahan.';
        setMessage({ type: 'error', text: errMsg });
        toast.error(errMsg);
      }
    } catch {
      setMessage({ type: 'error', text: 'Kesalahan jaringan.' });
      toast.error('Kesalahan jaringan.');
    }
  };

  const confirmDeleteTeam = async () => {
    if (!deletingTeam) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/teams/${deletingTeam.id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeletingTeam(null);
        void teamsStore.refresh();
        announceChangeEverywhere();
        setMessage({ type: 'success', text: 'Tim berhasil dihapus.' });
        toast.success('Tim berhasil dihapus.');
      } else {
        const err = await res.json().catch(() => ({}));
        const errMsg = err.error || 'Gagal menghapus tim.';
        setMessage({ type: 'error', text: errMsg });
        toast.error(errMsg);
      }
    } catch {
      setMessage({ type: 'error', text: 'Kesalahan jaringan saat menghapus tim.' });
      toast.error('Kesalahan jaringan saat menghapus tim.');
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditForm = (team: Team) => {
    setFormData({
      name: team.name,
      short_name: team.short_name,
      group_name: team.group_name,
      color: team.color || '#5B8DFF',
      logo_url: team.logo_url || '',
      category: team.category ?? 'U10',
    });
    setEditingId(team.id);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setFormData(EMPTY);
  };

  if (isLoading) {
    return <div className="h-40 animate-skeleton rounded-[28px] bg-raise" />;
  }

  const input =
    'h-12 w-full rounded-full border border-line bg-surface px-4 text-base text-text outline-none transition-colors focus:border-blue';

  return (
    <div className="space-y-6">
      {message && (
        <p
          className={`rounded-full border border-line px-5 py-3 text-sm ${
            message.type === 'success' ? 'text-blue' : 'text-danger'
          }`}
        >
          {message.text}
        </p>
      )}

      {!online && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-full border border-danger/40 bg-danger/10 px-5 py-3">
          <p className="text-sm text-danger">Data tidak dapat dimuat.</p>
          <button onClick={reload} className="label text-text">
            Coba lagi
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="rule-title font-display text-3xl font-extrabold">Tim</h1>
        <button onClick={() => setIsFormOpen(true)} className="label h-12 rounded-full bg-blue px-6 text-ink">
          Tambah tim
        </button>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[28px] border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <h2 className="font-display text-xl font-extrabold">
                {editingId ? 'Ubah tim' : 'Tambah tim'}
              </h2>
              <button onClick={closeForm} className="label h-9 px-3 text-muted" aria-label="Tutup">
                Tutup
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
              <div>
                <label htmlFor="t-name" className="label block text-muted">
                  Nama tim
                </label>
                <input
                  id="t-name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`${input} mt-1.5`}
                />
              </div>
              <div>
                <span className="label block text-muted">Kategori</span>
                <div className="pill mt-1.5 w-full gap-0.5 p-1" role="group" aria-label="Kategori">
                  {['U10', 'U12'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          category: c,
                          group_name: c === 'U12' ? 'W' : 'A',
                        }))
                      }
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="t-short" className="label block text-muted">
                    Singkatan (3 huruf)
                  </label>
                  <input
                    id="t-short"
                    type="text"
                    required
                    maxLength={3}
                    value={formData.short_name}
                    onChange={(e) =>
                      setFormData({ ...formData, short_name: e.target.value.toUpperCase() })
                    }
                    className={`${input} mt-1.5 font-mono uppercase`}
                  />
                </div>
                <div>
                  <label htmlFor="t-group" className="label block text-muted">
                    Grup
                  </label>
                  <select
                    id="t-group"
                    value={formData.group_name}
                    onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                    className={`${input} mt-1.5`}
                  >
                    {(formData.category === 'U12' ? ['W', 'X', 'Y', 'Z'] : ['A', 'B', 'C', 'D']).map((g) => (
                      <option key={g} value={g}>
                        Grup {g}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="t-color" className="label block text-muted">
                  Warna tim
                </label>
                <div className="mt-1.5 flex items-center gap-3">
                  <input
                    id="t-color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="h-12 w-16 cursor-pointer rounded-full border border-line bg-surface p-1"
                  />
                  <span className="label text-muted">{formData.color}</span>
                </div>
              </div>

              {/* Setting Logo Tim (Tanpa Background) */}
              <div className="rounded-2xl border border-line bg-raise/40 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="t-logo" className="label block text-muted">
                    Logo Tim (Tanpa Background)
                  </label>
                  {formData.logo_url && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, logo_url: '' })}
                      className="text-[11px] text-danger hover:underline"
                    >
                      Hapus Logo
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                  <div className="space-y-2 min-w-0">
                    <input
                      id="t-logo"
                      type="text"
                      placeholder="URL logo atau /logoutama.png"
                      value={formData.logo_url || ''}
                      onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                      className="h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-text outline-none focus:border-blue"
                    />

                    <div className="flex flex-wrap items-center gap-2">
                      <label className="label cursor-pointer rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs text-text hover:border-blue hover:text-blue transition-colors">
                        📁 Pilih File Logo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 2 * 1024 * 1024) {
                                alert('Ukuran logo maksimal 2MB.');
                                return;
                              }
                              const img = new Image();
                              const objectUrl = URL.createObjectURL(file);
                              img.onload = () => {
                                URL.revokeObjectURL(objectUrl);
                                const canvas = document.createElement('canvas');
                                const maxDim = 160;
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
                                  const compressedDataUrl = canvas.toDataURL('image/webp', 0.88);
                                  setFormData((prev) => ({ ...prev, logo_url: compressedDataUrl }));
                                }
                              };
                              img.onerror = () => {
                                URL.revokeObjectURL(objectUrl);
                                alert('Gagal membaca gambar logo.');
                              };
                              img.src = objectUrl;
                            }
                          }}
                        />
                      </label>
                      <span className="text-[11px] text-muted">PNG transparan disarankan</span>
                    </div>
                  </div>

                  {/* Preview Logo Transparan */}
                  <div className="flex flex-col items-center justify-center p-2 rounded-xl border border-line/60 bg-ink/70 w-16 h-16 flex-none">
                    <Monogram
                      name={formData.name || 'Tim'}
                      shortName={formData.short_name || 'TIM'}
                      logoUrl={formData.logo_url}
                      color={formData.color}
                      size={44}
                    />
                  </div>
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
                <button type="submit" className="label h-12 flex-1 rounded-full bg-blue text-ink">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-[28px] border border-line">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="border-b border-line bg-surface">
              <th scope="col" className="label px-5 py-4 text-left text-muted">
                Tim
              </th>
              <th scope="col" className="label px-5 py-4 text-left text-muted">
                Kategori
              </th>
              <th scope="col" className="label px-5 py-4 text-left text-muted">
                Grup
              </th>
              <th scope="col" className="label px-5 py-4 text-right text-muted">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {teams.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-muted">
                  Belum ada tim terdaftar.
                </td>
              </tr>
            ) : (
              teams.map((team) => (
                <tr key={team.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-3">
                      <Monogram
                        name={team.name}
                        shortName={team.short_name}
                        logoUrl={team.logo_url}
                        color={team.color}
                        size={36}
                      />
                      <span>
                        <span className="block font-bold">{team.name}</span>
                        <span className="label text-muted">{team.short_name}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <CategoryMark category={team.category ?? 'U10'} />
                  </td>
                  <td className="px-5 py-3">Grup {team.group_name}</td>
                  <td className="px-5 py-3 text-right">
                    <span className="inline-flex gap-2">
                      <button
                        onClick={() => openEditForm(team)}
                        className="label h-11 rounded-full border border-line px-4"
                      >
                        Ubah
                      </button>
                      <button
                        onClick={() => setDeletingTeam(team)}
                        className="label h-11 rounded-full border border-danger/40 px-4 text-danger"
                      >
                        Hapus
                      </button>
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {deletingTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-[28px] border border-line bg-surface p-6 text-center">
            <h3 className="font-display text-xl font-extrabold">Hapus tim?</h3>
            <p className="mt-2 text-sm text-muted">
              Tim {deletingTeam.name} akan dihapus permanen. Tim yang sudah punya
              pertandingan tidak dapat dihapus.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingTeam(null)}
                className="label h-12 flex-1 rounded-full border border-line"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDeleteTeam}
                className="label h-12 flex-1 rounded-full bg-danger text-white"
              >
                {isDeleting ? 'Menghapus…' : 'Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}