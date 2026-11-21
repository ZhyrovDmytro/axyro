# Customer support

The public Help page links to password recovery, membership management and training data settings. Set `AXYRO_SUPPORT_EMAIL` to a monitored public inbox in the production build environment and rebuild. Before publishing the address, send a message from an outside account and confirm that a reply arrives. Record verification in L14.

## Handling a request

- **Lost access.** Direct password users to the reset flow and Google users to Google sign-in. Check the authentication delivery status for a missing email. Never ask for passwords, codes or recovery links.
- **Billing or refunds.** Verify the requester through the account email before disclosing billing details. Match the account to its Stripe customer and subscription, check invoice and payment status, and apply the approved refund policy. Record the invoice and outcome. Escalate disputed cases to the operator.
- **Training data or privacy.** Verify account ownership. Clarify whether the person wants access, correction, export or deletion. Use account-scoped records only. Deliver personal data through a verified private channel and record the scope and resolution. Do not promise a backup deletion date without verified provider retention terms.
- **Failed account deletion.** Verify ownership and the original deletion intent. Check the account, training records and subscription separately before retrying. Confirm which systems completed the request and explain any outstanding provider records.
- **Complaints.** Acknowledge receipt through the monitored inbox, identify the affected account only if necessary, and refer unresolved complaints to the operator. Keep internal records limited to the request, action and outcome.

Operator approval is still needed for the public contact, refund terms, retention periods and applicable response deadlines.
