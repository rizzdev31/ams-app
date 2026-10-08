import mysql, { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

let pool: Pool | null = null;
let lastPoolConfigKey = '';

/**
 * Pastikan environment variable termuat pada standalone server Hostinger/cPanel.
 * Node.js standalone sering kali tidak memuat file .env secara otomatis kecuali diinstruksikan.
 */
function ensureEnvLoaded(): void {
  if (typeof window === 'undefined') {
    const hasDBConfig = Boolean(process.env.DB_NAME && (process.env.DB_USER || process.env.DB_HOST));
    if (!hasDBConfig) {
      try {
        // Coba muat menggunakan @next/env bawaan Next.js
        const { loadEnvConfig } = require('@next/env');
        loadEnvConfig(process.cwd());
      } catch {
        // Fallback pembacaan manual jika @next/env tidak tersedia
        try {
          const fs = require('fs');
          const path = require('path');
          const candidates = ['.env.production', '.env.local', '.env'];
          for (const filename of candidates) {
            const filepath = path.resolve(process.cwd(), filename);
            if (fs.existsSync(filepath)) {
              const text = fs.readFileSync(filepath, 'utf8');
              for (const line of text.split(/\r?\n/)) {
                const trimmed = line.trim();
                if (!trimmed || trimmed.startsWith('#')) continue;
                const eqIdx = trimmed.indexOf('=');
                if (eqIdx > 0) {
                  const key = trimmed.slice(0, eqIdx).trim();
                  let val = trimmed.slice(eqIdx + 1).trim();
                  if (
                    (val.startsWith('"') && val.endsWith('"')) ||
                    (val.startsWith("'") && val.endsWith("'"))
                  ) {
                    val = val.slice(1, -1);
                  }
                  if (!process.env[key]) {
                    process.env[key] = val;
                  }
                }
              }
            }
          }
        } catch {
          // Abaikan jika tidak ada file
        }
      }
    }
  }
}

export function resetMySQLPool(): void {
  if (pool) {
    try {
      void pool.end();
    } catch {
      // ignore
    }
    pool = null;
    lastPoolConfigKey = '';
  }
}

export function getMySQLPool(): Pool {
  ensureEnvLoaded();

  const host = process.env.DB_HOST || 'localhost';
  const port = Number(process.env.DB_PORT) || 3306;
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD ?? '';
  const database = process.env.DB_NAME || 'annur_minsoc';
  const configKey = `${host}:${port}:${user}:${database}`;

  if (!pool || lastPoolConfigKey !== configKey) {
    if (pool) {
      try {
        void pool.end();
      } catch {
        // ignore
      }
    }

    pool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      charset: 'utf8mb4',
    });
    lastPoolConfigKey = configKey;
  }
  return pool;
}

export function isMySQLDriver(): boolean {
  ensureEnvLoaded();
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
 * Uji konektivitas MySQL dengan diagnosis mendalam (kode error, status kredensial, daftar tabel)
 */
export async function testMySQLConnection(): Promise<{
  connected: boolean;
  error?: string;
  code?: string;
  config: {
    driver: string;
    host: string;
    port: number;
    user: string;
    database: string;
    hasPassword: boolean;
  };
  tables?: string[];
}> {
  ensureEnvLoaded();
  const config = {
    driver: process.env.DB_DRIVER || (isMySQLDriver() ? 'mysql' : 'supabase'),
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    database: process.env.DB_NAME || 'annur_minsoc',
    hasPassword: Boolean(process.env.DB_PASSWORD),
  };

  try {
    const p = getMySQLPool();
    await p.query('SELECT 1 as test');
    const [rows] = await p.query<RowDataPacket[]>('SHOW TABLES');
    const tableNames = rows.map((r) => Object.values(r)[0] as string);
    return {
      connected: true,
      config,
      tables: tableNames,
    };
  } catch (err: any) {
    return {
      connected: false,
      error: err?.message || String(err),
      code: err?.code || 'UNKNOWN_ERROR',
      config,
    };
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
