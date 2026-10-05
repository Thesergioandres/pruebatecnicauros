/**
 * Layout del sub-grupo `(tickets)`. La sesion ya fue validada por el
 * `SessionBootstrap` del layout padre, asi que aqui basta con un pase
 * directo sin tocar el cliente. La verificacion de autorizacion vive
 * en el padre (`(app)/layout.tsx`).
 */
export default function TicketsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
