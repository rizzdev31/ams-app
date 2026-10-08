# ⚽ An-Nur Mini Soccer (AMS-APP)

[![Next.js](https://img.shields.io/badge/Next.js-16.3.7-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.8-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![MySQL](https://img.shields.io/badge/MySQL-5.7%2B%20%7C%208.0%2B-00758f?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Vitest](https://img.shields.io/badge/Tests-58%20Passed-449e48?style=for-the-badge&logo=vitest)](https://vitest.dev/)

**An-Nur Mini Soccer (AMS-APP)** adalah sistem manajemen turnamen sepak bola mini profesional dan real-time yang dirancang khusus untuk turnamen **An-Nur Mini Soccer Cup 2026**.

Aplikasi ini mencakup portal publik interaktif, papan skor langsung (*Live Score*), bagan turnamen sistem gugur otomatis (*Knockout Bracket*), konsol wasit/operator lapangan terisolasi, pembuat pamflet laga otomatis (rasio 1080×1350), serta panel kontrol panitia (*Superadmin*) dengan keamanan berlapis.

---

## 📑 Daftar Isi

- [Arsitektur & Fitur Unggulan](#-arsitektur--fitur-unggulan)
- [Struktur Sistem & Hak Akses](#-struktur-sistem--hak-akses)
- [Persiapan & Instalasi Lokal](#-persiapan--instalasi-lokal)
- [Konfigurasi Database MySQL](#-konfigurasi-database-mysql)
- [Variabel Lingkungan (Environment Variables)](#-variabel-lingkungan-environment-variables)
- [Panduan Deployment Produksi (Web App + MySQL)](#-panduan-deployment-produksi-web-app--mysql)
  - [Opsi A: Hostinger / cPanel Node.js Application](#opsi-a-hostinger--cpanel-nodejs-application-rekomendasi)
  - [Opsi B: VPS Linux (Ubuntu / Debian + PM2 + Nginx)](#opsi-b-vps-linux-ubuntu--debian--pm2--nginx)
  - [Opsi C: Vercel / Cloud PaaS](#opsi-c-vercel--cloud-paas)
- [Pengujian & Verifikasi (Quality Assurance)](#-pengujian--verifikasi-quality-assurance)
- [Struktur Direktori](#-struktur-direktori)
- [Kredensial Default](#-kredensial-default)

---

## 🌟 Arsitektur & Fitur Unggulan

### 1. 📱 Portal Publik (Mobile-First Experience)
- **Dashboard Turnamen (`/dashboard`)**: Profil acara, video teaser resmi, hitung mundur kickoff, jadwal hari ini, dan direktori sponsor.
- **Beranda Interaktif (`/`)**: Kartu laga berjalan (*live matches*), hasil pertandingan terkini, dan akses cepat seluruh fitur.
- **Skor Langsung (`/live`)**: Pembaruan otomatis (auto-refresh) setiap 5 detik dengan animasi denyut live, kartu skor besar, dan log pencetak gol serta kartu.
- **Bagan Fase Gugur (`/bagan`)**: Bagan turnamen interaktif untuk kategori U-10 dan U-12 dengan pemenang otomatis tersinkronisasi ke babak Semi Final dan Final.
- **Jadwal Lengkap (`/jadwal`)**: Filter fleksibel berdasarkan tanggal pertandingan, lapangan (Lapangan 1 / 2), dan kategori grup.
- **Klasemen Grup (`/klasemen`)**: Perhitungan poin otomatis (Menang = 2, Seri = 1, Kalah = 0) dengan sistem pemeringkatan tie-break resmi (Poin → Head-to-Head → Selisih Gol → Produktivitas Gol).
- **Profil Tim & Pemain (`/tim`, `/tim/[id]`)**: Roster pemain lengkap, nomor punggung, riwayat pertandingan, dan statistik performa tim.

### 2. 🎨 Generator Pamflet Pertandingan (Match Pamphlet 1080×1350)
- Dapat diunduh langsung dalam format gambar resolusi tinggi **1080×1350 piksel** (aspek rasio 4:5 ideal untuk Instagram Feed & WhatsApp Story).
- Desain *futuristic sports card* menyertakan:
  - Header: Logo resmi turnamen, Yayasan Pesantren An-Nur, dan PSSQ.
  - Body: Papan skor, logo kedua tim, pencetak gol (*scorer*), status laga, dan catatan wasit.
  - Footer: Sponsor resmi (Platinum, Gold, Silver) dan Educational Partners (MA & Mubosta) serta promo PPDB.

### 3. 🏟️ Konsol Wasit & Operator Lapangan Terisolasi
- **Konsol Lapangan 1 (`/lapangan/1`)** & **Konsol Lapangan 2 (`/lapangan/2`)**:
  - Antarmuka sentuh satu tangan (*one-hand mobile touch*) untuk operator di pinggir lapangan.
  - Tombol cepat tambah/kurang skor, pencatatan pencetak gol, kartu kuning, dan kartu merah.
  - Alur babak pertandingan: Mulai Babak 1 → Istirahat → Babak 2 → Adu Penalti (opsional) → Selesai.
- **Papan Update Skor Terpusat (`/updateskor`)**:
  - Panel kendali wasit utama untuk mengawasi seluruh lapangan sekaligus.

### 4. 🛡️ Sistem Keamanan Berlapis (Enterprise Security)
- **Gerbang Sandi Terenkripsi (Passcode Gate)**: Akses ke `/lapangan/1`, `/lapangan/2`, dan `/updateskor` dikunci dengan sandi unik terpisah.
- **Token Akses Cepat WhatsApp (One-Click Instant Access)**: Superadmin dapat menyalin tautan ber-token JWT terenkripsi dari dashboard (`?auth=<token>`). Petugas di pinggir lapangan cukup membuka tautan di HP untuk langsung masuk tanpa mengetik PIN, dengan masa aktif sesi **48 jam**.
- **Isolasi Wewenang Lapangan (Boundary Guard)**: Petugas Lapangan 1 dibatasi secara sistem agar tidak dapat mengubah data Lapangan 2, dan sebaliknya.
- **Proteksi Brute-Force & Rate Limiting**: Batas maksimal 8 kali percobaan salah per menit per alamat IP.
- **Sesi HttpOnly**: Token sesi disimpan dalam cookie `HttpOnly`, `SameSite=Lax`, dan `Secure` pada mode produksi.

### 5. 🎛️ Portal Manajemen Panitia & Superadmin (`/panitia`)
- **Manajemen Jadwal & Laga**: Buat, ubah, atur ulang jadwal, lapangan, dan status pertandingan.
- **Sinkronisasi Bagan Otomatis**: Integrasi otomatis partai semifinal dan final berdasarkan juara dan runner-up grup.
- **Pusat Sandi & Keamanan**: Superadmin dapat melihat (*reveal*), memperbarui sandi lapangan secara instan, dan melihat status proteksi.
- **Manajemen Tim & Pemain**: Kelola data peserta, unggah logo tim dengan kompresi gambar otomatis di sisi klien.
- **Manajemen Sponsor**: Atur tingkatan sponsor (Platinum, Gold, Silver, Media Partner).
- **Audit Log & Diagnostics**: Catatan jejak audit aksi administrator untuk akuntabilitas.

---

## 🗄️ Konfigurasi Database MySQL

Aplikasi ini menggunakan **MySQL / MariaDB** sebagai basis data produksi utama dengan koneksi *Connection Pooling* berperforma tinggi (`mysql2/promise`).

### 1. Struktur Tabel Utama

File skema database lengkap tersedia pada file [`mysql-schema.sql`](./mysql-schema.sql):

| Nama Tabel | Deskripsi |
| :--- | :--- |
| `teams` | Master data tim peserta turnamen, logo, grup, dan kategori (U-10 / U-12). |
| `matches` | Data jadwal, skor utama, skor penalti, lapangan, status, dan pemenang. |
| `players` | Daftar anggota pemain per tim beserta nomor punggung dan posisi. |
| `match_events` | Detail peristiwa pertandingan (gol, kartu kuning, kartu merah, menit laga). |
| `event_settings` | Informasi turnamen, aturan tie-break, dan sandi konsol lapangan. |
| `sponsors` | Daftar sponsor turnamen, logo, tingkatan sponsor, dan urutan tampil. |
| `admin_users` | Akun pengguna panitia dan superadmin (password di-hash dengan bcrypt). |
| `audit_log` | Riwayat aktivitas dan perubahan data penting oleh admin. |

### 2. Cara Impor Skema ke MySQL

#### Melalui phpMyAdmin (Hostinger / cPanel / XAMPP):
1. Buka **phpMyAdmin** dan pilih database Anda (misal: `annur_minsoc`).
2. Masuk ke tab **Import**.
3. Pilih file [`mysql-schema.sql`](./mysql-schema.sql) dari repositori ini.
4. Klik **Import / Go**.

#### Melalui Terminal / CLI:
```bash
mysql -u root -p annur_minsoc < mysql-schema.sql
```

---

## ⚙️ Variabel Lingkungan (Environment Variables)

Salin template variabel lingkungan dari `.env.example`:

```bash
cp .env.example .env.local
```

Sesuaikan parameter berikut:

```env
# ==============================================================================
# 1. Konfigurasi Database (MySQL)
# ==============================================================================
DB_DRIVER=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password_db_anda
DB_NAME=annur_minsoc

# ==============================================================================
# 2. Keamanan & Sesi Administrator
# ==============================================================================
# Password default akun superadmin
ADMIN_PASSWORD=annurminsoc2026

# Kunci rahasia JWT (Wajib minimal 32 karakter acak untuk keamanan produksi)
SESSION_SECRET=2f7a72bd247ed994ed71e9cf95d132eafe777b658584c08cd0c7b0f415e8e362
```

---

## 🚀 Persiapan & Instalasi Lokal

### Prasyarat
- **Node.js**: Versi `18.18.0` atau lebih tinggi (disarankan Node.js 20 atau 22 LTS).
- **MySQL**: Versi `5.7+` atau `8.0+` (atau MariaDB `10.3+`).

### Langkah Instalasi

```bash
# 1. Clone repositori
git clone https://github.com/rizzdev31/ams-app.git
cd ams-app

# 2. Install dependensi
npm install

# 3. Siapkan database
# Pastikan MySQL berjalan, buat database 'annur_minsoc', lalu import mysql-schema.sql

# 4. Jalankan aplikasi dalam mode pengembangan
npm run dev
```

Buka peramban Anda di:
- **Portal Publik**: [http://localhost:3000](http://localhost:3000)
- **Dashboard Turnamen**: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
- **Portal Panitia**: [http://localhost:3000/panitia](http://localhost:3000/panitia)
- **Konsol Lapangan 1**: [http://localhost:3000/lapangan/1](http://localhost:3000/lapangan/1) (Passcode: `LAP1-2026`)
- **Konsol Lapangan 2**: [http://localhost:3000/lapangan/2](http://localhost:3000/lapangan/2) (Passcode: `LAP2-2026`)
- **Papan Update Skor**: [http://localhost:3000/updateskor](http://localhost:3000/updateskor) (Passcode: `WASIT-2026`)

---

## ☁️ Panduan Deployment Produksi (Web App + MySQL)

Aplikasi telah dikonfigurasi dengan mode **`output: 'standalone'`** di [`next.config.ts`](./next.config.ts), sehingga menghasilkan bundel produksi mandiri yang ringan tanpa memerlukan folder `node_modules` berukuran besar di server.

### Opsi A: Hostinger / cPanel Node.js Application (Rekomendasi)

Panduan langkah demi langkah lengkap dapat dilihat di [HOSTINGER-DEPLOY-GUIDE.md](./HOSTINGER-DEPLOY-GUIDE.md).

1. **Build dan Bundel Otomatis di Komputer Lokal**:
   ```bash
   npm run bundle:hostinger
   ```
   *Skrip ini akan mengompilasi aplikasi ke `.next/standalone`, menyalin seluruh aset `public/` dan `.next/static/`, serta membuat file konfigurasi `.env.production.example`.*

2. **Kompresi File**:
   - Masuk ke folder `.next/standalone/`.
   - Pilih seluruh isinya, lalu kompres ke format **ZIP** (misal: `deploy.zip`).

3. **Upload ke Hosting**:
   - Buka **File Manager** cPanel / Hostinger hPanel.
   - Ekstrak `deploy.zip` ke folder aplikasi Node.js Anda (misal: `public_html` atau `/home/u123/nodeapp`).
   - Buat file `.env` di folder tersebut dan masukkan kredensial MySQL hosting Anda.

4. **Konfigurasi Node.js App di cPanel / hPanel**:
   - **Node.js Version**: 20.x atau 22.x
   - **Application Root**: Lokasi folder ekstrak
   - **Application Startup File**: `server.js`
   - Klik **Restart Application**.

---

### Opsi B: VPS Linux (Ubuntu / Debian + PM2 + Nginx)

1. **Kompilasi di Server**:
   ```bash
   git clone https://github.com/rizzdev31/ams-app.git
   cd ams-app
   npm install
   npm run build
   node scripts/prepare-hostinger.js
   ```

2. **Jalankan dengan PM2**:
   ```bash
   cd .next/standalone
   cp ../../.env.local .env
   pm2 start server.js --name "ams-app"
   pm2 save
   pm2 startup
   ```

3. **Konfigurasi Nginx Reverse Proxy**:
   ```nginx
   server {
       server_name tournament.domainanda.com;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

---

### Opsi C: Vercel / Cloud PaaS

Jika menggunakan Vercel, pastikan database MySQL Anda dapat diakses secara publik (misal: PlanetScale, TiDB Cloud, Aiven, atau remote MySQL VPS):
1. Import repositori ke Vercel.
2. Tambahkan variabel lingkungan: `DB_DRIVER=mysql`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `ADMIN_PASSWORD`, dan `SESSION_SECRET`.
3. Klik **Deploy**.

---

## 🧪 Pengujian & Verifikasi (Quality Assurance)

Proyek ini dilengkapi dengan pengujian otomatis (*Unit & Integration Tests*) menggunakan **Vitest**:

```bash
# Jalankan seluruh unit test
npm test

# Jalankan pengujian tipe TypeScript
npm run typecheck
```

### Cakupan Pengujian:
- ✅ **`tests/operator-auth.test.ts`**: Verifikasi token JWT operator, validasi passcode, boundary isolation, dan link instan WhatsApp.
- ✅ **`tests/bracket.test.ts`**: Logika bagan turnamen sistem gugur (Semi Final, Final, Juara 3).
- ✅ **`tests/utils.test.ts`**: Perhitungan poin klasemen grup, selisih gol, dan aturan tie-break head-to-head.
- ✅ **`tests/pamphlet.test.ts`**: Pemrosesan dan struktur data pamflet laga 1080×1350.
- ✅ **`tests/sponsors.test.ts`**: Manajemen urutan dan tingkatan sponsor.
- ✅ **`tests/mysql.test.ts` & `tests/mysql-integration.test.ts`**: Konektivitas pool database MySQL dan integritas query.

---

## 📂 Struktur Direktori

```text
ams-app/
├── public/                     # Aset publik (logo turnamen, video teaser, sponsor, banner)
├── scripts/                    # Skrip migrasi database, seeding, dan kompresi bundle
│   ├── prepare-hostinger.js    # Skrip otomatisasi persiapan standalone bundle
│   ├── refresh-seed.ts         # Seeding jadwal, grup, dan data laga resmi
│   └── migrate-supabase-to-mysql.ts
├── src/
│   ├── app/
│   │   ├── (public)/           # Halaman publik (jadwal, klasemen, bagan, tim, info, dashboard)
│   │   ├── api/                # API Endpoints (matches, score, events, auth, security, sponsors)
│   │   ├── lapangan/           # Konsol operator Lapangan 1 & 2 (/lapangan/[field])
│   │   │   └── masuk/          # Gerbang sandi terenkripsi operator lapangan
│   │   ├── updateskor/         # Papan update skor wasit utama
│   │   │   └── masuk/          # Gerbang sandi wasit
│   │   └── panitia/            # Dashboard Superadmin (jadwal, tim, pengaturan, pengguna)
│   ├── components/             # Komponen UI modular (KnockoutBracket, MatchPamphlet, dll.)
│   ├── lib/
│   │   ├── db.ts               # Abstraksi database adaptif (MySQL / Supabase)
│   │   ├── mysql.ts            # Connection pool & query engine MySQL
│   │   ├── operator-auth.ts    # Modul otentikasi JWT & passcode operator
│   │   ├── bracket.ts          # Algoritma sinkronisasi bagan turnamen
│   │   └── session.ts          # Konfigurasi sesi & cookie
│   └── proxy.ts                # Middleware keamanan & boundary guard
├── tests/                      # Suite pengujian unit & integrasi (Vitest)
├── .env.example                # Template variabel lingkungan
├── mysql-schema.sql            # Skema lengkap basis data MySQL
├── next.config.ts              # Konfigurasi Next.js (output standalone)
└── README.md
```

---

## 🔑 Kredensial Default

| Komponen | Akses / URL | Kredensial Default |
| :--- | :--- | :--- |
| **Superadmin Master** | `/panitia/masuk` | Username: `admin`<br>Password: `annurminsoc2026` |
| **Konsol Lapangan 1** | `/lapangan/1` | Passcode: `LAP1-2026` |
| **Konsol Lapangan 2** | `/lapangan/2` | Passcode: `LAP2-2026` |
| **Papan Update Skor** | `/updateskor` | Passcode: `WASIT-2026` |

> ⚠️ **Catatan Keamanan:** Segera ubah sandi default dan nilai `SESSION_SECRET` di menu **Portal Panitia ➔ Pengaturan ➔ Keamanan** sebelum digunakan pada turnamen resmi.

---

## 📄 Lisensi

Dikembangkan untuk **Turnamen An-Nur Mini Soccer 2026**. Hak cipta dilindungi undang-undang.
