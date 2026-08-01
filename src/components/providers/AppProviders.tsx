"use client";

import type { ReactNode } from "react";
import { CurrencyProvider } from "@/components/currency/CurrencyProvider";
import { LanguageProvider } from "@/components/language/LanguageProvider";
import { RoleProvider } from "@/components/role/RoleProvider";
import { AuthModalProvider } from "@/components/auth/AuthModalProvider";

// Single composition point for every app-wide client Context, mounted once
// in the root layout. Order doesn't matter functionally (none of these
// depend on each other) — kept stable so provider nesting in devtools is
// predictable.
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <CurrencyProvider>
      <LanguageProvider>
        <RoleProvider>
          <AuthModalProvider>{children}</AuthModalProvider>
        </RoleProvider>
      </LanguageProvider>
    </CurrencyProvider>
  );
}
