"use client";

import { WhatsAppProvider } from "@/app/contexts/whatsapp-context";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <WhatsAppProvider>
      {children}
    </WhatsAppProvider>
  );
}
