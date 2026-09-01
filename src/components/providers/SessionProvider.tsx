"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

export default function AppSessionProvider({
  children,
  session,
}: {
  children: ReactNode;
  session?: any;
}) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
