import { and, eq } from "drizzle-orm";
import { cmsArticles, cmsProducts, certificates, downloads, seoMetadata } from "../db/schema";
import { applications, articles as seedArticles, products as seedProducts } from "./site-data";

export type PublishedProduct = {
  slug: string; code: string; name: string; nameZh?: string; category: string; categoryName: string; categoryNameZh?: string;
  use: string; useZh?: string; benefits: string[]; benefitsZh?: string[]; specs: string[][]; specsZh?: string[][]; verificationStatus?: "pending" | "verified";
};

export type PublishedArticle = {
  slug: string; title: string; titleZh?: string; type: string; typeZh?: string; category: string; categoryName: string; updated: string; readingMinutes: number;
  summary: string; summaryZh?: string; relatedProductSlugs: string[]; relatedApplicationSlugs: string[];
  sections: Array<{ heading: string; headingZh: string; paragraphs: string[]; paragraphsZh: string[] }>;
  checklist: string[]; checklistZh: string[]; faq: string[][]; faqZh: string[][];
};

export type PublishedCertificate = { id: string; slug: string; type: string; name: string; nameZh?: string; description?: string; descriptionZh?: string; fileUrl: string; issuedDate?: string; expiresDate?: string };
export type PublishedDownload = { id: string; slug: string; type: string; name: string; nameZh?: string; description?: string; descriptionZh?: string; fileUrl: string; productSlug?: string; locale?: string };
export type PublishedSeo = { title: string; description: string; keywords: string[] };
export type PublishedSiteContent = { products: PublishedProduct[]; articles: PublishedArticle[]; certificates: PublishedCertificate[]; downloads: PublishedDownload[] };

const titleCase = (value: string) => value.split("-").map(part => part ? `${part[0].toUpperCase()}${part.slice(1)}` : part).join(" ");
const objectValue = (value: string) => { try { const parsed = JSON.parse(value); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}; } catch { return {}; } };
const stringValue = (value: unknown) => typeof value === "string" ? value : "";
const stringArray = (value: unknown) => Array.isArray(value) ? value.filter(item => typeof item === "string") as string[] : [];
const pairArray = (value: unknown) => Array.isArray(value) ? value.filter(item => Array.isArray(item) && item.length === 2 && item.every(part => typeof part === "string")) as string[][] : [];
const paragraphs = (value: unknown) => stringValue(value).split(/\n\s*\n/).map(item => item.trim()).filter(Boolean);

function mergeBySlug<T extends { slug: string }>(seed: T[], overrides: T[]) {
  const merged = new Map(seed.map(item => [item.slug, item]));
  for (const item of overrides) merged.set(item.slug, item);
  return Array.from(merged.values());
}

const seededProducts: PublishedProduct[] = seedProducts.map(product => ({ ...product, specs: product.specs.map(pair => [...pair]) }));
const seededArticles: PublishedArticle[] = seedArticles.map(article => ({ ...article, faq: article.faq.map(pair => [...pair]), faqZh: article.faqZh.map(pair => [...pair]) }));

export async function loadPublishedSiteContent(): Promise<PublishedSiteContent> {
  try {
    const { getDb } = await import("../db");
    const db = getDb();
    const [productRows, articleRows, certificateRows, downloadRows] = await Promise.all([
      db.select().from(cmsProducts).where(and(eq(cmsProducts.status, "published"), eq(cmsProducts.verificationStatus, "verified"))),
      db.select().from(cmsArticles).where(and(eq(cmsArticles.status, "published"), eq(cmsArticles.verificationStatus, "verified"))),
      db.select().from(certificates).where(and(eq(certificates.status, "published"), eq(certificates.verificationStatus, "verified"))),
      db.select().from(downloads).where(and(eq(downloads.status, "published"), eq(downloads.verificationStatus, "verified"))),
    ]);
    const productOverrides: PublishedProduct[] = productRows.map(row => {
      const data = objectValue(row.dataJson);
      return { slug: row.slug, code: row.code, category: row.category, categoryName: stringValue(data.categoryNameEn) || titleCase(row.category), categoryNameZh: stringValue(data.categoryNameZh), name: stringValue(data.nameEn), nameZh: stringValue(data.nameZh), use: stringValue(data.useEn), useZh: stringValue(data.useZh), benefits: stringArray(data.benefits), benefitsZh: stringArray(data.benefitsZh), specs: pairArray(data.specs), specsZh: pairArray(data.specsZh), verificationStatus: "verified" };
    });
    const articleOverrides: PublishedArticle[] = articleRows.map(row => {
      const data = objectValue(row.dataJson);
      const bodyEn = paragraphs(data.bodyEn);
      const bodyZh = paragraphs(data.bodyZh);
      return { slug: row.slug, category: row.category, categoryName: stringValue(data.categoryNameEn) || titleCase(row.category), title: stringValue(data.titleEn), titleZh: stringValue(data.titleZh), type: stringValue(data.typeEn) || "Technical article", typeZh: stringValue(data.typeZh) || "技术文章", updated: new Date(row.updatedAt).toISOString().slice(0, 10), readingMinutes: Math.max(1, Math.ceil(bodyEn.join(" ").split(/\s+/).filter(Boolean).length / 180)), summary: stringValue(data.summaryEn), summaryZh: stringValue(data.summaryZh), relatedProductSlugs: stringArray(data.relatedProducts), relatedApplicationSlugs: stringArray(data.relatedApplications), sections: [{ heading: stringValue(data.sectionHeadingEn) || "Overview", headingZh: stringValue(data.sectionHeadingZh) || "概览", paragraphs: bodyEn, paragraphsZh: bodyZh }], checklist: stringArray(data.checklist), checklistZh: stringArray(data.checklistZh), faq: pairArray(data.faq), faqZh: pairArray(data.faqZh) };
    });
    const publishedCertificates: PublishedCertificate[] = certificateRows.map(row => { const data = objectValue(row.dataJson); return { id: row.id, slug: row.slug, type: row.type, name: stringValue(data.nameEn), nameZh: stringValue(data.nameZh), description: stringValue(data.descriptionEn), descriptionZh: stringValue(data.descriptionZh), fileUrl: stringValue(data.fileUrl), issuedDate: stringValue(data.issuedDate), expiresDate: stringValue(data.expiresDate) }; }).filter(item => item.name && item.fileUrl);
    const publishedDownloads: PublishedDownload[] = downloadRows.map(row => { const data = objectValue(row.dataJson); return { id: row.id, slug: row.slug, type: row.type, name: stringValue(data.nameEn), nameZh: stringValue(data.nameZh), description: stringValue(data.descriptionEn), descriptionZh: stringValue(data.descriptionZh), fileUrl: stringValue(data.fileUrl), productSlug: stringValue(data.productSlug), locale: stringValue(data.locale) }; }).filter(item => item.name && item.fileUrl);
    return { products: mergeBySlug(seededProducts, productOverrides), articles: mergeBySlug(seededArticles, articleOverrides), certificates: publishedCertificates, downloads: publishedDownloads };
  } catch {
    return { products: seededProducts, articles: seededArticles, certificates: [], downloads: [] };
  }
}

export async function loadPublishedSeo(path: string, locale: "en" | "zh"): Promise<PublishedSeo | null> {
  try {
    const { getDb } = await import("../db");
    const row = await getDb().select().from(seoMetadata).where(and(eq(seoMetadata.path, path), eq(seoMetadata.locale, locale), eq(seoMetadata.status, "published"))).get();
    if (!row) return null;
    const keywords = JSON.parse(row.keywordsJson);
    return { title: row.title, description: row.description, keywords: Array.isArray(keywords) ? keywords.filter(value => typeof value === "string") : [] };
  } catch { return null; }
}

export const publishedApplications = applications;
