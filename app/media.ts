export type SiteMedia = {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  aspectRatio: string;
  focalPoint: string;
  usage: string;
  status: "placeholder" | "final";
  replacementNotes: string;
};

const placeholder = (
  id: string,
  src: string,
  alt: string,
  width: number,
  height: number,
  focalPoint: string,
  usage: string,
  replacementNotes: string,
): SiteMedia => ({
  id,
  src,
  alt,
  width,
  height,
  aspectRatio: `${width} / ${height}`,
  focalPoint,
  usage,
  status: "placeholder",
  replacementNotes,
});

export const media = {
  heroInk: placeholder("hero-ink", "/images/hero-ink-drawdown.webp", "Cyan printing ink being drawn across a dark production surface", 1824, 862, "64% 48%", "Homepage hero top material plate", "Replace with an original TNV ink drawdown or press-side photograph, minimum 1800 × 850 px."),
  heroPaper: placeholder("hero-paper", "/images/hero-paper-fibers.webp", "Close view of layered uncoated paper fibers", 1774, 887, "52% 50%", "Homepage hero middle material plate", "Replace with an original macro photograph of a verified TNV target substrate, minimum 1700 × 850 px."),
  heroCorrugated: placeholder("hero-corrugated", "/images/hero-corrugated-flute.webp", "Close view of corrugated board layers and flute structure", 1824, 862, "65% 50%", "Homepage hero lower material plate", "Replace with an original substrate photograph showing verified corrugated-board use, minimum 1800 × 850 px."),
  applicationPackaging: placeholder("application-packaging", "/images/application-packaging.webp", "Cyan ink transferring through an industrial printing roller system", 1448, 1086, "55% 50%", "Flexible packaging application card and reviewed article cover option", "Replace with original TNV-compatible press photography, minimum 1400 × 1050 px."),
  applicationPaper: placeholder("application-paper", "/images/application-paper.webp", "Stacked uncoated paper sheets with visible natural edges", 1448, 1086, "50% 48%", "Paper and corrugated application card and reviewed article cover option", "Replace with original samples from a verified TNV paper application, minimum 1400 × 1050 px."),
  applicationSpecialty: placeholder("application-specialty", "/images/application-specialty-print.webp", "Macro view of cyan halftone dots on a specialty print substrate", 1448, 1086, "52% 48%", "Labels and specialty print application card and reviewed article cover option", "Replace with original TNV print-result photography, minimum 1400 × 1050 px."),
  materialInks: placeholder("material-inks", "/images/material-printing-inks.webp", "Deep cyan printing ink texture", 1122, 1402, "50% 50%", "Product family material swatch", "Replace with a controlled original TNV ink sample photograph, minimum 1000 × 1000 px."),
  materialColorants: placeholder("material-colorants", "/images/material-colorants.webp", "Fine blue-green colorant texture", 1024, 1535, "50% 50%", "Product family material swatch", "Replace with an original verified colorant or concentrate sample, minimum 1000 × 1000 px."),
  materialAdditives: placeholder("material-additives", "/images/material-functional-additives.webp", "Translucent ivory functional material texture", 1122, 1402, "50% 50%", "Product family material swatch", "Replace with an original verified additive sample, minimum 1000 × 1000 px."),
  materialCustom: placeholder("material-custom", "/images/material-custom-formulation.webp", "Cream-colored formulation sample with controlled flow texture", 1086, 1448, "50% 50%", "Product family material swatch", "Replace with an original approved custom-formulation sample, minimum 1000 × 1000 px."),
  evidenceRnd: placeholder("evidence-rnd", "/images/evidence-rnd.webp", "Gloved technician evaluating a cyan ink sample in a clean laboratory", 1448, 1086, "50% 48%", "Research and development evidence and reviewed article cover option", "Replace with an original TNV laboratory workflow photograph after safety and privacy review."),
  evidenceFactory: placeholder("evidence-factory", "/images/evidence-factory.webp", "Clean industrial mixing and process equipment", 1448, 1086, "50% 50%", "Manufacturing evidence and reviewed article cover option", "Replace with an original TNV facility photograph after equipment and capacity claims are verified."),
  evidenceQc: placeholder("evidence-qc", "/images/evidence-quality-control.webp", "Laboratory technician checking a material sample", 1448, 1086, "58% 46%", "Quality-control evidence and reviewed article cover option", "Replace with an original TNV quality-control photograph after the depicted procedure is verified."),
} as const;

export const placeholderMedia = Object.values(media);

export const articleCoverMediaKeys = ["applicationPackaging", "applicationPaper", "applicationSpecialty", "evidenceRnd", "evidenceFactory", "evidenceQc"] as const;
export type ArticleCoverMediaKey = typeof articleCoverMediaKeys[number];

export function articleCoverMedia(value: unknown): SiteMedia | undefined {
  return typeof value === "string" && articleCoverMediaKeys.includes(value as ArticleCoverMediaKey) ? media[value as ArticleCoverMediaKey] : undefined;
}
