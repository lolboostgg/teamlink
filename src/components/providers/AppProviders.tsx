"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { CurrencyProvider } from "@/components/currency/CurrencyProvider";
import { LanguageProvider } from "@/components/language/LanguageProvider";
import { RoleProvider } from "@/components/role/RoleProvider";
import { AuthModalProvider } from "@/components/auth/AuthModalProvider";

// Single composition point for every app-wide client Context, mounted once
// in the root layout. ToastProvider sits outermost since AuthModalProvider
// (and others) call useToast() internally. Otherwise order doesn't matter
// functionally — kept stable so provider nesting in devtools is predictable.
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <CurrencyProvider>
        <LanguageProvider>
          <RoleProvider>
            <AuthModalProvider>{children}</AuthModalProvider>
          </RoleProvider>
        </LanguageProvider>
      </CurrencyProvider>
    </ToastProvider>
  );
}
