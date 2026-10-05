import type { Metadata } from "next";

import { RegisterForm } from "../../../presentation/components/auth/RegisterForm.js";

export const metadata: Metadata = {
  title: "Crear cuenta",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
