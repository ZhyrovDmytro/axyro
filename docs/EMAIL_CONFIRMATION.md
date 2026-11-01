# Axyro confirmation email

## Design direction

Friendly welcome for a person creating an Axyro account. Reuse charcoal
`#1b1b1b`, canvas `#0e0e0e`, white `#f5f5f5`, muted `#bdbdbd` and orange
`#ff6b24`. One welcoming character illustration is the focal point. Use an
email-safe system sans stack, a left-aligned headline, concise instructions
and one prominent orange confirmation action. The email must remain useful
with images blocked and fit a narrow phone without horizontal scrolling.

Source: `supabase/templates/confirmation.html`. Subject: **Welcome to Axyro — confirm your email**.
Keep both confirmation links as `{{ .ConfirmationURL }}`; this preserves the
existing Supabase verification and callback flow. Never substitute a real
user token into source or preview artifacts.

## Illustration provenance

Final asset: `public/images/email/welcome-guide-v1.jpg` (1040px wide JPEG).
Generated with the built-in image generation tool, then resized/compressed
with macOS sips. No new runtime dependency. User approved friendly welcome,
charcoal/orange and a waving character. Supplied fictional athlete reference
was used for identity; no claim of ownership/licensing is inferred.

Final prompt:

> Use case: stylized-concept. Create one polished 3D character illustration for an Axyro account confirmation email. The attached image is a character identity reference, not a collage to reproduce. Preserve this exact fictional adult male athlete's facial features, warm brown skin, short tightly curled dark hair, dark thick brows, athletic build, grey fitted training t-shirt and dark charcoal joggers. Replace lime wristbands with Axyro orange #ff6b24 wristbands as a brand adaptation. Show a single character from head to upper thighs, facing the viewer, natural friendly closed-mouth smile, one relaxed hand raised in a welcoming hello with anatomically correct fingers, other arm relaxed. He is welcoming the reader to their first home workout; approachable, confident, no exaggerated mascot grin. Premium stylized 3D animation render, soft studio lighting and realistic fabric, clean silhouette. Wide horizontal composition approximately 3:2, character centered with generous clear margins around head and hand, solid seamless charcoal #1b1b1b background matching a dark email panel, extremely subtle grounding shadow only. Keep the image uncluttered and suitable for a 520px wide email hero. No words, lettering, logos, watermark, panels, collage, exercise equipment or extra people. Render only the new illustration, not an email layout.

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

The image uses a publicly verified GitHub raw URL pinned to full asset commit
`3cb162467b50fa5907f6f45f7ec7bfa318b1cbc0`. This avoids depending on Netlify
preview-deploy retention before PR #1 merges. Keep this public repository and
commit accessible. After the asset ships on main, the image can move to
`https://axyro.app/images/email/welcome-guide-v1.jpg`, after verifying that URL.

Browser previews checked desktop and a 390px phone frame; the public image
loaded at 1040 × 693. HTML is under 4 KB; JPEG is 75,271 bytes. Static assertions
verified two confirmation placeholders, no scripts/forms, and Gmail-size
budget. Button/text remain usable with the image unavailable. The saved
Supabase preview contains only the new content. No test email was sent during
this change. Real Gmail/Apple Mail/Outlook rendering remains unverified.

To roll back, paste the earlier simple confirmation body from the template's
previous operation notes or use Supabase Reset template; retain the verified
SMTP sender. Dashboard edits are operational settings, not automatically
applied by a repository deployment.
