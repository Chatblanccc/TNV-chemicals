import Link from "next/link";
import { ArrowDown, ArrowUpRight } from "@phosphor-icons/react/ssr";
import { applications, articles, company, knowledgeCategories, products } from "./site-data";
import { alternateLocale, localizedPath, splitLocalizedRoute, t, type Locale } from "./i18n";
import { media, type SiteMedia } from "./media";
import { ProductFinder } from "./product-finder";
import { InquiryForm, MobileNav } from "./site-interactions";
import { AdminInquiries } from "./admin-inquiries";

const Arrow = () => <ArrowUpRight aria-hidden="true" size={17} weight="regular" />;
const knowledgeCategoryLabel = (locale: Locale, slug: string, fallback: string) => locale === "zh" ? ({ "application-guides": "应用指南", "technical-guides": "技术指南", "procurement-guides": "采购指南" }[slug] || fallback) : fallback;

function MediaImage({ item, className, priority = false }: { item: SiteMedia; className?: string; priority?: boolean }) {
  // Assets are already responsive WebP files. Plain img avoids the Vinext image worker binding in local previews.
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={className} src={item.src} alt={item.alt} width={item.width} height={item.height} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async" style={{ objectPosition: item.focalPoint, aspectRatio: item.aspectRatio }} />;
}

function Placeholder({ children, locale }: { children: React.ReactNode; locale: Locale }) {
  return <span className="placeholder">{t(locale, "Review needed: ")}{children}</span>;
}

function Header({ locale, route, preview }: { locale: Locale; route: string; preview: boolean }) {
  const path = (target: string) => localizedPath(locale, target);
  const other = alternateLocale(locale);
  const items = [
    ["/products", t(locale, "Products")],
    ["/applications", t(locale, "Applications")],
    ["/quality-compliance", t(locale, "Quality")],
    ["/technical-library", t(locale, "Resources")],
    ["/about", t(locale, "Company")],
  ].map(([href, label]) => ({ href: path(href), label, active: route === href || route.startsWith(`${href}/`) }));
  return <>
    {preview && <div className="review-bar"><span>{t(locale, "PRE-LAUNCH REVIEW SITE")}</span><span>{t(locale, "Unverified company facts are clearly marked")}</span></div>}
    <header className="header">
      <Link className="brand" href={path("/")}><span className="brand-mark">T</span><span>TNV <b>CHEMICALS</b></span></Link>
      <nav aria-label={locale === "zh" ? "主导航" : "Primary navigation"}>
        {items.map(item => <Link key={item.href} href={item.href} aria-current={item.active ? "page" : undefined}>{item.label}</Link>)}
      </nav>
      <div className="header-actions">
        <Link className="language-button" href={localizedPath(other, route)} hrefLang={other === "zh" ? "zh-CN" : "en"} aria-label={other === "zh" ? "切换到中文" : "Switch to English"}>{other === "zh" ? "中文" : "EN"}</Link>
        <Link className="button button-small" href={path("/request-quote")}>{t(locale, "Request a quote")} <Arrow /></Link>
        <MobileNav items={items.map(({ href, label }) => ({ href, label }))} ctaHref={path("/request-quote")} ctaLabel={t(locale, "Request a quote")} languageHref={localizedPath(other, route)} languageLabel={other === "zh" ? "中文" : "English"} labels={{ open: locale === "zh" ? "打开菜单" : "Open menu", close: locale === "zh" ? "关闭菜单" : "Close menu", navigation: locale === "zh" ? "移动导航" : "Mobile navigation" }} />
      </div>
    </header>
  </>;
}

function Footer({ locale, preview }: { locale: Locale; preview: boolean }) {
  const path = (target: string) => localizedPath(locale, target);
  return <footer>
    <div className="footer-top"><div><div className="brand brand-light"><span className="brand-mark">T</span><span>TNV <b>CHEMICALS</b></span></div><p>{t(locale, "Application-led ink and chemical solutions for international industrial buyers.")}</p></div><div><h3>{t(locale, "Explore")}</h3><Link href={path("/products")}>{t(locale, "Products")}</Link><Link href={path("/applications")}>{t(locale, "Applications")}</Link><Link href={path("/knowledge")}>{locale === "zh" ? "知识中心" : "Knowledge center"}</Link></div><div><h3>{t(locale, "Company")}</h3><Link href={path("/about")}>{t(locale, "About")}</Link><Link href={path("/quality-compliance")}>{t(locale, "Quality & compliance")}</Link><Link href={path("/contact")}>{t(locale, "Contact")}</Link></div><div><h3>{t(locale, "Contact")}</h3><p><Placeholder locale={locale}>{t(locale, "sales email")}</Placeholder></p><p><Placeholder locale={locale}>{t(locale, "phone / WhatsApp")}</Placeholder></p></div></div>
    <div className="footer-bottom"><span>© 2026 TNV Chemicals.{preview ? ` ${t(locale, "Pre-launch content.")}` : ""}</span><span><Link href={path("/privacy-policy")}>{t(locale, "Privacy")}</Link> · <Link href={path("/terms")}>{t(locale, "Terms")}</Link></span></div>
  </footer>;
}

function ProductCard({ product, locale }: { product: typeof products[number]; locale: Locale }) {
  const image = product.category === "printing-inks" ? media.materialInks : product.category === "colorants" ? media.materialColorants : product.category === "additives" ? media.materialAdditives : media.materialCustom;
  return <Link className="product-card" href={localizedPath(locale, `/products/${product.category}/${product.slug}`)}><div className="product-code">{product.code}</div><h3>{t(locale, product.name)}</h3><p>{t(locale, product.use)}</p><MediaImage item={image} className="product-card-image" /><div className="card-link">{t(locale, "View product")} <Arrow /></div></Link>;
}

function Rfq({ locale, compact = false, productCode }: { locale: Locale; compact?: boolean; productCode?: string }) {
  const path = (target: string) => localizedPath(locale, target);
  const labels = {
    formLabel: locale === "zh" ? "获取报价表单" : "Request a quote form", productCode: locale === "zh" ? "询价产品" : "Product requested", email: t(locale, "Business email"), area: t(locale, "Product or application"), selectArea: t(locale, "Select an area"), printingInks: t(locale, "Printing inks"), colorants: t(locale, "Colorants & concentrates"), additives: t(locale, "Functional additives"), custom: t(locale, "Custom formulation"), company: t(locale, "Company"), companyPlaceholder: t(locale, "Company name"), country: t(locale, "Country"), countryPlaceholder: t(locale, "Country / market"), requirement: t(locale, "Production requirement"), requirementPlaceholder: t(locale, "Substrate, print method, current issue, target performance and monthly quantity"), prepare: compact ? t(locale, "Prepare inquiry") : (locale === "zh" ? "提交技术询盘" : "Submit technical inquiry"), preparing: locale === "zh" ? "正在提交…" : "Submitting…", demoNote: compact ? t(locale, "Demo form — recipient inbox and privacy workflow must be connected before launch.") : (locale === "zh" ? "提交仅发送至已配置的企业收件端，并受隐私政策约束。" : "Submission is delivered only to the configured company endpoint and is governed by the privacy policy."), emailError: locale === "zh" ? "请输入有效的企业邮箱。" : "Enter a valid business email.", areaError: locale === "zh" ? "请选择产品或应用方向。" : "Choose a product or application area.", requiredError: locale === "zh" ? "此项为必填项。" : "This field is required.", requirementError: locale === "zh" ? "请说明基材、工艺和目标性能。" : "Describe the substrate, process and target performance.", privacyError: locale === "zh" ? "请先确认隐私政策。" : "Confirm the privacy policy before submitting.", privacyPrefix: locale === "zh" ? "我已阅读并同意" : "I have read and accept the", privacyLink: locale === "zh" ? "隐私政策" : "privacy policy", deliveryError: locale === "zh" ? "询盘暂未送达。请稍后重试，或等待公司完成收件端配置。" : "The inquiry was not delivered. Try again later or wait until the company delivery endpoint is configured.", successEyebrow: locale === "zh" ? "询盘已接收" : "INQUIRY RECEIVED", successTitle: locale === "zh" ? "技术需求已提交。" : "Your technical inquiry was submitted.", successBody: locale === "zh" ? "请保存下方询盘编号，便于后续沟通。" : "Keep the reference below for follow-up.", reference: locale === "zh" ? "询盘编号" : "Inquiry reference", readyEyebrow: locale === "zh" ? "询盘草稿已整理" : "INQUIRY DRAFT READY", readyTitle: locale === "zh" ? "技术需求已准备好。" : "Your technical brief is ready.", readyBody: locale === "zh" ? "这是未发送的草稿；请进入完整询盘页提交。" : "This is an unsent draft; use the full inquiry page to submit.", editDraft: locale === "zh" ? "返回修改" : "Edit the draft",
  };
  return <section className={compact ? "rfq rfq-compact" : "rfq"}><div><span className="eyebrow">{t(locale, "START A TECHNICAL CONVERSATION")}</span><h2>{t(locale, "Tell us what your production line needs.")}</h2><p>{t(locale, "Share your substrate, print method, target performance and estimated volume. A technical sales contact can then qualify the right next step.")}</p></div><InquiryForm compact={compact} labels={labels} productCode={productCode} locale={locale} privacyHref={path("/privacy-policy")} /></section>;
}

function Home({ locale }: { locale: Locale }) {
  const path = (target: string) => localizedPath(locale, target);
  const applicationMedia = [media.applicationPackaging, media.applicationPaper, media.applicationSpecialty];
  const evidence = [
    [media.evidenceRnd, t(locale, "RESEARCH & DEVELOPMENT"), t(locale, "From application question to tested formulation."), path("/about/research-development")],
    [media.evidenceFactory, t(locale, "FACTORY"), t(locale, "Show the production environment."), path("/about/factory")],
    [media.evidenceQc, t(locale, "QUALITY CONTROL"), t(locale, "Control from incoming material to final batch."), path("/about/quality-control")],
  ] as const;
  return <main>
    <section className="hero">
      <div className="hero-copy"><span className="eyebrow">{t(locale, "PRINTING INKS · FUNCTIONAL MATERIALS · CUSTOM FORMULATION")}</span><h1>{t(locale, "Ink systems for packaging,")}<br /><em>{t(locale, "paper and label printing.")}</em></h1><p>{t(locale, "Match the ink system to substrate, print method, press speed and target performance—from technical qualification to repeatable production.")}</p><div className="hero-actions"><Link className="button button-dark" href={path("/applications")}>{t(locale, "Choose by application")} <Arrow /></Link><Link className="text-link dark" href={path("/request-quote")}>{t(locale, "Submit a technical inquiry")} <Arrow /></Link></div><div className="hero-folio"><b>01</b><span></span><small>Material atlas</small></div></div>
      <div className="hero-atlas"><MediaImage item={media.heroInk} priority /><MediaImage item={media.heroPaper} /><MediaImage item={media.heroCorrugated} /></div>
    </section>

    <section className="atlas-section applications-atlas"><div className="section-intro"><span className="section-number">02</span><h2>{t(locale, "What are you printing?")}</h2><p>{t(locale, "Buyers do not always begin with a product code. These pathways start with the substrate, print process and performance target.")}</p><Link className="text-link dark" href={path("/applications")}>{t(locale, "View all applications")} <Arrow /></Link></div><div className="application-cards">{applications.map((item, index) => <Link href={path(`/applications/${item.slug}`)} key={item.slug}><MediaImage item={applicationMedia[index]} /><span>0{index + 1}</span><h3>{t(locale, item.name)}</h3><p>{t(locale, item.intro)}</p></Link>)}</div></section>

    <section className="atlas-section product-atlas"><div className="section-intro"><span className="section-number">03</span><h2>{t(locale, "PRODUCT FAMILIES")}</h2><p>{t(locale, "Browse representative product families. All technical values remain clearly marked until the company supplies verified specifications.")}</p><Link className="text-link dark" href={path("/products")}>{t(locale, "View all products")} <Arrow /></Link></div><div className="product-atlas-grid">{products.map(product => <ProductCard key={product.slug} product={product} locale={locale} />)}</div></section>

    <section className="atlas-section evidence-section"><div className="section-intro"><span className="section-number">04</span><h2>{t(locale, "Built on R&D.")}<br />{t(locale, "Delivered in manufacturing.")}</h2><p>{t(locale, "This page is intentionally structured without invented facts. Replace the review markers with verified company data, original photography, responsible personnel and dated evidence.")}</p><Link className="text-link dark" href={path("/about")}>{t(locale, "ABOUT TNV CHEMICALS")} <Arrow /></Link></div><div className="evidence-grid">{evidence.map(([image, label, title, href]) => <Link key={label} href={href}><MediaImage item={image} /><span>{label}</span><h3>{title}</h3><small><Placeholder locale={locale}>{t(locale, "verified workflow details")}</Placeholder></small></Link>)}</div></section>

    <section className="technical-index"><div><span className="section-number">05</span><h2>{t(locale, "TECHNICAL LIBRARY")}</h2><p>{t(locale, "Tools, guidance and resources for technical, R&D and procurement teams.")}</p><Link className="text-link dark" href={path("/technical-library")}>{t(locale, "Open technical library")} <Arrow /></Link></div><div className="technical-links"><Link href={path("/technical-library")}><b>{t(locale, "Technical Data Sheet")}</b><span>{t(locale, "Specification by product grade")}</span><Arrow /></Link><Link href={path("/technical-library")}><b>{t(locale, "Safety Data Sheet")}</b><span>{t(locale, "Market and language specific")}</span><Arrow /></Link><Link href={path("/knowledge")}><b>{t(locale, "TECHNICAL INSIGHTS")}</b><span>{t(locale, "Useful answers for industrial buyers.")}</span><Arrow /></Link></div></section>

    <section className="closing-cta"><h2>{t(locale, "Let’s create chemistry")}<br /><em>{t(locale, "that works for your process.")}</em></h2><div><p>{t(locale, "Share your substrate, print method, target performance and estimated volume. A technical sales contact can then qualify the right next step.")}</p><Link className="button" href={path("/request-quote")}>{t(locale, "Start a technical inquiry")}<Arrow /></Link></div></section>
  </main>;
}

function PageHero({ eyebrow, title, intro, locale }: { eyebrow: string; title: string; intro: string; locale: Locale }) {
  return <section className="page-hero"><span className="eyebrow">{t(locale, eyebrow)}</span><h1>{t(locale, title)}</h1><p>{t(locale, intro)}</p></section>;
}

function ProductsPage({ locale, initialQuery }: { locale: Locale; initialQuery?: string }) {
  return <main><PageHero locale={locale} eyebrow="PRODUCT CENTER" title="Formulations for real production conditions." intro="Explore representative product families, then qualify the exact grade around substrate, press, process and end-use requirements." /><ProductFinder products={products} locale={locale} initialQuery={initialQuery}/><section className="section product-catalog"><div className="section-head"><div><span className="eyebrow">{locale === "zh" ? "代表性产品系列" : "REPRESENTATIVE FAMILIES"}</span><h2>{locale === "zh" ? "当前产品目录结构" : "Current catalog structure"}</h2></div><p>{locale === "zh" ? "所有最终牌号、规格、包装与文件均需要经过企业确认及应用选型。" : "Every final grade, specification, package and document remains subject to company verification and application qualification."}</p></div><div className="product-grid">{products.map(p => <ProductCard key={p.slug} product={p} locale={locale} />)}</div><div className="review-note"><b>{t(locale, "Company review checkpoint")}</b><p>{t(locale, "Product names and families shown here are structured placeholder content. Confirm the real catalog, codes, packaging, MOQ and technical limits before launch.")}</p></div></section><Rfq locale={locale} compact /></main>;
}

function ProductDetail({ product, locale }: { product: typeof products[number]; locale: Locale }) {
  const path = (target: string) => localizedPath(locale, target);
  const image = product.category === "printing-inks" ? media.materialInks : product.category === "colorants" ? media.materialColorants : product.category === "additives" ? media.materialAdditives : media.materialCustom;
  const qualification = locale === "zh" ? [["承印材料", "材料类型、供应商、表面处理与批次"], ["印刷工艺", "印刷方式、设备、速度与干燥配置"], ["后加工", "复合、涂布、模切或其他后加工步骤"], ["验收目标", "颜色、附着、耐性与最终使用要求"]] : [["Substrate", "Material, supplier, surface treatment and batch"], ["Print process", "Method, press, speed and drying configuration"], ["Finishing", "Lamination, coating, converting or other downstream steps"], ["Acceptance target", "Color, adhesion, resistance and final end-use requirements"]];
  return <main><section className="product-hero"><div><div className="breadcrumbs"><Link href={path("/products")}>{t(locale, "Products")}</Link> / {t(locale, product.categoryName)}</div><span className="eyebrow">{product.code}</span><h1>{t(locale, product.name)}</h1><p>{t(locale, product.use)}</p><div className="hero-actions"><Link className="button" href={`${path("/request-quote")}?product=${encodeURIComponent(product.code)}`}>{t(locale, "Request this product")} <Arrow /></Link><a className="text-link" href="#specifications">{t(locale, "View specifications")} <ArrowDown size={17} /></a></div></div><div className="product-visual"><MediaImage item={image} priority /><span>{product.code}</span><b>{t(locale, "FORMULATION WINDOW")}</b><small>{t(locale, "Final grade subject to technical qualification")}</small></div></section><section className="section product-content"><div><span className="eyebrow">{t(locale, "WHY THIS FAMILY")}</span><h2>{t(locale, "Built to be qualified, not guessed.")}</h2><p>{t(locale, "This placeholder page demonstrates the buying information architecture. The final recommendation should follow a review of the customer’s substrate, equipment, speed, drying, finishing and resistance targets.")}</p><ul className="benefit-list">{product.benefits.map(b => <li key={b}>{t(locale, b)}</li>)}</ul></div><div id="specifications"><div className="verification-label"><span>{locale === "zh" ? "数据状态" : "DATA STATUS"}</span><b>{locale === "zh" ? "待企业与牌号核实" : "Pending company and grade verification"}</b></div><h2>{t(locale, "Technical overview")}</h2><table><tbody>{product.specs.map(([k, v]) => <tr key={k}><th>{t(locale, k)}</th><td>{t(locale, v)}</td></tr>)}</tbody></table><div className="document-status"><span>TDS <b>{locale === "zh" ? "待提供" : "Pending"}</b></span><span>SDS <b>{locale === "zh" ? "待提供" : "Pending"}</b></span><span>COA <b>{locale === "zh" ? "按批次确认" : "Confirm by batch"}</b></span></div></div></section><section className="qualification-brief section"><div><span className="eyebrow">{locale === "zh" ? "询盘准备" : "INQUIRY PREPARATION"}</span><h2>{locale === "zh" ? "提供可用于技术选型的信息" : "Prepare a qualification-ready brief"}</h2><p>{locale === "zh" ? "这些信息可以帮助供应商判断产品系列、样品路径和后续验证重点，但不会替代实际测试。" : "These inputs help a supplier qualify the product family, sample route and validation priorities without pretending that a product name alone is enough."}</p></div><dl>{qualification.map(([term, description]) => <div key={term}><dt>{term}</dt><dd>{description}</dd></div>)}</dl></section><section className="faq section"><span className="eyebrow">{t(locale, "BUYER FAQ")}</span><h2>{t(locale, "Before you request a sample")}</h2><details><summary>{t(locale, "What information is needed for grade selection?")}</summary><p>{t(locale, "Share substrate, print method, press speed, drying setup, finishing process, target resistance and current production issue.")}</p></details><details><summary>{t(locale, "Can the formulation and color be customized?")}</summary><p>{t(locale, "Customization is presented as a capability pathway here, but its actual scope, MOQ and lead time require company confirmation.")}</p></details><details><summary>{t(locale, "Which documents are available?")}</summary><p>{t(locale, "TDS, SDS and batch documents should only be published after verified company files have been supplied and reviewed.")}</p></details></section><Rfq locale={locale} productCode={product.code} /></main>;
}

function ApplicationsPage({ locale }: { locale: Locale }) {
  return <main><PageHero locale={locale} eyebrow="APPLICATIONS" title="Choose by substrate and process." intro="An application-led route helps buyers reach the right product family even when they do not know the precise chemical or grade name."/><section className="section application-list">{applications.map((a, i) => <Link href={localizedPath(locale, `/applications/${a.slug}`)} key={a.slug}><span>0{i+1}</span><div><h2>{t(locale, a.name)}</h2><p>{t(locale, a.intro)}</p></div><Arrow /></Link>)}</section><Rfq locale={locale} compact /></main>;
}

function ApplicationDetail({ item, locale }: { item: typeof applications[number]; locale: Locale }) {
  const related = products.filter(p => p.category === "printing-inks").slice(0,3);
  return <main><PageHero locale={locale} eyebrow="APPLICATION GUIDE" title={item.name} intro={item.intro}/><section className="section product-content"><div><span className="eyebrow">{t(locale, "COMMON BUYER CHALLENGES")}</span><h2>{t(locale, "Define the production window first.")}</h2><ul className="benefit-list">{item.challenges.map(x => <li key={x}>{t(locale, x)}</li>)}</ul></div><div><span className="eyebrow">{t(locale, "QUALIFICATION INPUTS")}</span><h2>{t(locale, "Prepare these details")}</h2><table><tbody><tr><th>{t(locale, "Substrate")}</th><td>{t(locale, "Material, supplier and surface treatment")}</td></tr><tr><th>{t(locale, "Process")}</th><td>{t(locale, "Print method, speed and drying configuration")}</td></tr><tr><th>{t(locale, "End use")}</th><td>{t(locale, "Resistance, finishing and regulatory requirements")}</td></tr></tbody></table></div></section><section className="section"><div className="section-head"><div><span className="eyebrow">{t(locale, "RELATED STARTING POINTS")}</span><h2>{t(locale, "Representative product families")}</h2></div></div><div className="product-grid">{related.map(p => <ProductCard key={p.slug} product={p} locale={locale}/>)}</div></section><Rfq locale={locale} /></main>;
}

function StandardPage({ route, locale, productCode }: { route: string; locale: Locale; productCode?: string }) {
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
  if (route === "/request-quote" || route === "/contact") return <main className="inquiry-page"><PageHero locale={locale} eyebrow={eyebrow} title={title} intro={intro}/><Rfq locale={locale} productCode={productCode}/></main>;
  if (route === "/technical-library") return <main><PageHero locale={locale} eyebrow={eyebrow} title={title} intro={intro}/><section className="section library-grid">{["Product catalog","Technical data sheets","Safety data sheets","Certificates","Testing reports","Packaging information"].map(x => <div key={x}><span>PDF</span><h2>{t(locale, x)}</h2><p><Placeholder locale={locale}>{t(locale, "company files pending")}</Placeholder></p><button disabled>{t(locale, "Not yet available")}</button></div>)}</section></main>;
  return <main><PageHero locale={locale} eyebrow={eyebrow} title={title} intro={intro}/><section className="section editorial"><div><h2>{t(locale, "Company review required")}</h2><p>{t(locale, "This page is intentionally structured without invented facts. Replace the review markers with verified company data, original photography, responsible personnel and dated evidence.")}</p></div><div className="fact-sheet"><p><span>{t(locale, "Legal company name")}</span><Placeholder locale={locale}>{t(locale, company.legalName)}</Placeholder></p><p><span>{t(locale, "Factory location")}</span><Placeholder locale={locale}>{t(locale, company.address)}</Placeholder></p><p><span>{t(locale, "Certifications")}</span><Placeholder locale={locale}>{t(locale, "verified certificate names and dates")}</Placeholder></p><p><span>{t(locale, "Production capability")}</span><Placeholder locale={locale}>{t(locale, "verified lines and annual capacity")}</Placeholder></p></div></section><Rfq locale={locale} compact/></main>;
}

function Insights({ slug, locale, routeBase }: { slug?: string; locale: Locale; routeBase: "/insights" | "/knowledge" }) {
  const article = articles.find(item => item.slug === slug);
  const category = knowledgeCategories.find(item => item.slug === slug);
  const listing = category ? articles.filter(item => item.category === category.slug) : articles;
  const indexPath = localizedPath(locale, routeBase);
  if (article) {
    const relatedProducts = products.filter(product => article.relatedProductSlugs.includes(product.slug));
    const relatedApplications = applications.filter(application => article.relatedApplicationSlugs.includes(application.slug));
    const checklist = locale === "zh" ? article.checklistZh : article.checklist;
    const faq = locale === "zh" ? article.faqZh : article.faq;
    return <main>
      <article className="article-page">
        <nav className="breadcrumbs" aria-label={locale === "zh" ? "面包屑导航" : "Breadcrumb"}><Link href={indexPath}>{routeBase === "/knowledge" ? (locale === "zh" ? "知识中心" : "Knowledge center") : t(locale, "Insights")}</Link> / <Link href={localizedPath(locale, `/knowledge/${article.category}`)}>{knowledgeCategoryLabel(locale, article.category, article.categoryName)}</Link></nav>
        <span className="eyebrow">{t(locale, article.type)}</span><h1>{t(locale, article.title)}</h1><p className="lead">{t(locale, article.summary)}</p>
        <div className="article-meta"><span>{locale === "zh" ? `更新于 ${article.updated}` : `Updated ${article.updated}`}</span><span>{locale === "zh" ? `约 ${article.readingMinutes} 分钟阅读` : `${article.readingMinutes} min read`}</span><span>{locale === "zh" ? "通用买家指南，不构成产品规格" : "General buyer guidance — not a product specification"}</span></div>
        {article.sections.map(section => <section key={section.heading}><h2>{locale === "zh" ? section.headingZh : section.heading}</h2>{(locale === "zh" ? section.paragraphsZh : section.paragraphs).map(paragraph => <p key={paragraph}>{paragraph}</p>)}</section>)}
        <section className="article-checklist"><span className="eyebrow">{locale === "zh" ? "采购检查清单" : "BUYER CHECKLIST"}</span><h2>{locale === "zh" ? "提交或审核前请确认" : "Confirm before submission or approval"}</h2><ul>{checklist.map(item => <li key={item}>{item}</li>)}</ul></section>
        {(relatedProducts.length > 0 || relatedApplications.length > 0) && <section className="article-related"><span className="eyebrow">{locale === "zh" ? "继续浏览" : "CONTINUE EXPLORING"}</span><h2>{locale === "zh" ? "相关产品与应用入口" : "Related products and application routes"}</h2><div>{relatedProducts.map(product => <Link key={product.slug} href={localizedPath(locale, `/products/${product.category}/${product.slug}`)}><span>{product.code}</span><b>{t(locale, product.name)}</b><Arrow/></Link>)}{relatedApplications.map(application => <Link key={application.slug} href={localizedPath(locale, `/applications/${application.slug}`)}><span>{locale === "zh" ? "应用指南" : "Application guide"}</span><b>{t(locale, application.name)}</b><Arrow/></Link>)}</div></section>}
        <section className="article-faq"><span className="eyebrow">FAQ</span><h2>{locale === "zh" ? "常见采购问题" : "Common buyer questions"}</h2>{faq.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section>
      </article><Rfq locale={locale} compact/>
    </main>;
  }
  const eyebrow = routeBase === "/knowledge" ? (locale === "zh" ? "知识中心" : "KNOWLEDGE CENTER") : "INSIGHTS";
  const title = category ? knowledgeCategoryLabel(locale, category.slug, category.name) : (locale === "zh" ? "为工业买家准备的技术指南" : "Technical answers, written for buyers.");
  const intro = category ? (locale === "zh" ? "按主题浏览经过清晰标注、便于核实的采购与应用指南。" : "Browse clearly scoped buyer guidance organized around this topic.") : t(locale, "Selection guides, application notes and procurement resources designed to be clear, attributable and easy to verify.");
  return <main><PageHero locale={locale} eyebrow={eyebrow} title={title} intro={intro}/>{routeBase === "/knowledge" && <nav className="knowledge-categories" aria-label={locale === "zh" ? "知识中心分类" : "Knowledge categories"}><Link aria-current={!category ? "page" : undefined} href={localizedPath(locale, "/knowledge")}>{locale === "zh" ? "全部指南" : "All guides"}</Link>{knowledgeCategories.map(item => <Link key={item.slug} aria-current={category?.slug === item.slug ? "page" : undefined} href={localizedPath(locale, `/knowledge/${item.slug}`)}>{knowledgeCategoryLabel(locale, item.slug, item.name)}</Link>)}</nav>}<section className="section article-grid">{listing.map(item => <Link key={item.slug} href={localizedPath(locale, `${routeBase}/${item.slug}`)}><span>{t(locale, item.type)}</span><h3>{t(locale, item.title)}</h3><p>{t(locale, item.summary)}</p><small>{locale === "zh" ? `约 ${item.readingMinutes} 分钟 · ${item.updated}` : `${item.readingMinutes} min · ${item.updated}`}</small><b>{t(locale, "Read guide")} <Arrow /></b></Link>)}</section></main>;
}

function InquiryAdminPage({ locale }: { locale: Locale }) {
  return <main className="admin-page">
    <section className="admin-heading">
      <span className="eyebrow">{locale === "zh" ? "询盘管理" : "INQUIRY MANAGEMENT"}</span>
      <h1>{locale === "zh" ? "从新线索到销售跟进。" : "From new lead to sales follow-up."}</h1>
      <p>{locale === "zh" ? "筛选询盘、核对客户需求并记录销售阶段。此区域仅向已授权管理员开放。" : "Filter inquiries, review buyer requirements and keep each sales stage current. This workspace is restricted to authorized administrators."}</p>
    </section>
    <AdminInquiries locale={locale}/>
  </main>;
}

export function SitePage({ route: inputRoute, searchParams = {} }: { route: string; searchParams?: Record<string, string | string[] | undefined> }) {
  const { locale, route } = splitLocalizedRoute(inputRoute);
  const product = products.find(p => route.endsWith(`/${p.slug}`));
  const application = applications.find(a => route === `/applications/${a.slug}`);
  const insightSlug = route.startsWith("/insights/") || route.startsWith("/knowledge/") ? route.split("/").pop() : undefined;
  const requestedProduct = typeof searchParams.product === "string" && products.some(item => item.code === searchParams.product) ? searchParams.product : undefined;
  let page: React.ReactNode = <StandardPage route={route} locale={locale} productCode={requestedProduct}/>;
  if (route === "/") page = <Home locale={locale}/>;
  else if (route === "/products") page = <ProductsPage locale={locale} initialQuery={typeof searchParams.q === "string" ? searchParams.q : undefined}/>;
  else if (product) page = <ProductDetail product={product} locale={locale}/>;
  else if (route === "/applications") page = <ApplicationsPage locale={locale}/>;
  else if (application) page = <ApplicationDetail item={application} locale={locale}/>;
  else if (route === "/admin/inquiries") page = <InquiryAdminPage locale={locale}/>;
  else if (route === "/insights" || route === "/knowledge" || insightSlug) page = <Insights slug={insightSlug} locale={locale} routeBase={route.startsWith("/knowledge") ? "/knowledge" : "/insights"}/>;
  const article = articles.find(a => a.slug === insightSlug);
  const baseUrl = process.env.SITE_URL?.replace(/\/$/, "");
  const pageUrl = baseUrl ? `${baseUrl}${localizedPath(locale, route)}` : undefined;
  const language = locale === "zh" ? "zh-CN" : "en";
  const organization = { "@type": "Organization", "@id": baseUrl ? `${baseUrl}/#organization` : undefined, name: company.brand, url: baseUrl };
  const articleFaq = article ? (locale === "zh" ? article.faqZh : article.faq) : [];
  const productImage = product ? (product.category === "printing-inks" ? media.materialInks : product.category === "colorants" ? media.materialColorants : product.category === "additives" ? media.materialAdditives : media.materialCustom) : undefined;
  const schema = route === "/"
    ? { "@context": "https://schema.org", ...organization, inLanguage: language, description: t(locale, "Application-led ink and chemical solutions for international industrial buyers.") }
    : product
      ? { "@context": "https://schema.org", "@graph": [{ "@type": "Product", "@id": pageUrl ? `${pageUrl}#product` : undefined, name: t(locale, product.name), description: t(locale, product.use), sku: product.code, category: t(locale, product.categoryName), image: baseUrl && productImage ? `${baseUrl}${productImage.src}` : undefined, url: pageUrl, inLanguage: language, brand: { "@type": "Brand", name: company.brand }, additionalProperty: product.specs.map(([name, value]) => ({ "@type": "PropertyValue", name: t(locale, name), value: t(locale, value) })) }, { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: t(locale, "Products"), item: baseUrl ? `${baseUrl}${localizedPath(locale, "/products")}` : undefined }, { "@type": "ListItem", position: 2, name: t(locale, product.name), item: pageUrl }] }] }
      : article
        ? { "@context": "https://schema.org", "@graph": [{ "@type": "Article", headline: t(locale, article.title), description: t(locale, article.summary), url: pageUrl, mainEntityOfPage: pageUrl, inLanguage: language, dateModified: article.updated, articleSection: knowledgeCategoryLabel(locale, article.category, article.categoryName), publisher: organization }, { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: locale === "zh" ? "知识中心" : "Knowledge center", item: baseUrl ? `${baseUrl}${localizedPath(locale, "/knowledge")}` : undefined }, { "@type": "ListItem", position: 2, name: knowledgeCategoryLabel(locale, article.category, article.categoryName), item: baseUrl ? `${baseUrl}${localizedPath(locale, `/knowledge/${article.category}`)}` : undefined }, { "@type": "ListItem", position: 3, name: t(locale, article.title), item: pageUrl }] }, { "@type": "FAQPage", mainEntity: articleFaq.map(([question, answer]) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) }] }
        : { "@context": "https://schema.org", "@type": "WebPage", name: t(locale, company.brand), url: pageUrl, inLanguage: language, isPartOf: baseUrl ? { "@type": "WebSite", "@id": `${baseUrl}/#website`, name: company.brand, url: baseUrl } : undefined };
  const preview = process.env.SITE_LAUNCH_READY !== "true";
  return <div className={preview ? "site-preview" : "site-live"} lang={locale === "zh" ? "zh-CN" : "en"}><a className="skip-link" href="#main-content">{locale === "zh" ? "跳到主要内容" : "Skip to main content"}</a><Header locale={locale} route={route} preview={preview}/><div id="main-content" tabIndex={-1}>{page}</div><Footer locale={locale} preview={preview}/><script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(schema)}}/></div>;
}
