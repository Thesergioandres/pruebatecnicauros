"use client";

import { useState } from "react";

import { Sidebar } from "./Sidebar.js";
import { Topbar } from "./Topbar.js";
import { MobileSidebar } from "./MobileSidebar.js";

/**
 * AppShell: composicion de Sidebar + Topbar + area de contenido.
 *  - Desktop (>= lg): sidebar fijo a la izquierda (256px), topbar pegajoso.
 *  - Mobile (< lg): sidebar oculto, topbar muestra boton hamburguesa que
 *    abre un drawer con el mismo sidebar.
 *
 * El offset `lg:pl-64` en el main reserva el espacio del sidebar fijo.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-[--color-canvas] text-[--color-on-surface]">
      {/* Sidebar fijo solo en desktop */}
      <div className="hidden lg:block fixed inset-y-0 left-0 w-64 z-40">
        <Sidebar />
      </div>

      {/* Drawer mobile */}
      <MobileSidebar
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      {/* Columna principal con offset para el sidebar en desktop */}
      <div className="lg:pl-64 flex min-h-dvh flex-col">
        <Topbar onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 px-4 py-6 sm:px-6 sm:py-8 max-w-[1720px] w-full mx-auto focus:outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
