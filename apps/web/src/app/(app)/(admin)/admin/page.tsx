import type { Metadata } from "next";

import { DashboardClient } from "../../../../presentation/components/admin/DashboardClient.js";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function AdminDashboardPage() {
  return <DashboardClient />;
}
