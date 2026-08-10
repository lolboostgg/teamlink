"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { CurrencyProvider } from "@/components/currency/CurrencyProvider";
import { LanguageProvider } from "@/components/language/LanguageProvider";
import { AuthModalProvider } from "@/components/auth/AuthModalProvider";
import { TeammatesSync } from "@/components/providers/TeammatesSync";
import { NotificationProvider } from "@/components/dashboard/NotificationProvider";
import { ScrollToTopOnReload } from "@/components/layout/ScrollToTopOnReload";
import type { LanguageCode } from "@/lib/i18n";

// Single composition point for every app-wide client Context, mounted once
// in the root layout. ToastProvider sits outermost since AuthModalProvider
// (and others) call useToast() internally. SessionProvider is what makes
// useSession() work in AuthModalProvider (real accounts, see src/auth.ts)
// — otherwise order doesn't matter functionally, kept stable so provider
// nesting in devtools is predictable.
export function AppProviders({ children, initialLanguage }: { children: ReactNode; initialLanguage: LanguageCode }) {
  return (
    <ToastProvider>
      <ScrollToTopOnReload />
      <SessionProvider>
        <CurrencyProvider>
          <LanguageProvider initialLanguage={initialLanguage}>
            <AuthModalProvider>
              <NotificationProvider>
                <TeammatesSync />
                {children}
              </NotificationProvider>
            </AuthModalProvider>
          </LanguageProvider>
        </CurrencyProvider>
      </SessionProvider>
    </ToastProvider>
  );
}
