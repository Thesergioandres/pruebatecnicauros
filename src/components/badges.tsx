const STATUS_STYLES: Record<string, string> = {
  Pendiente: "bg-amber-100 text-amber-900 border-amber-300",
  "En progreso": "bg-blue-100 text-blue-900 border-blue-300",
  Resuelta: "bg-green-100 text-green-900 border-green-300",
  Cancelada: "bg-zinc-100 text-zinc-700 border-zinc-300",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? "bg-zinc-100 text-zinc-700 border-zinc-300";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`}
    >
      {status}
    </span>
  );
}

const PRIORITY_STYLES: Record<string, string> = {
  Baja: "bg-zinc-100 text-zinc-700 border-zinc-300",
  Media: "bg-sky-100 text-sky-900 border-sky-300",
  Alta: "bg-orange-100 text-orange-900 border-orange-300",
  "Crítica": "bg-red-100 text-red-900 border-red-300",
};

export function PriorityBadge({ priority }: { priority: string }) {
  const style =
    PRIORITY_STYLES[priority] ?? "bg-zinc-100 text-zinc-700 border-zinc-300";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`}
    >
      {priority}
    </span>
  );
}
