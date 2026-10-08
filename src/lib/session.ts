// Konstanta sesi admin — dipakai oleh lib/auth.ts (Node) dan proxy.ts (edge).
// File ini sengaja tanpa dependensi Node agar aman diimpor dari proxy.

export const COOKIE_NAME = 'admin_session';
export const OPERATOR_COOKIE_NAME = 'operator_session';
export const OPERATOR_SESSION_DURATION = 48 * 60 * 60; // 48 jam masa aktif turnamen

const FALLBACK = 'default-secret-change-me';

/** True bila secret belum diganti dari nilai contoh. */
export function isSecretPlaceholder(value: string | undefined): boolean {
  return !value || value === FALLBACK || value.length < 32;
}

/**
 * Secret sebagai bytes. Di production tanpa secret asli langsung throw
 * (fail-closed) supaya JWT tidak bisa dipalsu. Di dev, fallback eksplisit
 * dipakai agar `next dev` tetap jalan.
 */
export function sessionSecretBytes(): Uint8Array {
  const raw = process.env.SESSION_SECRET;
  if (isSecretPlaceholder(raw)) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'SESSION_SECRET belum dikonfigurasi. Isi minimal 32 karakter acak di environment production.'
      );
    }
    return new TextEncoder().encode('dev-only-insecure-secret-32chars!!');
  }
  return new TextEncoder().encode(raw as string);
}
