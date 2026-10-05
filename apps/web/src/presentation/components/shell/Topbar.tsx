"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { authContainer } from "../../../infrastructure/container.js";
import { useSession } from "../../hooks/useSession.js";

/**
 * Topbar pegajoso con:
 *  - Boton hamburguesa (solo mobile) que abre el drawer del sidebar.
 *  - Breadcrumb sintetico a partir del pathname.
 *  - Busqueda global con shortcut `⌘K` (placeholder; la accion real no
 *    se implementa en este slice, pero el atajo esta visible y es focuseable).
 *  - Chip de rol + menu de usuario con accion de cerrar sesion.
 *
 * El header se mantiene en `position: sticky` para que el breadcrumb y
 * el menu esten siempre disponibles, como en Linear/Stripe.
 */

const SEGMENT_LABELS: Record<string, string> = {
  admin: "Operaciones",
  tickets: "Solicitudes",
  users: "Usuarios",
  new: "Nueva",
  edit: "Editar",
  login: "Acceso",
};

function buildBreadcrumb(pathname: string): { label: string; href: string }[] {
  if (!pathname || pathname === "/") return [];
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [];
  let acc = "";
  for (const seg of segments) {
    acc += `/${seg}`;
    const label =
      SEGMENT_LABELS[seg] ??
      (seg.length > 24 ? `${seg.slice(0, 12)}…` : seg);
    crumbs.push({ label, href: acc });
  }
  return crumbs;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

const ROLE_LABELS = {
  ADMIN: "Administrador",
  USER: "Cliente",
} as const;

export function Topbar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const { session, setSession } = useSession();
  const pathname = usePathname() ?? "";
  const crumbs = buildBreadcrumb(pathname);
  const [menuOpen, setMenuOpen] = useState(false);

  // Cierra el menu al cambiar de ruta.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await authContainer.logout();
    setSession(null);
  }

  return (
    <header className="sticky top-0 z-30 h-16 bg-[--color-surface]/85 backdrop-blur-md border-b border-[--color-border-faint] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex h-full items-center justify-between gap-3 px-4 sm:px-6">
        {/* Izquierda: hamburguesa + breadcrumb + busqueda */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileNav}
            aria-label="Abrir menu de navegacion"
            className="lg:hidden -ml-1 p-2 rounded-md text-[--color-on-surface-muted] hover:bg-[--color-surface-muted] hover:text-[--color-on-surface] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-brand-500]"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>

          {crumbs.length > 0 ? (
            <nav aria-label="Ruta" className="hidden sm:flex items-center gap-1 text-sm text-[--color-on-surface-muted] min-w-0">
              <Link href="/" className="hover:text-[--color-on-surface] transition-colors">
                Soporte
              </Link>
              {crumbs.map((crumb, idx) => (
                <span key={crumb.href} className="flex items-center gap-1 min-w-0">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden className="shrink-0 text-[--color-on-surface-faint]">
                    <path d="M4.5 2.5l3 3.5-3 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {idx === crumbs.length - 1 ? (
                    <span className="font-mono text-xs font-semibold text-[--color-brand-600] truncate">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link href={crumb.href} className="hover:text-[--color-on-surface] transition-colors truncate">
                      {crumb.label}
                    </Link>
                  )}
                </span>
              ))}
            </nav>
          ) : (
            <Link href="/" className="hidden sm:block text-sm font-semibold text-[--color-on-surface]">
              Centro de soporte
            </Link>
          )}

          <div className="hidden lg:flex items-center gap-2 ml-2 px-3 py-1.5 rounded-lg bg-[--color-surface-muted] border border-[--color-border-faint] w-72 focus-within:border-[--color-brand-300] focus-within:bg-[--color-surface] transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="text-[--color-on-surface-faint]">
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              placeholder="Buscar ticket, usuario, palabra clave..."
              aria-label="Busqueda global"
              className="flex-1 bg-transparent text-sm text-[--color-on-surface] placeholder:text-[--color-on-surface-faint] focus:outline-none"
            />
            <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[--color-surface] border border-[--color-border] text-[--color-on-surface-muted]">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Derecha: rol + notificaciones + usuario */}
        <div className="flex items-center gap-2 sm:gap-3">
          {session ? (
            <>
              <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[--color-surface-muted] border border-[--color-border-faint] text-[11px] font-semibold text-[--color-on-surface]">
                <span
                  className={
                    session.user.role === "ADMIN"
                      ? "h-1.5 w-1.5 rounded-full bg-[--color-brand-500]"
                      : "h-1.5 w-1.5 rounded-full bg-[--color-info]"
                  }
                  aria-hidden
                />
                {ROLE_LABELS[session.user.role]}
              </span>

              <button
                type="button"
                aria-label="Notificaciones"
                className="relative p-2 rounded-md text-[--color-on-surface-muted] hover:bg-[--color-surface-muted] hover:text-[--color-on-surface] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-brand-500]"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path d="M10 2.5a4.5 4.5 0 0 0-4.5 4.5v2.5L4 13h12l-1.5-3.5V7A4.5 4.5 0 0 0 10 2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M8 15.5a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-[--color-critical] text-white text-[10px] font-bold flex items-center justify-center">
                  3
                </span>
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-[--color-surface-muted] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-brand-500] transition-colors"
                >
                  <span
                    aria-hidden
                    className="h-8 w-8 rounded-full bg-[--color-brand-500] text-white text-xs font-semibold flex items-center justify-center"
                  >
                    {getInitials(session.user.name)}
                  </span>
                  <span className="hidden sm:flex flex-col items-start leading-tight">
                    <span className="text-xs font-semibold text-[--color-on-surface]">
                      {session.user.name}
                    </span>
                    <span className="text-[10px] text-[--color-on-surface-muted]">
                      {session.user.email}
                    </span>
                  </span>
                </button>
                {menuOpen ? (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-56 rounded-lg border border-[--color-border] bg-[--color-surface] shadow-[0_10px_15px_-3px_rgba(15,23,42,0.1),0_4px_6px_-4px_rgba(15,23,42,0.05)] py-1"
                  >
                    <div className="px-3 py-2 border-b border-[--color-border-faint]">
                      <p className="text-xs font-semibold text-[--color-on-surface] truncate">
                        {session.user.name}
                      </p>
                      <p className="text-xs text-[--color-on-surface-muted] truncate">
                        {session.user.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => void handleLogout()}
                      className="w-full text-left px-3 py-2 text-sm text-[--color-on-surface] hover:bg-[--color-surface-muted] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[--color-brand-500]"
                    >
                      Cerrar sesion
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
