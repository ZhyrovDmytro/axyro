"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { AuthUser } from "@/services/auth/types";
import {
  clearUserStorageIdentity,
  flushUserStorage,
  initializeUserStorage,
} from "@/services/persistence/user-storage";

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  configured: boolean;
  developmentAdminEnabled: boolean;
  error: string;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<AuthState | null>(null);
export async function authRequest(path: string, body: Record<string, unknown>) {
  const response = await fetch(`/api/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok)
    throw new Error(
      payload.error ?? "The request could not be completed. Please try again.",
    );
  return payload;
}
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState({
    user: null as AuthUser | null,
    loading: true,
    configured: false,
    developmentAdminEnabled: false,
    error: "",
  });
  const generation = useRef(0);
  const [syncError, setSyncError] = useState(false);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    clearUserStorageIdentity();
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      if (!response.ok)
        throw new Error("Your account could not be loaded. Please try again.");
      const payload = await response.json();
      if (current !== generation.current) return;
      await initializeUserStorage(payload.user?.id ?? null);
      if (current !== generation.current) return;
      setSyncError(false);
      setState({ ...payload, loading: false, error: "" });
    } catch (error) {
      if (current !== generation.current) return;
      setState((s) => ({
        ...s,
        user: null,
        loading: false,
        error:
          error instanceof Error ? error.message : "Connection unavailable.",
      }));
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  useEffect(() => {
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener("axyro:identity-changed", onFocus);
    return () => window.removeEventListener("axyro:identity-changed", onFocus);
  }, [refresh]);
  const signOut = useCallback(async () => {
    await flushUserStorage();
    await authRequest("logout", {});
    clearUserStorageIdentity();
    window.localStorage.setItem("axyro:identity-event", String(Date.now()));
    await refresh();
  }, [refresh]);
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === "axyro:identity-event") void refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);
  useEffect(() => {
    const failed = () => setSyncError(true);
    const leaving = () => {
      void flushUserStorage();
    };
    window.addEventListener("axyro:sync-error", failed);
    window.addEventListener("pagehide", leaving);
    return () => {
      window.removeEventListener("axyro:sync-error", failed);
      window.removeEventListener("pagehide", leaving);
    };
  }, []);
  return (
    <AuthContext.Provider value={{ ...state, refresh, signOut }}>
      {state.loading ? (
        <main className="page-shell" role="status">
          Loading your account…
        </main>
      ) : state.error ? (
        <main className="page-shell">
          <p role="alert">{state.error}</p>
          <button
            className="button button--dark"
            onClick={() => void refresh()}
          >
            Try again
          </button>
        </main>
      ) : (
        <div key={state.user?.id ?? "guest"}>
          {syncError && (
            <aside className="safety-note" role="alert">
              Your latest training changes could not be synced. Keep this tab
              open to preserve your local changes.{" "}
              <button className="text-link" onClick={() => void refresh()}>
                Reload saved cloud data
              </button>
            </aside>
          )}
          {children}
        </div>
      )}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth requires AuthProvider");
  return context;
}
