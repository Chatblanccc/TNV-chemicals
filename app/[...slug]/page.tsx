import type { Metadata } from "next";
import { SitePage } from "../site-page";
import { applications, articles, products, routePaths } from "../site-data";
import { localizedPath, splitLocalizedRoute, t, type Locale } from "../i18n";

export function generateStaticParams() {
  return (["en", "zh"] as Locale[]).flatMap(locale =>
    routePaths.map(path => ({ slug: localizedPath(locale, path).slice(1).split("/") })),
  );
}

export async function generateMetadata({ params }: { params: Promise<{slug: string[]}> }): Promise<Metadata> {
  const { slug } = await params;
  const inputRoute = `/${slug.join("/")}`;
  const { locale, route } = splitLocalizedRoute(inputRoute);
  const product = products.find(p => route.endsWith(`/${p.slug}`));
  const app = applications.find(a => route === `/applications/${a.slug}`);
  const article = articles.find(a => route === `/insights/${a.slug}`);
  const label = route === "/" ? "TNV Chemicals" : product?.name || app?.name || article?.title || route.split("/").at(-1)?.replaceAll("-", " ") || "TNV Chemicals";
  const localizedLabel = t(locale, label.replace(/\b\w/g, c => c.toUpperCase()));
  const title = route === "/" ? (locale === "zh" ? "TNV Chemicals｜工业油墨与化学解决方案" : "TNV Chemicals | Industrial Ink & Chemical Solutions") : `${localizedLabel} | TNV Chemicals`;
  const fallbackDescription = locale === "zh" ? `了解 TNV Chemicals 的${localizedLabel}。预发布信息以公司最终核实为准。` : `Explore ${label} from TNV Chemicals. Pre-launch information subject to company verification.`;
  const description = route === "/" ? (locale === "zh" ? "面向全球工业买家的应用导向型印刷油墨与化学解决方案。" : "Application-led printing ink and chemical solutions for international industrial buyers.") : t(locale, product?.use || app?.intro || article?.summary || fallbackDescription);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: localizedPath(locale, route), languages: { en: localizedPath("en", route), "zh-CN": localizedPath("zh", route), "x-default": localizedPath("en", route) } },
    openGraph: { title, description, type: article ? "article" : "website", locale: locale === "zh" ? "zh_CN" : "en_US" },
  };
}

export default async function CatchAllPage({ params }: { params: Promise<{slug: string[]}> }) {
  const { slug } = await params;
  return <SitePage route={`/${slug.join("/")}`} />;
}
