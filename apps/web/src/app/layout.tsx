import type { Metadata } from "next";

import { AppHeader } from "../presentation/components/AppHeader.js";
import { SkipLink } from "../presentation/components/SkipLink.js";
import { SessionProvider } from "../presentation/providers/SessionProvider.js";

import "./globals.css";

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
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2c55d1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[--color-surface-muted] text-[--color-text]">
        <SessionProvider>
          <SkipLink />
          <AppHeader />
          <main
            id="main-content"
            tabIndex={-1}
            className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10"
          >
            {children}
          </main>
          <footer className="mx-auto w-full max-w-5xl px-4 py-6 text-xs text-[--color-text-muted] sm:px-6">
            <p>
              Soporte interno · Construido con Next.js, TypeScript y Tailwind.
            </p>
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}
