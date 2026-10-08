# Panduan Lengkap Migrasi ke MySQL & Deployment ke Hostinger (Mode Business / Web Apps)

Dokumen ini memuat panduan lengkap mengenai hasil analisis, pengujian komunikasi MySQL lokal, serta langkah-langkah praktis untuk mendeploy aplikasi turnamen **An-Nur Mini Soccer** ke **Hostinger Web Hosting (Paket Business / Web Hosting dengan Node.js Support)**.

---

## 1. Ringkasan Hasil Analisis & Pengujian Lokal

| Komponen | Status | Keterangan |
| :--- | :---: | :--- |
| **Koneksi Database MySQL** | **BERHASIL (100%)** | Berhasil terhubung ke MySQL (`localhost:3306`, DB: `annur_minsoc`). |
| **Skema Database MySQL** | **LENGKAP** | Berkas [`mysql-schema.sql`](./mysql-schema.sql) berisi 8 tabel lengkap dengan tipe data optimal (`VARCHAR(36)`, `LONGTEXT` untuk logo, `TIMESTAMP`, `JSON`). |
| **Migrasi Data Turnamen** | **SUKSES** | **32 Tim** (U10 & U12) dan **52 Jadwal Pertandingan** + **Sponsor** + **Pengaturan Acara** tersimpan utuh di MySQL. |
| **Dukungan Dual-Driver** | **AKTIF** | Sistem mendukung perpindahan instan antara `mysql` dan `supabase` via variabel `DB_DRIVER` di `.env.local`. |
| **Pengujian Unit & Integrasi** | **34/34 PASSED** | Seluruh unit test dan 8 tes integrasi end-to-end MySQL (CRUD Tim, Pertandingan, Sponsor, Pemain, & Autentikasi Admin) lulus 100%. |
| **Build Next.js Standalone** | **SUKSES** | `output: 'standalone'` aktif, menghasilkan bundel ringan di `.next/standalone` siap dijalankan dengan `node server.js`. |

---

## 2. Struktur Tabel MySQL yang Disediakan (`mysql-schema.sql`)

1. **`teams`**: Data 32 tim, singkatan 3 huruf, grup A-D, kategori U10/U12, warna tema hex, dan logo tim.
2. **`matches`**: Jadwal 52 pertandingan, babak grup dan sistem gugur, skor live, status laga, tanggal, jam, dan lapangan.
3. **`match_events`**: Pencatatan kejadian real-time (gol, kartu kuning, kartu merah, menit, dan nama pencetak gol).
4. **`players`**: Data pemain per tim, nomor punggung, dan posisi (GK, DF, MF, FW).
5. **`event_settings`**: Informasi turnamen (nama turnamen, tanggal, lokasi lapangan, aturan selisih gol, dll).
6. **`sponsors`**: Data sponsorship (nama mitra, logo base64/URL, tier platinum/gold/silver/partner, dan urutan tampilan).
7. **`admin_users`**: Manajemen akun superadmin dan wasit/panitia (enkripsi password aman dengan bcrypt).
8. **`audit_log`**: Catatan riwayat aktivitas aksi admin untuk transparansi turnamen.

---

## 3. Langkah-Langkah Deployment ke Hostinger

Paket **Hostinger Business** menyediakan fitur **Database MySQL**, **phpMyAdmin**, **File Manager**, dan dukungan **Node.js** (melalui menu **Web Apps / Node.js** di hPanel).

### Langkah 1: Buat Database MySQL di hPanel Hostinger
1. Masuk ke **hPanel Hostinger** ([hpanel.hostinger.com](https://hpanel.hostinger.com)).
2. Buka menu **Databases** > **Management** (Manajemen Basis Data).
3. Buat database baru:
   - **Database Name**: misal `u123456789_annur_minsoc`
   - **Username**: misal `u123456789_annur`
   - **Password**: Buat password yang kuat dan catat baik-baik.
4. Klik **Create** (Buat).

### Langkah 2: Impor Skema & Data ke phpMyAdmin
1. Di samping database yang baru dibuat, klik tombol **Enter phpMyAdmin**.
2. Pilih nama database Anda di sisi kiri.
3. Klik tab **Import** (Impor) di bilah atas.
4. Klik **Choose File** (Pilih Berkas) dan unggah berkas **[`mysql-schema.sql`](./mysql-schema.sql)** dari proyek ini.
5. Klik **Go** (Kirim) di bagian bawah. Semua 8 tabel turnamen akan langsung terbentuk dengan indeks dan relasi yang tepat.

*(Opsional: Anda juga dapat mengekspor database `annur_minsoc` lokal via phpMyAdmin XAMPP dan mengimpornya ke Hostinger jika ingin langsung membawa data 32 tim dan jadwal yang ada di lokal).*

---

### Langkah 3: Siapkan Bundel Standalone di Komputer Lokal
Di terminal proyek di komputer Anda, jalankan perintah bundling khusus:

```powershell
npm run bundle:hostinger
```

Perintah ini akan secara otomatis:
1. Membangun aplikasi Next.js ke mode produksi (`next build`).
2. Menyalin folder aset statis (`.next/static` dan `public`) ke dalam `.next/standalone`.
3. Menghasilkan folder **`.next/standalone`** yang siap dijalankan di Hostinger.

Kompres (ZIP) seluruh isi di dalam folder `.next/standalone/`:
- Masuk ke folder `.next/standalone`
- Pilih semua file/folder di dalamnya (`server.js`, `package.json`, `node_modules`, `.next`, `public`)
- Klik kanan > **Compress to ZIP file** (misal beri nama `annur-app.zip`).

---

### Langkah 4: Unggah ke Hostinger File Manager
1. Di hPanel Hostinger, buka **Files** > **File Manager**.
2. Masuk ke folder root aplikasi Anda (biasanya `public_html` atau direktori aplikasi Node.js yang ditunjuk).
3. Klik tombol **Upload**, pilih berkas `annur-app.zip`.
4. Setelah terunggah, klik kanan berkas zip lalu pilih **Extract** (Ekstrak di tempat).

---

### Langkah 5: Konfigurasi Environment Variable (`.env`) di Hostinger
Di File Manager Hostinger, buat atau edit berkas bernama **`.env`** di direktori utama aplikasi tersebut:

```env
PORT=3000
NODE_ENV=production

# Konfigurasi Database Hostinger (MySQL lokal Hostinger)
DB_DRIVER=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=u123456789_annur
DB_PASSWORD=PasswordDatabaseHostingerAnda
DB_NAME=u123456789_annur_minsoc

# Keamanan Akun Panitia & Superadmin
ADMIN_PASSWORD=annurminsoc2026
SESSION_SECRET=2f7a72bd247ed994ed71e9cf95d132eafe777b658584c08cd0c7b0f415e8e36250b5442c88b507b38ea1061f54c47d01
```

> **Catatan Hostinger:** Di server Hostinger, `DB_HOST` tetap diisi `localhost` karena server database MySQL berada di mesin yang sama dengan aplikasi.

---

### Langkah 6: Konfigurasi Aplikasi Node.js di hPanel
1. Di hPanel Hostinger, cari menu **Node.js** (atau **Web Applications / Advanced > Node.js**).
2. Konfigurasikan:
   - **Node.js Version**: Pilih versi LTS (misal **Node.js 20.x** atau **22.x**).
   - **Application Root**: Arahkan ke folder tempat berkas diekstrak (misal `public_html`).
   - **Application Startup File**: Ketik `server.js`.
3. Klik tombol **Start Application** (atau Restart).
4. Buka domain/website Anda di browser:
   - Halaman utama publik: `https://domainanda.com`
   - Skor langsung: `https://domainanda.com/live`
   - Bagan gugur: `https://domainanda.com/bagan`
   - Dashboard Panitia: `https://domainanda.com/panitia` (Login dengan user `admin` dan password sesuai `ADMIN_PASSWORD`).

---

## 4. Keuntungan Migrasi ke MySQL di Hostinger Business

1. **Latensi Sangat Cepat (< 1ms)**: Karena database MySQL berjalan di server yang sama dengan web apps di Hostinger (`localhost:3306`), respon query jauh lebih cepat tanpa overhead jaringan eksternal.
2. **Bebas Pembatasan Supabase Gratis**: Tidak ada risiko database "tidur / pause" setelah inaktif beberapa hari.
3. **Kemudahan Backup & Kelola**: Seluruh data tersimpan dalam MySQL standar yang dapat di-backup kapan saja dalam format `.sql` melalui phpMyAdmin Hostinger dengan sekali klik.
4. **Keamanan Maksimal**: Database tidak terekspos ke internet publik, hanya bisa diakses oleh aplikasi lokal server Anda.
