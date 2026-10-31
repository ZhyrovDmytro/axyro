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
  retryUserStorageSync,
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
  const [syncConflict, setSyncConflict] = useState(false);
  const [retryingSync, setRetryingSync] = useState(false);
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
      setSyncConflict(false);
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
    const saved = () => {
      setSyncError(false);
      setSyncConflict(false);
    };
    const leaving = () => {
      void flushUserStorage();
    };
    window.addEventListener("axyro:sync-error", failed);
    window.addEventListener("axyro:sync-success", saved);
    window.addEventListener("pagehide", leaving);
    return () => {
      window.removeEventListener("axyro:sync-error", failed);
      window.removeEventListener("axyro:sync-success", saved);
      window.removeEventListener("pagehide", leaving);
    };
  }, []);
  async function retrySync() {
    setRetryingSync(true);
    try {
      const result = await retryUserStorageSync();
      setSyncError(result !== "saved");
      setSyncConflict(result === "conflict");
    } finally {
      setRetryingSync(false);
    }
  }
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
            <aside className="safety-note sync-notice" role="alert">
              <p>
                {syncConflict
                  ? "Your account has newer changes from another session. Your unsaved changes are still on this device. Reloading cloud data will replace them."
                  : "Your latest training changes could not be synced. Keep this tab open and retry saving to preserve your changes."}
              </p>
              <button
                className="text-link"
                disabled={retryingSync}
                onClick={() => {
                  if (!syncConflict) {
                    void retrySync();
                  } else if (
                    window.confirm(
                      "Replace this device’s unsaved training changes with the saved cloud data? This cannot be undone.",
                    )
                  ) {
                    void refresh();
                  }
                }}
              >
                {retryingSync
                  ? "Saving…"
                  : syncConflict
                    ? "Reload saved cloud data"
                    : "Retry saving"}
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
