"use client";

import { Popover } from "@base-ui/react/popover";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
  const { user, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 48rem)");
    const closeOnDesktop = () => {
      if (desktop.matches) setMenuOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  if (/\/workouts\/[^/]+\/start\/?$/.test(pathname)) return null;

  const accountActive = user
    ? pathname === "/account"
    : ["/signin", "/signup", "/forgot-password", "/reset-password"].includes(
        pathname,
      );
  const accountHref = user ? "/account" : "/signin";

  const navigationLinks = primaryLinks.map((link) => {
    const active =
      link.href === "/"
        ? pathname === "/"
        : pathname === link.href || pathname.startsWith(`${link.href}/`);

    const props = {
      className: "nav-link",
      href: link.href,
      "aria-current": active ? ("page" as const) : undefined,
      children: link.label,
      onClick: () => {
        if (menuOpen) {
          setMenuOpen(false);
          menuButton.current?.focus();
        }
      },
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
  });

  return (
    <Popover.Root open={menuOpen} onOpenChange={setMenuOpen}>
      <header className="site-header">
        <Link
          className="brand"
          href="/"
          aria-label="Axyro home"
          onClick={() => setMenuOpen(false)}
        >
          <span className="brand-mark" aria-hidden="true">
            A
          </span>
          <span>Axyro</span>
        </Link>
        <Popover.Trigger
          ref={menuButton}
          className="mobile-menu-toggle"
          aria-label={menuOpen ? "Close" : "Menu"}
        >
          <UiIcon name={menuOpen ? "close" : "menu"} />
        </Popover.Trigger>
        <nav className="primary-nav" aria-label="Primary navigation">
          {navigationLinks}
        </nav>
        <div className="header-actions">
          {loading ? (
            <span className="skeleton skeleton--account" role="status">
              <span className="sr-only">Loading account…</span>
            </span>
          ) : (
            <Link
              aria-current={accountActive ? "page" : undefined}
              className="settings-link header-account"
              href={accountHref}
              onClick={() => setMenuOpen(false)}
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
          )}
          <Link
            className="settings-link"
            href="/settings"
            onClick={() => setMenuOpen(false)}
            aria-label="Settings"
            title="Settings"
            aria-current={pathname === "/settings" ? "page" : undefined}
          >
            <UiIcon name="settings" />
          </Link>
        </div>
      </header>
      <Popover.Portal>
        <Popover.Positioner
          className="mobile-nav-positioner"
          align="end"
          sideOffset={16}
          collisionPadding={16}
        >
          <Popover.Popup
            className="mobile-nav-popup"
            aria-label="Navigation"
            finalFocus={(type) => type === "keyboard"}
          >
            <nav className="mobile-primary-nav" aria-label="Primary navigation">
              {navigationLinks}
            </nav>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
