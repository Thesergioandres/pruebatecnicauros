"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import type { ReactNode } from "react";

import { authContainer } from "../../../infrastructure/container.js";
import { useSession } from "../../hooks/useSession.js";
import { BrandMark } from "../Brand.js";

/**
 * Sidebar de navegacion principal. Se renderiza dentro de AppShell y se
 * duplica en MobileSidebar (drawer). Las definiciones de items viven
 * en `ADMIN_SECTIONS` y `USER_SECTIONS` para que ambas vistas compartan
 * el mismo mapa.
 *
 * Visibilidad por rol:
 *  - ADMIN: ve "Principal" (Dashboard, Todos los tickets, Usuarios),
 *    "Portal Cliente" (Mis solicitudes, Nueva solicitud).
 *  - USER: ve solo "Portal Cliente" (Mis solicitudes, Nueva solicitud).
 *
 * El item activo se determina por prefijo de pathname. Cuando dos items
 * apuntan a la misma ruta (p. ej. "Todos los tickets" y "Mis solicitudes"
 * del admin, ambos van a /tickets), gana el que aparece primero en
 * orden de seccion, para no duplicar el estado activo.
 */

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  matchPrefix?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

function Icon({ name }: { name: NavIconName }) {
  // Cuadrado 20x20, stroke 1.75, linecap round. Mismo tamano en todos
  // los items para que la columna de iconos quede alineada a lo largo
  // del sidebar (sin saltos de baseline por glyphs de ancho variable).
  const props = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "dashboard":
      return (
        <svg {...props}>
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
      );
    case "tickets":
      return (
        <svg {...props}>
          <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 1 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 1 0 0-4V9z" />
        </svg>
      );
    case "users":
      return (
        <svg {...props}>
          <circle cx="9" cy="8" r="3.5" />
          <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M15 20a5 5 0 0 1 6.5-4.9" />
        </svg>
      );
    case "my-tickets":
      return (
        <svg {...props}>
          <rect x="3.5" y="4.5" width="17" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3.5 10h17" />
          <path d="M9 15l2 2 4-4" />
        </svg>
      );
    case "new-ticket":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      );
    case "logout":
      return (
        <svg {...props}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="M16 17l5-5-5-5M21 12H9" />
        </svg>
      );
  }
}

type NavIconName =
  | "dashboard"
  | "tickets"
  | "users"
  | "my-tickets"
  | "new-ticket"
  | "logout";

const ADMIN_SECTIONS: NavSection[] = [
  {
    title: "Principal",
    items: [
      { label: "Dashboard", href: "/admin", icon: <Icon name="dashboard" /> },
      {
        label: "Todos los tickets",
        href: "/tickets",
        icon: <Icon name="tickets" />,
        matchPrefix: "/tickets",
      },
      {
        label: "Usuarios",
        href: "/admin/users",
        icon: <Icon name="users" />,
        matchPrefix: "/admin/users",
      },
    ],
  },
  {
    title: "Portal Cliente",
    items: [
      {
        label: "Mis solicitudes",
        href: "/tickets",
        icon: <Icon name="my-tickets" />,
        matchPrefix: "/tickets",
      },
      {
        label: "Nueva solicitud",
        href: "/tickets/new",
        icon: <Icon name="new-ticket" />,
      },
    ],
  },
];

const USER_SECTIONS: NavSection[] = [
  {
    title: "Portal Cliente",
    items: [
      {
        label: "Mis solicitudes",
        href: "/tickets",
        icon: <Icon name="my-tickets" />,
        matchPrefix: "/tickets",
      },
      {
        label: "Nueva solicitud",
        href: "/tickets/new",
        icon: <Icon name="new-ticket" />,
      },
    ],
  },
];

function itemMatches(pathname: string, item: NavItem): boolean {
  const target = item.matchPrefix ?? item.href;
  if (target === "/tickets") {
    // Coincide con /tickets exacto y con sub-rutas (/tickets/[id], /tickets/[id]/edit).
    // Se excluye /tickets/new para que "Nueva solicitud" pueda marcarse activo
    // en su propia pagina sin que tambien lo haga "Todos los tickets".
    if (pathname === "/tickets/new") return false;
    return pathname === "/tickets" || pathname.startsWith("/tickets/");
  }
  return pathname === target || pathname.startsWith(`${target}/`);
}

function buildActiveMap(
  pathname: string,
  sections: NavSection[],
): Map<string, boolean> {
  // Recorre secciones e items en orden. Solo el PRIMER item que matchea
  // una ruta queda activo, asi evitamos doble marcado cuando dos items
  // apuntan al mismo destino (p. ej. "Todos los tickets" y
  // "Mis solicitudes" ambos van a /tickets).
  const active = new Map<string, boolean>();
  const claimed = new Set<string>();
  for (const section of sections) {
    for (const item of section.items) {
      const key = item.matchPrefix ?? item.href;
      if (claimed.has(key)) {
        active.set(item.label, false);
        continue;
      }
      if (itemMatches(pathname, item)) {
        active.set(item.label, true);
        claimed.add(key);
      } else {
        active.set(item.label, false);
      }
    }
  }
  return active;
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { session, setSession } = useSession();
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const isAdmin = session?.user.role === "ADMIN";
  const sections = isAdmin ? ADMIN_SECTIONS : USER_SECTIONS;
  const activeMap = buildActiveMap(pathname, sections);

  async function handleLogout() {
    await authContainer.logout();
    setSession(null);
    onNavigate?.();
    router.push("/login");
  }

  return (
    <nav
      aria-label="Navegacion principal"
      className="flex h-full w-64 flex-col bg-[var(--color-sidebar-bg)] text-[var(--color-sidebar-text)]"
    >
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center justify-between gap-2 px-5 border-b border-[var(--color-sidebar-divider)]">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-400)]"
        >
          <BrandMark size={28} />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight text-[var(--color-sidebar-text)]">
              IT MANAGEMENT
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-sidebar-text-muted)]">
              Soporte interno
            </span>
          </div>
        </Link>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {sections.map((section) => (
          <div key={section.title}>
            <h3 className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-sidebar-section)]">
              {section.title}
            </h3>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = activeMap.get(item.label) === true;
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={
                        active
                          ? "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-semibold bg-[var(--color-brand-500)] text-white shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-300)]"
                          : "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-bg-hover)] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-400)] transition-colors"
                      }
                    >
                      <span
                        className={
                          "flex h-5 w-5 shrink-0 items-center justify-center " +
                          (active ? "text-white" : "text-[var(--color-sidebar-text-muted)]")
                        }
                        aria-hidden
                      >
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Cierre de sesion */}
      <div className="shrink-0 px-3 pb-3 pt-2 border-t border-[var(--color-sidebar-divider)]">
        <button
          type="button"
          onClick={() => void handleLogout()}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-semibold text-[var(--color-sidebar-text)] hover:bg-[var(--color-sidebar-bg-hover)] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-400)] transition-colors"
        >
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center text-[var(--color-sidebar-text-muted)]"
            aria-hidden
          >
            <Icon name="logout" />
          </span>
          <span className="truncate">Cerrar sesion</span>
        </button>
      </div>
    </nav>
  );
}
