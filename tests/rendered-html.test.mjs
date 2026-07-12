import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the TNV homepage and primary buyer journey", async () => {
  const response = await render("/");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>TNV Chemicals \| Industrial Ink &amp; Chemical Solutions<\/title>/i);
  assert.match(html, /Industrial chemistry,/i);
  assert.match(html, /built around your process/i);
  assert.match(html, /Explore products/i);
  assert.match(html, /Start a technical inquiry/i);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("server-renders a product detail with real navigation and pending data markers", async () => {
  const response = await render("/products/printing-inks/water-based-flexographic-ink");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Water-Based Flexographic Ink/i);
  assert.match(html, /Request this product/i);
  assert.match(html, /Technical overview/i);
  assert.match(html, /To be verified by grade/i);
});
