"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface Confirmation {
  title: string;
  description: string;
  action: string;
  destructive?: boolean;
  onConfirm: () => void;
}

const ConfirmationContext = createContext<
  ((confirmation: Confirmation) => void) | null
>(null);

export function ConfirmationProvider({ children }: { children: ReactNode }) {
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const open = confirmation !== null;

  useLayoutEffect(() => {
    const element = dialog.current;
    if (!open || !element) return;
    element.showModal();
    cancel.current?.focus();
    return () => element.close();
  }, [open]);

  function close() {
    dialog.current?.close();
    setConfirmation(null);
  }

  return (
    <ConfirmationContext.Provider value={setConfirmation}>
      {children}
      <dialog
        ref={dialog}
        className="confirmation-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirmation-title"
        aria-describedby="confirmation-description"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
      >
        {confirmation && (
          <>
            <h2 id="confirmation-title">{confirmation.title}</h2>
            <p id="confirmation-description">{confirmation.description}</p>
            <div className="confirmation-dialog__actions">
              <button
                ref={cancel}
                className="button button--secondary"
                type="button"
                onClick={close}
              >
                Go back
              </button>
              <button
                className={
                  confirmation.destructive
                    ? "button button--danger"
                    : "button button--primary"
                }
                type="button"
                onClick={() => {
                  close();
                  confirmation.onConfirm();
                }}
              >
                {confirmation.action}
              </button>
            </div>
          </>
        )}
      </dialog>
    </ConfirmationContext.Provider>
  );
}

export function useConfirmation() {
  const confirm = useContext(ConfirmationContext);
  if (!confirm)
    throw new Error("useConfirmation requires ConfirmationProvider");
  return confirm;
}
