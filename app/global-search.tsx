import Link from "next/link";
import { ArrowUpRight, MagnifyingGlass } from "@phosphor-icons/react/ssr";
import { localizedPath, t, type Locale } from "./i18n";
import type { PublishedSiteContent } from "./published-content";

type SearchResult = {
  key: string;
  type: "product" | "application" | "article" | "download";
  title: string;
  description: string;
  meta: string;
  href: string;
  score: number;
};

const normalize = (value: string) => value.toLocaleLowerCase().normalize("NFKC").replace(/\s+/g, " ").trim();
const localized = (locale: Locale, english: string, chinese?: string) => locale === "zh" ? (chinese || t(locale, english)) : english;

function matchScore(query: string, fields: string[], exactFields: string[] = []) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return 0;
  const haystacks = fields.map(normalize).filter(Boolean);
  const exact = exactFields.map(normalize);
  if (exact.includes(normalizedQuery)) return 100;
  if (haystacks.some(field => field.startsWith(normalizedQuery))) return 70;
  if (haystacks.some(field => field.includes(normalizedQuery))) return 50;
  const tokens = normalizedQuery.split(" ").filter(Boolean);
  return tokens.length > 1 && tokens.every(token => haystacks.some(field => field.includes(token))) ? 30 : 0;
}

function collectResults(locale: Locale, query: string, content: PublishedSiteContent): SearchResult[] {
  const results: SearchResult[] = [];
  for (const product of content.products) {
    const title = localized(locale, product.name, product.nameZh);
    const description = localized(locale, product.use, product.useZh);
    const benefits = locale === "zh" ? product.benefitsZh || product.benefits : product.benefits;
    const productApplications = locale === "zh" ? product.applicationsZh || product.applications || [] : product.applications || [];
    const specs = locale === "zh" ? product.specsZh || product.specs : product.specs;
    const score = matchScore(query, [title, product.name, product.nameZh || "", product.code, product.casNumber || "", product.formula || "", product.category, localized(locale, product.categoryName, product.categoryNameZh), description, localized(locale, product.description || "", product.descriptionZh), localized(locale, product.packaging || "", product.packagingZh), ...productApplications, ...benefits, ...specs.flat()], [product.code, product.casNumber || ""]);
    if (score) results.push({ key: `product-${product.slug}`, type: "product", title, description, meta: [product.code, product.casNumber ? `CAS ${product.casNumber}` : ""].filter(Boolean).join(" · "), href: localizedPath(locale, `/products/${product.category}/${product.slug}`), score });
  }
  for (const application of content.applications) {
    const title = localized(locale, application.name, application.nameZh);
    const description = localized(locale, application.intro, application.introZh);
    const challenges = locale === "zh" ? application.challengesZh || application.challenges.map(item => t(locale, item)) : application.challenges;
    const score = matchScore(query, [title, application.name, application.nameZh || "", description, application.intro, application.introZh || "", application.slug, ...challenges]);
    if (score) results.push({ key: `application-${application.slug}`, type: "application", title, description, meta: locale === "zh" ? "应用路径" : "Application route", href: localizedPath(locale, `/applications/${application.slug}`), score });
  }
  for (const article of content.articles) {
    const title = localized(locale, article.title, article.titleZh);
    const description = localized(locale, article.summary, article.summaryZh);
    const body = article.sections.flatMap(section => locale === "zh" ? [section.headingZh, ...section.paragraphsZh] : [section.heading, ...section.paragraphs]);
    const score = matchScore(query, [title, article.title, article.titleZh || "", description, article.categoryName, article.type, ...body, ...(locale === "zh" ? article.checklistZh : article.checklist)]);
    if (score) results.push({ key: `article-${article.slug}`, type: "article", title, description, meta: localized(locale, article.type, article.typeZh), href: localizedPath(locale, `/knowledge/${article.slug}`), score });
  }
  for (const download of content.downloads) {
    const title = localized(locale, download.name, download.nameZh);
    const description = localized(locale, download.description || "", download.descriptionZh);
    const score = matchScore(query, [title, description, download.type, download.productSlug || "", download.slug]);
    if (score) results.push({ key: `download-${download.id}`, type: "download", title, description, meta: download.type.toUpperCase(), href: download.fileUrl, score });
  }
  return results.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, locale));
}

const labels = {
  en: { eyebrow: "GLOBAL SEARCH", title: "Search products, applications and technical guidance.", intro: "Search by product name, product code, CAS number, application or keyword. Public results include verified CMS content and clearly labelled catalog placeholders.", input: "Product name, CAS, application or keyword", button: "Search", scope: "SEARCH SCOPE", scopeItems: ["Product names and codes", "Verified CAS numbers", "Applications and performance needs", "Knowledge articles and published documents"], results: "search results", empty: "No matching public content was found.", emptyHelp: "Try a product code, a broader application term, or send a technical inquiry so the requirement can be qualified.", start: "Enter a search term to begin.", types: { product: "Product", application: "Application", article: "Knowledge", download: "Download" } },
  zh: { eyebrow: "全站搜索", title: "搜索产品、应用与技术指南。", intro: "可按产品名称、产品代码、CAS 号、应用或关键词搜索。公开结果仅包含已验证的 CMS 内容和明确标注的目录占位信息。", input: "产品名称、CAS、应用或关键词", button: "搜索", scope: "搜索范围", scopeItems: ["产品名称与代码", "已验证的 CAS 号", "应用与性能需求", "知识文章与已发布文件"], results: "条搜索结果", empty: "未找到匹配的公开内容。", emptyHelp: "可尝试产品代码、更宽泛的应用词，或提交技术询盘以便进一步选型。", start: "输入搜索词开始查找。", types: { product: "产品", application: "应用", article: "知识", download: "下载" } },
} as const;

export function GlobalSearch({ locale, query, content }: { locale: Locale; query: string; content: PublishedSiteContent }) {
  const copy = labels[locale];
  const safeQuery = query.slice(0, 120).trim();
  const results = safeQuery ? collectResults(locale, safeQuery, content) : [];
  return <main>
    <section className="search-hero"><div><span className="eyebrow">{copy.eyebrow}</span><h1>{copy.title}</h1><p>{copy.intro}</p></div><form role="search" action={localizedPath(locale, "/search")} method="get"><label htmlFor="site-search">{copy.input}</label><div><MagnifyingGlass aria-hidden="true" size={20}/><input id="site-search" name="q" type="search" maxLength={120} defaultValue={safeQuery} placeholder={copy.input}/><button className="button button-dark" type="submit">{copy.button}<ArrowUpRight aria-hidden="true" size={17}/></button></div></form></section>
    <section className="search-layout"><aside><span className="eyebrow">{copy.scope}</span><ul>{copy.scopeItems.map(item => <li key={item}>{item}</li>)}</ul></aside><div className="search-results" aria-live="polite">
      {!safeQuery ? <p className="search-empty">{copy.start}</p> : results.length === 0 ? <div className="search-empty"><h2>{copy.empty}</h2><p>{copy.emptyHelp}</p><Link className="text-link dark" href={localizedPath(locale, "/request-quote")}>{locale === "zh" ? "提交技术询盘" : "Submit a technical inquiry"}<ArrowUpRight aria-hidden="true" size={17}/></Link></div> : <><div className="search-summary"><b>{results.length}</b> {copy.results} · “{safeQuery}”</div>{results.map(result => <Link className="search-result" key={result.key} href={result.href} target={result.type === "download" && /^https:\/\//.test(result.href) ? "_blank" : undefined} rel={result.type === "download" && /^https:\/\//.test(result.href) ? "noopener noreferrer" : undefined}><span>{copy.types[result.type]} · {result.meta}</span><h2>{result.title}</h2><p>{result.description}</p><b>{locale === "zh" ? "查看" : "View"}<ArrowUpRight aria-hidden="true" size={17}/></b></Link>)}</>}
    </div></section>
  </main>;
}
