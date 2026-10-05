"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useSession } from "../hooks/useSession.js";
import { authContainer } from "../../infrastructure/container.js";
import { Button } from "./ui/Button.js";
import { BrandMark } from "./Brand.js";

const AUTH_PATHS = new Set<string>(["/login", "/register"]);

function isOnAuthPage(pathname: string): boolean {
  return AUTH_PATHS.has(pathname) || pathname.startsWith("/login/") || pathname.startsWith("/register/");
}

export function AppHeader() {
  const { session, setSession } = useSession();
  const pathname = usePathname();
  const onAuthPage = isOnAuthPage(pathname ?? "");

  async function handleLogout() {
    await authContainer.logout();
    setSession(null);
  }

  return (
    <header className="border-b border-[--color-border] bg-[--color-surface]">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md text-base font-semibold text-[--color-text] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-brand-500]"
          aria-label="Ir a la página de inicio"
        >
          <BrandMark size={28} />
          <span>Soporte</span>
        </Link>

        <nav aria-label="Navegación principal" className="flex items-center gap-2 text-sm">
          {session ? (
            <>
              <span
                aria-live="polite"
                className="hidden text-[--color-text-muted] sm:inline"
              >
                Hola, <span className="font-medium text-[--color-text]">{session.user.name}</span>
              </span>
              <Button variant="secondary" onClick={() => void handleLogout()}>
                Cerrar sesión
              </Button>
            </>
          ) : onAuthPage ? null : (
            <>
              <Link
                href="/login"
                className="rounded-md px-3 py-1.5 text-[--color-text] hover:bg-[--color-surface-muted] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-brand-500]"
              >
                Ingresar
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-[--color-brand-600] px-3 py-1.5 font-semibold text-white hover:bg-[--color-brand-700] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[--color-brand-600]"
              >
                Crear cuenta
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
