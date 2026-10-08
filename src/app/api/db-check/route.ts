import { NextResponse } from 'next/server';
import { testMySQLConnection, isMySQLDriver } from '@/lib/mysql';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const result = await testMySQLConnection();

  let advice = '';
  if (!result.connected) {
    if (result.code === 'ER_ACCESS_DENIED_ERROR') {
      advice =
        'Username atau Password MySQL salah. Pastikan DB_USER dan DB_PASSWORD di Hostinger hPanel sesuai dengan akun database yang Anda buat.';
    } else if (result.code === 'ER_BAD_DB_ERROR') {
      advice = `Database "${result.config.database}" tidak ditemukan. Di Hostinger, nama database biasanya memiliki prefix (contoh: u123456789_annur). Periksa nama database yang tepat di menu MySQL Databases hPanel.`;
    } else if (result.code === 'ECONNREFUSED' || result.code === 'ETIMEDOUT') {
      advice =
        'Koneksi ke host MySQL ditolak. Coba ubah DB_HOST dari "localhost" menjadi "127.0.0.1", atau periksa host MySQL yang tertera di menu MySQL Databases Hostinger.';
    } else {
      advice =
        'Periksa pengaturan variabel lingkungan DB_HOST, DB_USER, DB_PASSWORD, dan DB_NAME pada menu Environment Variables di Hostinger Node.js.';
    }
  } else {
    const requiredTables = ['teams', 'matches', 'players', 'match_events', 'event_settings', 'sponsors', 'admin_users'];
    const missing = requiredTables.filter((t) => !result.tables?.includes(t));
    if (missing.length > 0) {
      advice = `Database terhubung, namun tabel berikut belum diimpor: [${missing.join(', ')}]. Silakan buka phpMyAdmin di Hostinger dan impor file "mysql-schema.sql".`;
    } else {
      advice = 'Semua tabel MySQL terverifikasi lengkap dan siap beroperasi!';
    }
  }

  return NextResponse.json(
    {
      success: result.connected,
      message: result.connected
        ? 'Koneksi ke database MySQL Hostinger BERHASIL!'
        : 'Gagal menghubungkan ke database MySQL Hostinger.',
      driver: result.config.driver,
      diagnostics: {
        host: result.config.host,
        port: result.config.port,
        user: result.config.user,
        database: result.config.database,
        hasPassword: result.config.hasPassword,
      },
      error: result.error || null,
      errorCode: result.code || null,
      tablesCount: result.tables ? result.tables.length : 0,
      tables: result.tables || [],
      troubleshooting: advice,
      timestamp: new Date().toISOString(),
    },
    {
      status: result.connected ? 200 : 500,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
