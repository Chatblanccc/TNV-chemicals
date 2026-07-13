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
