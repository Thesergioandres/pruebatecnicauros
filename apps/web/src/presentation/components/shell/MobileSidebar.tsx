"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { Sidebar } from "./Sidebar.js";

/**
 * Drawer del sidebar para mobile. Se muestra al abrir desde el boton
 * hamburguesa del Topbar. Cierra por:
 *  - clic en backdrop,
 *  - boton X,
 *  - navegacion (Sidebar invoca onNavigate),
 *  - tecla ESC.
 *
 * El sidebar es el mismo componente que la version desktop: asi
 * cualquier cambio de items se refleja en ambos lados.
 */
export function MobileSidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname() ?? "";
  const lastPathRef = useRef<string>(pathname);

  // Bloquea scroll cuando el drawer esta abierto.
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  // Cierre por ESC.
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  // Cierra tras un cambio real de pathname (no en el mount).
  useEffect(() => {
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;
    if (isOpen) onClose();
  }, [pathname, isOpen, onClose]);

  if (!isOpen) return null;
  return (
    <div
      className="lg:hidden fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Menu de navegacion"
    >
      <div
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
        aria-hidden
      />
      <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-[0_20px_25px_-5px_rgba(15,23,42,0.2)]">
        <div className="relative h-full">
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menu"
            className="absolute right-2 top-3 z-10 p-2 rounded-md text-white/80 hover:text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
          <Sidebar onNavigate={onClose} />
        </div>
      </div>
    </div>
  );
}
