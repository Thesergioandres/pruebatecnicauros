"use client";

import { createContext, useCallback, useMemo, useState } from "react";

import type { AuthSession } from "../../domain/auth.js";

export interface SessionContextValue {
  session: AuthSession | null;
  setSession: (session: AuthSession | null) => void;
}

export const SessionContext = createContext<SessionContextValue>({
  session: null,
  setSession: () => undefined,
});

export interface SessionProviderProps {
  children: React.ReactNode;
  initialSession?: AuthSession | null;
}

export function SessionProvider({ children, initialSession = null }: SessionProviderProps) {
  const [session, setSessionState] = useState<AuthSession | null>(initialSession);

  const setSession = useCallback((next: AuthSession | null) => {
    setSessionState(next);
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({ session, setSession }),
    [session, setSession],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
