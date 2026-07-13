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

function createD1Mock(results = []) {
  const executed = [];
  const prepare = sql => ({
    bind: (...args) => ({
      sql,
      args,
      async run() { executed.push({ sql, args }); return { success: true }; },
      async all() { executed.push({ sql, args }); return { results }; },
      async first() { executed.push({ sql, args }); return { status: "new" }; },
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

test("redirects the legacy favicon path to the real SVG asset", async () => {
  const response = await request("/favicon.ico");
  assert.equal(response.status, 308);
  assert.equal(new URL(response.headers.get("location"), "http://localhost").pathname, "/favicon.svg");
});
