import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acceso",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center py-6 sm:py-10">
      {children}
    </div>
  );
}
