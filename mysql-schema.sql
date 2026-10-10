-- ==============================================================================
-- AN-NUR MINI SOCCER — MYSQL DATABASE SCHEMA
-- ==============================================================================
-- Skema ini dirancang untuk MySQL 5.7+ / 8.0+ / MariaDB 10.3+.
-- Siap diimpor langsung via phpMyAdmin di Hostinger atau MySQL lokal (XAMPP).
-- ==============================================================================

-- CATATAN UNTUK HOSTINGER / CPANEL:
-- Database dibuat terlebih dahulu melalui menu "MySQL Databases" di hPanel / cPanel.
-- Pilih database Anda di phpMyAdmin, lalu import skema ini (tabel akan langsung dibuat di database yang aktif).
--
-- Untuk instalasi lokal (opsional):
-- CREATE DATABASE IF NOT EXISTS `annur_minsoc` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE `annur_minsoc`;

-- ------------------------------------------------------------------------------
-- 1. TABEL TEAMS (Daftar Tim Turnamen)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `teams` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `short_name` VARCHAR(10) NOT NULL,
  `logo_url` LONGTEXT DEFAULT NULL,
  `group_name` VARCHAR(10) NOT NULL,
  `color` VARCHAR(20) DEFAULT NULL,
  `category` VARCHAR(10) DEFAULT 'U10',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_teams_group` (`group_name`),
  KEY `idx_teams_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. TABEL MATCHES (Jadwal, Skor & Status Pertandingan)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `matches` (
  `id` VARCHAR(36) NOT NULL,
  `team_a_id` VARCHAR(36) NOT NULL,
  `team_b_id` VARCHAR(36) NOT NULL,
  `score_a` INT NOT NULL DEFAULT 0,
  `score_b` INT NOT NULL DEFAULT 0,
  `status` VARCHAR(20) NOT NULL DEFAULT 'scheduled',
  `match_date` DATE NOT NULL,
  `kickoff_time` TIME NOT NULL,
  `field` VARCHAR(50) NOT NULL,
  `stage` VARCHAR(20) NOT NULL DEFAULT 'grup',
  `group_name` VARCHAR(10) DEFAULT NULL,
  `category` VARCHAR(10) DEFAULT 'U10',
  `penalty_score_a` INT DEFAULT NULL,
  `penalty_score_b` INT DEFAULT NULL,
  `winner_team_id` VARCHAR(36) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_matches_status` (`status`),
  KEY `idx_matches_date` (`match_date`),
  KEY `idx_matches_stage` (`stage`),
  KEY `idx_matches_category` (`category`),
  KEY `fk_matches_team_a` (`team_a_id`),
  KEY `fk_matches_team_b` (`team_b_id`),
  CONSTRAINT `fk_matches_team_a` FOREIGN KEY (`team_a_id`) REFERENCES `teams` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_matches_team_b` FOREIGN KEY (`team_b_id`) REFERENCES `teams` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. TABEL EVENT SETTINGS (Pengaturan Informasi Turnamen)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `event_settings` (
  `id` VARCHAR(36) NOT NULL,
  `event_name` VARCHAR(255) NOT NULL DEFAULT 'An-Nur Mini Soccer',
  `start_date` DATE NOT NULL DEFAULT '2026-10-09',
  `end_date` DATE NOT NULL DEFAULT '2026-10-10',
  `location` VARCHAR(255) NOT NULL DEFAULT 'Lapangan An-Nur',
  `map_url` TEXT DEFAULT NULL,
  `rules_text` TEXT DEFAULT NULL,
  `tiebreak_rules` TEXT NOT NULL,
  `contact_info` VARCHAR(255) DEFAULT NULL,
  `passcode_field_1` VARCHAR(50) NOT NULL DEFAULT 'LAP1-2026',
  `passcode_field_2` VARCHAR(50) NOT NULL DEFAULT 'LAP2-2026',
  `passcode_scorer` VARCHAR(50) NOT NULL DEFAULT 'WASIT-2026',
  `active_category` VARCHAR(10) NOT NULL DEFAULT 'U12',
  `active_date` DATE NOT NULL DEFAULT '2026-10-10',
  `points_per_win` INT NOT NULL DEFAULT 3,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. TABEL PLAYERS (Daftar Pemain per Tim)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `players` (
  `id` VARCHAR(36) NOT NULL,
  `team_id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `jersey_number` INT DEFAULT NULL,
  `position` VARCHAR(10) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_players_team` (`team_id`),
  CONSTRAINT `fk_players_team` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. TABEL MATCH EVENTS (Pencetak Gol & Kartu Kuning/Merah)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `match_events` (
  `id` VARCHAR(36) NOT NULL,
  `match_id` VARCHAR(36) NOT NULL,
  `team_id` VARCHAR(36) NOT NULL,
  `player_id` VARCHAR(36) DEFAULT NULL,
  `player_name` VARCHAR(255) NOT NULL,
  `type` VARCHAR(20) NOT NULL,
  `minute` INT NOT NULL DEFAULT 1,
  `note` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_match_events_match` (`match_id`),
  KEY `idx_match_events_team` (`team_id`),
  CONSTRAINT `fk_events_match` FOREIGN KEY (`match_id`) REFERENCES `matches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_events_team` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_events_player` FOREIGN KEY (`player_id`) REFERENCES `players` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. TABEL SPONSORS (Sponsorship & Partner Turnamen)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sponsors` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `logo_url` LONGTEXT NOT NULL,
  `tier` VARCHAR(20) NOT NULL DEFAULT 'gold',
  `website_url` TEXT DEFAULT NULL,
  `display_order` INT NOT NULL DEFAULT 0,
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sponsors_tier` (`tier`),
  KEY `idx_sponsors_active` (`active`),
  KEY `idx_sponsors_order` (`display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. TABEL ADMIN USERS (Pengguna & Hak Akses Panitia / Superadmin)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `admin_users` (
  `id` VARCHAR(36) NOT NULL,
  `username` VARCHAR(100) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` VARCHAR(20) NOT NULL DEFAULT 'admin',
  `active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_admin_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 8. TABEL AUDIT LOG (Catatan Aktivitas Admin)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_log` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) DEFAULT NULL,
  `username` VARCHAR(100) DEFAULT NULL,
  `action` VARCHAR(100) NOT NULL,
  `target` VARCHAR(255) DEFAULT NULL,
  `payload` JSON DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_user` (`user_id`),
  KEY `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 9. TABEL TOURNAMENT ARCHIVES (Container Arsip & Snapshot Turnamen)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tournament_archives` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `category` VARCHAR(10) NOT NULL DEFAULT 'U10',
  `match_date` DATE DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `snapshot_data` LONGTEXT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_archive_category` (`category`),
  KEY `idx_archive_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- DATA AWAL DEFAULT (Inisialisasi)
-- ------------------------------------------------------------------------------
-- a. Default Pengaturan Acara
INSERT INTO `event_settings` (`id`, `event_name`, `start_date`, `end_date`, `location`, `tiebreak_rules`)
SELECT 'f1bc52dd-0df6-4855-a179-bd48875935b6', 'An-Nur Mini Soccer', '2026-10-09', '2026-10-10', 'Lapangan An-Nur', 'poin → selisih gol → gol masuk'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `event_settings`);

-- b. Superadmin default: username 'admin', password 'annurminsoc2026'
INSERT INTO `admin_users` (`id`, `username`, `password_hash`, `role`, `active`)
SELECT 'admin-root-001', 'admin', '$2b$10$YvYO5NeIw40CJ4WC3vB9CeULqHZHgGoRL3I1XcxdP7GiCHILalyQq', 'superadmin', 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `admin_users` WHERE `username` = 'admin');

-- c. Default Sponsor
INSERT INTO `sponsors` (`id`, `name`, `logo_url`, `tier`, `website_url`, `display_order`, `active`)
SELECT 's-annur-platinum', 'Yayasan An-Nur', '/logoutama.png', 'platinum', NULL, 1, 1
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `sponsors` WHERE `id` = 's-annur-platinum');
