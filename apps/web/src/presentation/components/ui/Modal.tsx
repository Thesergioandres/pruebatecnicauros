"use client";

import { useEffect, useId, useRef } from "react";

import type { ReactNode } from "react";

/**
 * Modal accesible con backdrop, cierre por ESC y por clic fuera.
 *
 * Notas de accesibilidad (WCAG 2.1 AA):
 *  - `role="dialog"` + `aria-modal="true"` para tecnologias asistivas.
 *  - `aria-labelledby` enlaza con el titulo cuando existe.
 *  - Foco inicial: primer elemento focuseable. Foco anterior se restaura
 *    al cerrar. Esto es critico para usuarios de teclado y lector de
 *    pantalla.
 *  - ESC y clic fuera cierran el dialogo.
 *  - Se bloquea el scroll del body mientras esta abierto.
 */

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  // Si es `false`, el clic en el backdrop no cierra el modal (ej. durante
  // una peticion en vuelo).
  dismissible?: boolean;
}

const SIZE_CLASS = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
} as const;

const FOCUSABLE_SELECTOR =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  icon,
  children,
  footer,
  size = "md",
  dismissible = true,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Bloquea el scroll del body y gestiona foco al abrir/cerrar.
  useEffect(() => {
    if (!isOpen) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Foco inicial: primer focuseable, si no, el dialogo mismo.
    const dialog = dialogRef.current;
    if (dialog) {
      const focusables = dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      const target = focusables[0] ?? dialog;
      // Diferir al siguiente tick para que el dialogo este montado.
      const id = window.setTimeout(() => target.focus(), 0);
      return () => {
        window.clearTimeout(id);
        document.body.style.overflow = previousOverflow;
        previouslyFocusedRef.current?.focus();
      };
    }
    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocusedRef.current?.focus();
    };
  }, [isOpen]);

  // Cierre por ESC + focus trap con Tab.
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && dismissible) {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusables = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusables.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, dismissible, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      aria-hidden={false}
    >
      {/* Backdrop */}
      <div
        onClick={() => dismissible && onClose()}
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px] animate-[fadeIn_0.15s_ease-out]"
        aria-hidden="true"
      />

      {/* Dialogo */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={`relative z-10 w-full ${SIZE_CLASS[size]} rounded-xl bg-[var(--color-surface)] shadow-[0_20px_25px_-5px_rgba(15,23,42,0.12),0_8px_10px_-6px_rgba(15,23,42,0.06)] border border-[var(--color-border)] outline-none animate-[scaleIn_0.15s_ease-out]`}
      >
        {/* Header */}
        <header className="flex items-start gap-3 px-6 py-5 border-b border-[var(--color-border-faint)]">
          {icon ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-brand-50)] text-[var(--color-brand-600)]">
              {icon}
            </div>
          ) : null}
          <div className="flex-1 min-w-0">
            <h2
              id={titleId}
              className="text-lg font-semibold tracking-tight text-[var(--color-on-surface)]"
            >
              {title}
            </h2>
            {description ? (
              <p
                id={descriptionId}
                className="mt-1 text-sm text-[var(--color-on-surface-muted)]"
              >
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 -m-1 p-1 rounded-md text-[var(--color-on-surface-faint)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-on-surface)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-brand-500)] transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        {/* Body */}
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">{children}</div>

        {/* Footer */}
        {footer ? (
          <footer className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[var(--color-border-faint)] bg-[var(--color-surface-container-low)] rounded-b-xl">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
