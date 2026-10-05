import {
  TICKET_PRIORITY_LABELS,
  type TicketPriority,
} from "@soporte/shared";

import { Badge, type BadgeTone } from "../ui/Badge.js";

const TONE_BY_PRIORITY: Record<TicketPriority, BadgeTone> = {
  BAJA: "neutral",
  MEDIA: "medium",
  ALTA: "high",
  CRITICA: "critical",
};

export interface PriorityBadgeProps {
  priority: TicketPriority;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  return (
    <Badge tone={TONE_BY_PRIORITY[priority]} pulse={priority === "CRITICA"}>
      {TICKET_PRIORITY_LABELS[priority]}
    </Badge>
  );
}
