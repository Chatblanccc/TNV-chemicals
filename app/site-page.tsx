import Link from "next/link";
import { applications, articles, company, products } from "./site-data";
import { alternateLocale, localizedPath, splitLocalizedRoute, t, type Locale } from "./i18n";

const Arrow = () => <span aria-hidden="true">↗</span>;

function Placeholder({ children, locale }: { children: React.ReactNode; locale: Locale }) {
  return <span className="placeholder">{t(locale, "Review needed: ")}{children}</span>;
}

function Header({ locale, route }: { locale: Locale; route: string }) {
  const path = (target: string) => localizedPath(locale, target);
  const other = alternateLocale(locale);
  return <>
    <div className="review-bar">{t(locale, "PRE-LAUNCH REVIEW SITE")} <span>{t(locale, "Unverified company facts are clearly marked")}</span></div>
    <header className="header">
      <Link className="brand" href={path("/")}><span className="brand-mark">T</span><span>TNV <b>CHEMICALS</b></span></Link>
      <nav aria-label={locale === "zh" ? "主导航" : "Primary navigation"}>
        <Link href={path("/products")}>{t(locale, "Products")}</Link>
        <Link href={path("/applications")}>{t(locale, "Applications")}</Link>
        <Link href={path("/quality-compliance")}>{t(locale, "Quality")}</Link>
        <Link href={path("/technical-library")}>{t(locale, "Resources")}</Link>
        <Link href={path("/about")}>{t(locale, "Company")}</Link>
      </nav>
      <div className="header-actions">
        <Link className="language-button" href={localizedPath(other, route)} hrefLang={other === "zh" ? "zh-CN" : "en"} aria-label={other === "zh" ? "切换到中文" : "Switch to English"}>{other === "zh" ? "中文" : "EN"}</Link>
        <Link className="button button-small" href={path("/request-quote")}>{t(locale, "Request a quote")} <Arrow /></Link>
      </div>
    </header>
  </>;
}

function Footer({ locale }: { locale: Locale }) {
  const path = (target: string) => localizedPath(locale, target);
  return <footer><div className="footer-top"><div><div className="brand brand-light"><span className="brand-mark">T</span><span>TNV <b>CHEMICALS</b></span></div><p>{t(locale, "Application-led ink and chemical solutions for international industrial buyers.")}</p></div><div><h3>{t(locale, "Explore")}</h3><Link href={path("/products")}>{t(locale, "Products")}</Link><Link href={path("/applications")}>{t(locale, "Applications")}</Link><Link href={path("/insights")}>{t(locale, "Insights")}</Link></div><div><h3>{t(locale, "Company")}</h3><Link href={path("/about")}>{t(locale, "About")}</Link><Link href={path("/quality-compliance")}>{t(locale, "Quality & compliance")}</Link><Link href={path("/contact")}>{t(locale, "Contact")}</Link></div><div><h3>{t(locale, "Contact")}</h3><p><Placeholder locale={locale}>{t(locale, "sales email")}</Placeholder></p><p><Placeholder locale={locale}>{t(locale, "phone / WhatsApp")}</Placeholder></p></div></div><div className="footer-bottom"><span>© 2026 TNV Chemicals. {t(locale, "Pre-launch content.")}</span><span><Link href={path("/privacy-policy")}>{t(locale, "Privacy")}</Link> · <Link href={path("/terms")}>{t(locale, "Terms")}</Link></span></div></footer>;
}

function ProductCard({ product, locale }: { product: typeof products[number]; locale: Locale }) {
  return <Link className="product-card" href={localizedPath(locale, `/products/${product.category}/${product.slug}`)}><div className="product-code">{product.code}</div><h3>{t(locale, product.name)}</h3><p>{t(locale, product.use)}</p><div className="card-link">{t(locale, "View product")} <Arrow /></div></Link>;
}

function Rfq({ locale, compact = false }: { locale: Locale; compact?: boolean }) {
  return <section className={compact ? "rfq rfq-compact" : "rfq"}><div><span className="eyebrow">{t(locale, "START A TECHNICAL CONVERSATION")}</span><h2>{t(locale, "Tell us what your production line needs.")}</h2><p>{t(locale, "Share your substrate, print method, target performance and estimated volume. A technical sales contact can then qualify the right next step.")}</p></div><form aria-label={locale === "zh" ? "获取报价表单" : "Request a quote form"}><label>{t(locale, "Business email")}<input required type="email" placeholder="name@company.com" /></label><label>{t(locale, "Product or application")}<select required defaultValue=""><option value="" disabled>{t(locale, "Select an area")}</option><option>{t(locale, "Printing inks")}</option><option>{t(locale, "Colorants & concentrates")}</option><option>{t(locale, "Functional additives")}</option><option>{t(locale, "Custom formulation")}</option></select></label>{!compact && <><label>{t(locale, "Company")}<input required placeholder={t(locale, "Company name")} /></label><label>{t(locale, "Country")}<input required placeholder={t(locale, "Country / market")} /></label><label className="full">{t(locale, "Production requirement")}<textarea required rows={4} placeholder={t(locale, "Substrate, print method, current issue, target performance and monthly quantity")} /></label></>}<button type="submit" className="button">{t(locale, "Prepare inquiry")} <Arrow /></button><small>{t(locale, "Demo form — recipient inbox and privacy workflow must be connected before launch.")}</small></form></section>;
}

function Home({ locale }: { locale: Locale }) {
  const path = (target: string) => localizedPath(locale, target);
  return <main>
    <section className="hero"><div className="hero-copy"><span className="eyebrow">{t(locale, "PRINTING INKS · FUNCTIONAL MATERIALS · CUSTOM FORMULATION")}</span><h1>{t(locale, "Industrial chemistry,")}<br /><em>{t(locale, "built around your process.")}</em></h1><p>{t(locale, "Application-led ink and chemical solutions for packaging, paper and specialty print buyers—from initial sample to repeatable production.")}</p><div className="hero-actions"><Link className="button" href={path("/products")}>{t(locale, "Explore products")} <Arrow /></Link><Link className="text-link" href={path("/request-quote")}>{t(locale, "Discuss an application")} <Arrow /></Link></div><div className="hero-trust"><span><b>01</b> {t(locale, "Buyer-first technical qualification")}</span><span><b>02</b> {t(locale, "Custom color & formulation pathway")}</span><span><b>03</b> {t(locale, "Export documentation support")}</span></div></div><div className="hero-panel"><div className="molecule-orbit orbit-one"></div><div className="molecule-orbit orbit-two"></div><div className="formula-card"><span>{t(locale, "APPLICATION NOTE / 01")}</span><b>{t(locale, "Substrate + process + end-use")}</b><p>{t(locale, "The three inputs behind every useful recommendation.")}</p></div><div className="batch-card"><span>{t(locale, "BATCH TRACEABILITY")}</span><div><i></i><i></i><i></i><i></i><i></i><i></i></div><small><Placeholder locale={locale}>{t(locale, "verified workflow details")}</Placeholder></small></div></div></section>
    <section className="proof-strip"><span>{t(locale, "FORMULATION SUPPORT")}</span><span>{t(locale, "COLOR MATCHING")}</span><span>{t(locale, "LAB SAMPLE PATHWAY")}</span><span>{t(locale, "DOCUMENTATION READY")}</span></section>
    <section className="section"><div className="section-head"><div><span className="eyebrow">{t(locale, "PRODUCT FAMILIES")}</span><h2>{t(locale, "Start with the chemistry.")}<br />{t(locale, "Finish with the application.")}</h2></div><p>{t(locale, "Browse representative product families. All technical values remain clearly marked until the company supplies verified specifications.")}</p></div><div className="product-grid">{products.slice(0, 4).map(p => <ProductCard key={p.slug} product={p} locale={locale} />)}</div><Link className="text-link dark" href={path("/products")}>{t(locale, "View all products")} <Arrow /></Link></section>
    <section className="dark-section"><div className="section-head"><div><span className="eyebrow">{t(locale, "APPLICATION-FIRST SELECTION")}</span><h2>{t(locale, "What are you printing?")}</h2></div><p>{t(locale, "Buyers do not always begin with a product code. These pathways start with the substrate, print process and performance target.")}</p></div><div className="application-grid">{applications.map((a, i) => <Link href={path(`/applications/${a.slug}`)} key={a.slug}><span>0{i + 1}</span><h3>{t(locale, a.name)}</h3><p>{t(locale, a.intro)}</p><b>{t(locale, "Explore application")} <Arrow /></b></Link>)}</div></section>
    <section className="section split"><div><span className="eyebrow">{t(locale, "EVIDENCE, NOT EMPTY CLAIMS")}</span><h2>{t(locale, "A technical resource center buyers can actually use.")}</h2><p>{t(locale, "Certificates, specifications and test reports belong in a clear, versioned library—not buried inside sales copy.")}</p><Link className="button button-dark" href={path("/technical-library")}>{t(locale, "Open technical library")} <Arrow /></Link></div><div className="document-stack"><div><span>TDS</span><b>{t(locale, "Technical Data Sheet")}</b><small>{t(locale, "Specification by product grade")}</small></div><div><span>SDS</span><b>{t(locale, "Safety Data Sheet")}</b><small>{t(locale, "Market and language specific")}</small></div><div><span>COA</span><b>{t(locale, "Certificate of Analysis")}</b><small>{t(locale, "Batch-level documentation")}</small></div><Placeholder locale={locale}>{t(locale, "documents pending company upload")}</Placeholder></div></section>
    <section className="insights section"><div className="section-head"><div><span className="eyebrow">{t(locale, "TECHNICAL INSIGHTS")}</span><h2>{t(locale, "Useful answers for industrial buyers.")}</h2></div><Link className="text-link dark" href={path("/insights")}>{t(locale, "View all insights")} <Arrow /></Link></div><div className="article-grid">{articles.map(a => <Link key={a.slug} href={path(`/insights/${a.slug}`)}><span>{t(locale, a.type)}</span><h3>{t(locale, a.title)}</h3><p>{t(locale, a.summary)}</p><b>{t(locale, "Read guide")} <Arrow /></b></Link>)}</div></section>
    <Rfq locale={locale} compact />
  </main>;
}

function PageHero({ eyebrow, title, intro, locale }: { eyebrow: string; title: string; intro: string; locale: Locale }) {
  return <section className="page-hero"><span className="eyebrow">{t(locale, eyebrow)}</span><h1>{t(locale, title)}</h1><p>{t(locale, intro)}</p></section>;
}

function ProductsPage({ locale }: { locale: Locale }) {
  return <main><PageHero locale={locale} eyebrow="PRODUCT CENTER" title="Formulations for real production conditions." intro="Explore representative product families, then qualify the exact grade around substrate, press, process and end-use requirements." /><section className="section"><div className="product-grid">{products.map(p => <ProductCard key={p.slug} product={p} locale={locale} />)}</div><div className="review-note"><b>{t(locale, "Company review checkpoint")}</b><p>{t(locale, "Product names and families shown here are structured placeholder content. Confirm the real catalog, codes, packaging, MOQ and technical limits before launch.")}</p></div></section><Rfq locale={locale} compact /></main>;
}

function ProductDetail({ product, locale }: { product: typeof products[number]; locale: Locale }) {
  const path = (target: string) => localizedPath(locale, target);
  return <main><section className="product-hero"><div><div className="breadcrumbs"><Link href={path("/products")}>{t(locale, "Products")}</Link> / {t(locale, product.categoryName)}</div><span className="eyebrow">{product.code}</span><h1>{t(locale, product.name)}</h1><p>{t(locale, product.use)}</p><div className="hero-actions"><Link className="button" href={`${path("/request-quote")}?product=${encodeURIComponent(product.code)}`}>{t(locale, "Request this product")} <Arrow /></Link><a className="text-link" href="#specifications">{t(locale, "View specifications")} ↓</a></div></div><div className="product-visual"><span>{product.code}</span><b>{t(locale, "FORMULATION WINDOW")}</b><div className="scale"><i></i><i></i><i></i><i></i><i></i></div><small>{t(locale, "Final grade subject to technical qualification")}</small></div></section><section className="section product-content"><div><span className="eyebrow">{t(locale, "WHY THIS FAMILY")}</span><h2>{t(locale, "Built to be qualified, not guessed.")}</h2><p>{t(locale, "This placeholder page demonstrates the buying information architecture. The final recommendation should follow a review of the customer’s substrate, equipment, speed, drying, finishing and resistance targets.")}</p><ul className="benefit-list">{product.benefits.map(b => <li key={b}>{t(locale, b)}</li>)}</ul></div><div id="specifications"><h2>{t(locale, "Technical overview")}</h2><table><tbody>{product.specs.map(([k, v]) => <tr key={k}><th>{t(locale, k)}</th><td>{t(locale, v)}</td></tr>)}</tbody></table><div className="download-row"><button disabled>{t(locale, "TDS — pending")}</button><button disabled>{t(locale, "SDS — pending")}</button><button disabled>{t(locale, "COA — on request")}</button></div></div></section><section className="faq section"><span className="eyebrow">{t(locale, "BUYER FAQ")}</span><h2>{t(locale, "Before you request a sample")}</h2><details><summary>{t(locale, "What information is needed for grade selection?")}</summary><p>{t(locale, "Share substrate, print method, press speed, drying setup, finishing process, target resistance and current production issue.")}</p></details><details><summary>{t(locale, "Can the formulation and color be customized?")}</summary><p>{t(locale, "Customization is presented as a capability pathway here, but its actual scope, MOQ and lead time require company confirmation.")}</p></details><details><summary>{t(locale, "Which documents are available?")}</summary><p>{t(locale, "TDS, SDS and batch documents should only be published after verified company files have been supplied and reviewed.")}</p></details></section><Rfq locale={locale} /></main>;
}

function ApplicationsPage({ locale }: { locale: Locale }) {
  return <main><PageHero locale={locale} eyebrow="APPLICATIONS" title="Choose by substrate and process." intro="An application-led route helps buyers reach the right product family even when they do not know the precise chemical or grade name."/><section className="section application-list">{applications.map((a, i) => <Link href={localizedPath(locale, `/applications/${a.slug}`)} key={a.slug}><span>0{i+1}</span><div><h2>{t(locale, a.name)}</h2><p>{t(locale, a.intro)}</p></div><Arrow /></Link>)}</section><Rfq locale={locale} compact /></main>;
}

function ApplicationDetail({ item, locale }: { item: typeof applications[number]; locale: Locale }) {
  const related = products.filter(p => p.category === "printing-inks").slice(0,3);
  return <main><PageHero locale={locale} eyebrow="APPLICATION GUIDE" title={item.name} intro={item.intro}/><section className="section product-content"><div><span className="eyebrow">{t(locale, "COMMON BUYER CHALLENGES")}</span><h2>{t(locale, "Define the production window first.")}</h2><ul className="benefit-list">{item.challenges.map(x => <li key={x}>{t(locale, x)}</li>)}</ul></div><div><span className="eyebrow">{t(locale, "QUALIFICATION INPUTS")}</span><h2>{t(locale, "Prepare these details")}</h2><table><tbody><tr><th>{t(locale, "Substrate")}</th><td>{t(locale, "Material, supplier and surface treatment")}</td></tr><tr><th>{t(locale, "Process")}</th><td>{t(locale, "Print method, speed and drying configuration")}</td></tr><tr><th>{t(locale, "End use")}</th><td>{t(locale, "Resistance, finishing and regulatory requirements")}</td></tr></tbody></table></div></section><section className="section"><div className="section-head"><div><span className="eyebrow">{t(locale, "RELATED STARTING POINTS")}</span><h2>{t(locale, "Representative product families")}</h2></div></div><div className="product-grid">{related.map(p => <ProductCard key={p.slug} product={p} locale={locale}/>)}</div></section><Rfq locale={locale} /></main>;
}

function StandardPage({ route, locale }: { route: string; locale: Locale }) {
  const content: Record<string, [string,string,string]> = {
    "/custom-solutions": ["CUSTOM SOLUTIONS","A formulation pathway built around your line.","From application briefing and lab sample to production validation, the process should be documented, measurable and commercially clear."],
    "/quality-compliance": ["QUALITY & COMPLIANCE","Evidence buyers can verify.","This section is ready for the company’s real quality workflow, laboratory equipment, certifications, traceability evidence and export documentation."],
    "/technical-library": ["TECHNICAL LIBRARY","The documents behind the product.","A structured home for catalogs, TDS, SDS, certificates, test reports, color cards and packaging information."],
    "/about": ["ABOUT TNV CHEMICALS","Manufacturing context, stated precisely.","Company history, legal identity, location, ownership, capabilities and market experience will be published only after verification."],
    "/about/factory": ["FACTORY","Show the production environment.","A future evidence page for facility photography, production lines, equipment, workflow and verified capacity."],
    "/about/research-development": ["RESEARCH & DEVELOPMENT","From application question to tested formulation.","A future evidence page for laboratory workflow, sampling, test methods, technical team and documented product development."],
    "/about/quality-control": ["QUALITY CONTROL","Control from incoming material to final batch.","A future evidence page for inspection stages, batch records, retention samples, testing and release criteria."],
    "/contact": ["CONTACT","Start with the application.","Send your substrate, process, target performance and buying requirements so the right technical conversation can begin."],
    "/request-quote": ["REQUEST A QUOTE","Make your inquiry useful from the first message.","The more production context you provide, the faster a supplier can qualify product family, sample route, MOQ and lead time."],
    "/privacy-policy": ["LEGAL","Privacy policy.","This draft must be reviewed for the company’s legal entity, data collection, analytics, inquiry handling, retention and international transfer practices."],
    "/terms": ["LEGAL","Website terms.","This draft must be reviewed for the company’s legal identity, jurisdiction, technical information disclaimers and document usage rules."],
  };
  const [eyebrow,title,intro] = content[route] || content["/about"];
  if (route === "/request-quote" || route === "/contact") return <main><PageHero locale={locale} eyebrow={eyebrow} title={title} intro={intro}/><Rfq locale={locale}/></main>;
  if (route === "/technical-library") return <main><PageHero locale={locale} eyebrow={eyebrow} title={title} intro={intro}/><section className="section library-grid">{["Product catalog","Technical data sheets","Safety data sheets","Certificates","Testing reports","Packaging information"].map(x => <div key={x}><span>PDF</span><h2>{t(locale, x)}</h2><p><Placeholder locale={locale}>{t(locale, "company files pending")}</Placeholder></p><button disabled>{t(locale, "Not yet available")}</button></div>)}</section></main>;
  return <main><PageHero locale={locale} eyebrow={eyebrow} title={title} intro={intro}/><section className="section editorial"><div><h2>{t(locale, "Company review required")}</h2><p>{t(locale, "This page is intentionally structured without invented facts. Replace the review markers with verified company data, original photography, responsible personnel and dated evidence.")}</p></div><div className="fact-sheet"><p><span>{t(locale, "Legal company name")}</span><Placeholder locale={locale}>{t(locale, company.legalName)}</Placeholder></p><p><span>{t(locale, "Factory location")}</span><Placeholder locale={locale}>{t(locale, company.address)}</Placeholder></p><p><span>{t(locale, "Certifications")}</span><Placeholder locale={locale}>{t(locale, "verified certificate names and dates")}</Placeholder></p><p><span>{t(locale, "Production capability")}</span><Placeholder locale={locale}>{t(locale, "verified lines and annual capacity")}</Placeholder></p></div></section><Rfq locale={locale} compact/></main>;
}

function Insights({ slug, locale }: { slug?: string; locale: Locale }) {
  const article = articles.find(a => a.slug === slug);
  if (article) return <main><article className="article-page"><span className="eyebrow">{t(locale, article.type)}</span><h1>{t(locale, article.title)}</h1><p className="lead">{t(locale, article.summary)}</p><div className="article-meta">{t(locale, "Placeholder editorial draft · Technical review required · Updated July 2026")}</div><h2>{t(locale, "Start with production context")}</h2><p>{t(locale, "A useful industrial recommendation begins with the exact substrate, process conditions, finishing steps and end-use requirements. Product names alone are not enough to predict production performance.")}</p><h2>{t(locale, "Build a comparable trial")}</h2><p>{t(locale, "Document the sample identifier, press settings, ambient conditions, substrate batch, color target, drying observations and resistance results. Keep the approved sample and the test record together.")}</p><div className="review-note"><b>{t(locale, "Editorial review checkpoint")}</b><p>{t(locale, "This sample article demonstrates structure and tone. A qualified company specialist must replace it with original, evidence-backed guidance before publication.")}</p></div></article><Rfq locale={locale} compact/></main>;
  return <main><PageHero locale={locale} eyebrow="INSIGHTS" title="Technical answers, written for buyers." intro="Selection guides, application notes and procurement resources designed to be clear, attributable and easy to verify."/><section className="section article-grid">{articles.map(a => <Link key={a.slug} href={localizedPath(locale, `/insights/${a.slug}`)}><span>{t(locale, a.type)}</span><h3>{t(locale, a.title)}</h3><p>{t(locale, a.summary)}</p><b>{t(locale, "Read guide")} <Arrow /></b></Link>)}</section></main>;
}

export function SitePage({ route: inputRoute }: { route: string }) {
  const { locale, route } = splitLocalizedRoute(inputRoute);
  const product = products.find(p => route.endsWith(`/${p.slug}`));
  const application = applications.find(a => route === `/applications/${a.slug}`);
  const insightSlug = route.startsWith("/insights/") ? route.split("/").pop() : undefined;
  let page: React.ReactNode = <StandardPage route={route} locale={locale}/>;
  if (route === "/") page = <Home locale={locale}/>;
  else if (route === "/products") page = <ProductsPage locale={locale}/>;
  else if (product) page = <ProductDetail product={product} locale={locale}/>;
  else if (route === "/applications") page = <ApplicationsPage locale={locale}/>;
  else if (application) page = <ApplicationDetail item={application} locale={locale}/>;
  else if (route === "/insights" || insightSlug) page = <Insights slug={insightSlug} locale={locale}/>;
  const article = articles.find(a => a.slug === insightSlug);
  const schema = { "@context": "https://schema.org", "@type": route === "/" ? "Organization" : product ? "Product" : insightSlug ? "Article" : "WebPage", name: t(locale, product?.name || article?.title || company.brand), inLanguage: locale === "zh" ? "zh-CN" : "en", ...(product ? { description: t(locale, product.use), sku: product.code, brand: {"@type":"Brand", name:company.brand} } : {}) };
  return <div lang={locale === "zh" ? "zh-CN" : "en"}><Header locale={locale} route={route}/>{page}<Footer locale={locale}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(schema)}}/></div>;
}
