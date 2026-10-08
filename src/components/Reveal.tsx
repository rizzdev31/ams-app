'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/**
 * Muncul saat elemen masuk layar, bukan saat halaman dimuat.
 *
 * Ini yang membuat halaman terasa hidup saat digulir: elemen di bawah
 * lipatan tetap tersembunyi sampai boleh dibaca. Unobserve setelah
 * pertama kali supaya tidak berkedip saat digulir naik-turun.
 */
export default function Reveal({
  children,
  index = 0,
  as: Tag = 'div',
  className = '',
  onClick,
}: {
  children: ReactNode;
  index?: number;
  as?: 'div' | 'section' | 'li' | 'article' | 'h1' | 'h2' | 'h3';
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Tanpa IntersectionObserver (atau saat gerak dimatikan) tampilkan langsung.
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('rv-on');
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('rv-on');
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('rv-on');
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      onClick={onClick}
      className={`rv ${className}`}
      style={{ ['--i' as string]: index }}
    >
      {children}
    </Tag>
  );
}