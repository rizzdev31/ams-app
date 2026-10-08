import fs from 'fs';
import path from 'path';

/**
 * Script untuk mempersiapkan paket deployment mandiri (standalone) ke Hostinger:
 * 1. Menyalin folder `public` ke `.next/standalone/public`
 * 2. Menyalin folder `.next/static` ke `.next/standalone/.next/static`
 * 3. Menyediakan template `.env.production` di folder standalone
 */

const ROOT_DIR = process.cwd();
const STANDALONE_DIR = path.join(ROOT_DIR, '.next', 'standalone');
const STATIC_SRC = path.join(ROOT_DIR, '.next', 'static');
const STATIC_DEST = path.join(STANDALONE_DIR, '.next', 'static');
const PUBLIC_SRC = path.join(ROOT_DIR, 'public');
const PUBLIC_DEST = path.join(STANDALONE_DIR, 'public');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else if (exists) {
    fs.copyFileSync(src, dest);
  }
}

console.log('Menyiapkan bundle Hostinger Standalone...');

if (!fs.existsSync(STANDALONE_DIR)) {
  console.error('Error: Folder .next/standalone belum ada. Jalankan "npm run build" terlebih dahulu.');
  process.exit(1);
}

// 1. Copy static assets
if (fs.existsSync(STATIC_SRC)) {
  console.log('Menyalin .next/static ke .next/standalone/.next/static...');
  copyRecursiveSync(STATIC_SRC, STATIC_DEST);
}

// 2. Copy public directory
if (fs.existsSync(PUBLIC_SRC)) {
  console.log('Menyalin public ke .next/standalone/public...');
  copyRecursiveSync(PUBLIC_SRC, PUBLIC_DEST);
}

// 3. Buat template .env di standalone
const envTemplate = `# Hostinger Production Environment
PORT=3000
NODE_ENV=production

# Database Hostinger (MySQL)
DB_DRIVER=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=u123456789_annur
DB_PASSWORD=PasswordDatabaseHostingerAnda
DB_NAME=u123456789_annur_minsoc

# Admin Auth
ADMIN_PASSWORD=annurminsoc2026
SESSION_SECRET=2f7a72bd247ed994ed71e9cf95d132eafe777b658584c08cd0c7b0f415e8e36250b5442c88b507b38ea1061f54c47d01
`;

fs.writeFileSync(path.join(STANDALONE_DIR, '.env.production.example'), envTemplate, 'utf8');

console.log('Bundle siap di folder .next/standalone!');
console.log('Anda dapat mengompres isi folder .next/standalone menjadi zip dan mengunggahnya ke Hostinger File Manager.');
