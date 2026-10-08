'use client';

import { useState } from 'react';
import { getInitials } from '@/lib/utils';

export interface MonogramProps {
  name: string;
  shortName?: string | null;
  logoUrl?: string | null;
  color?: string | null;
  size?: number;
  className?: string;
}

/**
 * Komponen Logo Tim / Monogram.
 * - Jika tim memiliki logo_url: Menampilkan logo asli tim secara bersih TANPA BACKGROUND (bg-transparent),
 *   dengan aspect ratio terjaga sempurna (object-contain) dan drop-shadow lembut.
 * - Jika tanpa logo: Menampilkan fallback inisial tim dengan desain modern transparan,
 *   tanpa background solid kaku yang mengganggu.
 */
export default function Monogram({
  name,
  shortName,
  logoUrl,
  color,
  size = 40,
  className = '',
}: MonogramProps) {
  const [imgError, setImgError] = useState(false);
  const initials = (shortName?.trim() || getInitials(name || 'Tim')).toUpperCase().slice(0, 3);
  const accentColor = color?.trim() || '#5B8DFF';

  const hasLogo = Boolean(logoUrl && logoUrl.trim() && !imgError);

  if (hasLogo) {
    return (
      <span
        aria-hidden
        className={`relative inline-flex flex-none items-center justify-center bg-transparent select-none transition-transform duration-300 group-hover:scale-105 ${className}`}
        style={{
          width: size,
          height: size,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl!}
          alt={name}
          loading="lazy"
          onError={() => setImgError(true)}
          className="h-full w-full object-contain filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)]"
        />
      </span>
    );
  }

  // Fallback Monogram Bersih TANPA BG SOLID
  return (
    <span
      aria-hidden
      className={`relative inline-grid flex-none place-items-center rounded-2xl border bg-white/[0.04] backdrop-blur-[2px] transition-all duration-300 group-hover:border-blue/60 group-hover:bg-blue/10 ${className}`}
      style={{
        width: size,
        height: size,
        borderColor: `${accentColor}40`, // Aksen warna tim tipis transparan (25% opacity)
        color: '#F4F7FC',
        fontSize: Math.max(10, Math.round(size * 0.34)),
        fontFamily: 'var(--font-display)',
        fontWeight: 800,
        letterSpacing: '-0.02em',
      }}
    >
      <span
        className="text-text drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
        style={{
          color: accentColor.toLowerCase() === '#ffffff' ? '#FFFFFF' : undefined,
        }}
      >
        {initials}
      </span>
    </span>
  );
}