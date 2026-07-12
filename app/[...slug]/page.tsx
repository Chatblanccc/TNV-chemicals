import type { Metadata } from "next";
import { SitePage } from "../site-page";
import { applications, articles, products, routePaths } from "../site-data";

export function generateStaticParams() {
  return routePaths.filter(path => path !== "/").map(path => ({ slug: path.slice(1).split("/") }));
}

export async function generateMetadata({ params }: { params: Promise<{slug: string[]}> }): Promise<Metadata> {
  const { slug } = await params;
  const route = `/${slug.join("/")}`;
  const product = products.find(p => route.endsWith(`/${p.slug}`));
  const app = applications.find(a => route === `/applications/${a.slug}`);
  const article = articles.find(a => route === `/insights/${a.slug}`);
  const label = product?.name || app?.name || article?.title || slug.at(-1)?.replaceAll("-", " ") || "TNV Chemicals";
  const title = `${label.replace(/\b\w/g, c => c.toUpperCase())} | TNV Chemicals`;
  const description = product?.use || app?.intro || article?.summary || `Explore ${label} from TNV Chemicals. Pre-launch information subject to company verification.`;
  return { title, description, alternates: { canonical: route }, openGraph: { title, description, type: article ? "article" : "website" } };
}

export default async function CatchAllPage({ params }: { params: Promise<{slug: string[]}> }) {
  const { slug } = await params;
  return <SitePage route={`/${slug.join("/")}`} />;
}
