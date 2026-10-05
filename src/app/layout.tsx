import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Solicitudes de soporte",
  description: "Gestión de solicitudes internas de soporte tecnológico.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-zinc-200 bg-white">
          <nav className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/tickets" className="text-sm font-semibold text-zinc-900">
              Soporte · Solicitudes
            </Link>
            <Link href="/tickets/new" className="text-sm text-blue-700 hover:underline">
              Nueva solicitud
            </Link>
          </nav>
        </header>
        <main className="flex-1 bg-zinc-50">{children}</main>
      </body>
    </html>
  );
}
