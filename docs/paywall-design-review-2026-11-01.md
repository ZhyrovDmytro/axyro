# Paywall design review — 1 November 2026

## Evidence and scope

Reviewed the existing `/upgrade` paywall in the browser and traced its shared
usage through ProGate (Plan, workout, progress and library contexts). Existing
uncommitted account and billing work was preserved. This change is limited to
paywall presentation, its loading affordance, scoped CSS and browser regression
coverage; no prices, entitlement rules or purchase endpoints were changed.

Read the Impeccable, frontend design, Appllama usage and Appllama app design
skills. Appllama's MCP tools were unavailable and plugin discovery returned no
connector. The public [Appllama screens catalog](https://appllama.io/screens)
loaded, and its Paywall filter listed references including RunMotion Coach and
7 Minute Workout, but their screens were locked behind paid access. No reference
pixels were accessible or used; this is a review of the incumbent app rather
than a claim of completed competitor research.

## Findings and changes

- The narrow account-form layout pushed membership choices below the first
  desktop viewport. Benefits and checkout now sit side by side on wide screens;
  phones retain the natural reading order without horizontal scrolling.
- The five benefits had little visual structure. Shared check icons and a compact
  list establish a readable group without adding imagery or unsupported claims.
- A fully orange selected plan competed with the action. Selection now uses an
  orange outline and native radio state; the next action uses the primary orange
  button. Full prices and billing periods remain explicit.
- The currency field occupied the full column. Its label and selector now share
  a row, preserving the existing billing-period behavior when switching currency.
- Account continuation appeared before products loaded. A live loading message
  now precedes continuation. Unavailable subscriptions prioritize the working
  free workout and retain free account creation as a secondary action.
- Legal and membership utility links have 44px targets and visible keyboard focus.
- Removed the obsolete selected-plan entry from the orange-surface muted-color
  rule after axe exposed the inherited dark billing-period text.

## Verification

Browser coverage checks 320px, 390px and 1280px layouts, keyboard plan selection,
explicit billing amounts/periods, guest continuation, delayed product loading,
no horizontal overflow and axe accessibility. Existing subscription and design
review tests cover currency selection, submitted price IDs, checkout errors,
authenticated access and unavailable/empty-product fallbacks.

Results: all 12 targeted Playwright tests passed, including zero axe violations
at the three checked widths. All 413 unit tests passed; TypeScript, ESLint,
formatting and diff-whitespace checks passed. Browser screenshots were visually
reviewed for phone and desktop composition.

Release verification subsequently passed the webpack production build, all 119
browser regressions, both local production smoke tests, all 413 unit tests,
TypeScript and zero-warning lint. The optional promo-code field has keyboard and
accessibility coverage at all three widths; it does not submit or redeem codes.

Live purchases and paid Appllama references are outside this verification.
