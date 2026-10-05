import type { Metadata } from "next";

import { AdminUserForm } from "@/presentation/components/admin/AdminUserForm.js";

export const metadata: Metadata = {
  title: "Crear usuario",
};

export default function NewAdminUserPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <AdminUserForm />
    </div>
  );
}
