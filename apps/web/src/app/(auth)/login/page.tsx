import type { Metadata } from "next";

import { LoginForm } from "../../../presentation/components/auth/LoginForm.js";

export const metadata: Metadata = {
  title: "Iniciar sesión",
};

export default function LoginPage() {
  return <LoginForm />;
}
