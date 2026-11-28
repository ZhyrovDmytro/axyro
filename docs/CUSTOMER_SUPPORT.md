# Customer support

Help shows password recovery to guests and account-management links to signed-in users. Everyone can contact support, including during an account-service outage. The footer, Settings and Help link to `support@axyro.app`. To override the address, set `AXYRO_SUPPORT_EMAIL` at build time. Before publishing the address, send a message from an outside account and confirm that a reply arrives. Record verification in L14.

## Handling a request

- **Lost access.** Direct password users to the reset flow and Google users to Google sign-in. Check the authentication delivery status for a missing email. Never ask for passwords, codes or recovery links.
- **Billing or refunds.** Verify the requester through the account email before disclosing billing details. Match the account to its Stripe customer and subscription, check invoice and payment status, and apply the approved refund policy. Record the invoice and outcome. Escalate disputed cases to the operator.
- **Training data or privacy.** Verify account ownership. Clarify whether the person wants access, correction, export or deletion. Use account-scoped records only. Deliver personal data through a verified private channel and record the scope and resolution. Do not promise a backup deletion date without verified provider retention terms.
- **Failed account deletion.** Verify ownership and the original deletion intent. Check the account, training records and subscription separately before retrying. Confirm which systems completed the request and explain any outstanding provider records.
- **Complaints.** Acknowledge receipt through the monitored inbox, identify the affected account only if necessary, and refer unresolved complaints to the operator. Keep internal records limited to the request, action and outcome.

Operator approval is still needed for refund terms and the retention schedule.

## GDPR privacy requests

1. Record the receipt date, requested right and response deadline in the
   operator's restricted support records. Acknowledge the request. Respond
   without undue delay and within one month. For a permitted extension of up to
   two further months, notify the requester within the first month and explain
   the reason.
2. Verify identity proportionately using an existing verified channel. Request
   extra information only where there are reasonable doubts about identity.
3. Check the systems relevant to the request, including account and training
   records, billing, support and hosting. For access, provide the relevant
   personal data and processing information. For applicable portability, provide
   the supplied data in a structured, machine-readable format. The Settings
   download covers device training data and can be used separately.
4. For correction, erasure, restriction or objection, document the action,
   applicable exceptions and any providers that need to act. Explain any
   refusal and how the requester can complain or seek a judicial remedy.
   Deliver copies privately and record completion without keeping extra copies.
5. Before release, exercise the process with a test account across actual
   providers and record the result under L12.

[EDPB guidance on individual rights](https://www.edpb.europa.eu/sme/be-compliant/respect-individuals-rights_en)
