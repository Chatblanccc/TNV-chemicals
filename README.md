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
- `npm test`: build the production bundle and run rendered-route and API acceptance tests
- `npm run db:generate`: generate Drizzle migrations after schema changes

## TNV launch configuration

The site is safe-by-default: preview builds emit `noindex` metadata and an
`X-Robots-Tag` header, closes `robots.txt`, and keeps the sitemap empty until
launch is explicitly approved.

- `SITE_LAUNCH_READY=true` enables indexing and the production sitemap. Set it
  only after verified company facts and technical documents replace every
  review marker.
- `SITE_URL=https://example.com` sets canonical, sitemap, social, and structured
  data URLs to the company-controlled production origin.
- The `DB` D1 binding is required for inquiry storage. Apply the generated
  Drizzle migration before accepting production inquiries.
- The `DOCUMENTS` R2 binding stores administrator-uploaded PDF files. Uploaded
  objects remain publicly inaccessible until a certificate or download record
  referencing that URL is both verified and published.
- `INQUIRY_WEBHOOK_URL=https://...` optionally forwards a stored inquiry to a
  sales notification workflow. Missing or failed notification never erases the
  durable lead.
- `INQUIRY_WEBHOOK_TOKEN=...` optionally adds a bearer token to webhook calls.
- `ADMIN_EMAILS=owner@example.com,sales@example.com` is the explicit,
  comma-separated bootstrap allowlist for the administration workspace.
  Authentication alone does not grant admin access.
- `DEV_ADMIN_EMAIL=qa@example.com` can supply a local QA identity only when the
  request hostname is `localhost`, `127.0.0.1`, or `::1`. It is ignored on all
  production hostnames and should not be used as a deployment credential.
- `ANALYTICS_ENABLED=true` enables consent-gated, first-party event storage.
  Events intentionally exclude email, IP address, user agent, and form content.
- `GA_MEASUREMENT_ID=G-...` optionally loads Google Analytics after consent on
  a launch-ready production site. Preview and admin routes never load it.
- `GOOGLE_SITE_VERIFICATION=...` publishes the Search Console verification
  token through page metadata.
- `AI_ASSISTANT_ENDPOINT=https://...` connects the reserved selection-assistant
  boundary to a reviewed recommendation service. Without this value, the
  endpoint returns an explicit `not_connected` response and routes buyers to a
  human inquiry.
- `AI_ASSISTANT_TOKEN=...` optionally authenticates the recommendation request.

## TNV content operations

The private administration workspace uses the Material Atlas interface and D1
as its durable source of truth:

- `/en/admin/content` and `/zh/admin/content` manage products, product
  categories, the governed company profile, applications, knowledge articles,
  certificates, and downloads.
- `/en/admin/seo` and `/zh/admin/seo` manage page-level bilingual titles,
  descriptions, and keywords.
- `/en/admin/users` and `/zh/admin/users` manage the `admin`, `marketing`,
  `sales`, and `editor` roles.
- `/en/admin/inquiries` and `/zh/admin/inquiries` manage the inquiry pipeline.

Content uses separate editorial and verification states. Only records with both
`status=published` and `verification_status=verified` can appear on public
routes. This prevents draft or unverified product claims, certificates, and
technical files from leaking into the buyer experience. Certificate and
download records also require an HTTPS URL or a generated `/documents/*.pdf`
URL before they can be published. Their editor can upload PDF files (20 MB maximum) to the bound R2
bucket and automatically reuse the generated site-relative URL; upload alone
never publishes or exposes the object. Published certificates additionally
require a valid, non-future issue date. An optional expiry date cannot precede
the issue date. The public certificate center distinguishes current, expired,
and expiry-unspecified records; company-profile and About-page certificate
claims include current records only.

Apply every Drizzle migration in `drizzle/` to the bound D1 database before
using the administration workspace. Bootstrap administrators come from
`ADMIN_EMAILS`; subsequent users and roles live in `admin_users`. All content
writes and publication decisions are recorded in `content_events`.

Published CMS products, categories, applications, and articles merge into the
seed catalog by slug, so existing public routes remain stable while verified
content can progressively replace placeholders. A published category controls
the localized category label used by its products. Published page-level SEO
overrides are applied at render time, and the launch-gated sitemap includes
published dynamic routes. Admin routes remain noindex and are excluded from
sitemap discovery.

Products support verified CAS number, formula, molecular weight, purity,
appearance, descriptions, intended uses, applications, benefits, packaging,
bilingual MOQ, structured specifications, and product-linked downloads. The
first-class packaging and MOQ fields are merged into the public technical table,
locale-aware Product structured data, and global search without duplicating a
manually entered specification. Empty identity fields
are omitted rather than guessed. Published TDS, SDS, and COA records appear on
their product page only when the file record is verified, published, linked to a
published product, and assigned to the current page language. A product can
have only one current published file for each TDS/SDS/COA type and language;
the normalized `downloads.product_slug` and `downloads.locale` columns plus a
partial unique index enforce this rule under concurrent writes. Publishers
archive the prior record before releasing a replacement. Archived
records immediately lose their public link while the audit record and stored
object remain available to the governed retention process. Missing files keep
an explicit pending or batch-confirmation state.
The PRD-compatible `/products/{slug}` shortcut permanently redirects to the
canonical `/products/{category}/{slug}` route, preserving the established URL
structure without creating duplicate indexable pages.

Applications have the same draft, review, verification, publishing, audit, and
translation lifecycle as products and articles. A verified application can add
a dynamic `/applications/{slug}` route without removing any existing route.
Application editors maintain an explicit list of related published product
slugs. Public pages resolve only matching products; a missing, archived, or
unpublished product remains hidden, and an empty verified relationship renders
an inquiry handoff instead of an inferred recommendation.

Articles support bilingual titles, summaries, bodies, author names, explicit
publication dates, related content, checklists, FAQs, and a cover selected only
from media registered in `app/media.ts`. Missing authors or covers are omitted
rather than inferred; published values flow into the visible byline, Open Graph,
Twitter, and Article structured data.

## Search, SEO, GEO, and localization

- `/en/search` and `/zh/search` search product names, codes, verified CAS
  numbers and identity fields, application needs, articles, and published
  downloads. Search pages remain `noindex,follow` to avoid thin-result indexing.
- `/en/knowledge` and `/zh/knowledge` provide categorized buyer guides with
  internal product/application links, FAQ, checklists, and Article,
  BreadcrumbList, and FAQPage structured data.
- `/en/company-profile` and `/zh/company-profile` expose an attributable company
  knowledge record. Legal identity, business type, manufacturing statement,
  export markets, address, email, phone, and official website are sourced only
  from a `published + verified` company-profile record. Missing facts remain
  visibly pending and are omitted from Organization structured data.
- `public/llms.txt`, canonical links, `hreflang`, Open Graph, Product and
  Organization structured data, launch-gated sitemap output, and admin-safe
  robots rules form the SEO/GEO boundary.
- English and Chinese are active public locales. English, Chinese, Spanish,
  Arabic, and Russian are supported as independently reviewed CMS translation
  records and SEO locales. Selecting a saved CMS record opens the expansion-
  language editor for structured Spanish, Arabic, and Russian content with
  independent draft, verification, and publication states. A locale should
  become public only after its
  navigation, legal copy, content coverage, RTL behavior where applicable, and
  QA are complete.

## Analytics and selection-assistant boundary

Analytics collection begins only after the visitor accepts the site consent
prompt. The first-party report at `/en/admin/analytics` and
`/zh/admin/analytics` aggregates page views, site searches, product interest,
document downloads, inquiry conversions, referring host, and Cloudflare country
code over 30 days. It is a content and conversion report, not a user-profile
system.

The selection assistant at `/en/assistant` and `/zh/assistant` is deliberately
fail-closed. A connected service may return a summary, verified product slugs,
and clarification questions, but the public UI always requires human review and
does not treat model output as a quotation, specification, or technical
commitment.

The webhook receives JSON containing `inquiryId`, `receivedAt`, `email`,
`area`, `company`, `country`, `quantity`, `unit`, `requirement`, optional
`phone`, optional `productCode`, and `locale`. Keep it HTTPS-only, validate
again downstream, and store secrets in deployment bindings rather than source
control. The CRM pipeline is `new` →
`contacted` → `quotation_sent` → `negotiation` → `completed`, with `archived`
available for closed records; every status transition is written to the audit
event table.

Before setting `SITE_LAUNCH_READY=true`, run `npm run lint`,
`npx tsc --noEmit`, and `npm test`, then verify the inquiry against the real
recipient workflow.

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
