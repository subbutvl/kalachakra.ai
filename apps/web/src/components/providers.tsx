"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { useLocaleSetup } from "@/i18n/locale";

export function Providers({ children }: { children: ReactNode }) {
  useLocaleSetup();
  const [client] = useState(
    () =>
      new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
