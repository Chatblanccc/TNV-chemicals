import { and, eq } from "drizzle-orm";
import { cmsApplications, cmsArticles, cmsCategories, cmsProducts, certificates, companyProfiles, contentTranslations, downloads, seoMetadata } from "../db/schema";
import { applications as seedApplications, articles as seedArticles, products as seedProducts } from "./site-data";
import { articleCoverMedia, type ArticleCoverMediaKey } from "./media";

export type PublishedProduct = {
  slug: string; code: string; name: string; nameZh?: string; category: string; categoryName: string; categoryNameZh?: string;
  casNumber?: string; formula?: string; molecularWeight?: string; purity?: string; appearance?: string;
  description?: string; descriptionZh?: string; use: string; useZh?: string; packaging?: string; packagingZh?: string; moq?: string; moqZh?: string;
  applications?: string[]; applicationsZh?: string[]; benefits: string[]; benefitsZh?: string[]; specs: string[][]; specsZh?: string[][]; verificationStatus?: "pending" | "verified";
};

export type PublishedArticle = {
  slug: string; title: string; titleZh?: string; type: string; typeZh?: string; category: string; categoryName: string; updated: string; readingMinutes: number;
  author?: string; authorZh?: string; published?: string; coverMediaKey?: ArticleCoverMediaKey;
  summary: string; summaryZh?: string; relatedProductSlugs: string[]; relatedApplicationSlugs: string[];
  sections: Array<{ heading: string; headingZh: string; paragraphs: string[]; paragraphsZh: string[] }>;
  checklist: string[]; checklistZh: string[]; faq: string[][]; faqZh: string[][];
};

export type PublishedApplication = { slug: string; name: string; nameZh?: string; intro: string; introZh?: string; challenges: string[]; challengesZh?: string[]; verificationStatus?: "pending" | "verified" };
export type PublishedCategory = { slug: string; name: string; nameZh?: string; description?: string; descriptionZh?: string; verificationStatus?: "pending" | "verified" };
export type PublishedCompanyProfile = {
  slug: string; legalName: string; legalNameZh?: string; businessType?: string; businessTypeZh?: string;
  manufacturingCapability?: string; manufacturingCapabilityZh?: string; exportMarkets: string[]; exportMarketsZh?: string[];
  address?: string; addressZh?: string; email?: string; phone?: string; websiteUrl?: string; verificationStatus: "verified";
};

export type PublishedCertificate = { id: string; slug: string; type: string; name: string; nameZh?: string; description?: string; descriptionZh?: string; fileUrl: string; issuedDate?: string; expiresDate?: string };
export type PublishedDownload = { id: string; slug: string; type: string; name: string; nameZh?: string; description?: string; descriptionZh?: string; fileUrl: string; productSlug?: string; locale?: string };
export type PublishedSeo = { title: string; description: string; keywords: string[] };
export type PublishedSiteContent = { products: PublishedProduct[]; categories: PublishedCategory[]; companyProfile: PublishedCompanyProfile | null; applications: PublishedApplication[]; articles: PublishedArticle[]; certificates: PublishedCertificate[]; downloads: PublishedDownload[] };

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
const seededCategories: PublishedCategory[] = Array.from(new Map(seedProducts.map(product => [product.category, { slug: product.category, name: product.categoryName }])).values());
const seededApplications: PublishedApplication[] = seedApplications.map(application => ({ ...application, challenges: [...application.challenges] }));
const seededArticles: PublishedArticle[] = seedArticles.map(article => ({ ...article, faq: article.faq.map(pair => [...pair]), faqZh: article.faqZh.map(pair => [...pair]) }));

export async function loadPublishedSiteContent(): Promise<PublishedSiteContent> {
  try {
    const { getDb } = await import("../db");
    const db = getDb();
    const [productRows, categoryRows, companyProfileRows, applicationRows, articleRows, certificateRows, downloadRows, translationRows] = await Promise.all([
      db.select().from(cmsProducts).where(and(eq(cmsProducts.status, "published"), eq(cmsProducts.verificationStatus, "verified"))),
      db.select().from(cmsCategories).where(and(eq(cmsCategories.status, "published"), eq(cmsCategories.verificationStatus, "verified"))).catch(() => []),
      db.select().from(companyProfiles).where(and(eq(companyProfiles.status, "published"), eq(companyProfiles.verificationStatus, "verified"))).catch(() => []),
      db.select().from(cmsApplications).where(and(eq(cmsApplications.status, "published"), eq(cmsApplications.verificationStatus, "verified"))).catch(() => []),
      db.select().from(cmsArticles).where(and(eq(cmsArticles.status, "published"), eq(cmsArticles.verificationStatus, "verified"))),
      db.select().from(certificates).where(and(eq(certificates.status, "published"), eq(certificates.verificationStatus, "verified"))),
      db.select().from(downloads).where(and(eq(downloads.status, "published"), eq(downloads.verificationStatus, "verified"))),
      db.select().from(contentTranslations).where(and(eq(contentTranslations.status, "published"), eq(contentTranslations.verificationStatus, "verified"))).catch(() => []),
    ]);
    const translation = (entityType: string, entityId: string, locale: "en" | "zh") => {
      const row = translationRows.find(item => item.entityType === entityType && item.entityId === entityId && item.locale === locale);
      return row ? objectValue(row.dataJson) : {};
    };
    const productOverrides: PublishedProduct[] = productRows.map(row => {
      const data = objectValue(row.dataJson);
      const en = translation("product", row.id, "en");
      const zh = translation("product", row.id, "zh");
      const casNumber = stringValue(data.casNumber);
      const specs = pairArray(en.specs).length ? pairArray(en.specs) : pairArray(data.specs);
      const specsZh = pairArray(zh.specs).length ? pairArray(zh.specs) : pairArray(data.specsZh);
      const formula = stringValue(data.formula);
      const molecularWeight = stringValue(data.molecularWeight);
      const purity = stringValue(data.purity);
      const appearance = stringValue(data.appearance);
      const packaging = stringValue(en.packaging) || stringValue(data.packagingEn);
      const packagingZh = stringValue(zh.packaging) || stringValue(data.packagingZh);
      const moq = stringValue(en.moq) || stringValue(data.moqEn);
      const moqZh = stringValue(zh.moq) || stringValue(data.moqZh);
      const verifiedProperties: Array<[string, string, string]> = [["CAS number", "CAS 号", casNumber], ["Formula", "分子式", formula], ["Molecular weight", "分子量", molecularWeight], ["Purity", "纯度", purity], ["Appearance", "外观", appearance]];
      for (const [labelEn, labelZh, value] of verifiedProperties.reverse()) {
        if (value && !specs.some(([label]) => label.toLowerCase() === labelEn.toLowerCase())) specs.unshift([labelEn, value]);
        if (value && !specsZh.some(([label]) => label === labelZh || (labelEn === "CAS number" && /^cas/i.test(label)))) specsZh.unshift([labelZh, value]);
      }
      if (packaging && !specs.some(([label]) => label.toLowerCase() === "packaging")) specs.push(["Packaging", packaging]);
      if ((packagingZh || packaging) && !specsZh.some(([label]) => label === "包装")) specsZh.push(["包装", packagingZh || packaging]);
      if (moq && !specs.some(([label]) => label.toLowerCase() === "moq")) specs.push(["MOQ", moq]);
      if ((moqZh || moq) && !specsZh.some(([label]) => label === "起订量" || label.toLowerCase() === "moq")) specsZh.push(["起订量", moqZh || moq]);
      return { slug: row.slug, code: row.code, category: row.category, categoryName: stringValue(en.categoryName) || stringValue(data.categoryNameEn) || titleCase(row.category), categoryNameZh: stringValue(zh.categoryName) || stringValue(data.categoryNameZh), name: stringValue(en.name) || stringValue(data.nameEn), nameZh: stringValue(zh.name) || stringValue(data.nameZh), casNumber, formula, molecularWeight, purity, appearance, description: stringValue(en.description) || stringValue(data.descriptionEn), descriptionZh: stringValue(zh.description) || stringValue(data.descriptionZh), use: stringValue(en.use) || stringValue(data.useEn), useZh: stringValue(zh.use) || stringValue(data.useZh), packaging, packagingZh, moq, moqZh, applications: stringArray(en.applications).length ? stringArray(en.applications) : stringArray(data.applications), applicationsZh: stringArray(zh.applications).length ? stringArray(zh.applications) : stringArray(data.applicationsZh), benefits: stringArray(en.benefits).length ? stringArray(en.benefits) : stringArray(data.benefits), benefitsZh: stringArray(zh.benefits).length ? stringArray(zh.benefits) : stringArray(data.benefitsZh), specs, specsZh, verificationStatus: "verified" };
    });
    const categoryOverrides: PublishedCategory[] = categoryRows.map(row => {
      const data = objectValue(row.dataJson);
      const en = translation("category", row.id, "en");
      const zh = translation("category", row.id, "zh");
      return { slug: row.slug, name: stringValue(en.name) || stringValue(data.nameEn), nameZh: stringValue(zh.name) || stringValue(data.nameZh), description: stringValue(en.description) || stringValue(data.descriptionEn), descriptionZh: stringValue(zh.description) || stringValue(data.descriptionZh), verificationStatus: "verified" };
    });
    const publishedCompanyProfile: PublishedCompanyProfile | null = companyProfileRows.length ? (() => {
      const row = companyProfileRows[0];
      const data = objectValue(row.dataJson);
      const en = translation("company_profile", row.id, "en");
      const zh = translation("company_profile", row.id, "zh");
      return { slug: row.slug, legalName: stringValue(en.legalName) || stringValue(data.legalNameEn), legalNameZh: stringValue(zh.legalName) || stringValue(data.legalNameZh), businessType: stringValue(en.businessType) || stringValue(data.businessTypeEn), businessTypeZh: stringValue(zh.businessType) || stringValue(data.businessTypeZh), manufacturingCapability: stringValue(en.manufacturingCapability) || stringValue(data.manufacturingCapabilityEn), manufacturingCapabilityZh: stringValue(zh.manufacturingCapability) || stringValue(data.manufacturingCapabilityZh), exportMarkets: stringArray(en.exportMarkets).length ? stringArray(en.exportMarkets) : stringArray(data.exportMarkets), exportMarketsZh: stringArray(zh.exportMarkets).length ? stringArray(zh.exportMarkets) : stringArray(data.exportMarketsZh), address: stringValue(en.address) || stringValue(data.addressEn), addressZh: stringValue(zh.address) || stringValue(data.addressZh), email: stringValue(data.email), phone: stringValue(data.phone), websiteUrl: stringValue(data.websiteUrl), verificationStatus: "verified" };
    })() : null;
    const applicationOverrides: PublishedApplication[] = applicationRows.map(row => {
      const data = objectValue(row.dataJson);
      const en = translation("application", row.id, "en");
      const zh = translation("application", row.id, "zh");
      return { slug: row.slug, name: stringValue(en.name) || stringValue(data.nameEn), nameZh: stringValue(zh.name) || stringValue(data.nameZh), intro: stringValue(en.intro) || stringValue(data.introEn), introZh: stringValue(zh.intro) || stringValue(data.introZh), challenges: stringArray(en.challenges).length ? stringArray(en.challenges) : stringArray(data.challenges), challengesZh: stringArray(zh.challenges).length ? stringArray(zh.challenges) : stringArray(data.challengesZh), verificationStatus: "verified" };
    });
    const articleOverrides: PublishedArticle[] = articleRows.map(row => {
      const data = objectValue(row.dataJson);
      const en = translation("article", row.id, "en");
      const zh = translation("article", row.id, "zh");
      const bodyEn = paragraphs(en.body || data.bodyEn);
      const bodyZh = paragraphs(zh.body || data.bodyZh);
      const cover = articleCoverMedia(data.coverMediaKey);
      return { slug: row.slug, category: row.category, categoryName: stringValue(en.categoryName) || stringValue(data.categoryNameEn) || titleCase(row.category), title: stringValue(en.title) || stringValue(data.titleEn), titleZh: stringValue(zh.title) || stringValue(data.titleZh), type: stringValue(en.type) || stringValue(data.typeEn) || "Technical article", typeZh: stringValue(zh.type) || stringValue(data.typeZh) || "技术文章", author: stringValue(en.author) || stringValue(data.authorEn), authorZh: stringValue(zh.author) || stringValue(data.authorZh), published: stringValue(data.publishDate) || (row.publishedAt ? new Date(row.publishedAt).toISOString().slice(0, 10) : undefined), coverMediaKey: cover ? data.coverMediaKey as ArticleCoverMediaKey : undefined, updated: new Date(row.updatedAt).toISOString().slice(0, 10), readingMinutes: Math.max(1, Math.ceil(bodyEn.join(" ").split(/\s+/).filter(Boolean).length / 180)), summary: stringValue(en.summary) || stringValue(data.summaryEn), summaryZh: stringValue(zh.summary) || stringValue(data.summaryZh), relatedProductSlugs: stringArray(data.relatedProducts), relatedApplicationSlugs: stringArray(data.relatedApplications), sections: [{ heading: stringValue(en.sectionHeading) || stringValue(data.sectionHeadingEn) || "Overview", headingZh: stringValue(zh.sectionHeading) || stringValue(data.sectionHeadingZh) || "概览", paragraphs: bodyEn, paragraphsZh: bodyZh }], checklist: stringArray(en.checklist).length ? stringArray(en.checklist) : stringArray(data.checklist), checklistZh: stringArray(zh.checklist).length ? stringArray(zh.checklist) : stringArray(data.checklistZh), faq: pairArray(en.faq).length ? pairArray(en.faq) : pairArray(data.faq), faqZh: pairArray(zh.faq).length ? pairArray(zh.faq) : pairArray(data.faqZh) };
    });
    const publishedCertificates: PublishedCertificate[] = certificateRows.map(row => { const data = objectValue(row.dataJson); const en = translation("certificate", row.id, "en"); const zh = translation("certificate", row.id, "zh"); return { id: row.id, slug: row.slug, type: row.type, name: stringValue(en.name) || stringValue(data.nameEn), nameZh: stringValue(zh.name) || stringValue(data.nameZh), description: stringValue(en.description) || stringValue(data.descriptionEn), descriptionZh: stringValue(zh.description) || stringValue(data.descriptionZh), fileUrl: stringValue(data.fileUrl), issuedDate: stringValue(data.issuedDate), expiresDate: stringValue(data.expiresDate) }; }).filter(item => item.name && item.fileUrl);
    const publishedDownloads: PublishedDownload[] = downloadRows.map(row => { const data = objectValue(row.dataJson); const en = translation("download", row.id, "en"); const zh = translation("download", row.id, "zh"); return { id: row.id, slug: row.slug, type: row.type, name: stringValue(en.name) || stringValue(data.nameEn), nameZh: stringValue(zh.name) || stringValue(data.nameZh), description: stringValue(en.description) || stringValue(data.descriptionEn), descriptionZh: stringValue(zh.description) || stringValue(data.descriptionZh), fileUrl: stringValue(data.fileUrl), productSlug: stringValue(data.productSlug), locale: stringValue(data.locale) }; }).filter(item => item.name && item.fileUrl);
    const publishedCategories = mergeBySlug(seededCategories, categoryOverrides);
    const categoryMap = new Map(publishedCategories.map(category => [category.slug, category]));
    const publishedProducts = mergeBySlug(seededProducts, productOverrides).map(product => { const category = categoryMap.get(product.category); return category ? { ...product, categoryName: category.name, categoryNameZh: category.nameZh || product.categoryNameZh } : product; });
    return { products: publishedProducts, categories: publishedCategories, companyProfile: publishedCompanyProfile, applications: mergeBySlug(seededApplications, applicationOverrides), articles: mergeBySlug(seededArticles, articleOverrides), certificates: publishedCertificates, downloads: publishedDownloads };
  } catch {
    return { products: seededProducts, categories: seededCategories, companyProfile: null, applications: seededApplications, articles: seededArticles, certificates: [], downloads: [] };
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

export const publishedApplications = seededApplications;
