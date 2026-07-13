# vinext-starter

A clean full-stack starter running on
[vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and
Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

This starter does not use `wrangler.jsonc`.

## Included Shape

- edit site code under `app/`
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

OpenAI workspace sites can read the current user's email from
`oai-authenticated-user-email`.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build the starter and verify its rendered loading skeleton
- `npm run db:generate`: generate Drizzle migrations after schema changes

## TNV launch configuration

The site is safe-by-default: preview builds emit `noindex` metadata and an
`X-Robots-Tag` header, and the sitemap remains empty until launch is explicitly
approved.

- `SITE_LAUNCH_READY=true` enables indexing and the production sitemap. Set it
  only after verified company facts and technical documents replace every
  review marker.
- `SITE_URL=https://example.com` sets canonical, sitemap, social, and structured
  data URLs to the company-controlled production origin.
- The `DB` D1 binding is required for inquiry storage. Apply the generated
  Drizzle migration before accepting production inquiries.
- `INQUIRY_WEBHOOK_URL=https://...` optionally forwards a stored inquiry to a
  sales notification workflow. Missing or failed notification never erases the
  durable lead.
- `INQUIRY_WEBHOOK_TOKEN=...` optionally adds a bearer token to webhook calls.
- `ADMIN_EMAILS=owner@example.com,sales@example.com` is the explicit,
  comma-separated allowlist for `/en/admin/inquiries` and
  `/zh/admin/inquiries`. Authentication alone does not grant admin access.

The webhook receives JSON containing `inquiryId`, `receivedAt`, `email`,
`area`, `company`, `country`, `requirement`, optional `productCode`, and
`locale`. Keep it HTTPS-only, validate again downstream, and store secrets in
deployment bindings rather than source control. The CRM pipeline is `new` →
`contacted` → `quotation_sent` → `negotiation` → `completed`, with `archived`
available for closed records; every status transition is written to the audit
event table.

Before setting `SITE_LAUNCH_READY=true`, run `npm run lint`,
`npx tsc --noEmit`, and `npm test`, then verify the inquiry against the real
recipient workflow.

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
