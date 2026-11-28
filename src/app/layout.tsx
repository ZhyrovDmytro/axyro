import { trainingTagline } from "@/lib/brand-copy";
import Link from "next/link";
import type { Metadata, Viewport } from "next";

import { ConfirmationProvider } from "@/components/confirmation-dialog";
import { AuthProvider } from "@/components/auth/auth-provider";
import { AccountContent } from "@/components/auth/account-content";
import { EntitlementProvider } from "@/components/membership/entitlement-provider";

import {
  PaywallProvider,
  PaywallOutlet,
} from "@/components/membership/paywall-modal";

import { AppHeader } from "@/components/app-header";

import { publicOrigin, supportEmail } from "@/lib/publishing";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(publicOrigin),
  robots: { index: false, follow: false },
  title: "Axyro",
  description: "Mobile-first guided workouts for focused training at home.",
};

export const viewport: Viewport = {
  themeColor: "#111412",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ConfirmationProvider>
          <PaywallProvider>
            <AuthProvider>
              <EntitlementProvider>
                <PaywallOutlet />
                <div className="app-frame">
                  <a className="skip-link" href="#main-content">
                    Skip to content
                  </a>
                  <AppHeader />
                  <div id="main-content" tabIndex={-1}>
                    <AccountContent>{children}</AccountContent>
                  </div>
                  <footer className="site-footer">
                    <div className="site-footer__intro">
                      <strong>Axyro</strong>
                      <p>{trainingTagline}</p>
                      <small>© {new Date().getFullYear()} Axyro</small>
                    </div>
                    <nav aria-label="Footer navigation">
                      <Link href="/">Home</Link>
                      <Link href="/plan">Training plan</Link>
                      <Link href="/workouts">Workouts</Link>
                      <Link href="/exercises">Exercise library</Link>
                      <Link href="/account">Account</Link>
                      <Link href="/settings">Settings</Link>
                    </nav>
                    <nav aria-label="Support and legal">
                      <Link href="/help">Help</Link>
                      <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
                      <Link href="/privacy">Privacy</Link>
                      <Link href="/terms">Terms</Link>
                    </nav>
                  </footer>
                </div>
              </EntitlementProvider>
            </AuthProvider>
          </PaywallProvider>
        </ConfirmationProvider>
      </body>
    </html>
  );
}
