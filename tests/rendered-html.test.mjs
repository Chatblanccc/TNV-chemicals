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
      async all() { executed.push({ sql, args }); return { results }; },
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

test("adds qualification context and truthful structured product properties", async () => {
  const response = await request("/en/products/printing-inks/water-based-flexographic-ink", {}, { SITE_URL: "https://example.com" });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Prepare a qualification-ready brief/i);
  assert.match(html, /Pending company and grade verification/i);
  assert.match(html, /additionalProperty/i);
  assert.match(html, /PropertyValue/i);
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
  const product = { slug: "verified-product", code: "VP-01", category: "printing-inks", status: "published", verificationStatus: "verified", data: { nameEn: "Verified product", useEn: "Verified application statement" } };
  const adminDb = createD1Mock();
  const published = await request("/api/admin/content/products", { method: "POST", headers: { accept: "application/json", "content-type": "application/json", "oai-authenticated-user-email": "admin@example.com" }, body: JSON.stringify(product) }, { ADMIN_EMAILS: "admin@example.com", DB: adminDb.db });
  assert.equal(published.status, 201);
  assert.ok(adminDb.executed.some(statement => statement.sql.includes("INSERT INTO cms_products")));
  assert.ok(adminDb.executed.some(statement => statement.sql.includes("INSERT INTO content_events")));

  const unverified = await request("/api/admin/content/certificates", { method: "POST", headers: { accept: "application/json", "content-type": "application/json", "oai-authenticated-user-email": "admin@example.com" }, body: JSON.stringify({ slug: "pending-certificate", type: "ISO", status: "published", verificationStatus: "pending", data: { nameEn: "Pending certificate" } }) }, { ADMIN_EMAILS: "admin@example.com", DB: createD1Mock().db });
  assert.equal(unverified.status, 400);
  assert.deepEqual(await unverified.json(), { error: "Only verified content can be published" });

  const editorDb = createD1Mock([], { role: "editor", active: 1 });
  const editorPublish = await request("/api/admin/content/products", { method: "POST", headers: { accept: "application/json", "content-type": "application/json", "oai-authenticated-user-email": "editor@example.com" }, body: JSON.stringify(product) }, { DB: editorDb.db });
  assert.equal(editorPublish.status, 403);
  assert.deepEqual(await editorPublish.json(), { error: "Publishing permission required" });
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
