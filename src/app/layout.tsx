import type { Metadata, Viewport } from "next";

import { AuthProvider } from "@/components/auth/auth-provider";
import { EntitlementProvider } from "@/components/membership/entitlement-provider";

import { AppHeader } from "@/components/app-header";

import "./globals.css";

export const metadata: Metadata = {
  title: "Axyro",
  description: "Mobile-first guided workouts for focused training at home.",
};

export const viewport: Viewport = {
  themeColor: "#111111",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>
          <EntitlementProvider>
            <div className="app-frame">
              <a className="skip-link" href="#main-content">
                Skip to content
              </a>
              <AppHeader />
              <div id="main-content" tabIndex={-1}>
                {children}
              </div>
            </div>
          </EntitlementProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
