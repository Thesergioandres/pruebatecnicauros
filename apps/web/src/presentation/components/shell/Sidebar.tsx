"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { ReactNode } from "react";

import { useSession } from "../../hooks/useSession.js";
import { BrandMark } from "../Brand.js";

/**
 * Sidebar de navegacion principal. Se renderiza dentro de AppShell y se
 * duplica en MobileSidebar (drawer). Las definiciones de items viven en
 * `SIDEBAR_SECTIONS` para que ambas vistas compartan el mismo mapa.
 *
 * Visibilidad por rol:
 *  - ADMIN: ve "Principal" (Dashboard, Tickets, Usuarios) y "Sistema".
 *  - USER: ve "Portal Cliente" (Mis Solicitudes, Nueva Solicitud).
 *
 * El item activo se determina por prefijo de pathname para que las
 * sub-rutas (detalle, edicion) sigan marcando la seccion padre.
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
          <path d="M3 13a9 9 0 1 1 18 0" />
          <path d="M12 13l4-4" />
          <circle cx="12" cy="13" r="1" />
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
    case "settings":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
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
  | "settings"
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
  {
    title: "Sistema",
    items: [
      {
        label: "Configuracion SLA",
        href: "/admin",
        icon: <Icon name="settings" />,
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

function isActive(pathname: string, item: NavItem): boolean {
  const target = item.matchPrefix ?? item.href;
  if (target === "/tickets") {
    // Para "tickets" no queremos marcar el item si estamos en /tickets/new
    // con la intencion de crear (ese item se maneja aparte).
    return pathname === "/tickets" || pathname.startsWith("/tickets/");
  }
  return pathname === target || pathname.startsWith(`${target}/`);
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { session } = useSession();
  const pathname = usePathname() ?? "";
  const isAdmin = session?.user.role === "ADMIN";
  const sections = isAdmin ? ADMIN_SECTIONS : USER_SECTIONS;

  return (
    <nav
      aria-label="Navegacion principal"
      className="flex h-full w-64 flex-col bg-[--color-sidebar-bg] text-[--color-sidebar-text]"
    >
      {/* Brand */}
      <div className="flex h-16 items-center justify-between px-5 border-b border-[--color-sidebar-divider]">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-sm font-semibold text-[--color-sidebar-text] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-brand-400] rounded"
        >
          <BrandMark size={28} />
          <div className="flex flex-col leading-tight">
            <span className="font-semibold tracking-tight text-[--color-sidebar-text]">
              IT MANAGEMENT
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[--color-sidebar-text-muted]">
              Soporte interno
            </span>
          </div>
        </Link>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {sections.map((section) => (
          <div key={section.title} className="space-y-1">
            <h3 className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[--color-sidebar-section]">
              {section.title}
            </h3>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(pathname, item);
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={
                        active
                          ? "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-semibold bg-[--color-brand-500] text-white shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-brand-300]"
                          : "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-[--color-sidebar-text] hover:bg-[--color-sidebar-bg-hover] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-brand-400] transition-colors"
                      }
                    >
                      <span
                        className={
                          active
                            ? "text-white"
                            : "text-[--color-sidebar-text-muted]"
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

      {/* Footer: cluster operativo (estilo Stitch) */}
      <div className="m-3 p-3 rounded-lg border border-[--color-sidebar-divider] bg-[rgba(15,23,42,0.5)]">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[--color-info] opacity-75 animate-ping" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[--color-info]" />
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[--color-sidebar-text]">
            Cluster Operativo
          </span>
        </div>
        <p className="mt-1.5 font-mono text-[11px] text-[--color-sidebar-text-muted]">
          EU-1 · 99.98% uptime
        </p>
      </div>
    </nav>
  );
}
