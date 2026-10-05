import { AppShell } from "../../presentation/components/shell/AppShell.js";
import { SessionBootstrap } from "../../presentation/components/shell/SessionBootstrap.js";

/**
 * Layout del grupo `(app)`. Aqui viven todas las rutas autenticadas.
 *  - `SessionBootstrap` intenta restaurar la sesion via `GET /api/auth/me`
 *    (cookie httpOnly). Mientras dura, muestra un estado neutro.
 *  - Si no hay sesion, redirige a `/login` (solo una vez tras el bootstrap).
 *  - `AppShell` envuelve sidebar + topbar + area principal.
 *
 * Los sub-grupos `(tickets)` y `(admin)` solo anaden comprobaciones
 * adicionales (rol) sobre la sesion ya restaurada.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionBootstrap>
      <AppShell>{children}</AppShell>
    </SessionBootstrap>
  );
}
