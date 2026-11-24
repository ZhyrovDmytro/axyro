"use client";

import { Popover } from "@base-ui/react/popover";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { UiIcon } from "@/components/ui-icon";

const primaryLinks = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/plan", label: "Plan", icon: "calendar" },
  { href: "/workouts", label: "Workouts", icon: "dumbbell" },
  { href: "/exercises", label: "Library", icon: "book-open" },
  { href: "/rehub", label: "Rehub", icon: "recovery" },
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
      children: (
        <>
          <UiIcon name={link.icon} />
          {link.label}
        </>
      ),
      onClick: () => {
        if (menuOpen) {
          setMenuOpen(false);
          menuButton.current?.focus();
        }
      },
    };
    return <Link {...props} key={link.href} />;
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
          <Image
            src="/images/axyro-mark.png"
            alt=""
            width={32}
            height={32}
            unoptimized
          />
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
              <UiIcon name="account" />
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
          sideOffset={12}
          collisionPadding={16}
        >
          <Popover.Popup
            className="mobile-nav-popup"
            aria-label="Navigation"
            finalFocus={(type) => type === "keyboard"}
          >
            <nav className="mobile-primary-nav" aria-label="Primary navigation">
              {navigationLinks}
              <div
                className="mobile-nav-personal"
                role="group"
                aria-label="Personal settings"
              >
                {loading ? (
                  <span role="status">Loading account…</span>
                ) : (
                  <Link
                    className="nav-link"
                    href={accountHref}
                    aria-current={accountActive ? "page" : undefined}
                    onClick={() => setMenuOpen(false)}
                  >
                    <UiIcon name="account" />
                    {user ? "Account" : "Sign in"}
                  </Link>
                )}
                <Link
                  className="nav-link"
                  href="/settings"
                  aria-current={pathname === "/settings" ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  <UiIcon name="settings" />
                  Settings
                </Link>
              </div>
            </nav>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
