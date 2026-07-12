# Design system

The site uses a Material Atlas visual direction: industrial editorial photography, warm mineral paper, deep navy typography, and cyan as a precise signal color.

## Tokens

All color, spacing, motion, layout, focus, and z-index values live in `app/globals.css` under `:root`. The primary font roles are Cormorant Garamond for display/editorial text and Manrope for navigation, labels, forms, and body copy.

## Layout

- Global maximum design width: 1440 px.
- Fluid side gutter: `--gutter`.
- Major sections use a sticky editorial introduction column plus image/content fields on wide screens.
- Below 900 px the layout becomes single-column and the real mobile navigation replaces the desktop navigation.
- Below 640 px image crops, CTA widths, card structure, and section rhythm are explicitly recomposed.

## Components

- Global shell: `Header`, `Footer`, `MobileNav`.
- Conversion: `Rfq`, `InquiryForm`.
- Domain: `ProductCard`, application cards, evidence cards, technical links.
- Media: `MediaImage` backed by `app/media.ts`.

Keep corners sharp, shadows rare, and hierarchy driven by scale, spacing, rules, and photography.

