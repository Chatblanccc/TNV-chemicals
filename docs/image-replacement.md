# Image replacement guide

The generated images in `public/images/` are temporary production-quality placeholders. `app/media.ts` is the authoritative inventory for source path, dimensions, aspect ratio, focal point, alt text, usage, status, and replacement notes.

## Replacement workflow

1. Confirm that the photograph depicts a real TNV product, process, facility, or verified application.
2. Match or exceed the dimensions in `app/media.ts` and preserve the listed crop orientation.
3. Export WebP at visually lossless web quality; keep the existing filename when replacing like-for-like.
4. Update alt text and focal point if the subject changes.
5. Change `status` to `final` only after company approval.
6. Recheck desktop and mobile crops and run the production build.

Do not place text, certifications, customer logos, chemical formulas, packaging claims, or safety-critical actions inside replacement images unless they are original, legible, and approved.

