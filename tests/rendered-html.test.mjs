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

test("returns a real 404 for unknown localized routes", async () => {
  const response = await request("/zh/products/does-not-exist");
  assert.equal(response.status, 404);
  assert.match(response.headers.get("x-robots-tag") ?? "", /noindex/i);
});

test("keeps inquiry delivery honest until a webhook is configured", async () => {
  const payload = { email: "buyer@example.com", area: "printing-inks", company: "Example", country: "CN", requirement: "Paper flexographic application", privacyAccepted: true, locale: "zh" };
  const response = await request("/api/inquiry", { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify(payload) });
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "Inquiry delivery is not configured" });
});

test("redirects the legacy favicon path to the real SVG asset", async () => {
  const response = await request("/favicon.ico");
  assert.equal(response.status, 308);
  assert.equal(new URL(response.headers.get("location"), "http://localhost").pathname, "/favicon.svg");
});
