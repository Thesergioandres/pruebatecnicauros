import type { Metadata } from "next";

import { TicketDetailClient } from "@/presentation/components/tickets/TicketDetailClient.js";

export const metadata: Metadata = {
  title: "Detalle de solicitud",
};

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TicketDetailClient ticketId={id} />;
}
