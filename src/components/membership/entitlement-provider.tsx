"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/components/auth/auth-provider";
import type { Subscription } from "@/domain/access/entitlements";

const EntitlementContext = createContext<{
  hasPro: boolean;
  loading: boolean;
  subscription: Subscription | null;
  refresh: () => Promise<boolean>;
} | null>(null);
export function EntitlementProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const requestGeneration = useRef(0);
  const [state, setState] = useState({
    hasPro: false,
    userId: undefined as string | null | undefined,
    subscription: null as Subscription | null,
  });
  const refresh = useCallback(async () => {
    const generation = ++requestGeneration.current;
    try {
      const response = await fetch("/api/billing/status", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Membership unavailable");
      const payload = await response.json();
      if (generation !== requestGeneration.current) return false;
      setState({
        hasPro: payload.hasPro === true,
        subscription: payload.subscription,
        userId,
      });
      return payload.hasPro === true;
    } catch {
      if (generation !== requestGeneration.current) return false;
      setState({ hasPro: false, userId, subscription: null });
      return false;
    }
  }, [userId]);
  useEffect(() => {
    if (authLoading) return;
    const initial = window.setTimeout(() => {
      void refresh();
    }, 0);
    if (
      user &&
      new URLSearchParams(window.location.search).get("checkout") === "success"
    ) {
      void fetch("/api/billing/restore", { method: "POST" })
        .then(() => refresh())
        .catch(() => undefined);
    }
    const check = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const interval = window.setInterval(
      check,
      new URLSearchParams(window.location.search).get("checkout") === "success"
        ? 3000
        : 60_000,
    );
    window.addEventListener("focus", check);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
      window.removeEventListener("focus", check);
    };
  }, [refresh, user, authLoading]);
  const ready = !authLoading && state.userId === userId;
  return (
    <EntitlementContext.Provider
      value={{
        hasPro: ready && state.hasPro,
        loading: !ready,
        subscription: ready ? state.subscription : null,
        refresh,
      }}
    >
      {children}
    </EntitlementContext.Provider>
  );
}
export function useEntitlement() {
  const context = useContext(EntitlementContext);
  if (!context) throw new Error("useEntitlement requires EntitlementProvider");
  return context;
}
