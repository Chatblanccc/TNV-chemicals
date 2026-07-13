import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SitePage } from "../site-page";
import { applications, articles, knowledgeCategories, products, routePaths } from "../site-data";
import { localizedPath, splitLocalizedRoute, t, type Locale } from "../i18n";

export function generateStaticParams() {
  return (["en", "zh"] as Locale[]).flatMap(locale =>
    routePaths.map(path => ({ slug: localizedPath(locale, path).slice(1).split("/") })),
  );
}

function requireKnownRoute(inputRoute: string) {
  if (!/^\/(en|zh)(?:\/|$)/.test(inputRoute)) notFound();
  const parsed = splitLocalizedRoute(inputRoute);
  if (!routePaths.includes(parsed.route)) notFound();
  return parsed;
}

export async function generateMetadata({ params }: { params: Promise<{slug: string[]}> }): Promise<Metadata> {
  const { slug } = await params;
  const inputRoute = `/${slug.join("/")}`;
  const { locale, route } = requireKnownRoute(inputRoute);
  const product = products.find(p => route.endsWith(`/${p.slug}`));
  const app = applications.find(a => route === `/applications/${a.slug}`);
  const article = articles.find(a => route === `/insights/${a.slug}`);
  const knowledgeArticle = articles.find(a => route === `/knowledge/${a.slug}`);
  const knowledgeCategory = knowledgeCategories.find(category => route === `/knowledge/${category.slug}`);
  const routeLabels: Record<string, string> = {
    "/products": "Products", "/applications": "Applications", "/custom-solutions": "CUSTOM SOLUTIONS",
    "/quality-compliance": "Quality & compliance", "/technical-library": "TECHNICAL LIBRARY",
    "/about": "ABOUT TNV CHEMICALS", "/about/factory": "FACTORY", "/about/research-development": "RESEARCH & DEVELOPMENT",
    "/about/quality-control": "QUALITY CONTROL", "/insights": "Insights", "/knowledge": "Knowledge center", "/contact": "Contact",
    "/request-quote": "Request a quote", "/admin/inquiries": "Inquiry management", "/privacy-policy": "Privacy", "/terms": "Terms",
  };
  const contentArticle = article || knowledgeArticle;
  const label = route === "/" ? "TNV Chemicals" : product?.name || app?.name || contentArticle?.title || knowledgeCategory?.name || routeLabels[route] || "TNV Chemicals";
  const localizedLabel = t(locale, label);
  const title = route === "/" ? (locale === "zh" ? "TNV Chemicals｜工业油墨与化学解决方案" : "TNV Chemicals | Industrial Ink & Chemical Solutions") : `${localizedLabel} | TNV Chemicals`;
  const fallbackDescription = locale === "zh" ? `了解 TNV Chemicals 的${localizedLabel}、相关技术资料与询盘路径。` : `Explore ${label}, related technical resources and inquiry pathways from TNV Chemicals.`;
  const description = route === "/" ? (locale === "zh" ? "面向全球工业买家的应用导向型印刷油墨与化学解决方案。" : "Application-led printing ink and chemical solutions for international industrial buyers.") : t(locale, product?.use || app?.intro || contentArticle?.summary || fallbackDescription);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: localizedPath(locale, route), languages: { en: localizedPath("en", route), "zh-CN": localizedPath("zh", route), "x-default": localizedPath("en", route) } },
    openGraph: { title, description, type: contentArticle ? "article" : "website", locale: locale === "zh" ? "zh_CN" : "en_US", images: [{ url: "/og.png", width: 1536, height: 1024, alt: locale === "zh" ? "TNV Chemicals 工业油墨与应用解决方案" : "TNV Chemicals industrial ink and application solutions" }] },
    twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
    ...(route.startsWith("/admin/") ? { robots: { index: false, follow: false, noarchive: true, nosnippet: true } } : {}),
  };
}

export default async function CatchAllPage({ params, searchParams }: { params: Promise<{slug: string[]}>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { slug } = await params;
  const route = `/${slug.join("/")}`;
  requireKnownRoute(route);
  return <SitePage route={route} searchParams={await searchParams} />;
}
