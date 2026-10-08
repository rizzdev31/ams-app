import bcrypt from 'bcryptjs';
import { getServiceSupabase, isServiceRoleConfigured } from './supabase';
import { query, queryOne, execute, isMySQLDriver } from './mysql';

export type Role = 'superadmin' | 'admin';

export interface AdminUser {
  id: string;
  username: string;
  password_hash: string;
  role: Role;
  active: boolean;
  created_at: string;
}

const SUPERADMIN_BOOTSTRAP = (process.env.ADMIN_PASSWORD || '').trim();

/** Hash a password for storage. New users are always bcrypt. */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyUserPassword(user: AdminUser, password: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, user.password_hash);
  } catch {
    return false;
  }
}

export async function findUserByUsername(username: string): Promise<AdminUser | null> {
  if (isMySQLDriver()) {
    const row = await queryOne<AdminUser>(
      'SELECT id, username, password_hash, role, active, created_at FROM admin_users WHERE username = ?',
      [username]
    );
    if (!row) return null;
    return { ...row, active: Boolean(row.active) };
  }
  if (!isServiceRoleConfigured()) return null;
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('admin_users')
    .select('*')
    .eq('username', username)
    .maybeSingle<AdminUser>();
  if (error) throw error;
  return data ?? null;
}

export async function findUserById(id: string): Promise<AdminUser | null> {
  if (isMySQLDriver()) {
    const row = await queryOne<AdminUser>(
      'SELECT id, username, password_hash, role, active, created_at FROM admin_users WHERE id = ?',
      [id]
    );
    if (!row) return null;
    return { ...row, active: Boolean(row.active) };
  }
  if (!isServiceRoleConfigured()) return null;
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('admin_users')
    .select('*')
    .eq('id', id)
    .maybeSingle<AdminUser>();
  if (error) throw error;
  return data ?? null;
}

/** True bila user masih ada dan tidak dinonaktifkan. Dipakai untuk menegakkan deaktivasi segera. */
export async function isUserActive(id: string): Promise<boolean> {
  const u = await findUserById(id);
  return !!u && u.active === true;
}

export async function updatePassword(id: string, password_hash: string): Promise<void> {
  if (isMySQLDriver()) {
    await execute('UPDATE admin_users SET password_hash = ? WHERE id = ?', [password_hash, id]);
    return;
  }
  const sb = getServiceSupabase();
  const { error } = await sb.from('admin_users').update({ password_hash }).eq('id', id);
  if (error) throw error;
}

/**
 * Saat tabel admin_users masih kosong (deploy pertama), buat satu superadmin
 * "admin" dari ADMIN_PASSWORD agar tidak terkunci keluar. Setelahnya, ADMIN_PASSWORD
 * tidak lagi dipakai untuk login biasa.
 */
export async function ensureBootstrapSuperadmin(): Promise<void> {
  if (isMySQLDriver()) {
    if (!SUPERADMIN_BOOTSTRAP) return;
    const rows = await query<{ count: number }>('SELECT COUNT(*) as count FROM admin_users');
    const count = Number(rows[0]?.count ?? 0);
    if (count > 0) return;
    const password_hash = await hashPassword(SUPERADMIN_BOOTSTRAP);
    await execute(
      'INSERT INTO admin_users (id, username, password_hash, role, active) VALUES (UUID(), ?, ?, ?, 1)',
      ['admin', password_hash, 'superadmin']
    );
    return;
  }

  if (!isServiceRoleConfigured() || !SUPERADMIN_BOOTSTRAP) return;
  const sb = getServiceSupabase();
  const { count, error } = await sb
    .from('admin_users')
    .select('*', { count: 'exact', head: true });
  if (error) return;
  if ((count ?? 0) > 0) return;
  const password_hash = await hashPassword(SUPERADMIN_BOOTSTRAP);
  await sb.from('admin_users').insert({ username: 'admin', password_hash, role: 'superadmin' });
}

export async function listUsers(): Promise<Omit<AdminUser, 'password_hash'>[]> {
  if (isMySQLDriver()) {
    const rows = await query<any>(
      'SELECT id, username, role, active, created_at FROM admin_users ORDER BY created_at ASC'
    );
    return rows.map((r) => ({ ...r, active: Boolean(r.active) }));
  }
  const sb = getServiceSupabase();
  const { data, error } = await sb
    .from('admin_users')
    .select('id,username,role,active,created_at')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Omit<AdminUser, 'password_hash'>[];
}

export async function setUserRole(id: string, role: Role) {
  if (isMySQLDriver()) {
    await execute('UPDATE admin_users SET role = ? WHERE id = ?', [role, id]);
    return;
  }
  const sb = getServiceSupabase();
  const { error } = await sb.from('admin_users').update({ role }).eq('id', id);
  if (error) throw error;
}

export async function setUserActive(id: string, active: boolean) {
  if (isMySQLDriver()) {
    await execute('UPDATE admin_users SET active = ? WHERE id = ?', [active ? 1 : 0, id]);
    return;
  }
  const sb = getServiceSupabase();
  const { error } = await sb.from('admin_users').update({ active }).eq('id', id);
  if (error) throw error;
}

export async function deleteUser(id: string) {
  if (isMySQLDriver()) {
    await execute('DELETE FROM admin_users WHERE id = ?', [id]);
    return;
  }
  const sb = getServiceSupabase();
  const { error } = await sb.from('admin_users').delete().eq('id', id);
  if (error) throw error;
}

/** Tulis satu baris audit. Gagal audit tidak boleh membatalkan operasi. */
export async function audit(
  actor: { id?: string; sub?: string; username?: string } | null,
  action: string,
  target?: string,
  payload?: Record<string, unknown>
): Promise<void> {
  try {
    if (isMySQLDriver()) {
      await execute(
        'INSERT INTO audit_log (id, user_id, username, action, target, payload) VALUES (UUID(), ?, ?, ?, ?, ?)',
        [
          actor?.sub ?? actor?.id ?? null,
          actor?.username ?? null,
          action,
          target ?? null,
          payload ? JSON.stringify(payload) : null,
        ]
      );
      return;
    }
    const sb = getServiceSupabase();
    await sb.from('audit_log').insert({
      user_id: actor?.sub ?? actor?.id ?? null,
      username: actor?.username ?? null,
      action,
      target: target ?? null,
      payload: payload ?? null,
    });
  } catch (e) {
    console.error('audit gagal:', e);
  }
}
