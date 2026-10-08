import mysql, { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

let pool: Pool | null = null;

export function getMySQLPool(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_NAME || 'annur_minsoc',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      charset: 'utf8mb4',
    });
  }
  return pool;
}

export function isMySQLDriver(): boolean {
  const driver = (process.env.DB_DRIVER || '').toLowerCase();
  if (driver === 'mysql') return true;
  if (driver === 'supabase') return false;
  if (process.env.DB_HOST && !process.env.NEXT_PUBLIC_SUPABASE_URL) return true;
  return false;
}

/**
 * Cek apakah konfigurasi database MySQL aktif & tersedia
 */
export async function isMySQLConnected(): Promise<boolean> {
  try {
    const p = getMySQLPool();
    const [rows] = await p.query<RowDataPacket[]>('SELECT 1 as test');
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

/**
 * Jalankan query SELECT dan kembalikan array baris
 */
export async function query<T = unknown>(
  sql: string,
  params: any[] = []
): Promise<T[]> {
  const p = getMySQLPool();
  const [rows] = await p.query<RowDataPacket[]>(sql, params);
  return rows as unknown as T[];
}

/**
 * Jalankan query SELECT dan kembalikan baris pertama atau null
 */
export async function queryOne<T = unknown>(
  sql: string,
  params: any[] = []
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * Jalankan query INSERT, UPDATE, atau DELETE
 */
export async function execute(
  sql: string,
  params: any[] = []
): Promise<ResultSetHeader> {
  const p = getMySQLPool();
  const [result] = await p.execute<ResultSetHeader>(sql, params);
  return result;
}
