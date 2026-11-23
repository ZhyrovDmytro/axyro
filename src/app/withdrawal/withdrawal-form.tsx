"use client";

import { useEffect, useRef, useState } from "react";

type Receipt = { message: string; receiptSent: boolean };

export function WithdrawalForm() {
  const [details, setDetails] = useState({
    name: "",
    contract_reference: "",
    email: "",
  });
  const [id, setId] = useState<string>();
  const [receipt, setReceipt] = useState<Receipt>();
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const [error, setError] = useState("");
  const nameField = useRef<HTMLInputElement>(null);
  const edited = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const stage = receipt ? "receipt" : id ? "review" : "details";

  useEffect(() => {
    if (stage === "details" && edited.current) nameField.current?.focus();
    if (stage !== "details") heading.current?.focus();
  }, [stage]);

  async function confirm() {
    if (sending.current || !id) return;
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/billing/withdrawal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...details, id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setReceipt(result);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Try again or email support.",
      );
    } finally {
      setBusy(false);
      sending.current = false;
    }
  }

  if (receipt) {
    return (
      <section className="account-section">
        <h2 ref={heading} tabIndex={-1}>
          Withdrawal received
        </h2>
        <p className="withdrawal-receipt">{receipt.message}</p>
        <p role="status">
          {receipt.receiptSent
            ? `We sent a receipt to ${details.email}.`
            : "Your withdrawal has been recorded. The email receipt is still pending."}
        </p>
        <div className="withdrawal-actions">
          <a
            className="button button--primary"
            download="axyro-withdrawal.txt"
            href={`data:text/plain;charset=utf-8,${encodeURIComponent(receipt.message)}`}
          >
            Download receipt
          </a>
          {!receipt.receiptSent && (
            <button
              className="button button--secondary"
              type="button"
              disabled={busy}
              onClick={() => void confirm()}
            >
              {busy ? "Sending…" : "Retry receipt email"}
            </button>
          )}
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </section>
    );
  }

  if (id) {
    return (
      <section className="account-section">
        <h2 ref={heading} tabIndex={-1}>
          Review your withdrawal
        </h2>
        <p>I withdraw from my Axyro Pro contract.</p>
        <dl className="withdrawal-details">
          <dt>Name</dt>
          <dd>{details.name}</dd>
          <dt>Purchase</dt>
          <dd>{details.contract_reference}</dd>
          <dt>Send receipt to</dt>
          <dd>{details.email}</dd>
        </dl>
        <div className="withdrawal-actions">
          <button
            type="button"
            className="button button--primary"
            disabled={busy}
            onClick={() => void confirm()}
          >
            {busy ? "Confirming…" : "Confirm withdrawal"}
          </button>
          <button
            type="button"
            className="text-link"
            disabled={busy}
            onClick={() => {
              edited.current = true;
              setId(undefined);
              setError("");
            }}
          >
            Edit details
          </button>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </section>
    );
  }

  return (
    <form
      className="account-form"
      onSubmit={(event) => {
        event.preventDefault();
        setId(crypto.randomUUID());
      }}
    >
      <label>
        Full name
        <input
          required
          ref={nameField}
          autoComplete="name"
          maxLength={150}
          value={details.name}
          onChange={(e) => setDetails({ ...details, name: e.target.value })}
        />
      </label>
      <label>
        Purchase reference, invoice number or date
        <input
          required
          maxLength={250}
          value={details.contract_reference}
          onChange={(e) =>
            setDetails({ ...details, contract_reference: e.target.value })
          }
        />
      </label>
      <label>
        Email for your receipt
        <input
          required
          type="email"
          autoComplete="email"
          maxLength={254}
          value={details.email}
          onChange={(e) => setDetails({ ...details, email: e.target.value })}
        />
      </label>
      <button className="button button--primary" type="submit">
        Review withdrawal
      </button>
    </form>
  );
}
