import type { Metadata } from "next";

import { UsersListClient } from "@/presentation/components/admin/UsersListClient.js";

export const metadata: Metadata = {
  title: "Usuarios",
};

export default function AdminUsersPage() {
  return <UsersListClient />;
}
