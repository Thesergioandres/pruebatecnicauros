"use client";

import {
  TICKET_CATEGORIES,
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITIES,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUSES,
  TICKET_STATUS_LABELS,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "@soporte/shared";

import { Button } from "../ui/Button.js";
import { Select } from "../ui/Select.js";
import { TextField } from "../ui/TextField.js";

export interface TicketFilterValue {
  search: string;
  status: TicketStatus | "";
  priority: TicketPriority | "";
  category: TicketCategory | "";
  sortBy: "createdAt" | "updatedAt" | "title" | "priority" | "status";
  sortOrder: "asc" | "desc";
}

export const EMPTY_FILTER: TicketFilterValue = {
  search: "",
  status: "",
  priority: "",
  category: "",
  sortBy: "createdAt",
  sortOrder: "desc",
};

export interface TicketFiltersProps {
  value: TicketFilterValue;
  onChange: (next: TicketFilterValue) => void;
  onReset: () => void;
  onApply: () => void;
  isLoading?: boolean;
}

const STATUS_OPTIONS = TICKET_STATUSES.map((value) => ({ value, label: TICKET_STATUS_LABELS[value] }));
const PRIORITY_OPTIONS = TICKET_PRIORITIES.map((value) => ({ value, label: TICKET_PRIORITY_LABELS[value] }));
const CATEGORY_OPTIONS = TICKET_CATEGORIES.map((value) => ({ value, label: TICKET_CATEGORY_LABELS[value] }));
const SORT_OPTIONS = [
  { value: "createdAt", label: "Fecha de creación" },
  { value: "updatedAt", label: "Última actualización" },
  { value: "title", label: "Título" },
  { value: "priority", label: "Prioridad" },
  { value: "status", label: "Estado" },
];
const ORDER_OPTIONS = [
  { value: "desc", label: "Descendente" },
  { value: "asc", label: "Ascendente" },
];

export function TicketFilters({ value, onChange, onReset, onApply, isLoading }: TicketFiltersProps) {
  function update<K extends keyof TicketFilterValue>(key: K, next: TicketFilterValue[K]) {
    onChange({ ...value, [key]: next });
  }

  return (
    <form
      role="search"
      aria-label="Filtros de solicitudes"
      onSubmit={(event) => {
        event.preventDefault();
        onApply();
      }}
      className="grid grid-cols-1 gap-3 rounded-lg border border-[--color-border] bg-[--color-surface] p-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <TextField
        label="Buscar"
        name="search"
        type="search"
        value={value.search}
        onChange={(v) => update("search", v)}
        placeholder="Texto en título o descripción"
      />
      <Select
        label="Estado"
        name="status"
        value={value.status}
        onChange={(v) => update("status", v as TicketStatus | "")}
        placeholder="Todos"
        options={[{ value: "", label: "Todos" }, ...STATUS_OPTIONS]}
      />
      <Select
        label="Prioridad"
        name="priority"
        value={value.priority}
        onChange={(v) => update("priority", v as TicketPriority | "")}
        placeholder="Todas"
        options={[{ value: "", label: "Todas" }, ...PRIORITY_OPTIONS]}
      />
      <Select
        label="Categoría"
        name="category"
        value={value.category}
        onChange={(v) => update("category", v as TicketCategory | "")}
        placeholder="Todas"
        options={[{ value: "", label: "Todas" }, ...CATEGORY_OPTIONS]}
      />
      <Select
        label="Ordenar por"
        name="sortBy"
        value={value.sortBy}
        onChange={(v) => update("sortBy", v as TicketFilterValue["sortBy"])}
        options={SORT_OPTIONS}
      />
      <Select
        label="Dirección"
        name="sortOrder"
        value={value.sortOrder}
        onChange={(v) => update("sortOrder", v as TicketFilterValue["sortOrder"])}
        options={ORDER_OPTIONS}
      />
      <div className="col-span-full flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onReset} disabled={isLoading}>
          Limpiar
        </Button>
        <Button type="submit" isLoading={isLoading}>
          Aplicar filtros
        </Button>
      </div>
    </form>
  );
}
