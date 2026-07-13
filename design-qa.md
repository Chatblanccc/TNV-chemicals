# TNV Chemicals design QA

## 2026-07-12 audit implementation pass

- Preserved the Material Atlas composition, imagery, warm-paper/navy palette,
  editorial hierarchy, and application-first buyer journey.
- Replaced broken build-machine font URLs with self-hosted Manrope and
  Cormorant Garamond WOFF2 assets; computed styles now resolve correctly.
- Tightened the homepage promise around packaging, paper, and label printing;
  localized the remaining homepage evidence and closing-CTA headings.
- Verified no horizontal overflow at 1440, 1024, 768, 390, and 360 CSS-pixel
  viewports.
- Verified the mobile menu locks background scroll, includes the language
  switcher, closes with Escape, and returns focus to the trigger.
- Verified product-code handoff into the RFQ, 16px mobile controls, accessible
  validation, privacy acknowledgement, durable-storage failure handling, and
  notification state that does not pretend an unconfigured webhook succeeded.
- Preview status remains intentionally visible because legal identity, contact
  details, certifications, and TDS/SDS files have not been supplied. The build
  therefore remains noindex by default.

- Source visual truth: `design-reference-option-3.png`
- Implementation screenshot: `qa/implementation-home-1024.png`
- Side-by-side comparison: `qa/comparison-source-vs-implementation.png`
- Responsive evidence: `qa/implementation-home-390.png`
- Interaction evidence: `qa/interaction-mobile-menu-390.png`, `qa/interaction-inquiry-ready-390.png`
- Comparison viewport: 1024 × 900 browser-rendered homepage, aligned to the source hero composition
- State: English homepage, default navigation, no modal, top of page

## Full-view comparison evidence

The side-by-side input compares the selected Material Atlas visual target and the local browser render in one image. Both use the same left editorial-copy/right material-plate structure, warm paper surface, deep navy/cyan palette, fine rule system, product-first navigation, paired CTAs, and three vertically cropped material photographs. The implementation preserves existing TNV content and route constraints rather than reproducing speculative labels from the generated mock.

## Focused comparison evidence

- Typography and hero hierarchy were checked at readable size in `qa/comparison-source-vs-implementation.png`.
- Image crop and quality were checked in the same comparison and in `qa/implementation-home-390.png`.
- Mobile navigation open state was checked in `qa/interaction-mobile-menu-390.png`.
- Inquiry validation and draft-ready behavior were checked in `qa/interaction-inquiry-ready-390.png` and the browser DOM.

## Required fidelity surfaces

- Fonts and typography: Cormorant Garamond supplies the high-contrast editorial display voice; Manrope supplies navigation, labels, body, and form text. Heading scale, italic emphasis, wrapping, body measure, and label tracking match the selected direction without clipping at 390 or 360 px.
- Spacing and layout rhythm: the desktop 50/50 hero, image stack, thin dividers, editorial intro columns, sharp corners, and wide whitespace match the source system. Mobile recomposes to one column with explicit image crops and CTA widths.
- Colors and tokens: warm mineral paper, deep navy, muted blue-gray, and calibrated cyan are centralized in `app/globals.css`. Error, success, and focus states are semantic and legible.
- Image quality and asset fidelity: every visible target-image role has a real generated WebP asset registered in `app/media.ts`; no CSS drawings, inline SVG illustrations, gradient stand-ins, emoji, or placeholder boxes replace target imagery. Web assets total about 1.5 MB after conversion.
- Copy and content: the exact hero message and existing verified product/application language are preserved. Unverified company details remain visibly pending.
- Icons: one Phosphor icon family is used for arrows and menu controls; sizes, stroke weight, and alignment are consistent.
- States and interactions: desktop navigation, mobile menu, form validation, preparing state, local draft-ready state, disabled document states, focus, hover, and reduced motion are implemented.
- Accessibility: semantic headings and landmarks, labelled controls, associated inline errors, `aria-expanded`, `aria-current`, visible focus, alt text, reduced motion, and practical mobile targets are present. Full WCAG conformance still requires an external assistive-technology audit after real content is supplied.

## Comparison history

### Iteration 1 — blocked

- [P0] Local image optimization failed because the Vinext preview did not expose the image-worker asset binding. Fix: converted all generated assets to WebP and used intrinsic responsive `img` output with explicit dimensions, priority, decoding, focal point, and aspect handling.
- [P1] The first implementation used abstract/original-site visual placeholders rather than the selected photographic material atlas. Fix: generated and installed hero, application, product-material, R&D, manufacturing, and quality-control assets.
- [P1] Display typography lacked the source's editorial contrast. Fix: replaced the interim display face with Cormorant Garamond and retained Manrope for product text.
- [P1] Mobile navigation from the original site was missing. Fix: implemented a keyboard-accessible menu with real routes and CTA.
- [P2] Intrinsic image ratios expanded the hero to roughly 1193 px. Fix: defined explicit desktop/tablet/mobile hero rows and forced controlled object-fit crops.
- [P2] Empty inquiry submission relied on browser-native language. Fix: implemented inline associated errors, focus recovery, preparing state, and an honest local draft-ready state.

### Iteration 2 — passed

- Browser evidence shows the selected split hero, material photography, palette, typography roles, and CTA hierarchy rendered without the earlier image-worker overlay.
- Browser checks at 1024, 390, and 360 px show no accessible horizontal scroll; the 360 px root overflow is clipped after confirming no child content exceeds the content box.
- Mobile menu and inquiry draft journey work from start to finish.
- Browser console check returned no current warnings or errors after the image implementation fix.

## Remaining P3 follow-up polish

- The SEO content milestone adds `/knowledge`, three topic routes, three complete bilingual buyer guides, article metadata, checklists, FAQ, product/application internal links, and Article/Breadcrumb/FAQ structured data while preserving legacy `/insights` routes.
- V2 product discovery now adds an accessible search and family filter, explicit verification and document states, qualification-ready inquiry guidance, structured product properties, and an `llms.txt` truth boundary without introducing unverified product facts.
- The decorative hero caption was removed after review; the corrugated-material image now occupies the full remaining atlas height at desktop, tablet, and mobile breakpoints.
- The pre-launch review strip intentionally remains above the selected mock's header so unverified facts are not mistaken for production claims.
- Replace generated placeholder photography with original TNV facility, sample, and press imagery after company review.
- Re-run contrast, screen-reader, 200% zoom, and translation-length testing after final bilingual content is supplied.

## 2026-07-13 inquiry CRM milestone

- Added a Material Atlas-aligned inquiry workspace at `/en/admin/inquiries` and
  `/zh/admin/inquiries`, backed by D1 rather than browser-only state.
- Verified the unauthenticated state, ChatGPT sign-in path, explicit admin
  allowlist, status filtering, keyword search, and the six-stage sales pipeline.
- Inquiry creation now persists the customer, lead, source path, notification
  result, and audit events before any optional webhook notification is attempted.
- The production inquiry contract now captures a required positive quantity and
  controlled unit plus an optional phone/WhatsApp contact. The CRM and webhook
  display and forward the same fields, while legacy inquiries remain readable.
- Admin routes are excluded from sitemap and robots discovery and emit explicit
  noindex/nofollow metadata.
- Exact CDP viewport checks at 1440, 1024, 768, 390, and 360 CSS pixels confirmed
  `scrollWidth <= clientWidth`, the authorization state is visible, mobile
  navigation remains reachable, and no page content is clipped.
- The in-app browser check at 1280 px reported no console warnings or errors.
- Automated acceptance: lint passed, TypeScript passed, production build passed,
  and all 14 rendered/API tests passed.

## 2026-07-13 governed content and SEO milestone

- Added bilingual administration surfaces for products, knowledge articles,
  certificates, downloads, page-level SEO, and role-based access control.
- Public products, articles, resources, metadata, and sitemap entries now read
  from D1 only after both editorial publication and company verification.
- Verified that an editor can prepare content but cannot publish it, while the
  configured publishing roles can approve verified records. Content mutations
  retain actor and event history.
- Verified real local D1 creation and publication for a product and knowledge
  article, dynamic English and Chinese public routes, page-level metadata
  override, user creation, and an expected `403` for an editor publication
  attempt.
- Certificates and downloads remain visibly pending because no company-verified
  files were supplied; the CMS rejects unsafe publication URLs rather than
  fabricating document availability.
- Exact CDP checks at 1440, 1024, 768, 390, and 360 CSS pixels confirmed the
  authenticated content workspace has no page-level horizontal overflow and
  keeps navigation, controls, records, and responsive forms reachable.
- The unauthenticated in-app browser state at 1000 px exposed the sign-in path,
  stayed within the viewport, and produced no console warnings or errors.
- Automated acceptance: production build passed and all 17 rendered/API tests
  passed. Final milestone lint and TypeScript checks are recorded with the
  corresponding commit.

final result: passed

## 2026-07-13 V2 platform completion pass

- Added the expansion-language editor as a bordered editorial continuation of
  the selected source record. It reuses existing form controls and tokens,
  exposes loading/error/success/publishing states, and applies RTL direction to
  Arabic records without introducing a separate dashboard visual language.
- Verified the translation lifecycle against the real local D1 store: a clearly
  labelled local category source was created, an Arabic record entered review,
  the translation was archived, and the parent was archived. A missing local
  category migration surfaced during this check and was applied before the
  successful rerun; no fixture remains published.
- Added the governed company-profile editor inside the existing editorial
  workspace and reused the public definition-list layout. No new dashboard,
  card wall, or unsupported company claim was introduced.
- Published a clearly labelled local-only company fixture through the real D1
  admin API and confirmed its legal name, manufacturing statement, contact,
  `alternateName`, and `areaServed` reached the public page and Organization
  schema. Checks at 1024/768/390/360 showed `scrollWidth <= clientWidth` with no
  browser warnings or errors. The fixture was archived and the page returned to
  its honest pending-verification state before handoff.
- Repeated the local-only company fixture check after wiring the shared footer
  and company fact sheet: the verified legal name, manufacturing statement,
  email, and phone appeared consistently with `scrollWidth == clientWidth` and
  no browser warnings. The PRD `/products/{slug}` shortcut resolved to the
  category-qualified canonical URL. The fixture was archived immediately after
  verification.
- Added governed product-category records to the existing content workspace.
  Category labels remain typographic metadata rather than a new card layer, so
  the Material Atlas hierarchy and existing product routes remain unchanged.

- Added global search across product identity fields, applications, knowledge
  content, and published documents with exact code/CAS ranking and a truthful
  empty state.
- Added independent EN/ZH/ES/AR/RU translation records, an explicit locale
  registry with Arabic RTL metadata, and five-locale SEO/document administration
  while keeping only reviewed English and Chinese public routes active.
- Added consent-gated first-party analytics, optional post-consent GA loading,
  Search Console verification metadata, a private 30-day content/conversion
  report, and document-download tracking without storing form identity.
- Added a fail-closed AI selection-assistant boundary and human-inquiry handoff;
  the unconfigured endpoint returns an explicit service status instead of a
  fabricated recommendation.
- Added a source-bounded company knowledge profile and expanded `llms.txt` while
  leaving legal identity, manufacturing, markets, contacts, and certificates
  visibly pending.
- Completed the product record with verified CAS, formula, molecular weight,
  purity, appearance, packaging, applications, descriptions, structured specs,
  and product-linked TDS/SDS/COA rendering.
- Moved application paths into the governed CMS, verification, translation,
  dynamic-route, search, related-content, and sitemap flow without removing
  existing application URLs.
- Reduced the 1536 × 1024 social image from 2,651,717-byte PNG to a 264,398-byte
  JPEG, preloaded the three critical WOFF2 fonts, and added immutable/bounded
  asset caching. No Lighthouse or Core Web Vitals number is claimed because the
  available browser tool surface did not expose Chrome DevTools performance
  tracing.
- Browser checks at the available 1280 px surface confirmed the search,
  assistant, product, and analytics-consent journeys render without horizontal
  overflow or console warnings. Earlier milestone evidence retains exact
  1440/1024/768/390/360 checks for the shared layout, CRM, and CMS surfaces.
- A real local D1 application record was published through the admin API,
  rendered at its dynamic application route, appeared in global search, and was
  then archived. The route and search page both reported
  `scrollWidth <= clientWidth`, and the browser log contained no warnings or
  errors. The fixture identified itself as local-only and never represented
  production company content.
- The requirement-by-requirement implementation and production-input boundary
  is recorded in `v2-implementation-audit.md`.

## 2026-07-13 inquiry qualification completion

- Added required positive quantity and controlled unit fields plus an optional
  phone/WhatsApp field to the public bilingual quote form.
- The same values now persist in D1, appear in the private CRM, participate in
  CRM search, and reach the optional HTTPS notification adapter.
- Drizzle migration `0006_curvy_wild_child.sql` adds nullable columns so
  existing customers and inquiries remain readable during rollout.
- Browser checks on the Chinese quote page at 1440, 1024, 768, 390, and 360 CSS
  pixels confirmed every new field is visible and
  `scrollWidth == clientWidth`. The 390 px visual review preserved the Material
  Atlas hierarchy, single-column form flow, reachable mobile navigation, and
  readable quantity/unit grouping. No browser warnings or errors were present.
- Automated acceptance: lint passed, TypeScript passed, production build
  passed, and all 26 rendered/API tests passed.

## 2026-07-13 governed documents and article metadata

- Certificate and download editors now provide an accessible PDF uploader with
  explicit idle, validation, uploading, success, and error states. Uploads are
  limited to signed PDF files up to 20 MB and do not publish themselves.
- Uploaded files use site-relative document URLs backed by the `DOCUMENTS` R2
  binding. The public document route serves an object only while a referencing
  certificate or download record is both published and verified.
- The article editor now captures an explicit publication date, optional
  verified author names in English and Chinese, and an optional cover selected
  from the governed media registry. These values feed visible article metadata,
  Open Graph/Twitter metadata, and truthful Article structured data.
- Browser checks on the article editor at 1440, 1024, 768, 390, and 360 CSS
  pixels confirmed all new fields are visible and
  `scrollWidth == clientWidth`. The PDF uploader passed the same five-width
  check, including its associated no-file validation alert. Browser logs
  contained only Vite and React development messages, with no warnings or
  errors.
- The local-only development admin identity is restricted to loopback hosts and
  is ignored on non-local origins. The local published product fixture used for
  QA was archived after verification.
- Automated acceptance: lint passed, TypeScript passed, production build
  passed, and all 28 rendered/API tests passed.
