"use client";

import Link from "next/link";
import { ArrowUpRight, MagnifyingGlass } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { localizedPath, type Locale } from "./i18n";

type FinderProduct = {
  slug: string;
  code: string;
  name: string;
  nameZh?: string;
  category: string;
  categoryName: string;
  categoryNameZh?: string;
  use: string;
  useZh?: string;
  verificationStatus?: "pending" | "verified";
};

export function ProductFinder({ products, locale, initialQuery = "" }: { products: FinderProduct[]; locale: Locale; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState("all");
  const copy = locale === "zh" ? {
    label: "产品查找器", title: "按产品、系列或应用方向查找",
    intro: "当前目录展示的是待企业确认的代表性产品系列。搜索结果不会替代技术选型。",
    placeholder: "搜索产品名称、系列代码或应用", all: "全部系列", results: "个匹配结果",
    empty: "未找到匹配产品。请提交应用需求，由技术团队确认选型方向。", view: "查看产品", pending: "技术数据待核实",
  } : {
    label: "PRODUCT FINDER", title: "Search by product, series or application",
    intro: "The current catalog contains representative product families pending company verification. Search results do not replace technical qualification.",
    placeholder: "Search product name, series code or application", all: "All families", results: "matching results",
    empty: "No matching product was found. Submit the application requirement so the right starting point can be qualified.", view: "View product", pending: "Technical data pending verification",
  };
  const categories = useMemo(() => Array.from(new Map(products.map(product => [product.category, locale === "zh" ? (product.categoryNameZh || product.categoryName) : product.categoryName])).entries()), [locale, products]);
  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return products.filter(product => {
      const searchable = `${product.name} ${product.nameZh || ""} ${product.code} ${product.categoryName} ${product.categoryNameZh || ""} ${product.use} ${product.useZh || ""}`.toLocaleLowerCase();
      return (category === "all" || product.category === category) && (!term || searchable.includes(term));
    });
  }, [category, products, query]);

  return <section className="product-finder" aria-labelledby="product-finder-title">
    <div className="finder-heading"><span className="eyebrow">{copy.label}</span><h2 id="product-finder-title">{copy.title}</h2><p>{copy.intro}</p></div>
    <div className="finder-controls">
      <label className="finder-search"><span className="sr-only">{copy.placeholder}</span><MagnifyingGlass aria-hidden="true" size={18}/><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={copy.placeholder}/></label>
      <div className="finder-filters" aria-label={locale === "zh" ? "按产品系列筛选" : "Filter by product family"}>
        <button type="button" aria-pressed={category === "all"} onClick={() => setCategory("all")}>{copy.all}</button>
        {categories.map(([value, label]) => <button key={value} type="button" aria-pressed={category === value} onClick={() => setCategory(value)}>{label}</button>)}
      </div>
    </div>
    <div className="finder-summary" aria-live="polite"><b>{filtered.length}</b> {copy.results}</div>
    {filtered.length ? <div className="finder-results">{filtered.map(product => <Link key={product.slug} href={localizedPath(locale, `/products/${product.category}/${product.slug}`)}>
      <span className="finder-code">{product.code}</span><div><h3>{locale === "zh" ? (product.nameZh || product.name) : product.name}</h3><p>{locale === "zh" ? (product.useZh || product.use) : product.use}</p><small>{product.verificationStatus === "verified" ? (locale === "zh" ? "企业已审核发布" : "Company-verified publication") : copy.pending}</small></div><span className="finder-link">{copy.view}<ArrowUpRight aria-hidden="true" size={17}/></span>
    </Link>)}</div> : <p className="finder-empty">{copy.empty}</p>}
  </section>;
}
