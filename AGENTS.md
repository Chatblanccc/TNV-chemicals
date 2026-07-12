# TNV Chemicals site rules

## Product truth

- Never invent product parameters, certifications, customers, capacity, addresses, contact details, environmental claims, patents, or laboratory methods.
- Keep unknown values visibly marked as pending verification.
- Preserve existing public routes. Add redirects before changing a route.

## Design system

- Use the tokens in `app/globals.css`; do not scatter approximate colors, spacing, radii, or typography values through components.
- Preserve the Material Atlas direction: warm paper, deep navy, calibrated cyan, editorial serif display type, precise sans-serif body type, thin rules, and image-led industrial evidence.
- Avoid SaaS dashboards, card walls, nested cards, glass effects, decorative gradients, pill clusters, fake metrics, and generic technology imagery.
- Build new page sections from the existing layout and domain patterns in `app/site-page.tsx` before creating one-off structures.

## Images

- Register images in `app/media.ts`; never hard-code new image paths in page components.
- Every image needs accurate alt text, intrinsic dimensions, a focal point, usage, status, and replacement notes.
- Generated assets are placeholders. Prefer WebP and keep the replacement crop compatible with the existing container.
- Do not redraw the TNV logo or add text, claims, labels, or certifications inside generated photography.

## Accessibility and interaction

- Target WCAG 2.2 AA: semantic headings, visible focus, keyboard navigation, labelled controls, associated errors, sufficient contrast, and reduced-motion support.
- Every mobile navigation and primary CTA must remain reachable without hover.
- Inquiry forms must expose loading, validation, success/draft, and error states without pretending an unconnected backend is live.

## SEO and verification

- Keep unique metadata, canonical behavior, sitemap, robots, semantic headings, internal links, and truthful structured data.
- Before handoff run `npm run lint`, `npx tsc --noEmit`, `npm test`, and browser checks at 1440/1024/768/390/360 where the browser surface supports them.
- Compare the selected visual target with browser-rendered screenshots and keep `design-qa.md` current.

