import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Font di-host sendiri: build tidak bergantung jaringan, tidak ada
// permintaan ke Google Fonts saat runtime. Subset latin sudah cukup untuk
// Bahasa Indonesia (tanpa huruf beraksen di luar latin).
const bricolage = localFont({
  src: "./fonts/BricolageGrotesque-latin.woff2",
  variable: "--font-bricolage",
  display: "swap",
  weight: "500 800",
  fallback: ["Segoe UI", "system-ui", "sans-serif"],
});

const publicSans = localFont({
  src: "./fonts/PublicSans-latin.woff2",
  variable: "--font-public-sans",
  display: "swap",
  weight: "400 700",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
});

const plexMono = localFont({
  src: "./fonts/IBMPlexMono-latin.woff2",
  variable: "--font-plex-mono",
  display: "swap",
  weight: "500",
  fallback: ["ui-monospace", "Menlo", "monospace"],
});

export const metadata: Metadata = {
  title: {
    default: "An-Nur Mini Soccer 2026",
    template: "%s · An-Nur Mini Soccer",
  },
  description:
    "Turnamen mini soccer An-Nur, 9–10 Oktober 2026. Jadwal dan skor diperbarui langsung oleh panitia.",
  applicationName: "An-Nur Mini Soccer",
  keywords: ["mini soccer", "turnamen", "An-Nur", "jadwal", "skor"],
  openGraph: {
    title: "An-Nur Mini Soccer 2026",
    description: "Turnamen mini soccer An-Nur, 9–10 Oktober 2026.",
    type: "website",
    locale: "id_ID",
  },
  robots: { index: true, follow: true },
  icons: {
    icon: '/logoutama.png',
    apple: '/logoutama.png',
  },
};

export const viewport: Viewport = {
  themeColor: "#05070D",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${bricolage.variable} ${publicSans.variable} ${plexMono.variable}`}
    >
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}