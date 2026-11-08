# Registration protection and email verification — 2 November 2026

## Current implementation

- The workspace uses the owner's original watercolour Nebula logo from `demo/nebula-builder/assets/brand/nebula-logo.jpg`. The header crops the flower with CSS; the original artwork is preserved. The verification envelope is SVG so it does not become a platform emoji.
- Firebase sends verification after email/password registration. Resends have a one-minute client cooldown; Firebase still applies its own service limits. The email's continue URL returns to `/dashboard`. Returning to a visible verification page reloads the Firebase user and forces an ID-token refresh. Server verification still requires a signed token with verified email.
- Turnstile uses a Managed widget with action `nebula_access`. The server calls Siteverify, checks success, exact hostname and action, and issues a Secure/HttpOnly/SameSite=Strict host-only proof cookie for 30 minutes. A new verified owner cannot create a shop or create a registry session without that proof when protection is enabled. Existing shop owners and authorized platform administrators retain access.
- New email/password registrations run the challenge in the UI first. This does not enforce CAPTCHA directly on Firebase's public Authentication API. Firebase-side abuse protection is a separate setup; do not describe this integration as preventing all Firebase account or verification-email spam. Public customer requests keep their existing server limits; this widget does not challenge every order.

## Configuration and rollout

Main Worker: `nebula`. The owner installed `TURNSTILE_SECRET_KEY` as a secret; its name was confirmed without retrieving its value. The public widget Site Key was separately confirmed. A random independent `HUMAN_PROOF_SECRET` was provisioned without displaying or persisting plaintext, so possession of the provider secret cannot forge Nebula proof cookies. Rotating the proof key invalidates these short-lived cookies and requires a fresh challenge; it does not affect merchant OAuth encryption.

The main Wrangler config sets `TURNSTILE_SITE_KEY` and `TURNSTILE_ENABLED=true`. Main release `f6846dd9-486e-4909-851c-6824187642ef` is deployed. The owner declined rotation of the provider secret initially pasted in chat; no such value is written into source, docs or browser configuration. The widget must allow `app.nebulastudio.site`. Sandbox release `df12c567-9e68-41b8-9090-a3e02b8fd9c7` includes the logo/email improvements but keeps Turnstile disabled until its own secret/config is provisioned.

The owner subsequently shared Firebase verification emails received in Gmail Spam; delivery is now evidenced, but inbox placement is not. No live Turnstile success has been independently observed. A successful Resend order-notification test is separate from Firebase's verification email.

## Native fetch correction

The first live human check failed with HTTP 503 because `redirect: "error"` is rejected by workerd before the Siteverify request is sent. Node fetch mocks did not expose this. A dedicated native workerd regression reproduced that failure, then passed after changing to `redirect: "manual"`; non-2xx responses still fail closed without forwarding secrets to redirects. Main correction version: `7a9fe80c-cfce-41d6-8fe5-070fbb494e6c`.

After deployment, a deliberately invalid diagnostic token returned normal HTTP 403 instead of 503 and no proof cookie was issued. This confirms the live transport failure is corrected, not that a real human challenge has passed. The user must retry the actual challenge; no CAPTCHA was solved by the agent.

## Validation

- 100 platform Node tests passed, including provider failure, wrong hostname/action, cookie tampering, expiry, origin isolation, new-owner bypass attempts and existing-owner access.
- Isolated mobile browser tests passed for the original logo, envelope SVG, email continue URL, resend cooldown, verified token refresh and challenge/server handoff. Firebase, emails and challenge responses were mocked; no real account, email or payment was created.
- Anonymous read-only main deployment smoke passed: original logo decoded, public Site Key enabled, secrets absent from config, Firebase login/deep routes and mobile layout working, source/private files excluded. Production Square connection stays enabled and checkout stays disabled. No live CAPTCHA was solved and no email was sent by this smoke.

References: [Cloudflare server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/), [Firebase user verification](https://firebase.google.com/docs/auth/web/manage-users).
