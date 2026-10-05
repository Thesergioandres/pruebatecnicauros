import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { SessionProvider } from "../presentation/providers/SessionProvider.js";
import { SkipLink } from "../presentation/components/SkipLink.js";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Soporte · Solicitudes internas",
    template: "%s · Soporte",
  },
  description:
    "Plataforma interna para registrar, seguir y resolver solicitudes de soporte técnico.",
  applicationName: "Soporte",
  authors: [{ name: "Equipo de Soporte" }],
  formatDetection: { email: false, telephone: false },
  robots: { index: false, follow: false },
  icons: {
    icon: [{ url: "/icon", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#3525cd",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="bg-[var(--color-canvas)] text-[var(--color-on-surface)] font-sans antialiased">
        <SessionProvider>
          <SkipLink />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
