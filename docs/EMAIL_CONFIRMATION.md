# Axyro confirmation email

## Design direction

The signup email uses Axyro’s canvas `#111412`, surface `#202722`,
text `#f3f4ed`, muted text `#c3c9bc`, and lime accent `#d9fc54`.
The confirmation button uses dark text. The layout uses an email-safe
sans-serif stack and remains usable when images are blocked.

Source: `supabase/templates/confirmation.html`. Subject: **Welcome to Axyro — confirm your email**.
Keep both confirmation links as `{{ .ConfirmationURL }}`; this preserves the
existing Supabase verification and callback flow. Never substitute a real
user token into source or preview artifacts.

## Illustration provenance

Current asset: `public/images/email/welcome-guide-v2.jpg` (1040px wide JPEG).
The built-in image generation tool used the original waving guide as its
reference and recreated both wristbands in lime with a dark green background.
The template pins the asset to GitHub commit `eecd6408d61e70b413b7f657b558918d3994cbb9`.

## Sender

Resend's delivered-message detail confirms the actual From header is
`"Axyro" <noreply@auth.axyro.app>`. The operator's temporary inbox displayed
a long `@rsend.auth.axyro.app` address, consistent with the delivery envelope.
Keep the verified sender and provider bounce routing; changing the template
does not change how each inbox chooses to display envelope metadata.

## Deployment and verification

2026-11-01: saved the subject and HTML to the hosted Axyro Supabase project's
Confirm sign up template. Reloaded, selected/copied the editor contents and
verified exact equality with the source file. Both action and fallback retain
`{{ .ConfirmationURL }}`. No changes to authentication routes or credentials.

The original template and illustration are retained in repository history.
Hosted changes are made in Authentication → Emails → Confirm sign up. Check
the hosted preview and both confirmation URL placeholders after saving.

To roll back, paste the earlier simple confirmation body from the template's
previous operation notes or use Supabase Reset template; retain the verified
SMTP sender. Dashboard edits are operational settings, not automatically
applied by a repository deployment.
