'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (type: ToastType, message: string, title?: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Event bus untuk memicu toast dari mana saja (bahkan di luar komponen React)
type ToastListener = (toast: ToastItem) => void;
const listeners: Set<ToastListener> = new Set();

export const toast = {
  success: (message: string, title?: string, duration = 3500) => {
    emitToast({ id: Math.random().toString(36).slice(2), type: 'success', message, title, duration });
  },
  error: (message: string, title?: string, duration = 4500) => {
    emitToast({ id: Math.random().toString(36).slice(2), type: 'error', message, title, duration });
  },
  info: (message: string, title?: string, duration = 3500) => {
    emitToast({ id: Math.random().toString(36).slice(2), type: 'info', message, title, duration });
  },
  warning: (message: string, title?: string, duration = 4000) => {
    emitToast({ id: Math.random().toString(36).slice(2), type: 'warning', message, title, duration });
  },
};

function emitToast(item: ToastItem) {
  listeners.forEach((listener) => listener(item));
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string, title?: string, duration = 3500) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev.slice(-3), { id, type, message, title, duration }]);
    },
    []
  );

  useEffect(() => {
    const handleEmit: ToastListener = (item) => {
      setToasts((prev) => [...prev.slice(-3), item]);
    };
    listeners.add(handleEmit);
    return () => {
      listeners.delete(handleEmit);
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      {/* Toast Container Floating */}
      <div
        aria-live="assertive"
        className="fixed top-4 inset-x-0 sm:inset-x-auto sm:right-4 z-[9999] flex flex-col items-center sm:items-end gap-2.5 px-4 pointer-events-none max-w-md w-full"
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast: t, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, t.duration || 3500);
    return () => clearTimeout(timer);
  }, [t.duration, onDismiss]);

  const config = {
    success: {
      border: 'border-emerald-500/50',
      bg: 'bg-slate-950/95',
      glow: 'shadow-emerald-500/20',
      iconBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      icon: '✓',
      badge: 'SUKSES',
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    },
    error: {
      border: 'border-rose-500/50',
      bg: 'bg-slate-950/95',
      glow: 'shadow-rose-500/20',
      iconBg: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
      icon: '✕',
      badge: 'PERHATIAN',
      badgeColor: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    },
    warning: {
      border: 'border-amber-500/50',
      bg: 'bg-slate-950/95',
      glow: 'shadow-amber-500/20',
      iconBg: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
      icon: '!',
      badge: 'PERINGATAN',
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    },
    info: {
      border: 'border-cyan-500/50',
      bg: 'bg-slate-950/95',
      glow: 'shadow-cyan-500/20',
      iconBg: 'bg-cyan-500/20 text-cyan-400 border-cyan-400/40',
      icon: 'ℹ',
      badge: 'INFO',
      badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    },
  }[t.type];

  return (
    <div
      role="status"
      onClick={onDismiss}
      className={`pointer-events-auto w-full rounded-2xl border ${config.border} ${config.bg} p-3.5 sm:p-4 shadow-xl ${config.glow} backdrop-blur-xl transition-all duration-300 transform translate-y-0 opacity-100 hover:scale-[1.01] cursor-pointer group flex items-start gap-3`}
    >
      <div
        className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs border ${config.iconBg} flex-none mt-0.5`}
      >
        {config.icon}
      </div>

      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase border ${config.badgeColor}`}
          >
            {config.badge}
          </span>
          {t.title && (
            <h4 className="text-xs font-bold text-white font-display truncate">
              {t.title}
            </h4>
          )}
        </div>
        <p className="text-xs text-slate-200 leading-snug break-words">
          {t.message}
        </p>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        className="text-slate-500 hover:text-slate-300 text-xs p-1 rounded-lg transition-colors flex-none"
        aria-label="Tutup notifikasi"
      >
        ✕
      </button>
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Kembalikan singleton jika di luar provider
    return {
      toasts: [],
      showToast: (type: ToastType, message: string, title?: string, duration?: number) => {
        if (type === 'success') toast.success(message, title, duration);
        else if (type === 'error') toast.error(message, title, duration);
        else if (type === 'warning') toast.warning(message, title, duration);
        else toast.info(message, title, duration);
      },
      removeToast: () => {},
      success: toast.success,
      error: toast.error,
      info: toast.info,
      warning: toast.warning,
    };
  }

  return {
    ...context,
    success: (message: string, title?: string, duration?: number) =>
      context.showToast('success', message, title, duration),
    error: (message: string, title?: string, duration?: number) =>
      context.showToast('error', message, title, duration),
    info: (message: string, title?: string, duration?: number) =>
      context.showToast('info', message, title, duration),
    warning: (message: string, title?: string, duration?: number) =>
      context.showToast('warning', message, title, duration),
  };
}
