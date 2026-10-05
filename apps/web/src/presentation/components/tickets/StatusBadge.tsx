import {
  TICKET_STATUS_LABELS,
  type TicketStatus,
} from "@soporte/shared";

import { Badge, type BadgeTone } from "../ui/Badge.js";

/**
 * Mapeo entre estado de la solicitud y tono semantico del badge.
 * La nomenclatura sigue el sistema del design: PENDIENTE = neutral
 * (espera), EN_PROGRESO = info (en transito), RESUELTA = success,
 * CANCELADA = neutral con opacidad reducida.
 */
const TONE_BY_STATUS: Record<TicketStatus, BadgeTone> = {
  PENDIENTE: "neutral",
  EN_PROGRESO: "info",
  RESUELTA: "success",
  CANCELADA: "neutral",
};

export interface StatusBadgeProps {
  status: TicketStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const cancelled = status === "CANCELADA";
  return (
    <Badge
      tone={TONE_BY_STATUS[status]}
      className={cancelled ? "opacity-70" : undefined}
    >
      {TICKET_STATUS_LABELS[status]}
    </Badge>
  );
}
