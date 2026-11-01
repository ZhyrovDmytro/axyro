"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
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
};
export type PaywallContext = "plan" | "workout" | "progress" | "library";
export function Paywall({
  context = "plan",
  returnTo = "/plan/setup",
  onUnlocked,
  embedded = false,
}: {
  context?: PaywallContext;
  returnTo?: string;
  onUnlocked?: () => void;
  embedded?: boolean;
}) {
  const { user } = useAuth();
  const { hasPro, refresh } = useEntitlement();
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
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
          a.interval === b.interval ? 0 : a.interval === "year" ? -1 : 1,
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
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: selected, returnTo }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(
          payload.error ?? "Checkout unavailable. Please try again.",
        );
      window.location.assign(payload.url);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please try again.");
      setBusy(false);
    }
  }
  async function restore() {
    setBusy(true);
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
      setBusy(false);
    }
  }
  const titles = {
    plan: "Build your personal padel training plan",
    workout: "Unlock every padel workout",
    progress: "Unlock your full training progress",
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
    <section className="account-panel paywall" aria-labelledby="paywall-title">
      <div className="paywall-intro">
        <Heading id="paywall-title">{titles[context]}</Heading>
        <p className="lede">
          {context === "library"
            ? "Movement demos and clear technique cues for every exercise in the collection."
            : context === "workout"
              ? "Choose a workout for your goal, with guided work and recovery from start to finish."
              : context === "progress"
                ? "Review your completed sessions and keep track of your training."
                : "A personal plan built around your goals, level, equipment and schedule."}
        </p>
        <ul className="membership-benefits" aria-label="Included with Pro">
          {[
            "Personalized padel training plan",
            "Full workout and exercise library",
            "Core, legs, shoulders, mobility and conditioning",
            "Training with your available equipment",
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
        <h2 className="paywall-membership-title">
          Axyro <span>Pro</span>
        </h2>
        {!products.length && !productsUnavailable && (
          <p role="status" className="paywall-loading">
            Loading memberships…
          </p>
        )}
        {products.length > 0 && (
          <>
            {currencies.length > 1 && (
              <div className="account-field">
                <label htmlFor="membership-currency">Currency</label>
                <select
                  id="membership-currency"
                  className="plan-input"
                  value={selectedProduct?.currency}
                  disabled={busy}
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
            <fieldset className="membership-products" disabled={busy}>
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
                      name="product"
                      value={product.id}
                      checked={selected === product.id}
                      onChange={() => setSelected(product.id)}
                    />
                    <span className="membership-product-copy">
                      <strong>
                        {product.interval === "year" ? "Yearly" : "Monthly"}
                      </strong>
                      <span className="membership-product-price">
                        {new Intl.NumberFormat(undefined, {
                          style: "currency",
                          currency: product.currency.toUpperCase(),
                        }).format(
                          product.amount /
                            10 **
                              (new Intl.NumberFormat(undefined, {
                                style: "currency",
                                currency: product.currency.toUpperCase(),
                              }).resolvedOptions().maximumFractionDigits ?? 2),
                        )}
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
            <div className="membership-promo">
              <label htmlFor="membership-promo-code">
                Promo code <span>(optional)</span>
              </label>
              <input
                id="membership-promo-code"
                className="plan-input"
                name="promoCode"
                type="text"
                placeholder="Enter promo code"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={64}
                disabled={busy}
                aria-describedby="membership-promo-help"
              />
              <small id="membership-promo-help">
                Promo codes are coming soon. Codes entered here won’t change
                your price yet.
              </small>
            </div>
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
            <Link
              className="button button--primary button--full"
              href={`/workouts/${FREE_WORKOUT_ID}`}
            >
              Try the free workout
            </Link>
          </div>
        )}
        {user && !productsUnavailable && products.length > 0 && (
          <button
            className="button button--primary button--full"
            disabled={busy || !selected}
            onClick={() => void purchase()}
          >
            {busy
              ? "Please wait…"
              : context === "plan"
                ? "Unlock My Plan"
                : "Start Pro"}
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
          Creating an account is free; Pro is a separate subscription. One
          complete workout is free forever. Pro renews until cancelled. Prices
          and billing terms are confirmed at checkout.
        </p>
        <div className="account-links">
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          {user && (
            <button disabled={busy} onClick={() => void restore()}>
              Restore purchases
            </button>
          )}
          {user && <Link href="/account">Manage membership</Link>}
        </div>
      </div>
    </section>
  );
}
