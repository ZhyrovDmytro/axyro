"use client";

import { LoadingStatus } from "@/components/loading-status";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import { useDialogFocusTrap } from "@/hooks/use-dialog-focus-trap";
import { AuthForm, type AuthMode } from "@/components/auth/auth-form";
import { useAuth } from "@/components/auth/auth-provider";
import { UiIcon } from "@/components/ui-icon";
import { useEntitlement } from "./entitlement-provider";
import { Paywall, type PaywallContext } from "./paywall";

type PaywallRequest = {
  context: PaywallContext;
  returnTo: string;
  requirePro?: boolean;
  initialAuthMode?: "signin" | "signup";
  planCreated?: boolean;
};
type ModalRequest = PaywallRequest & { pathname: string };
const PaywallModalContext = createContext<{
  request: ModalRequest | null;
  open: (request: PaywallRequest) => void;
  close: () => void;
} | null>(null);

export function PaywallProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [request, setRequest] = useState<ModalRequest | null>(null);
  if (request && request.pathname !== pathname) setRequest(null);
  const open = useCallback(
    (next: PaywallRequest) => setRequest({ ...next, pathname }),
    [pathname],
  );
  const close = useCallback(() => setRequest(null), []);
  return (
    <PaywallModalContext.Provider value={{ request, open, close }}>
      {children}
    </PaywallModalContext.Provider>
  );
}

export function PaywallOutlet() {
  const modal = useContext(PaywallModalContext);
  if (!modal) throw new Error("PaywallOutlet requires PaywallProvider");
  return modal.request ? (
    <PaywallModal {...modal.request} onClose={modal.close} />
  ) : null;
}

export function usePaywallModal() {
  const modal = useContext(PaywallModalContext);
  if (!modal) throw new Error("Paywall access requires PaywallProvider");
  return modal.open;
}

export function PaywallLink({
  context,
  returnTo,
  requirePro = true,
  initialAuthMode = "signin",
  ...props
}: ComponentProps<typeof Link> & Omit<PaywallRequest, "planCreated">) {
  const open = usePaywallModal();
  const { user, loading: authLoading } = useAuth();
  const { hasPro, loading } = useEntitlement();
  return (
    <Link
      {...props}
      onNavigate={(event) => {
        if (!authLoading && user && (loading || !requirePro || hasPro)) return;
        event.preventDefault();
        open({ context, returnTo, requirePro, initialAuthMode });
      }}
    />
  );
}

function PaywallModal({
  context,
  returnTo,
  onClose,
  requirePro = true,
  initialAuthMode = "signin",
  planCreated = false,
}: ModalRequest & { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { user, loading: authLoading } = useAuth();
  const { hasPro, loading } = useEntitlement();
  const [authMode, setAuthMode] = useState<AuthMode | null | undefined>(
    undefined,
  );
  if (authMode === undefined && !authLoading)
    setAuthMode(user ? null : initialAuthMode);
  const router = useRouter();
  const dismissible = authMode !== null || !planCreated;
  const dismiss = useCallback(() => {
    if (dismissible) onClose();
  }, [dismissible, onClose]);
  useDialogFocusTrap(true, dialog, dismiss);
  useEffect(() => {
    const element = dialog.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element?.showModal();
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, []);
  useEffect(() => {
    if (authMode === null && !authLoading && !loading && user) {
      if (!requirePro || hasPro) {
        onClose();
        router.push(returnTo);
      }
    }
  }, [
    authMode,
    authLoading,
    user,
    hasPro,
    loading,
    requirePro,
    onClose,
    returnTo,
    router,
  ]);
  useEffect(() => {
    if (authMode === null && !loading) {
      dialog.current?.querySelector<HTMLElement>(".paywall-intro h2")?.focus();
    }
  }, [authMode, loading]);
  return (
    <dialog
      ref={dialog}
      className={`paywall-modal${authMode ? " paywall-modal--auth" : ""}${!dismissible ? " paywall-modal--locked" : ""}`}
      aria-label={authMode ? "Sign in to continue" : "Axyro Pro membership"}
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
    >
      <div className="paywall-modal-content">
        {dismissible && (
          <div className="dialog-heading paywall-modal-toolbar">
            <button
              aria-label={authMode ? "Close sign-in" : "Close paywall"}
              onClick={onClose}
            >
              <UiIcon name="close" />
            </button>
          </div>
        )}
        {authMode === undefined || (!authMode && loading) ? (
          <LoadingStatus className="paywall-membership-loading">
            Checking membership…
          </LoadingStatus>
        ) : authMode ? (
          <AuthForm
            key={authMode}
            mode={authMode}
            next={returnTo}
            embedded
            onModeChange={setAuthMode}
            onSuccess={() => setAuthMode(null)}
          />
        ) : (
          <Paywall
            context={context}
            returnTo={returnTo}
            embedded
            planCreated={planCreated}
          />
        )}
      </div>
    </dialog>
  );
}
