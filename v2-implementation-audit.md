# TNV Chemicals V2 implementation audit

This document maps the referenced V2 PRD to current, inspectable evidence. It
separates implementation work from production facts and credentials that the
company must supply. A feature is not treated as production-ready merely because
its interface exists.

Status meanings:

- **Implemented** — code, storage, public/admin route, and relevant acceptance
  coverage exist.
- **Implementation ready; production input required** — the fail-closed system
  exists, but real facts, files, recipients, credentials, or approval are absent.
- **Reserved** — the PRD explicitly placed the feature in a later phase and the
  safe connection boundary exists without pretending the service is live.

## 1. Product database and product center

**Status: Implemented; real catalog verification still required.**

- Governed product records: `cms_products` in `db/schema.ts`.
- Product CMS: `/en/admin/content` and `/zh/admin/content` in
  `app/admin-content.tsx`.
- Fields: slug, code, category, bilingual name/description/use, verified CAS,
  formula, molecular weight, purity, appearance, bilingual applications,
  benefits, packaging, structured specifications, and document linkage.
- Public routes preserve the existing `/products/{category}/{slug}` structure;
  verified dynamic products can be added without removing seeded routes.
- Product metadata, Product JSON-LD, breadcrumbs, inquiry handoff, application
  qualification, and explicit verification state are rendered in
  `app/[...slug]/page.tsx` and `app/site-page.tsx`.
- Only `published + verified` CMS rows reach public output through
  `app/published-content.ts`.

The current public catalog contains representative placeholders. Real product
names, codes, identity values, technical limits, packaging, MOQ, and documents
must be approved by TNV before launch.

## 2. Application database

**Status: Implemented; real application copy still requires review.**

- Governed application records: `cms_applications` in `db/schema.ts` and
  migration `drizzle/0003_salty_luke_cage.sql`.
- Applications use the same draft, review, verification, publishing, audit, and
  translation lifecycle as products and articles.
- Verified records merge by slug and create dynamic `/applications/{slug}`
  routes, sitemap entries, search results, homepage paths, and article-related
  links.
- Existing application routes remain available through the seed fallback.

## 3. SEO content and Knowledge Center

**Status: Implemented; ongoing editorial volume is an operating program.**

- Bilingual `/knowledge`, category, and article routes.
- Three complete buyer guides with summaries, sections, checklists, FAQs,
  related products, and related applications.
- Article CMS with review and verification gating.
- Unique metadata with governed page-level overrides in `seo_metadata`.
- Canonical, English/Chinese `hreflang`, Open Graph, Twitter image, Article,
  FAQPage, BreadcrumbList, Product, Organization, and WebPage structured data.
- Dynamic content routes enter the launch-gated sitemap; admin and search-result
  pages have explicit indexing rules.

The PRD's article-count growth target is not a one-time software deliverable.
New articles should be published through the existing verified editorial flow.

## 4. GEO and AI-search readability

**Status: Implemented; company facts still require sources.**

- `/company-profile` exposes a single attributable company knowledge record.
- Unknown legal entity, manufacturing, export market, certificate, address,
  email, and phone values remain visibly pending.
- `public/llms.txt` describes public routes and the site's truth boundary.
- Organization and page structured data use only the public TNV brand and
  source-backed content.

## 5. Inquiry and CRM

**Status: Implemented; production recipient configuration required.**

- Durable customers, inquiries, status events, source path, product code, and
  notification state in D1.
- Public bilingual inquiry form with validation, privacy acknowledgement,
  loading, storage error, success, and honest draft states.
- Pipeline: `new`, `contacted`, `quotation_sent`, `negotiation`, `completed`,
  and `archived`.
- Private filtering, search, status updates, and audit events at
  `/admin/inquiries`.
- Optional HTTPS notification adapter through `INQUIRY_WEBHOOK_URL` and
  `INQUIRY_WEBHOOK_TOKEN`; it can connect the stored lead to an email,
  enterprise WeChat, or other reviewed sales workflow. A notification failure
  never deletes the stored inquiry.

The recipient workflow and privacy/legal review must be configured and tested
with the actual company owner before launch.

## 6. Certificate center

**Status: Implementation ready; company files required.**

- Governed certificate CRUD, issue/expiry dates, verified HTTPS/site-relative
  files, translation support, public center, and audit history exist.
- With no verified company certificate, the public center shows a truthful empty
  state instead of a fabricated badge.

## 7. Download center

**Status: Implementation ready; company files required.**

- Governed SDS, TDS, COA, catalog, certificate, and other document records.
- Files support product slug and document locale.
- Verified published TDS/SDS/COA files appear on the matching product page;
  missing files stay marked pending or confirm-by-batch.
- Public document clicks are eligible for consented `document_download`
  analytics.

## 8. Global search

**Status: Implemented.**

- `/search` covers product names, codes, verified CAS and identity fields,
  categories, uses, applications, benefits, specifications, application paths,
  article content/checklists, and published downloads.
- Exact product code and CAS matches rank above prefix, substring, and token
  matches.
- Search is keyboard accessible, responsive, localized, analytics-aware, and
  `noindex,follow`.

## 9. Multilingual architecture

**Status: Implemented for expansion; English and Chinese are active.**

- Locale registry: English, Chinese, Spanish, Arabic (RTL), and Russian.
- Independent `content_translations` records have their own review,
  verification, publication, audit, and uniqueness rules.
- Product, application, article, certificate, download, document-language, and
  SEO administration support all planned content locales.
- English and Chinese remain the only public route locales until each additional
  locale has complete navigation, legal copy, content, and responsive/RTL QA.

## 10. Performance and accessibility

**Status: Implementation optimized; external performance audit still required.**

- Self-hosted WOFF2 fonts are preloaded; media has intrinsic dimensions, focal
  points, async decoding, and lazy/eager loading by role.
- The social image was reduced from approximately 2.65 MB PNG to approximately
  264 KB JPEG without changing its intrinsic dimensions.
- Hashed assets/fonts receive immutable caching; images and social assets receive
  bounded cache and stale-while-revalidate headers.
- Semantic landmarks/headings, skip link, visible focus, keyboard mobile menu,
  labelled forms, inline errors, reduced motion, and practical mobile controls
  are implemented.
- Earlier exact browser checks cover 1440, 1024, 768, 390, and 360 CSS-pixel
  layouts. New V2 surfaces also require final production-content checks.

No Lighthouse or Core Web Vitals score is claimed. The current tool surface did
not expose the Chrome DevTools performance-trace integration, so a production
trace remains an explicit launch check.

## 11. AI selection assistant

**Status: Reserved with a fail-closed connector.**

- `/assistant` collects substrate/process/performance context and can carry it
  into a formal inquiry.
- `/api/assistant/recommend` returns an explicit `not_connected` response until
  an HTTPS service is configured.
- Connected output is constrained to summary, existing product slugs, and
  clarification questions. Public copy requires human review and states that
  model output is not a quotation or technical commitment.

## 12. Roles and permissions

**Status: Implemented.**

- Roles: admin, marketing, sales, and editor.
- Server-side permissions cover inquiry read/write, content read/write/publish,
  analytics read, and user management.
- Editors can prepare drafts/review records but cannot publish; identity alone
  does not grant workspace access.
- Content, SEO, role, and CRM mutations retain actor/event history.

## 13. Analytics

**Status: Implemented; production activation/credentials required.**

- Consent-gated first-party page, search, product, document, and inquiry events.
- Stored events exclude email, IP, user agent, and form content.
- 30-day admin report covers totals, countries, top paths, searches, and product
  interest.
- Optional Google Analytics loads only after consent on a launch-ready public
  site with a valid `GA_MEASUREMENT_ID`.
- Search Console verification is supported through
  `GOOGLE_SITE_VERIFICATION`.

## 14. Administration and operating principles

**Status: Implemented.**

- Administration routes cover dashboard, products, applications, articles,
  certificates, downloads, inquiries, SEO, analytics, and users.
- D1 is used instead of the PRD's suggested PostgreSQL because the current
  Cloudflare/Vinext runtime already supplies a durable relational D1 binding.
  The data boundaries and migrations remain explicit rather than hiding storage
  in browser state.
- Existing public routes are preserved. Dynamic routes extend rather than
  replace the seed structure.
- Unknown facts are omitted or marked pending; generated photography remains
  labelled for replacement in `app/media.ts`.

## 15. Production completion gate

The implementation cannot truthfully be declared production-complete until all
of the following owner-controlled inputs are supplied and verified:

1. Legal company name, address, public contact channels, business type, and
   approved company profile.
2. Real product catalog, product parameters, packaging/MOQ, applications, and
   approved technical copy.
3. Original facility/laboratory/product imagery or explicit approval to retain
   the current generated placeholders.
4. Real certificate, TDS, SDS, COA, catalog, and other public files.
5. Production D1 binding with every migration applied.
6. Authorized admin emails and the reviewed inquiry recipient workflow.
7. Company-controlled `SITE_URL`, Search Console token, optional GA identifier,
   and explicit `SITE_LAUNCH_READY=true` approval.
8. Final privacy policy, terms, cookie/analytics wording, and retention review.
9. Production browser, screen-reader, 200% zoom, RTL (when activated), inquiry,
   notification, analytics, sitemap, robots, and performance checks.

Until this gate is satisfied, the site intentionally stays in preview mode,
keeps unknown facts visible, and does not claim a production launch.
