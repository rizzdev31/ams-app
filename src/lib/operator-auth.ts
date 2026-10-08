import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { OPERATOR_COOKIE_NAME, OPERATOR_SESSION_DURATION, sessionSecretBytes } from './session';
import { dbSettings } from './db';

export type OperatorScope = 'field_1' | 'field_2' | 'scorer' | 'all';

export interface OperatorPayload {
  scope: OperatorScope;
  field?: '1' | '2';
  title: string;
}

const DEFAULT_PASSCODES = {
  field1: 'LAP1-2026',
  field2: 'LAP2-2026',
  scorer: 'WASIT-2026',
};

/** Buat token JWT terenkripsi untuk operator / wasit */
export async function createOperatorToken(scope: OperatorScope): Promise<string> {
  const field = scope === 'field_1' ? '1' : scope === 'field_2' ? '2' : undefined;
  const title =
    scope === 'field_1'
      ? 'Petugas Lapangan 1'
      : scope === 'field_2'
      ? 'Petugas Lapangan 2'
      : scope === 'scorer'
      ? 'Panitia Update Skor'
      : 'Operator Turnamen';

  const token = await new SignJWT({ scope, field, title })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${OPERATOR_SESSION_DURATION}s`)
    .sign(sessionSecretBytes());

  return token;
}

/** Verifikasi token JWT operator */
export async function verifyOperatorToken(token: string): Promise<OperatorPayload | null> {
  try {
    const { payload } = await jwtVerify(token, sessionSecretBytes());
    const scope = (payload.scope as OperatorScope) || null;
    if (!scope) return null;

    return {
      scope,
      field: payload.field as '1' | '2' | undefined,
      title: (payload.title as string) || 'Operator Turnamen',
    };
  } catch {
    return null;
  }
}

/** Ambil sesi operator dari Cookie HTTP-Only */
export async function getOperatorSession(): Promise<OperatorPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(OPERATOR_COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifyOperatorToken(token);
  } catch {
    return null;
  }
}

/** Ambil passcode resmi dari database event_settings */
export async function getSystemPasscodes(): Promise<{
  field1: string;
  field2: string;
  scorer: string;
}> {
  try {
    const settings = await dbSettings.get();
    return {
      field1: settings?.passcode_field_1?.trim() || DEFAULT_PASSCODES.field1,
      field2: settings?.passcode_field_2?.trim() || DEFAULT_PASSCODES.field2,
      scorer: settings?.passcode_scorer?.trim() || DEFAULT_PASSCODES.scorer,
    };
  } catch (error) {
    console.error('Gagal mengambil passcode dari database:', error);
    return DEFAULT_PASSCODES;
  }
}

/** Verifikasi kecocokan passcode yang diinput user */
export async function verifyPasscode(
  target: 'field_1' | 'field_2' | 'scorer',
  inputPasscode: string
): Promise<boolean> {
  if (!inputPasscode || typeof inputPasscode !== 'string') return false;
  const cleanInput = inputPasscode.trim();
  const codes = await getSystemPasscodes();

  if (target === 'field_1') {
    return cleanInput.toUpperCase() === codes.field1.toUpperCase();
  }
  if (target === 'field_2') {
    return cleanInput.toUpperCase() === codes.field2.toUpperCase();
  }
  if (target === 'scorer') {
    return cleanInput.toUpperCase() === codes.scorer.toUpperCase();
  }
  return false;
}

/** Update passcode sistem di database oleh Superadmin */
export async function updateSystemPasscode(
  target: 'field_1' | 'field_2' | 'scorer',
  newPasscode: string
): Promise<void> {
  const clean = newPasscode.trim().toUpperCase();
  if (clean.length < 4) {
    throw new Error('Kode akses minimal 4 karakter.');
  }

  const patch: Record<string, string> = {};
  if (target === 'field_1') patch.passcode_field_1 = clean;
  if (target === 'field_2') patch.passcode_field_2 = clean;
  if (target === 'scorer') patch.passcode_scorer = clean;

  await dbSettings.update(patch);
}

/** Generate tautan cepat terenkripsi (URL with JWT) untuk dikirim ke WhatsApp petugas */
export async function generateQuickAuthUrl(
  scope: OperatorScope,
  origin: string
): Promise<string> {
  const token = await createOperatorToken(scope);
  const basePath =
    scope === 'field_1'
      ? '/lapangan/1'
      : scope === 'field_2'
      ? '/lapangan/2'
      : scope === 'scorer'
      ? '/updateskor'
      : '/lapangan';

  return `${origin}${basePath}?auth=${encodeURIComponent(token)}`;
}
