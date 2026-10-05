import { Button } from "./Button.js";

export interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  label?: string;
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  label = "solicitudes",
}: PaginationProps) {
  if (total === 0) return null;
  const safePage = Math.min(Math.max(1, page), totalPages);
  const desde = (safePage - 1) * pageSize + 1;
  const hasta = Math.min(total, safePage * pageSize);
  const canPrev = safePage > 1;
  const canNext = safePage < totalPages;

  return (
    <nav
      aria-label="Paginación"
      className="flex flex-col items-start justify-between gap-3 border-t border-[--color-border] px-1 py-3 text-sm sm:flex-row sm:items-center"
    >
      <p className="text-[--color-text-muted]">
        Mostrando <span className="font-semibold text-[--color-text]">{desde}–{hasta}</span> de{" "}
        <span className="font-semibold text-[--color-text]">{total}</span> {label}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={!canPrev}
          aria-label="Página anterior"
        >
          Anterior
        </Button>
        <span aria-live="polite" className="px-1 text-[--color-text-muted]">
          Página {safePage} de {totalPages}
        </span>
        <Button
          variant="secondary"
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={!canNext}
          aria-label="Página siguiente"
        >
          Siguiente
        </Button>
      </div>
    </nav>
  );
}
