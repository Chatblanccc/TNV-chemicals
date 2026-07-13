import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SitePage } from "../site-page";
import { routePaths } from "../site-data";
import { localizedPath, splitLocalizedRoute, t } from "../i18n";
import { loadPublishedSeo, loadPublishedSiteContent, type PublishedSiteContent } from "../published-content";
import { activeLocales } from "../locales";

export function generateStaticParams() {
  return activeLocales.flatMap(locale =>
    routePaths.map(path => ({ slug: localizedPath(locale, path).slice(1).split("/") })),
  );
}

function parseLocalizedRoute(inputRoute: string) {
  if (!/^\/(en|zh)(?:\/|$)/.test(inputRoute)) notFound();
  return splitLocalizedRoute(inputRoute);
}

function requireKnownRoute(route: string, content: PublishedSiteContent) {
  const categories = new Set(content.articles.map(article => article.category));
  const dynamicProduct = content.products.some(product => route === `/products/${product.category}/${product.slug}`);
  const dynamicApplication = content.applications.some(application => route === `/applications/${application.slug}`);
  const dynamicArticle = content.articles.some(article => route === `/knowledge/${article.slug}` || route === `/insights/${article.slug}`);
  const dynamicCategory = route.startsWith("/knowledge/") && categories.has(route.split("/").pop() || "");
  if (!routePaths.includes(route) && !dynamicProduct && !dynamicApplication && !dynamicArticle && !dynamicCategory) notFound();
}

export async function generateMetadata({ params }: { params: Promise<{slug: string[]}> }): Promise<Metadata> {
  const { slug } = await params;
  const inputRoute = `/${slug.join("/")}`;
  const { locale, route } = parseLocalizedRoute(inputRoute);
  const content = await loadPublishedSiteContent();
  requireKnownRoute(route, content);
  const product = content.products.find(p => route === `/products/${p.category}/${p.slug}`);
  const app = content.applications.find(application => route === `/applications/${application.slug}`);
  const article = content.articles.find(a => route === `/insights/${a.slug}`);
  const knowledgeArticle = content.articles.find(a => route === `/knowledge/${a.slug}`);
  const knowledgeCategorySlug = route.startsWith("/knowledge/") ? route.split("/").pop() : undefined;
  const knowledgeCategory = knowledgeCategorySlug && content.articles.some(item => item.category === knowledgeCategorySlug) ? { slug: knowledgeCategorySlug, name: content.articles.find(item => item.category === knowledgeCategorySlug)?.categoryName || knowledgeCategorySlug } : undefined;
  const routeLabels: Record<string, string> = {
    "/search": "Search", "/assistant": "Selection assistant", "/company-profile": "Company knowledge profile", "/products": "Products", "/applications": "Applications", "/custom-solutions": "CUSTOM SOLUTIONS",
    "/quality-compliance": "Quality & compliance", "/technical-library": "TECHNICAL LIBRARY",
    "/certificates": "Certificate center", "/downloads": "Download center",
    "/about": "ABOUT TNV CHEMICALS", "/about/factory": "FACTORY", "/about/research-development": "RESEARCH & DEVELOPMENT",
    "/about/quality-control": "QUALITY CONTROL", "/insights": "Insights", "/knowledge": "Knowledge center", "/contact": "Contact",
    "/request-quote": "Request a quote", "/admin": "Administration", "/admin/inquiries": "Inquiry management", "/admin/content": "Content management", "/admin/seo": "SEO management", "/admin/analytics": "Analytics", "/admin/users": "Access control", "/privacy-policy": "Privacy", "/terms": "Terms",
  };
  const contentArticle = article || knowledgeArticle;
  const label = route === "/" ? "TNV Chemicals" : product?.name || app?.name || contentArticle?.title || knowledgeCategory?.name || routeLabels[route] || "TNV Chemicals";
  const localizedLabel = locale === "zh" ? (product?.nameZh || app?.nameZh || contentArticle?.titleZh || t(locale, label)) : label;
  const title = route === "/" ? (locale === "zh" ? "TNV Chemicals｜工业油墨与化学解决方案" : "TNV Chemicals | Industrial Ink & Chemical Solutions") : `${localizedLabel} | TNV Chemicals`;
  const fallbackDescription = locale === "zh" ? `了解 TNV Chemicals 的${localizedLabel}、相关技术资料与询盘路径。` : `Explore ${label}, related technical resources and inquiry pathways from TNV Chemicals.`;
  const description = route === "/" ? (locale === "zh" ? "面向全球工业买家的应用导向型印刷油墨与化学解决方案。" : "Application-led printing ink and chemical solutions for international industrial buyers.") : locale === "zh" ? (product?.useZh || app?.introZh || contentArticle?.summaryZh || t(locale, product?.use || app?.intro || contentArticle?.summary || fallbackDescription)) : (product?.use || app?.intro || contentArticle?.summary || fallbackDescription);
  const seo = await loadPublishedSeo(route, locale);
  const resolvedTitle = seo?.title || title;
  const resolvedDescription = seo?.description || description;
  return {
    title: { absolute: resolvedTitle },
    description: resolvedDescription,
    keywords: seo?.keywords,
    alternates: { canonical: localizedPath(locale, route), languages: { en: localizedPath("en", route), "zh-CN": localizedPath("zh", route), "x-default": localizedPath("en", route) } },
    openGraph: { title: resolvedTitle, description: resolvedDescription, type: contentArticle ? "article" : "website", locale: locale === "zh" ? "zh_CN" : "en_US", images: [{ url: "/og.jpg", width: 1536, height: 1024, alt: locale === "zh" ? "TNV Chemicals 工业油墨与应用解决方案" : "TNV Chemicals industrial ink and application solutions" }] },
    twitter: { card: "summary_large_image", title: resolvedTitle, description: resolvedDescription, images: ["/og.jpg"] },
    ...(route === "/search" || route === "/admin" || route.startsWith("/admin/") ? { robots: { index: false, follow: route === "/search", noarchive: true, nosnippet: true } } : {}),
  };
}

export default async function CatchAllPage({ params, searchParams }: { params: Promise<{slug: string[]}>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const inputRoute = `/${slug.join("/")}`;
  const { route } = parseLocalizedRoute(inputRoute);
  const content = await loadPublishedSiteContent();
  requireKnownRoute(route, content);
  return <SitePage route={inputRoute} content={content} searchParams={await searchParams} />;
}
