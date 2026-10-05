import type { Metadata } from "next";

import { TicketsListClient } from "@/presentation/components/tickets/TicketsListClient.js";

export const metadata: Metadata = {
  title: "Solicitudes",
};

export default function TicketsPage() {
  return <TicketsListClient />;
}
