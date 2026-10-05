import type { Metadata } from "next";

import { TicketForm } from "@/presentation/components/tickets/TicketForm.js";

export const metadata: Metadata = {
  title: "Nueva solicitud",
};

export default function NewTicketPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <TicketForm mode="create" />
    </div>
  );
}
