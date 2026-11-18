"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { PaywallLink } from "@/components/membership/paywall-modal";
import { UiIcon } from "@/components/ui-icon";

const primaryLinks = [
  { href: "/", label: "Home" },
  { href: "/plan", label: "Plan" },
  { href: "/workouts", label: "Workouts" },
  { href: "/exercises", label: "Library" },
  { href: "/activity", label: "Activity" },
] as const;

export function AppHeader() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (/\/workouts\/[^/]+\/start\/?$/.test(pathname)) return null;

  const accountActive = user
    ? pathname === "/account"
    : ["/signin", "/signup", "/forgot-password", "/reset-password"].includes(
        pathname,
      );
  const accountHref = user ? "/account" : "/signin";

  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Axyro home">
        <span className="brand-mark" aria-hidden="true">
          A
        </span>
        <span>Axyro</span>
      </Link>
      <nav className="primary-nav" aria-label="Primary navigation">
        {primaryLinks.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname === link.href || pathname.startsWith(`${link.href}/`);

          const props = {
            className: "nav-link",
            href: link.href,
            "aria-current": active ? ("page" as const) : undefined,
            children: link.label,
          };
          return link.href === "/activity" ? (
            <PaywallLink
              {...props}
              key={link.href}
              context="progress"
              returnTo={link.href}
            />
          ) : (
            <Link {...props} key={link.href} />
          );
        })}
      </nav>
      <div className="header-actions">
        <Link
          aria-current={accountActive ? "page" : undefined}
          className="settings-link header-account"
          href={accountHref}
        >
          <svg
            aria-hidden="true"
            fill="none"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
              stroke="currentColor"
              strokeWidth="1.8"
            />
            <path
              d="M4 21v-2a8 6 0 0 1 16 0v2"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
          <span>{user ? "Account" : "Sign in"}</span>
        </Link>
        <Link
          className="settings-link"
          href="/settings"
          aria-label="Settings"
          title="Settings"
          aria-current={pathname === "/settings" ? "page" : undefined}
        >
          <UiIcon name="settings" />
        </Link>
      </div>
    </header>
  );
}
