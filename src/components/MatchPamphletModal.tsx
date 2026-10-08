'use client';

import React, { useRef, useState, useEffect } from 'react';
import { toPng, toBlob } from 'html-to-image';
import type { MatchWithTeams, MatchEvent, Sponsor } from '@/lib/types';
import MatchPamphlet from './MatchPamphlet';
import { toast } from '@/components/Toast';

interface MatchPamphletModalProps {
  match: MatchWithTeams | null;
  events?: MatchEvent[];
  isOpen: boolean;
  onClose: () => void;
}

export default function MatchPamphletModal({
  match,
  events = [],
  isOpen,
  onClose,
}: MatchPamphletModalProps) {
  const pamphletRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'fit' | 'full'>('fit');
  const [scale, setScale] = useState(0.55);

  // Ambil sponsorship aktif dari API aplikasi
  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/sponsors')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setSponsors(json.data);
        }
      })
      .catch((err) => {
        console.warn('Gagal memuat sponsor untuk pamflet:', err);
      });
  }, [isOpen]);

  // Keyboard escape handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Auto-scale handler agar pamflet 1080x1350 pas di viewport saat preview
  useEffect(() => {
    if (!isOpen) return;

    const updateScale = () => {
      if (!containerRef.current) return;
      if (previewMode === 'full') {
        setScale(1.0);
        return;
      }
      const availableWidth = containerRef.current.clientWidth - 48;
      const availableHeight = containerRef.current.clientHeight - 48;
      if (availableWidth <= 0 || availableHeight <= 0) return;

      const scaleX = availableWidth / 1080;
      const scaleY = availableHeight / 1350;
      const targetScale = Math.min(scaleX, scaleY);
      // Batasi skala minimum 0.25 (untuk layar hp kecil) dan maksimum 0.85
      setScale(Math.max(0.25, Math.min(targetScale, 0.85)));
    };

    updateScale();
    const handleResize = () => updateScale();
    window.addEventListener('resize', handleResize);
    const timeout = setTimeout(updateScale, 120);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeout);
    };
  }, [isOpen, previewMode]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const getFileName = () => {
    if (!match) return 'pamflet-pertandingan.png';
    const cat = match.category || 'U10';
    const a = (match.team_a?.short_name || 'TIMA').replace(/[^a-zA-Z0-9]/g, '');
    const b = (match.team_b?.short_name || 'TIMB').replace(/[^a-zA-Z0-9]/g, '');
    return `pamflet-1080x1350-${cat}-${a}-vs-${b}-${match.score_a ?? 0}-${match.score_b ?? 0}.png`;
  };

  // Opsi export standar tepat 1080 x 1350 piksel
  const getExportOptions = () => ({
    width: 1080,
    height: 1350,
    canvasWidth: 1080,
    canvasHeight: 1350,
    pixelRatio: 1, // Menghasilkan tepat 1080 x 1350 piksel
    cacheBust: true,
    quality: 0.98,
    style: {
      transform: 'none',
      transformOrigin: 'top left',
      margin: '0',
    },
  });

  // 1. Aksi Unduh Gambar PNG 1080x1350
  const handleDownload = async () => {
    if (!pamphletRef.current) return;
    setIsGenerating(true);
    toast.info('Menyiapkan pamflet HD 1080x1350...');
    try {
      if (document.fonts) await document.fonts.ready;

      const dataUrl = await toPng(pamphletRef.current, getExportOptions());

      const link = document.createElement('a');
      link.download = getFileName();
      link.href = dataUrl;
      link.click();

      showToast('✅ Pamflet 1080x1350 berhasil diunduh ke galeri/komputer!');
      toast.success('Pamflet 1080x1350 berhasil diunduh!');
    } catch (err) {
      console.error('Gagal generate pamflet PNG:', err);
      showToast('❌ Gagal mengunduh pamflet. Silakan coba lagi.');
      toast.error('Gagal mengunduh pamflet.');
    } finally {
      setIsGenerating(false);
    }
  };

  // 2. Aksi Salin Gambar ke Clipboard (Bisa langsung Ctrl+V di WhatsApp Web)
  const handleCopy = async () => {
    if (!pamphletRef.current) return;
    setIsGenerating(true);
    toast.info('Menyalin pamflet ke clipboard...');
    try {
      if (document.fonts) await document.fonts.ready;

      const blob = await toBlob(pamphletRef.current, getExportOptions());

      if (!blob) throw new Error('Blob gagal dibuat');

      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        showToast('📋 Gambar 1080x1350 disalin! Tempel (Ctrl+V) langsung di WhatsApp.');
        toast.success('Pamflet disalin! Tempel (Ctrl+V) di WhatsApp.');
      } else {
        handleDownload();
      }
    } catch (err) {
      console.error('Gagal copy image:', err);
      showToast('⚠️ Salin langsung tidak didukung browser, mengunduh file...');
      toast.warning('Browser tidak mendukung salin langsung, mengunduh...');
      handleDownload();
    } finally {
      setIsGenerating(false);
    }
  };

  // 3. Aksi Bagikan Langsung (Web Share API di Smartphone)
  const handleShare = async () => {
    if (!pamphletRef.current) return;
    setIsGenerating(true);
    toast.info('Membuka menu bagikan...');
    try {
      if (document.fonts) await document.fonts.ready;

      const blob = await toBlob(pamphletRef.current, getExportOptions());

      if (!blob) throw new Error('Blob gagal dibuat');

      const fileName = getFileName();
      const file = new File([blob], fileName, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Hasil Pertandingan An-Nur Mini Soccer 2026',
          text: `Hasil Laga ${match?.category || 'U10'}: ${match?.team_a?.name} (${match?.score_a}) vs (${match?.score_b}) ${match?.team_b?.name}. Simak laporan resmi turnamen!`,
        });
        showToast('✅ Berhasil dibagikan!');
        toast.success('Pamflet berhasil dibagikan!');
      } else {
        handleDownload();
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Gagal membagikan pamflet:', err);
        toast.error('Gagal membagikan pamflet.');
        handleDownload();
      }
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen || !match) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pamflet Hasil Pertandingan 1080x1350"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-reveal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative flex h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-slate-700/80 bg-slate-950 shadow-2xl">
        {/* Header Modal Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/95 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 font-bold border border-blue-400/30 text-lg">
              🖼️
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base font-black text-white leading-tight">
                  Pamflet Pertandingan Resmi
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-[10px] font-mono font-bold text-cyan-300">
                  1080 × 1350 px (4:5)
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Desain futuristik tanpa rectangle kaku · Standar Feed Instagram & Status WA
              </p>
            </div>
          </div>

          {/* Action & Preview Controls Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle Preview Zoom */}
            <div className="inline-flex rounded-xl bg-slate-800 p-1 border border-slate-700 text-xs font-mono font-bold">
              <button
                type="button"
                onClick={() => setPreviewMode('fit')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  previewMode === 'fit'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Tampilan pas layar otomatis"
              >
                Pas Layar ({Math.round(scale * 100)}%)
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode('full')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  previewMode === 'full'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Tampilan ukuran asli 1080x1350"
              >
                100%
              </button>
            </div>

            {/* Tombol Salin */}
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-all active:scale-95 disabled:opacity-50"
              title="Salin gambar ke papan klip untuk langsung dipaste di WhatsApp Web"
            >
              <span>📋</span>
              <span className="hidden sm:inline">Salin</span>
            </button>

            {/* Tombol Bagikan (Mobile Share) */}
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/20 hover:bg-emerald-500/30 text-xs font-bold text-emerald-300 transition-all active:scale-95 disabled:opacity-50"
              title="Bagikan ke WhatsApp, Instagram, dll"
            >
              <span>📱</span>
              <span className="hidden sm:inline">Bagikan</span>
            </button>

            {/* Tombol Unduh Utama */}
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-xs font-black text-white shadow-lg shadow-blue-500/25 transition-all active:scale-95 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Merender...</span>
                </>
              ) : (
                <>
                  <span>📥</span>
                  <span>Unduh PNG</span>
                </>
              )}
            </button>

            {/* Tombol Tutup */}
            <button
              type="button"
              onClick={onClose}
              className="ml-2 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Toast Notifikasi */}
        {toastMessage && (
          <div className="bg-blue-600/90 border-b border-blue-400/30 px-4 py-2 text-center text-xs font-bold text-white shadow-md animate-fade-in">
            {toastMessage}
          </div>
        )}

        {/* Scrollable Container dengan Scaled Preview */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-6 flex justify-center items-start bg-[#030611]"
        >
          <div
            className="flex-none shadow-2xl transition-all duration-200"
            style={{
              width: 1080 * scale,
              height: 1350 * scale,
            }}
          >
            <div
              style={{
                width: 1080,
                height: 1350,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }}
            >
              <MatchPamphlet
                ref={pamphletRef}
                match={match}
                events={events}
                sponsors={sponsors}
              />
            </div>
          </div>
        </div>

        {/* Footer Modal Info */}
        <div className="border-t border-slate-800/80 bg-slate-900/60 px-5 py-3 flex flex-wrap items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
            <span>Resolusi Asli: <strong>1080 × 1350 Piksel</strong> (Instagram Portrait 4:5 Ready)</span>
          </div>
          <div className="font-mono text-[11px] text-slate-500">
            {getFileName()}
          </div>
        </div>
      </div>
    </div>
  );
}
