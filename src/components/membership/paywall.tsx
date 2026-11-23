"use client";
import { LoadingStatus } from "@/components/loading-status";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { UiIcon } from "@/components/ui-icon";
import { useAuth } from "@/components/auth/auth-provider";
import { FREE_WORKOUT_ID } from "@/domain/access/entitlements";
import { useEntitlement } from "./entitlement-provider";

type Product = {
  id: string;
  amount: number;
  currency: string;
  interval: "month" | "year";
  intervalCount: number;
  taxInclusive?: boolean;
};
function formatPrice(product: Product) {
  const money = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: product.currency.toUpperCase(),
  });
  return money.format(
    product.amount / 10 ** (money.resolvedOptions().maximumFractionDigits ?? 2),
  );
}

function billingPeriod(product: Product) {
  return product.intervalCount === 1
    ? product.interval
    : `${product.intervalCount} ${product.interval}s`;
}

export type PaywallContext = "plan" | "workout" | "progress" | "library";
export type PlanOfferPreview = {
  title: string;
  date: string;
  minutes: number;
  reason: string;
};

export function Paywall({
  context = "plan",
  returnTo = "/plan/setup",
  onUnlocked,
  embedded = false,
  planCreated = false,
  preview,
}: {
  context?: PaywallContext;
  returnTo?: string;
  onUnlocked?: () => void;
  embedded?: boolean;
  planCreated?: boolean;
  preview?: PlanOfferPreview;
}) {
  const id = useId();
  const { user } = useAuth();
  const { hasPro, refresh } = useEntitlement();
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState<"checkout" | "restore" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [productsUnavailable, setProductsUnavailable] = useState(false);
  useEffect(() => {
    let active = true;
    void fetch("/api/billing/products")
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then((payload) => {
        if (!active) return;
        const sorted = (payload.products as Product[]).sort((a, b) =>
          a.interval === b.interval ? 0 : a.interval === "month" ? -1 : 1,
        );
        if (!sorted.length) throw new Error("No products available");
        setProducts(sorted);
        setSelected(
          (sorted.find((product) => product.currency === "usd") ?? sorted[0])
            ?.id ?? "",
        );
      })
      .catch(() => {
        if (active) {
          setProductsUnavailable(true);
          setError(
            "Subscriptions are currently unavailable. Please try again later.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (hasPro && onUnlocked) onUnlocked();
  }, [hasPro, onUnlocked]);
  async function purchase() {
    setBusy("checkout");
    setError("");
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: selected, returnTo }),
      });
      const payload = await response.json();
      if (response.status === 409) {
        const pending = products.find(
          ({ id }) => id === payload.pendingPriceId,
        );
        if (pending && typeof payload.pendingUntil === "string") {
          const until = new Date(payload.pendingUntil);
          if (Number.isFinite(until.getTime())) {
            setSelected(pending.id);
            setError(
              `Checkout is already open for ${formatPrice(pending)} every ${billingPeriod(pending)}. Review the selected price and continue, or choose another membership after ${until.toLocaleString()}.`,
            );
            setBusy(null);
            return;
          }
        }
      }
      if (!response.ok)
        throw new Error(
          payload.error ?? "Checkout unavailable. Please try again.",
        );
      window.location.assign(payload.url);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please try again.");
      setBusy(null);
    }
  }
  async function restore() {
    setBusy("restore");
    setError("");
    try {
      const response = await fetch("/api/billing/restore", { method: "POST" });
      if (!response.ok)
        throw new Error("Could not check your subscription. Please try again.");
      const active = await refresh();
      if (!active)
        setNotice("No active Pro subscription was found for this account.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(null);
    }
  }
  const titles = {
    plan: "Build your personal padel training plan",
    workout: "The full padel workout library",
    progress: "Your workout history and progress",
    library: "Your complete movement library",
  };
  const Heading = embedded ? "h2" : "h1";
  const selectedProduct = products.find((product) => product.id === selected);
  const currencies = [...new Set(products.map((product) => product.currency))];
  if (hasPro)
    return (
      <section className="account-panel">
        <Heading>Pro is active</Heading>
        <p>Your full training workspace is ready.</p>
        <Link className="button button--dark" href={returnTo}>
          Continue training
        </Link>
      </section>
    );
  return (
    <section
      className="account-panel paywall"
      aria-labelledby={`${id}-paywall-title`}
    >
      <div className="paywall-intro">
        <Heading
          id={`${id}-paywall-title`}
          tabIndex={embedded ? -1 : undefined}
        >
          {planCreated ? "Your plan is ready" : titles[context]}
        </Heading>
        <p className="lede">
          {planCreated
            ? "Axyro Pro includes your training schedule and guided sessions."
            : context === "library"
              ? "Movement demos and clear technique cues for every exercise in the collection."
              : context === "workout"
                ? "Choose a workout for your goal, with guided work and recovery from start to finish."
                : context === "progress"
                  ? "Review your completed sessions and keep track of your training."
                  : "A personal plan built around your goals, equipment and schedule."}
        </p>
        {preview && (
          <div className="plan-transparency">
            <strong>{preview.title}</strong>
            <p>
              {preview.date} · {preview.minutes} min
            </p>
            <p>{preview.reason}</p>
          </div>
        )}
        <ul className="membership-benefits" aria-label="Included with Pro">
          {[
            "Personalized padel training plan",
            "Full workout and exercise library",
            "Progress and workout history",
          ].map((benefit) => (
            <li key={benefit}>
              <UiIcon name="check" />
              <span>{benefit}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="paywall-checkout">
        <h2 className="paywall-membership-title">Axyro Pro</h2>
        {!products.length && !productsUnavailable && (
          <LoadingStatus className="paywall-loading">
            Loading memberships…
          </LoadingStatus>
        )}
        {products.length > 0 && (
          <>
            {currencies.length > 1 && (
              <div className="account-field">
                <label htmlFor={`${id}-membership-currency`}>Currency</label>
                <select
                  id={`${id}-membership-currency`}
                  className="plan-input"
                  value={selectedProduct?.currency}
                  disabled={!!busy}
                  onChange={(event) => {
                    const options = products.filter(
                      (product) => product.currency === event.target.value,
                    );
                    const next =
                      options.find(
                        (product) =>
                          product.interval === selectedProduct?.interval &&
                          product.intervalCount ===
                            selectedProduct.intervalCount,
                      ) ?? options[0];
                    if (next) setSelected(next.id);
                  }}
                >
                  {currencies.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <fieldset className="membership-products" disabled={!!busy}>
              <legend>Choose your membership</legend>
              {products
                .filter(
                  (product) => product.currency === selectedProduct?.currency,
                )
                .map((product) => (
                  <label
                    className={selected === product.id ? "is-selected" : ""}
                    key={product.id}
                  >
                    <input
                      type="radio"
                      name={`${id}-product`}
                      value={product.id}
                      checked={selected === product.id}
                      onChange={() => setSelected(product.id)}
                    />
                    <span className="membership-product-copy">
                      <strong>
                        {product.interval === "year" ? "Yearly" : "Monthly"}
                      </strong>
                      <span className="membership-product-price">
                        {formatPrice(product)}
                        <span className="membership-product-period">
                          /{" "}
                          {product.intervalCount > 1
                            ? product.intervalCount + " "
                            : ""}
                          {product.interval}
                        </span>
                      </span>
                    </span>
                  </label>
                ))}
            </fieldset>
          </>
        )}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
        {productsUnavailable && (
          <div className="membership-fallback">
            <p>
              {user
                ? "You can keep using the free workout. Pro access requires an active subscription."
                : "Creating an account will not unlock Pro while subscriptions are unavailable."}
            </p>
          </div>
        )}
        {(productsUnavailable || planCreated) && (
          <Link
            className="button button--secondary button--full"
            href={`/workouts/${FREE_WORKOUT_ID}`}
          >
            Try the free workout
          </Link>
        )}
        {selectedProduct && (
          <p className="account-fine-print">
            <strong>{formatPrice(selectedProduct)}</strong> due at checkout and
            every {billingPeriod(selectedProduct)} until cancelled.
            {selectedProduct.taxInclusive && " Includes applicable taxes."} No
            free trial.{" "}
            <Link className="text-link" href="/terms">
              Read the membership terms
            </Link>
            .
          </p>
        )}
        {user && !productsUnavailable && products.length > 0 && (
          <button
            className="button button--primary button--full"
            disabled={!!busy || !selected}
            onClick={() => void purchase()}
          >
            {busy === "checkout" ? "Opening checkout…" : "Continue to Stripe"}
          </button>
        )}
        {!user && (products.length > 0 || productsUnavailable) && (
          <Link
            className={`button button--full ${productsUnavailable ? "button--secondary" : "button--primary"}`}
            href={`/signup?next=${encodeURIComponent(returnTo)}`}
          >
            {productsUnavailable
              ? "Create a free account"
              : "Create account to continue"}
          </Link>
        )}
        {busy && (
          <LoadingStatus>
            {busy === "checkout"
              ? "Opening checkout…"
              : "Checking your subscription…"}
          </LoadingStatus>
        )}
        {!user && (
          <p className="auth-return">
            Already have an account?{" "}
            <Link
              className="text-link"
              href={`/signin?next=${encodeURIComponent(returnTo)}`}
            >
              Sign in
            </Link>
          </p>
        )}
        <p className="account-fine-print">
          One complete workout is free. Pro access starts after payment.
        </p>
        <div className="account-links">
          <Link href="/withdrawal">Withdrawal</Link>
          <Link href="/privacy">Privacy</Link>
          {user && (
            <button disabled={!!busy} onClick={() => void restore()}>
              Restore purchases
            </button>
          )}
          {user && <Link href="/account">Manage membership</Link>}
        </div>
      </div>
    </section>
  );
}
