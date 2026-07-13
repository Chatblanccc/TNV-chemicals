import assert from "node:assert/strict";
import test from "node:test";

async function request(path = "/", init = {}, extraEnv = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html", ...(init.headers || {}) }, ...init }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) }, ...extraEnv },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

function createD1Mock(results = [], firstResult = { status: "new" }) {
  const executed = [];
  const prepare = sql => ({
    bind: (...args) => ({
      sql,
      args,
      async run() { executed.push({ sql, args }); return { success: true }; },
      async all() { executed.push({ sql, args }); return { results: typeof results === "function" ? results(sql, args) : results }; },
      async raw() { executed.push({ sql, args }); const rows = typeof results === "function" ? results(sql, args) : results; return rows.map(row => Array.isArray(row) ? row : Object.values(row)); },
      async first() { executed.push({ sql, args }); return typeof firstResult === "function" ? firstResult(sql, args) : firstResult; },
    }),
  });
  return {
    executed,
    db: {
      prepare,
      async batch(statements) {
        for (const statement of statements) await statement.run();
        return statements.map(() => ({ success: true }));
      },
    },
  };
}

test("redirects the root URL to the canonical English locale", async () => {
  const response = await request("/");
  assert.ok([307, 308].includes(response.status));
  assert.equal(new URL(response.headers.get("location"), "http://localhost").pathname, "/en");
});

test("keeps preview robots closed until explicit launch approval", async () => {
  const response = await request("/robots.txt");
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.match(body, /User-Agent:\s*\*/i);
  assert.match(body, /Disallow:\s*\//i);
  assert.doesNotMatch(body, /Sitemap:/i);
});

test("server-renders localized homepages with safe preview indexing", async () => {
  const english = await request("/en");
  assert.equal(english.status, 200);
  assert.match(english.headers.get("x-robots-tag") ?? "", /noindex/i);
  const enHtml = await english.text();
  assert.match(enHtml, /<html lang="en">/i);
  assert.match(enHtml, /Ink systems for packaging/i);
  assert.match(enHtml, /Choose by application/i);

  const chinese = await request("/zh");
  assert.equal(chinese.status, 200);
  const zhHtml = await chinese.text();
  assert.match(zhHtml, /<html lang="zh-CN">/i);
  assert.match(zhHtml, /为包装、纸张与标签印刷/i);
  assert.match(zhHtml, /按应用选型/i);
  assert.match(zhHtml, /aria-label="打开菜单"/i);
  assert.match(zhHtml, /跳到主要内容/i);
  assert.doesNotMatch(zhHtml, /C:\/Users\/|file:\/\//i);
});

test("preserves product context in the full inquiry form", async () => {
  const response = await request("/zh/request-quote?product=WB-FX%20Series");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /询价产品/i);
  assert.match(html, /name="productCode"[^>]*value="WB-FX Series"/i);
  assert.match(html, /<input(?=[^>]*name="privacyAccepted")(?=[^>]*required)[^>]*>/i);
  assert.match(html, /action="\/api\/inquiry"/i);
});

test("renders the searchable product catalog without inventing technical values", async () => {
  const response = await request("/en/products?q=flexographic");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Product finder/i);
  assert.match(html, /Search product name, series code or application/i);
  assert.match(html, /Technical data pending verification/i);
  assert.doesNotMatch(html, /CAS No\.|Purity:|ISO 9001/i);
});

test("searches products, applications and knowledge from one public route", async () => {
  const productResponse = await request("/en/search?q=WB-FX%20Series");
  assert.equal(productResponse.status, 200);
  const productHtml = await productResponse.text();
  assert.match(productHtml, /GLOBAL SEARCH/i);
  assert.match(productHtml, /Water-Based Flexographic Ink/i);
  assert.match(productHtml, /Product[\s\S]*WB-FX Series/i);
  assert.match(productHtml, /name="q"/i);

  const applicationResponse = await request("/zh/search?q=标签");
  assert.equal(applicationResponse.status, 200);
  const applicationHtml = await applicationResponse.text();
  assert.match(applicationHtml, /全站搜索/i);
  assert.match(applicationHtml, /标签与特种印刷/i);
  assert.match(applicationHtml, /应用路径/i);

  const knowledgeResponse = await request("/en/search?q=batch-specific%20results");
  assert.equal(knowledgeResponse.status, 200);
  assert.match(await knowledgeResponse.text(), /TDS, SDS and COA: What Industrial Buyers Need/i);
});

test("renders an honest assistant boundary and carries its brief into inquiry", async () => {
  const assistant = await request("/en/assistant");
  assert.equal(assistant.status, 200);
  const html = await assistant.text();
  assert.match(html, /SELECTION ASSISTANT/i);
  assert.match(html, /No invented product parameters/i);
  assert.match(html, /human verification/i);

  const inquiry = await request("/en/request-quote?brief=Water-based%20ink%20for%20corrugated%20board");
  assert.equal(inquiry.status, 200);
  assert.match(await inquiry.text(), /Water-based ink for corrugated board/i);
});

test("publishes a truthful company knowledge profile for GEO", async () => {
  const response = await request("/en/company-profile", {}, { SITE_URL: "https://example.com" });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /COMPANY KNOWLEDGE PROFILE/i);
  assert.match(html, /Public brand name/i);
  assert.match(html, /facility and production evidence pending/i);
  assert.match(html, /no verified certificates published/i);
  assert.match(html, /"@type":"Organization"/i);
  assert.doesNotMatch(html, /ISO 9001|Europe|Middle East|manufacturer since/i);
});

test("adds qualification context and truthful structured product properties", async () => {
  const response = await request("/en/products/printing-inks/water-based-flexographic-ink", {}, { SITE_URL: "https://example.com" });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Prepare a qualification-ready brief/i);
  assert.match(html, /Pending company and grade verification/i);
  assert.match(html, /additionalProperty/i);
  assert.match(html, /PropertyValue/i);
});

test("permanently redirects the PRD product shortcut to the canonical category route", async () => {
  const response = await request("/en/products/water-based-flexographic-ink");
  assert.equal(response.status, 308);
  assert.equal(new URL(response.headers.get("location"), "http://localhost").pathname, "/en/products/printing-inks/water-based-flexographic-ink");
});

test("renders the bilingual knowledge center and topic routes", async () => {
  const english = await request("/en/knowledge/application-guides");
  assert.equal(english.status, 200);
  const enHtml = await english.text();
  assert.match(enHtml, /Knowledge center/i);
  assert.match(enHtml, /How to Select Water-Based Flexographic Ink/i);
  assert.doesNotMatch(enHtml, /TDS, SDS and COA: What Industrial Buyers Need/i);

  const chinese = await request("/zh/knowledge/technical-guides");
  assert.equal(chinese.status, 200);
  const zhHtml = await chinese.text();
  assert.match(zhHtml, /知识中心/i);
  assert.match(zhHtml, /油墨样品评估清单/i);
});

test("publishes complete article content with internal links and SEO schema", async () => {
  const response = await request("/en/knowledge/how-to-select-water-based-flexo-ink", {}, { SITE_URL: "https://example.com" });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Begin with the substrate, not the color/i);
  assert.match(html, /Buyer checklist/i);
  assert.match(html, /Related products and application routes/i);
  assert.match(html, /FAQPage/i);
  assert.match(html, /BreadcrumbList/i);
  assert.match(html, /dateModified/i);
  assert.match(html, /\/en\/products\/printing-inks\/water-based-flexographic-ink/i);
});

test("renders localized article body and FAQ content", async () => {
  const response = await request("/zh/knowledge/tds-sds-coa-explained", {}, { SITE_URL: "https://example.com" });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /TDS：产品技术指导/i);
  assert.match(html, /采购检查清单/i);
  assert.match(html, /TDS 能否替代 SDS/i);
});

test("returns a real 404 for unknown localized routes", async () => {
  const response = await request("/zh/products/does-not-exist");
  assert.equal(response.status, 404);
  assert.match(response.headers.get("x-robots-tag") ?? "", /noindex/i);
});

test("requires durable storage before accepting an inquiry", async () => {
  const payload = { email: "buyer@example.com", area: "printing-inks", company: "Example", country: "CN", requirement: "Paper flexographic application", privacyAccepted: true, locale: "zh" };
  const response = await request("/api/inquiry", { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(payload) });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "Inquiry storage is not configured" });
});

test("stores an inquiry even when outbound notification is not configured", async () => {
  const { db, executed } = createD1Mock();
  const payload = { email: "buyer@example.com", area: "printing-inks", company: "Example", country: "CN", requirement: "Paper flexographic application", privacyAccepted: true, locale: "zh", sourcePath: "/zh/request-quote" };
  const response = await request("/api/inquiry", { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(payload) }, { DB: db });
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.notificationStatus, "not_configured");
  assert.match(body.inquiryId, /^[0-9a-f-]{36}$/i);
  assert.ok(executed.some(statement => statement.sql.includes("INSERT INTO inquiries")));
  assert.ok(executed.some(statement => statement.sql.includes("INSERT INTO inquiry_events")));
});

test("protects the inquiry workspace with identity and an explicit allowlist", async () => {
  const unauthenticated = await request("/api/admin/inquiries", { headers: { accept: "application/json" } });
  assert.equal(unauthenticated.status, 401);
  const forbidden = await request("/api/admin/inquiries", { headers: { accept: "application/json", "oai-authenticated-user-email": "user@example.com" } }, { ADMIN_EMAILS: "admin@example.com" });
  assert.equal(forbidden.status, 403);

  const { db } = createD1Mock([{ id: "inq-1", status: "new", company: "Example", email: "buyer@example.com", country: "CN" }]);
  const allowed = await request("/api/admin/inquiries", { headers: { accept: "application/json", "oai-authenticated-user-email": "admin@example.com" } }, { ADMIN_EMAILS: "admin@example.com", DB: db });
  assert.equal(allowed.status, 200);
  assert.equal((await allowed.json()).inquiries.length, 1);
});

test("renders the inquiry workspace as a private, non-indexable route", async () => {
  const response = await request("/en/admin/inquiries");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /From new lead to sales follow-up/i);
  assert.match(html, /name="robots" content="noindex, nofollow/i);
});

test("enforces verification and RBAC across CMS content writes", async () => {
  const product = { slug: "verified-product", code: "VP-01", category: "printing-inks", status: "published", verificationStatus: "verified", data: { nameEn: "Verified product", useEn: "Verified application statement", casNumber: "123-45-6", formula: "C7H8", molecularWeight: "92.14 g/mol", purity: "Verified grade", appearance: "Verified appearance", packagingEn: "Verified package", applications: ["Verified application"] } };
  const adminDb = createD1Mock();
  const published = await request("/api/admin/content/products", { method: "POST", headers: { accept: "application/json", "content-type": "application/json", "oai-authenticated-user-email": "admin@example.com" }, body: JSON.stringify(product) }, { ADMIN_EMAILS: "admin@example.com", DB: adminDb.db });
  assert.equal(published.status, 201);
  assert.ok(adminDb.executed.some(statement => statement.sql.includes("INSERT INTO cms_products")));
  assert.ok(adminDb.executed.some(statement => statement.sql.includes("INSERT INTO content_events")));
  const productInsert = adminDb.executed.find(statement => statement.sql.includes("INSERT INTO cms_products"));
  assert.ok(productInsert.args.some(value => typeof value === "string" && value.includes('"formula":"C7H8"') && value.includes('"packagingEn":"Verified package"')));

  const invalidCas = await request("/api/admin/content/products", { method: "POST", headers: { accept: "application/json", "content-type": "application/json", "oai-authenticated-user-email": "admin@example.com" }, body: JSON.stringify({ ...product, slug: "invalid-cas-product", data: { ...product.data, casNumber: "not-verified" } }) }, { ADMIN_EMAILS: "admin@example.com", DB: createD1Mock().db });
  assert.equal(invalidCas.status, 400);
  assert.deepEqual(await invalidCas.json(), { error: "CAS number must use the standard hyphenated format" });

  const applicationDb = createD1Mock();
  const application = await request("/api/admin/content/applications", { method: "POST", headers: { accept: "application/json", "content-type": "application/json", "oai-authenticated-user-email": "admin@example.com" }, body: JSON.stringify({ slug: "verified-application", status: "published", verificationStatus: "verified", data: { nameEn: "Verified application", introEn: "Verified application introduction", challenges: ["Verified buyer challenge"] } }) }, { ADMIN_EMAILS: "admin@example.com", DB: applicationDb.db });
  assert.equal(application.status, 201);
  assert.ok(applicationDb.executed.some(statement => statement.sql.includes("INSERT INTO cms_applications")));

  const categoryDb = createD1Mock();
  const category = await request("/api/admin/content/categories", { method: "POST", headers: { accept: "application/json", "content-type": "application/json", "oai-authenticated-user-email": "admin@example.com" }, body: JSON.stringify({ slug: "verified-category", status: "published", verificationStatus: "verified", data: { nameEn: "Verified category", descriptionEn: "Verified category description" } }) }, { ADMIN_EMAILS: "admin@example.com", DB: categoryDb.db });
  assert.equal(category.status, 201);
  assert.ok(categoryDb.executed.some(statement => statement.sql.includes("INSERT INTO cms_categories")));

  const profileDb = createD1Mock();
  const profile = await request("/api/admin/content/company-profiles", { method: "POST", headers: { accept: "application/json", "content-type": "application/json", "oai-authenticated-user-email": "admin@example.com" }, body: JSON.stringify({ slug: "tnv-chemicals", status: "published", verificationStatus: "verified", data: { legalNameEn: "Verified Legal Entity Ltd.", email: "verified@example.com", websiteUrl: "https://verified.example.com" } }) }, { ADMIN_EMAILS: "admin@example.com", DB: profileDb.db });
  assert.equal(profile.status, 201);
  assert.ok(profileDb.executed.some(statement => statement.sql.includes("INSERT INTO company_profiles")));
  const profileInsert = profileDb.executed.find(statement => statement.sql.includes("INSERT INTO company_profiles"));
  assert.ok(profileInsert.args.some(value => typeof value === "string" && value.includes('"legalNameEn":"Verified Legal Entity Ltd."') && value.includes('"email":"verified@example.com"')));

  const invalidProfile = await request("/api/admin/content/company-profiles", { method: "POST", headers: { accept: "application/json", "content-type": "application/json", "oai-authenticated-user-email": "admin@example.com" }, body: JSON.stringify({ slug: "tnv-chemicals", status: "published", verificationStatus: "verified", data: { legalNameEn: "Verified Legal Entity Ltd.", websiteUrl: "http://insecure.example.com" } }) }, { ADMIN_EMAILS: "admin@example.com", DB: createD1Mock().db });
  assert.equal(invalidProfile.status, 400);

  const nonCanonicalProfile = await request("/api/admin/content/company-profiles", { method: "POST", headers: { accept: "application/json", "content-type": "application/json", "oai-authenticated-user-email": "admin@example.com" }, body: JSON.stringify({ slug: "another-company", status: "draft", verificationStatus: "pending", data: { legalNameEn: "Pending legal entity" } }) }, { ADMIN_EMAILS: "admin@example.com", DB: createD1Mock().db });
  assert.equal(nonCanonicalProfile.status, 400);

  const unverified = await request("/api/admin/content/certificates", { method: "POST", headers: { accept: "application/json", "content-type": "application/json", "oai-authenticated-user-email": "admin@example.com" }, body: JSON.stringify({ slug: "pending-certificate", type: "ISO", status: "published", verificationStatus: "pending", data: { nameEn: "Pending certificate" } }) }, { ADMIN_EMAILS: "admin@example.com", DB: createD1Mock().db });
  assert.equal(unverified.status, 400);
  assert.deepEqual(await unverified.json(), { error: "Only verified content can be published" });

  const editorDb = createD1Mock([], { role: "editor", active: 1 });
  const editorPublish = await request("/api/admin/content/products", { method: "POST", headers: { accept: "application/json", "content-type": "application/json", "oai-authenticated-user-email": "editor@example.com" }, body: JSON.stringify(product) }, { DB: editorDb.db });
  assert.equal(editorPublish.status, 403);
  assert.deepEqual(await editorPublish.json(), { error: "Publishing permission required" });
});

test("supports independently reviewed translations for planned locales", async () => {
  const translation = { entityType: "product", entityId: "product-id", locale: "es", status: "published", verificationStatus: "verified", data: { name: "Producto verificado", use: "Uso verificado" } };
  const adminDb = createD1Mock();
  const created = await request("/api/admin/translations", { method: "POST", headers: { accept: "application/json", "content-type": "application/json", "oai-authenticated-user-email": "admin@example.com" }, body: JSON.stringify(translation) }, { ADMIN_EMAILS: "admin@example.com", DB: adminDb.db });
  assert.equal(created.status, 201);
  assert.ok(adminDb.executed.some(statement => statement.sql.includes("INSERT INTO content_translations")));
  assert.ok(adminDb.executed.some(statement => statement.sql.includes("INSERT INTO content_events")));

  const arabicDb = createD1Mock();
  const arabic = await request("/api/admin/translations", { method: "POST", headers: { accept: "application/json", "content-type": "application/json", "oai-authenticated-user-email": "admin@example.com" }, body: JSON.stringify({ entityType: "company_profile", entityId: "company-id", locale: "ar", status: "review", verificationStatus: "pending", data: { legalName: "Arabic review copy" } }) }, { ADMIN_EMAILS: "admin@example.com", DB: arabicDb.db });
  assert.equal(arabic.status, 201);
  assert.ok(arabicDb.executed.some(statement => statement.sql.includes("SELECT id FROM company_profiles")));

  const unverifiedPublish = await request("/api/admin/translations", { method: "POST", headers: { accept: "application/json", "content-type": "application/json", "oai-authenticated-user-email": "admin@example.com" }, body: JSON.stringify({ ...translation, locale: "ru", verificationStatus: "pending" }) }, { ADMIN_EMAILS: "admin@example.com", DB: createD1Mock().db });
  assert.equal(unverifiedPublish.status, 400);

  const editor = await request("/api/admin/translations", { method: "POST", headers: { accept: "application/json", "content-type": "application/json", "oai-authenticated-user-email": "editor@example.com" }, body: JSON.stringify(translation) }, { DB: createD1Mock([], { role: "editor", active: 1 }).db });
  assert.equal(editor.status, 403);
  assert.deepEqual(await editor.json(), { error: "Publishing permission required" });

  const unsupported = await request("/api/admin/translations", { method: "POST", headers: { accept: "application/json", "content-type": "application/json", "oai-authenticated-user-email": "admin@example.com" }, body: JSON.stringify({ ...translation, locale: "fr" }) }, { ADMIN_EMAILS: "admin@example.com", DB: createD1Mock().db });
  assert.equal(unsupported.status, 400);
});

test("records consented analytics without personal identity and protects reports", async () => {
  const disabled = await request("/api/analytics", { method: "POST", headers: { accept: "application/json", "content-type": "application/json" }, body: JSON.stringify({ eventType: "page_view", path: "/en", locale: "en" }) });
  assert.equal(disabled.status, 204);

  const eventDb = createD1Mock();
  const recorded = await request("/api/analytics", { method: "POST", headers: { accept: "application/json", "content-type": "application/json", origin: "http://localhost", "cf-ipcountry": "DE" }, body: JSON.stringify({ eventType: "search", path: "/en/search", locale: "en", query: "flexographic", referrer: "https://www.google.com/search?q=ink" }) }, { ANALYTICS_ENABLED: "true", DB: eventDb.db });
  assert.equal(recorded.status, 204);
  const insert = eventDb.executed.find(statement => statement.sql.includes("INSERT INTO analytics_events"));
  assert.ok(insert);
  assert.ok(insert.args.includes("DE"));
  assert.ok(insert.args.includes("www.google.com"));
  assert.equal(insert.args.some(value => typeof value === "string" && value.includes("@")), false);

  const unauthenticated = await request("/api/admin/analytics", { headers: { accept: "application/json" } }, { ANALYTICS_ENABLED: "true", DB: createD1Mock().db });
  assert.equal(unauthenticated.status, 401);
  const report = await request("/api/admin/analytics", { headers: { accept: "application/json", "oai-authenticated-user-email": "admin@example.com" } }, { ADMIN_EMAILS: "admin@example.com", ANALYTICS_ENABLED: "true", DB: createD1Mock([{ eventType: "page_view", count: 3 }]).db });
  assert.equal(report.status, 200);
  assert.equal((await report.json()).periodDays, 30);
});

test("keeps the AI recommendation endpoint unavailable until explicitly connected", async () => {
  const invalid = await request("/api/assistant/recommend", { method: "POST", headers: { accept: "application/json", "content-type": "application/json" }, body: JSON.stringify({ requirement: "short", locale: "en" }) });
  assert.equal(invalid.status, 400);
  const unconfigured = await request("/api/assistant/recommend", { method: "POST", headers: { accept: "application/json", "content-type": "application/json" }, body: JSON.stringify({ requirement: "Water-based ink for corrugated board at production speed", locale: "en" }) });
  assert.equal(unconfigured.status, 503);
  assert.deepEqual(await unconfigured.json(), { configured: false, status: "not_connected", message: "The recommendation service is reserved but not connected. Use the technical inquiry workflow for a reviewed response." });
});

test("protects SEO publishing and user administration by role", async () => {
  const seo = { path: "/products", locale: "en", status: "published", title: "Verified product catalog", description: "Verified product catalog metadata for industrial buyers.", keywords: ["printing inks"] };
  const adminSeo = await request("/api/admin/seo", { method: "POST", headers: { accept: "application/json", "content-type": "application/json", "oai-authenticated-user-email": "admin@example.com" }, body: JSON.stringify(seo) }, { ADMIN_EMAILS: "admin@example.com", DB: createD1Mock().db });
  assert.equal(adminSeo.status, 201);

  const editorSeo = await request("/api/admin/seo", { method: "POST", headers: { accept: "application/json", "content-type": "application/json", "oai-authenticated-user-email": "editor@example.com" }, body: JSON.stringify(seo) }, { DB: createD1Mock([], { role: "editor", active: 1 }).db });
  assert.equal(editorSeo.status, 403);

  const adminUser = await request("/api/admin/users", { method: "POST", headers: { accept: "application/json", "content-type": "application/json", "oai-authenticated-user-email": "admin@example.com" }, body: JSON.stringify({ email: "sales@example.com", role: "sales", active: true }) }, { ADMIN_EMAILS: "admin@example.com", DB: createD1Mock().db });
  assert.equal(adminUser.status, 201);
  const salesUser = await request("/api/admin/users", { headers: { accept: "application/json", "oai-authenticated-user-email": "sales@example.com" } }, { DB: createD1Mock([], { role: "sales", active: 1 }).db });
  assert.equal(salesUser.status, 403);
});

test("renders private CMS routes and truthful empty resource centers", async () => {
  const cms = await request("/en/admin/content");
  assert.equal(cms.status, 200);
  const cmsHtml = await cms.text();
  assert.match(cmsHtml, /Publish product and technical content through review/i);
  assert.match(cmsHtml, /Molecular weight — verified only/i);
  assert.match(cmsHtml, /Packaging — verified only/i);
  assert.match(cmsHtml, /<button type="button">categories<\/button>/i);
  assert.match(cmsHtml, /<button type="button">company-profiles<\/button>/i);
  assert.match(cmsHtml, /<button type="button">applications<\/button>/i);
  assert.match(cmsHtml, /Expansion-language review/i);
  assert.match(cmsHtml, /Spanish, Arabic and Russian versions/i);

  const seoWorkspace = await request("/en/admin/seo");
  const seoHtml = await seoWorkspace.text();
  assert.match(seoHtml, /Español/);
  assert.match(seoHtml, /العربية/);
  assert.match(cmsHtml, /name="robots" content="noindex, nofollow/i);

  const downloads = await request("/en/downloads");
  assert.equal(downloads.status, 200);
  const downloadsHtml = await downloads.text();
  assert.match(downloadsHtml, /Verified files organized for industrial buyers/i);
  assert.match(downloadsHtml, /company files pending/i);
});

test("redirects the legacy favicon path to the real SVG asset", async () => {
  const response = await request("/favicon.ico");
  assert.equal(response.status, 308);
  assert.equal(new URL(response.headers.get("location"), "http://localhost").pathname, "/favicon.svg");
});
