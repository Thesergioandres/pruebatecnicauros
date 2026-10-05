"use client";

import { useContext } from "react";

import { SessionContext, type SessionContextValue } from "../providers/SessionProvider.js";

export function useSession(): SessionContextValue {
  return useContext(SessionContext);
}
