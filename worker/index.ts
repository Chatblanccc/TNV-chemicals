/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { articleCoverMediaKeys } from "../app/media";
import { applications as seedApplications, articles as seedArticles, products as seedProducts, routePaths } from "../app/site-data";

interface Env {
  ASSETS: Fetcher;
  INQUIRY_WEBHOOK_URL?: string;
  INQUIRY_WEBHOOK_TOKEN?: string;
  ADMIN_EMAILS?: string;
  DEV_ADMIN_EMAIL?: string;
  ANALYTICS_ENABLED?: string;
  AI_ASSISTANT_ENDPOINT?: string;
  AI_ASSISTANT_TOKEN?: string;
  SITE_LAUNCH_READY?: string;
  DB: D1Database;
  DOCUMENTS?: R2Bucket;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

const inquiryStatuses = ["new", "contacted", "quotation_sent", "negotiation", "completed", "archived"] as const;
type InquiryStatus = typeof inquiryStatuses[number];

function storageError(error: unknown): Response {
  const message = error instanceof Error ? error.message : "Unknown storage error";
  const unavailable = message.includes("no such table") || message.includes("D1_ERROR");
  return Response.json({ error: unavailable ? "Persistent storage is not ready" : "Persistent storage failed" }, { status: 503 });
}

type AdminRole = "admin" | "marketing" | "sales" | "editor";
type AdminPermission = "inquiries:read" | "inquiries:write" | "content:read" | "content:write" | "content:publish" | "analytics:read" | "users:manage";
type AdminSession = { email: string; role: AdminRole };

const rolePermissions: Record<AdminRole, ReadonlySet<AdminPermission>> = {
  admin: new Set(["inquiries:read", "inquiries:write", "content:read", "content:write", "content:publish", "analytics:read", "users:manage"]),
  marketing: new Set(["inquiries:read", "content:read", "content:write", "content:publish", "analytics:read"]),
  sales: new Set(["inquiries:read", "inquiries:write", "content:read", "analytics:read"]),
  editor: new Set(["content:read", "content:write"]),
};

async function requireAdmin(request: Request, env: Env, permission: AdminPermission): Promise<Response | AdminSession> {
  const hostname = new URL(request.url).hostname;
  const localDevelopment = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  const email = (request.headers.get("oai-authenticated-user-email") || (localDevelopment ? env.DEV_ADMIN_EMAIL : ""))?.trim().toLowerCase();
  if (!email) return Response.json({ error: "Authentication required" }, { status: 401 });
  const allowed = new Set((env.ADMIN_EMAILS || "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean));
  let role: AdminRole | null = allowed.has(email) ? "admin" : null;
  if (!role && env.DB) {
    try {
      const user = await env.DB.prepare("SELECT role, active FROM admin_users WHERE email = ?").bind(email).first<{ role: AdminRole; active: number }>();
      if (user?.active) role = user.role;
    } catch {
      // Bootstrap allowlist remains available before the RBAC migration is applied.
    }
  }
  if (!role) return Response.json({ error: "Admin access is not configured for this account" }, { status: 403 });
  if (!rolePermissions[role].has(permission)) return Response.json({ error: "Insufficient admin permission" }, { status: 403 });
  return { email, role };
}

const securityPolicy = (analyticsEnabled: boolean) => [
  "default-src 'self'",
  "base-uri 'self'",
  `connect-src 'self'${analyticsEnabled ? " https://www.google-analytics.com https://region1.google-analytics.com" : ""}`,
  "font-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data:",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${analyticsEnabled ? " https://www.googletagmanager.com" : ""}`,
  "style-src 'self' 'unsafe-inline'",
].join("; ");

function withResponseHeaders(response: Response, request: Request, env: Env): Response {
  const url = new URL(request.url);
  const headers = new Headers(response.headers);
  headers.set("Content-Security-Policy", securityPolicy(env.ANALYTICS_ENABLED === "true"));
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  if (url.protocol === "https:") headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  if (env.SITE_LAUNCH_READY !== "true" && (response.status >= 400 || headers.get("content-type")?.includes("text/html"))) {
    headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  }
  if (url.pathname.endsWith(".webp")) headers.set("Content-Type", "image/webp");
  if (/^\/assets\/.*-[\w-]+\.(?:css|js)$/.test(url.pathname) || url.pathname.startsWith("/fonts/")) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  } else if (url.pathname.startsWith("/images/") || url.pathname === "/og.jpg" || url.pathname === "/favicon.svg") {
    headers.set("Cache-Control", "public, max-age=604800, stale-while-revalidate=2592000");
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

const maxDocumentBytes = 20 * 1024 * 1024;

function safeDocumentName(value: string) {
  const normalized = value.normalize("NFKC").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return (normalized || "document.pdf").slice(-120);
}

async function handleAdminDocumentUpload(request: Request, env: Env): Promise<Response> {
  const admin = await requireAdmin(request, env, "content:write");
  if (admin instanceof Response) return admin;
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
  if (!env.DOCUMENTS) return Response.json({ error: "Document storage is not configured" }, { status: 503 });
  let form: FormData;
  try { form = await request.formData(); } catch { return Response.json({ error: "A multipart PDF upload is required" }, { status: 400 }); }
  const entry = form.get("file");
  if (!(entry instanceof File) || entry.size === 0 || entry.size > maxDocumentBytes || entry.type !== "application/pdf" || !entry.name.toLowerCase().endsWith(".pdf")) {
    return Response.json({ error: "Upload one PDF file no larger than 20 MB" }, { status: 400 });
  }
  const bytes = await entry.arrayBuffer();
  const signature = new TextDecoder().decode(bytes.slice(0, 5));
  if (signature !== "%PDF-") return Response.json({ error: "The uploaded file is not a valid PDF" }, { status: 400 });
  const key = `${crypto.randomUUID()}.pdf`;
  const originalName = safeDocumentName(entry.name);
  try {
    await env.DOCUMENTS.put(key, bytes, {
      httpMetadata: { contentType: "application/pdf", contentDisposition: `inline; filename="${originalName}"` },
      customMetadata: { originalName, uploadedBy: admin.email },
    });
    return Response.json({ ok: true, fileUrl: `/documents/${key}`, originalName, size: entry.size }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Document upload failed" }, { status: 503 });
  }
}

async function handlePublicDocument(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET, HEAD" } });
  const pathname = new URL(request.url).pathname;
  const key = pathname.match(/^\/documents\/([0-9a-f-]+\.pdf)$/i)?.[1];
  if (!key) return new Response("Not found", { status: 404 });
  if (!env.DB || !env.DOCUMENTS) return new Response("Not found", { status: 404 });
  try {
    const published = await env.DB.prepare("SELECT id FROM downloads WHERE status = 'published' AND verification_status = 'verified' AND json_extract(data_json, '$.fileUrl') = ? UNION ALL SELECT id FROM certificates WHERE status = 'published' AND verification_status = 'verified' AND json_extract(data_json, '$.fileUrl') = ? LIMIT 1")
      .bind(pathname, pathname).first<{ id: string }>();
    if (!published) return new Response("Not found", { status: 404 });
    const object = await env.DOCUMENTS.get(key);
    if (!object) return new Response("Not found", { status: 404 });
    const headers = new Headers({ "Content-Type": "application/pdf", "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" });
    object.writeHttpMetadata(headers);
    headers.set("Content-Type", "application/pdf");
    headers.set("ETag", object.httpEtag);
    return new Response(request.method === "HEAD" ? null : object.body, { status: 200, headers });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

async function handleInquiry(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
  let input: Record<string, unknown>;
  try {
    if (request.headers.get("content-type")?.includes("application/json")) {
      input = await request.json() as Record<string, unknown>;
    } else {
      const form = await request.formData();
      input = Object.fromEntries(form.entries());
      input.privacyAccepted = form.get("privacyAccepted") === "on";
    }
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const text = (key: string) => typeof input[key] === "string" ? input[key].trim() : "";
  if (text("website")) return Response.json({ ok: true, inquiryId: crypto.randomUUID() });
  const required = ["email", "area", "company", "country", "quantity", "unit", "requirement", "privacyAccepted"];
  if (required.some(key => key === "privacyAccepted" ? input[key] !== true : !text(key))) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }
  const quantity = Number(text("quantity"));
  const acceptedUnits = ["kg", "metric-tonne", "litre", "other"];
  if (!/^\S+@\S+\.\S+$/.test(text("email")) || !Number.isFinite(quantity) || quantity <= 0 || !acceptedUnits.includes(text("unit")) || text("phone").length > 100 || text("requirement").length > 5000) {
    return Response.json({ error: "Invalid inquiry" }, { status: 400 });
  }
  const inquiryId = crypto.randomUUID();
  const customerId = crypto.randomUUID();
  const receivedAt = new Date().toISOString();
  const timestamp = Date.now();
  const notificationStatus = env.INQUIRY_WEBHOOK_URL ? "pending" : "not_configured";
  let finalNotificationStatus: "not_configured" | "pending" | "sent" | "failed" = notificationStatus;
  if (!env.DB) return Response.json({ error: "Inquiry storage is not configured" }, { status: 503 });
  try {
    await env.DB.prepare("INSERT INTO customers (id, email, company, country, phone, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET company = excluded.company, country = excluded.country, phone = excluded.phone, updated_at = excluded.updated_at")
      .bind(customerId, text("email").toLowerCase(), text("company"), text("country"), text("phone") || null, timestamp, timestamp).run();
    await env.DB.batch([
      env.DB.prepare("INSERT INTO inquiries (id, customer_id, status, area, product_code, quantity, unit, requirement, locale, notification_status, source_path, created_at, updated_at) VALUES (?, (SELECT id FROM customers WHERE email = ?), 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(inquiryId, text("email").toLowerCase(), text("area"), text("productCode") || null, text("quantity"), text("unit"), text("requirement"), text("locale") === "zh" ? "zh" : "en", notificationStatus, text("sourcePath") || null, timestamp, timestamp),
      env.DB.prepare("INSERT INTO inquiry_events (id, inquiry_id, event_type, to_status, created_at) VALUES (?, ?, 'created', 'new', ?)")
        .bind(crypto.randomUUID(), inquiryId, timestamp),
    ]);
  } catch (error) {
    return storageError(error);
  }

  if (env.ANALYTICS_ENABLED === "true") {
    try {
      await env.DB.prepare("INSERT INTO analytics_events (id, event_type, path, locale, country, query, product_code, referrer_host, created_at) VALUES (?, 'inquiry_submitted', ?, ?, ?, NULL, ?, NULL, ?)")
        .bind(crypto.randomUUID(), text("sourcePath") || "/request-quote", text("locale") === "zh" ? "zh" : "en", requestCountry(request), text("productCode") || null, timestamp).run();
    } catch {
      // Conversion reporting is optional and must never invalidate a stored inquiry.
    }
  }

  if (env.INQUIRY_WEBHOOK_URL) {
    let notification: "sent" | "failed" = "failed";
    try {
      const webhookUrl = new URL(env.INQUIRY_WEBHOOK_URL);
      if (webhookUrl.protocol !== "https:") throw new Error("Webhook must use HTTPS");
      const upstream = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(env.INQUIRY_WEBHOOK_TOKEN ? { Authorization: `Bearer ${env.INQUIRY_WEBHOOK_TOKEN}` } : {}) },
        body: JSON.stringify({ inquiryId, receivedAt, email: text("email"), area: text("area"), company: text("company"), country: text("country"), phone: text("phone") || undefined, quantity: text("quantity"), unit: text("unit"), requirement: text("requirement"), productCode: text("productCode") || undefined, locale: text("locale") || "en" }),
      });
      if (upstream.ok) notification = "sent";
    } catch {
      notification = "failed";
    }
    finalNotificationStatus = notification;
    try {
      await env.DB.batch([
        env.DB.prepare("UPDATE inquiries SET notification_status = ?, updated_at = ? WHERE id = ?").bind(notification, Date.now(), inquiryId),
        env.DB.prepare("INSERT INTO inquiry_events (id, inquiry_id, event_type, created_at) VALUES (?, ?, ?, ?)").bind(crypto.randomUUID(), inquiryId, notification === "sent" ? "notification_sent" : "notification_failed", Date.now()),
      ]);
    } catch {
      // The inquiry is already stored; notification bookkeeping must not erase a valid lead.
    }
  }
  return Response.json({ ok: true, inquiryId, notificationStatus: finalNotificationStatus }, { status: 201 });
}

const analyticsEventTypes = ["page_view", "search", "product_view", "document_download", "inquiry_submitted"] as const;
const analyticsLocales = ["en", "zh", "es", "ar", "ru"] as const;

function shortText(value: unknown, limit: number) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function requestCountry(request: Request) {
  const cloudflareCountry = (request as Request & { cf?: { country?: string } }).cf?.country;
  const value = request.headers.get("cf-ipcountry") || cloudflareCountry || "";
  return /^[A-Z]{2}$/.test(value) ? value : null;
}

async function handleAnalyticsEvent(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
  if (env.ANALYTICS_ENABLED !== "true") return new Response(null, { status: 204 });
  if (!env.DB) return Response.json({ error: "Analytics storage is not configured" }, { status: 503 });
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== new URL(request.url).host) return Response.json({ error: "Cross-origin analytics are not accepted" }, { status: 403 });
  let input: Record<string, unknown>;
  try { input = await request.json() as Record<string, unknown>; } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  const eventType = shortText(input.eventType, 40);
  const locale = shortText(input.locale, 5);
  const path = shortText(input.path, 500);
  if (!analyticsEventTypes.includes(eventType as typeof analyticsEventTypes[number]) || !analyticsLocales.includes(locale as typeof analyticsLocales[number]) || !path.startsWith("/") || path.startsWith("//")) return Response.json({ error: "Invalid analytics event" }, { status: 400 });
  let referrerHost: string | null = null;
  const referrer = shortText(input.referrer, 500);
  if (referrer) { try { referrerHost = new URL(referrer).host.slice(0, 255); } catch { referrerHost = null; } }
  try {
    await env.DB.prepare("INSERT INTO analytics_events (id, event_type, path, locale, country, query, product_code, referrer_host, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), eventType, path, locale, requestCountry(request), shortText(input.query, 200) || null, shortText(input.productCode, 120) || null, referrerHost, Date.now()).run();
    return new Response(null, { status: 204 });
  } catch (error) { return storageError(error); }
}

async function handleAdminAnalytics(request: Request, env: Env): Promise<Response> {
  const admin = await requireAdmin(request, env, "analytics:read");
  if (admin instanceof Response) return admin;
  if (request.method !== "GET") return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
  if (!env.DB) return Response.json({ error: "Analytics storage is not configured" }, { status: 503 });
  const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
  try {
    const [totals, countries, paths, searches, products] = await Promise.all([
      env.DB.prepare("SELECT event_type AS eventType, COUNT(*) AS count FROM analytics_events WHERE created_at >= ? GROUP BY event_type ORDER BY count DESC").bind(since).all(),
      env.DB.prepare("SELECT COALESCE(country, 'Unknown') AS label, COUNT(*) AS count FROM analytics_events WHERE created_at >= ? GROUP BY country ORDER BY count DESC LIMIT 12").bind(since).all(),
      env.DB.prepare("SELECT path AS label, COUNT(*) AS count FROM analytics_events WHERE created_at >= ? AND event_type = 'page_view' GROUP BY path ORDER BY count DESC LIMIT 12").bind(since).all(),
      env.DB.prepare("SELECT query AS label, COUNT(*) AS count FROM analytics_events WHERE created_at >= ? AND event_type = 'search' AND query IS NOT NULL GROUP BY query ORDER BY count DESC LIMIT 12").bind(since).all(),
      env.DB.prepare("SELECT product_code AS label, COUNT(*) AS count FROM analytics_events WHERE created_at >= ? AND product_code IS NOT NULL GROUP BY product_code ORDER BY count DESC LIMIT 12").bind(since).all(),
    ]);
    return Response.json({ enabled: env.ANALYTICS_ENABLED === "true", periodDays: 30, totals: totals.results, countries: countries.results, paths: paths.results, searches: searches.results, products: products.results });
  } catch (error) { return storageError(error); }
}

async function handleAssistant(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "POST" } });
  let input: Record<string, unknown>;
  try { input = await request.json() as Record<string, unknown>; } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  const requirement = shortText(input.requirement, 2000);
  const locale = shortText(input.locale, 5);
  if (requirement.length < 20 || !analyticsLocales.includes(locale as typeof analyticsLocales[number])) return Response.json({ error: "A sufficiently detailed requirement and supported locale are required" }, { status: 400 });
  if (!env.AI_ASSISTANT_ENDPOINT) return Response.json({ configured: false, status: "not_connected", message: "The recommendation service is reserved but not connected. Use the technical inquiry workflow for a reviewed response." }, { status: 503 });
  try {
    const endpoint = new URL(env.AI_ASSISTANT_ENDPOINT);
    if (endpoint.protocol !== "https:") throw new Error("Assistant endpoint must use HTTPS");
    const upstream = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", ...(env.AI_ASSISTANT_TOKEN ? { Authorization: `Bearer ${env.AI_ASSISTANT_TOKEN}` } : {}) }, body: JSON.stringify({ requirement, locale, context: shortText(input.context, 500) || undefined }) });
    if (!upstream.ok) throw new Error("Assistant service unavailable");
    const result = await upstream.json() as { summary?: unknown; productSlugs?: unknown; questions?: unknown };
    const summary = shortText(result.summary, 2000);
    const productSlugs = Array.isArray(result.productSlugs) ? result.productSlugs.filter(value => typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)).slice(0, 6) : [];
    const questions = Array.isArray(result.questions) ? result.questions.filter(value => typeof value === "string").map(value => value.slice(0, 300)).slice(0, 6) : [];
    if (!summary) throw new Error("Invalid assistant response");
    return Response.json({ configured: true, status: "review_required", summary, productSlugs, questions });
  } catch { return Response.json({ configured: true, status: "temporarily_unavailable", message: "The recommendation service could not respond. Submit a technical inquiry for human review." }, { status: 502 }); }
}

async function handleAdminInquiries(request: Request, env: Env): Promise<Response> {
  const admin = await requireAdmin(request, env, request.method === "PATCH" ? "inquiries:write" : "inquiries:read");
  if (admin instanceof Response) return admin;
  if (!env.DB) return Response.json({ error: "Inquiry storage is not configured" }, { status: 503 });
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/api\/admin\/inquiries\/([^/]+)$/);
  if (request.method === "GET" && !match) {
    const status = url.searchParams.get("status") || "";
    const query = url.searchParams.get("q")?.trim() || "";
    if (status && !inquiryStatuses.includes(status as InquiryStatus)) return Response.json({ error: "Invalid status" }, { status: 400 });
    const pattern = `%${query.replaceAll("%", "").replaceAll("_", "")}%`;
    try {
      const result = await env.DB.prepare("SELECT i.id, i.status, i.area, i.product_code AS productCode, i.quantity, i.unit, i.requirement, i.locale, i.notification_status AS notificationStatus, i.created_at AS createdAt, i.updated_at AS updatedAt, c.email, c.company, c.country, c.phone FROM inquiries i JOIN customers c ON c.id = i.customer_id WHERE (? = '' OR i.status = ?) AND (? = '' OR c.email LIKE ? OR c.company LIKE ? OR c.phone LIKE ? OR i.product_code LIKE ? OR i.requirement LIKE ?) ORDER BY i.created_at DESC LIMIT 100")
        .bind(status, status, query, pattern, pattern, pattern, pattern, pattern).all();
      return Response.json({ inquiries: result.results });
    } catch (error) {
      return storageError(error);
    }
  }
  if (request.method === "PATCH" && match) {
    let payload: { status?: string };
    try { payload = await request.json() as { status?: string }; } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
    if (!payload.status || !inquiryStatuses.includes(payload.status as InquiryStatus)) return Response.json({ error: "Invalid status" }, { status: 400 });
    try {
      const current = await env.DB.prepare("SELECT status FROM inquiries WHERE id = ?").bind(match[1]).first<{ status: string }>();
      if (!current) return Response.json({ error: "Inquiry not found" }, { status: 404 });
      const now = Date.now();
      await env.DB.batch([
        env.DB.prepare("UPDATE inquiries SET status = ?, updated_at = ? WHERE id = ?").bind(payload.status, now, match[1]),
        env.DB.prepare("INSERT INTO inquiry_events (id, inquiry_id, event_type, from_status, to_status, actor_email, created_at) VALUES (?, ?, 'status_changed', ?, ?, ?, ?)").bind(crypto.randomUUID(), match[1], current.status, payload.status, admin.email, now),
      ]);
      return Response.json({ ok: true, id: match[1], status: payload.status });
    } catch (error) {
      return storageError(error);
    }
  }
  return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: match ? "PATCH" : "GET" } });
}

const contentTypes = ["products", "categories", "company-profiles", "applications", "articles", "certificates", "downloads"] as const;
type ContentType = typeof contentTypes[number];
type ContentStatus = "draft" | "review" | "published" | "archived";
type VerificationStatus = "pending" | "verified" | "rejected";
type ContentInput = {
  slug?: string;
  code?: string;
  category?: string;
  type?: string;
  status?: ContentStatus;
  verificationStatus?: VerificationStatus;
  data?: Record<string, unknown>;
};

const contentConfig: Record<ContentType, { table: string; entity: "product" | "category" | "company_profile" | "application" | "article" | "certificate" | "download" }> = {
  products: { table: "cms_products", entity: "product" },
  categories: { table: "cms_categories", entity: "category" },
  "company-profiles": { table: "company_profiles", entity: "company_profile" },
  applications: { table: "cms_applications", entity: "application" },
  articles: { table: "cms_articles", entity: "article" },
  certificates: { table: "certificates", entity: "certificate" },
  downloads: { table: "downloads", entity: "download" },
};
const contentStatuses: ContentStatus[] = ["draft", "review", "published", "archived"];
const verificationStatuses: VerificationStatus[] = ["pending", "verified", "rejected"];
const downloadTypes = ["sds", "tds", "coa", "catalog", "certificate", "other"];
const productDocumentTypes = new Set(["sds", "tds", "coa"]);
const seedProductBySlug = new Map(seedProducts.map(product => [product.slug, product]));
const seedApplicationSlugs = new Set(seedApplications.map(application => application.slug));
const seedArticleBySlug = new Map(seedArticles.map(article => [article.slug, article]));
const publicStaticRoutes = new Set(routePaths.filter(path => path !== "/search" && path !== "/admin" && !path.startsWith("/admin/")));
const contentLocales = ["en", "zh", "es", "ar", "ru"] as const;
const activePublicLocales = new Set(["en", "zh"]);

function isSafeFileUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

function isSafeDocumentUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  if (/^\/documents\/[0-9a-f-]+\.pdf$/i.test(value)) return true;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function parseStoredJson(value: unknown): Record<string, unknown> {
  if (typeof value !== "string") return {};
  try { const parsed = JSON.parse(value); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {}; } catch { return {}; }
}

function normalizeContentRows(rows: Array<Record<string, unknown>>) {
  return rows.map(row => ({ ...row, data: parseStoredJson(row.dataJson), dataJson: undefined }));
}

function validateContentInput(type: ContentType, input: ContentInput): string | null {
  if (!input.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) return "Use a lowercase, hyphenated slug";
  if (!input.status || !contentStatuses.includes(input.status)) return "Invalid content status";
  if (!input.verificationStatus || !verificationStatuses.includes(input.verificationStatus)) return "Invalid verification status";
  if (!input.data || typeof input.data !== "object" || Array.isArray(input.data)) return "Content data is required";
  if (input.status === "published" && input.verificationStatus !== "verified") return "Only verified content can be published";
  if (type === "products" && (!input.code?.trim() || !input.category?.trim() || typeof input.data.nameEn !== "string" || typeof input.data.useEn !== "string")) return "Product code, category, English name and use are required";
  if (type === "products" && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.category || "")) return "Product category must use a lowercase, hyphenated slug";
  if (type === "products" && typeof input.data.casNumber === "string" && input.data.casNumber && !/^[0-9]{2,7}-[0-9]{2}-[0-9]$/.test(input.data.casNumber)) return "CAS number must use the standard hyphenated format";
  if (type === "products" && [input.data.moqEn, input.data.moqZh].some(value => value !== undefined && (typeof value !== "string" || value.length > 300))) return "MOQ values must be short verified text";
  if (type === "categories" && typeof input.data.nameEn !== "string") return "Category English name is required";
  if (type === "company-profiles" && input.slug !== "tnv-chemicals") return "The governed company profile must use the canonical tnv-chemicals slug";
  if (type === "company-profiles" && typeof input.data.legalNameEn !== "string") return "Verified English legal entity name is required";
  if (type === "company-profiles" && typeof input.data.email === "string" && input.data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.data.email)) return "Use a valid verified contact email";
  if (type === "company-profiles" && typeof input.data.websiteUrl === "string" && input.data.websiteUrl && !isSafeFileUrl(input.data.websiteUrl)) return "The verified website URL must use HTTPS";
  if (type === "applications" && (typeof input.data.nameEn !== "string" || typeof input.data.introEn !== "string")) return "Application English name and introduction are required";
  if (type === "applications" && input.data.relatedProducts !== undefined && (!Array.isArray(input.data.relatedProducts) || input.data.relatedProducts.length > 50 || input.data.relatedProducts.some(value => typeof value !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)))) return "Related products must be a list of valid product slugs";
  if (type === "articles" && (!input.category?.trim() || typeof input.data.titleEn !== "string" || typeof input.data.summaryEn !== "string")) return "Article category, English title and summary are required";
  if (type === "articles" && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.category || "")) return "Article category must use a lowercase, hyphenated slug";
  if (type === "articles" && input.data.relatedProducts !== undefined && (!Array.isArray(input.data.relatedProducts) || input.data.relatedProducts.length > 50 || input.data.relatedProducts.some(value => typeof value !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)))) return "Related products must be a list of valid product slugs";
  if (type === "articles" && input.data.relatedApplications !== undefined && (!Array.isArray(input.data.relatedApplications) || input.data.relatedApplications.length > 50 || input.data.relatedApplications.some(value => typeof value !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)))) return "Related applications must be a list of valid application slugs";
  if (type === "articles" && typeof input.data.publishDate === "string" && input.data.publishDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.data.publishDate)) return "Publication date must use YYYY-MM-DD";
  if (type === "articles" && typeof input.data.coverMediaKey === "string" && input.data.coverMediaKey && !articleCoverMediaKeys.includes(input.data.coverMediaKey as typeof articleCoverMediaKeys[number])) return "Article cover must reference a registered media key";
  if (type === "certificates" && (!input.type?.trim() || typeof input.data.nameEn !== "string" || !input.data.nameEn.trim())) return "Certificate type and English name are required";
  if (type === "certificates" && input.data.issuedDate !== undefined && input.data.issuedDate !== "" && !isIsoDate(input.data.issuedDate)) return "Certificate issue date must be a valid YYYY-MM-DD date";
  if (type === "certificates" && input.data.expiresDate !== undefined && input.data.expiresDate !== "" && !isIsoDate(input.data.expiresDate)) return "Certificate expiry date must be a valid YYYY-MM-DD date";
  if (type === "certificates" && input.data.issuedDate && input.data.expiresDate && String(input.data.expiresDate) < String(input.data.issuedDate)) return "Certificate expiry date cannot be before its issue date";
  if (type === "certificates" && input.status === "published" && !isIsoDate(input.data.issuedDate)) return "A verified issue date is required before publishing a certificate";
  if (type === "certificates" && input.status === "published" && String(input.data.issuedDate) > new Date().toISOString().slice(0, 10)) return "Certificate issue date cannot be in the future";
  if (type === "downloads" && (!input.type || !downloadTypes.includes(input.type) || typeof input.data.nameEn !== "string" || !input.data.nameEn.trim())) return "Download type and English name are required";
  if (type === "downloads" && (typeof input.data.locale !== "string" || !contentLocales.includes(input.data.locale as typeof contentLocales[number]))) return "Document language must use a supported content locale";
  if (type === "downloads" && input.data.productSlug !== undefined && input.data.productSlug !== "" && (typeof input.data.productSlug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.data.productSlug))) return "Product link must use a valid product slug";
  if (type === "downloads" && input.status === "published" && productDocumentTypes.has(input.type || "") && !input.data.productSlug) return "Published TDS, SDS and COA files must link to a product";
  if ((type === "certificates" || type === "downloads") && input.status === "published" && !isSafeDocumentUrl(input.data.fileUrl)) return "A verified HTTPS or uploaded PDF URL is required before publication";
  return null;
}

function normalizedContentData(type: ContentType, data: Record<string, unknown>) {
  const normalized = { ...data };
  if (type === "applications" || type === "articles") {
    if (Array.isArray(data.relatedProducts)) normalized.relatedProducts = Array.from(new Set(data.relatedProducts));
  }
  if (type === "articles" && Array.isArray(data.relatedApplications)) normalized.relatedApplications = Array.from(new Set(data.relatedApplications));
  return normalized;
}

type ManagedRouteRow = { id: string; slug: string; status: ContentStatus; verificationStatus: VerificationStatus; category?: string };

async function cmsOwnsSeedLifecycle(entityType: "product" | "application" | "article", row: ManagedRouteRow, env: Env) {
  if (row.status === "archived") return true;
  const event = await env.DB.prepare("SELECT id FROM content_events WHERE entity_type = ? AND entity_id = ? AND action IN ('published', 'unpublished', 'archived') LIMIT 1").bind(entityType, row.id).first<{ id: string }>();
  return Boolean(event);
}

async function resolvePublicProduct(productSlug: string, env: Env): Promise<{ category: string } | null> {
  const seed = seedProductBySlug.get(productSlug);
  const row = await env.DB.prepare("SELECT id, slug, category, status, verification_status AS verificationStatus FROM cms_products WHERE slug = ? LIMIT 1").bind(productSlug).first<ManagedRouteRow>();
  if (row?.status === "published" && row.verificationStatus === "verified" && row.category) return { category: row.category };
  if (seed && (!row || !await cmsOwnsSeedLifecycle("product", row, env))) return { category: seed.category };
  return null;
}

async function isPublicApplication(applicationSlug: string, env: Env) {
  const row = await env.DB.prepare("SELECT id, slug, status, verification_status AS verificationStatus FROM cms_applications WHERE slug = ? LIMIT 1").bind(applicationSlug).first<ManagedRouteRow>();
  if (row?.status === "published" && row.verificationStatus === "verified") return true;
  return seedApplicationSlugs.has(applicationSlug) && (!row || !await cmsOwnsSeedLifecycle("application", row, env));
}

async function validatePublishedContentRelationships(type: ContentType, input: ContentInput, env: Env): Promise<string | null> {
  if (input.status !== "published" || !input.data) return null;
  const relatedProducts = (type === "applications" || type === "articles") && Array.isArray(input.data.relatedProducts) ? Array.from(new Set(input.data.relatedProducts as string[])) : [];
  const unavailableProducts = (await Promise.all(relatedProducts.map(async slug => [slug, await resolvePublicProduct(slug, env)] as const))).filter(([, product]) => !product).map(([slug]) => slug);
  if (unavailableProducts.length) return `Related products must be published and verified before this content can be published: ${unavailableProducts.join(", ")}`;
  const relatedApplications = type === "articles" && Array.isArray(input.data.relatedApplications) ? Array.from(new Set(input.data.relatedApplications as string[])) : [];
  const unavailableApplications = (await Promise.all(relatedApplications.map(async slug => [slug, await isPublicApplication(slug, env)] as const))).filter(([, application]) => !application).map(([slug]) => slug);
  if (unavailableApplications.length) return `Related applications must be published and verified before this article can be published: ${unavailableApplications.join(", ")}`;
  return null;
}

async function resolvePublicArticle(articleSlug: string, env: Env): Promise<{ category: string } | null> {
  const seed = seedArticleBySlug.get(articleSlug);
  const row = await env.DB.prepare("SELECT id, slug, category, status, verification_status AS verificationStatus FROM cms_articles WHERE slug = ? LIMIT 1").bind(articleSlug).first<ManagedRouteRow>();
  if (row?.status === "published" && row.verificationStatus === "verified" && row.category) return { category: row.category };
  if (seed && (!row || !await cmsOwnsSeedLifecycle("article", row, env))) return { category: seed.category };
  return null;
}

async function isPublicSeoPath(path: string, env: Env) {
  if (publicStaticRoutes.has(path)) return true;
  const productMatch = path.match(/^\/products\/([^/]+)\/([^/]+)$/);
  if (productMatch) return (await resolvePublicProduct(productMatch[2], env))?.category === productMatch[1];
  const applicationMatch = path.match(/^\/applications\/([^/]+)$/);
  if (applicationMatch) return isPublicApplication(applicationMatch[1], env);
  const articleMatch = path.match(/^\/(?:knowledge|insights)\/([^/]+)$/);
  if (!articleMatch) return false;
  const directArticle = await resolvePublicArticle(articleMatch[1], env);
  if (directArticle) return true;
  if (!path.startsWith("/knowledge/")) return false;
  for (const article of seedArticles) {
    if ((await resolvePublicArticle(article.slug, env))?.category === articleMatch[1]) return true;
  }
  const publishedCategory = await env.DB.prepare("SELECT id FROM cms_articles WHERE category = ? AND status = 'published' AND verification_status = 'verified' LIMIT 1").bind(articleMatch[1]).first<{ id: string }>();
  return Boolean(publishedCategory);
}

async function validatePublishedDownloadRelationship(input: ContentInput, env: Env, recordId?: string): Promise<string | null> {
  if (input.status !== "published" || !input.data || typeof input.data.productSlug !== "string" || !input.data.productSlug) return null;
  const productSlug = input.data.productSlug;
  if (!await resolvePublicProduct(productSlug, env)) return "Linked product must be published and verified before its document can be published";
  if (productDocumentTypes.has(input.type || "")) {
    const duplicate = await env.DB.prepare("SELECT id FROM downloads WHERE status = 'published' AND verification_status = 'verified' AND type = ? AND product_slug = ? AND locale = ? AND (? = '' OR id <> ?) LIMIT 1")
      .bind(input.type, productSlug, input.data.locale, recordId || "", recordId || "").first<{ id: string }>();
    if (duplicate) return "Archive the current product document before publishing a replacement for the same type and language";
  }
  return null;
}

function contentWriteError(error: unknown): Response {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("downloads_current_product_document_unique") || (message.includes("downloads.type") && message.includes("downloads.product_slug") && message.includes("downloads.locale"))) {
    return Response.json({ error: "Archive the current product document before publishing a replacement for the same type and language" }, { status: 409 });
  }
  if (message.includes("seo_metadata_path_locale_unique") || (message.includes("seo_metadata.path") && message.includes("seo_metadata.locale"))) return Response.json({ error: "SEO metadata already exists for that canonical path and language" }, { status: 409 });
  if (message.toLowerCase().includes("unique")) return Response.json({ error: "That slug is already in use" }, { status: 409 });
  return storageError(error);
}

async function handleAdminContent(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/api\/admin\/content\/([^/]+)(?:\/([^/]+))?$/);
  const type = match?.[1] as ContentType | undefined;
  const recordId = match?.[2];
  if (!type || !contentTypes.includes(type)) return Response.json({ error: "Unknown content type" }, { status: 404 });
  const requiredPermission: AdminPermission = request.method === "GET" ? "content:read" : "content:write";
  const admin = await requireAdmin(request, env, requiredPermission);
  if (admin instanceof Response) return admin;
  if (!env.DB) return Response.json({ error: "Content storage is not configured" }, { status: 503 });
  const config = contentConfig[type];

  if (request.method === "GET" && !recordId) {
    const status = url.searchParams.get("status") || "";
    if (status && !contentStatuses.includes(status as ContentStatus)) return Response.json({ error: "Invalid content status" }, { status: 400 });
    const extra = type === "products" ? ", code, category" : type === "articles" ? ", category" : type === "applications" || type === "categories" || type === "company-profiles" ? "" : ", type";
    try {
      const result = await env.DB.prepare(`SELECT id, slug, status, verification_status AS verificationStatus, data_json AS dataJson, updated_by AS updatedBy, published_at AS publishedAt, created_at AS createdAt, updated_at AS updatedAt${extra} FROM ${config.table} WHERE (? = '' OR status = ?) ORDER BY updated_at DESC LIMIT 200`).bind(status, status).all<Record<string, unknown>>();
      return Response.json({ type, records: normalizeContentRows(result.results) });
    } catch (error) { return storageError(error); }
  }

  if (request.method === "POST" && !recordId) {
    let input: ContentInput;
    try { input = await request.json() as ContentInput; } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
    const error = validateContentInput(type, input);
    if (error) return Response.json({ error }, { status: 400 });
    if (input.status === "published" && !rolePermissions[admin.role].has("content:publish")) return Response.json({ error: "Publishing permission required" }, { status: 403 });
    if (type === "downloads") {
      try {
        const relationshipError = await validatePublishedDownloadRelationship(input, env);
        if (relationshipError) return Response.json({ error: relationshipError }, { status: 400 });
      } catch (relationshipError) { return storageError(relationshipError); }
    }
    if (type === "applications" || type === "articles") {
      try {
        const relationshipError = await validatePublishedContentRelationships(type, input, env);
        if (relationshipError) return Response.json({ error: relationshipError }, { status: 400 });
      } catch (relationshipError) { return storageError(relationshipError); }
    }
    const id = crypto.randomUUID();
    const now = Date.now();
    const publishedAt = input.status === "published" ? now : null;
    const dataJson = JSON.stringify(normalizedContentData(type, input.data!));
    const eventAction = input.status === "published" ? "published" : "created";
    const insert = type === "products"
      ? env.DB.prepare("INSERT INTO cms_products (id, slug, code, category, status, verification_status, data_json, updated_by, published_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, input.slug, input.code!.trim(), input.category!.trim(), input.status, input.verificationStatus, dataJson, admin.email, publishedAt, now, now)
      : type === "categories"
        ? env.DB.prepare("INSERT INTO cms_categories (id, slug, status, verification_status, data_json, updated_by, published_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, input.slug, input.status, input.verificationStatus, dataJson, admin.email, publishedAt, now, now)
        : type === "company-profiles"
          ? env.DB.prepare("INSERT INTO company_profiles (id, slug, status, verification_status, data_json, updated_by, published_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, input.slug, input.status, input.verificationStatus, dataJson, admin.email, publishedAt, now, now)
        : type === "applications"
          ? env.DB.prepare("INSERT INTO cms_applications (id, slug, status, verification_status, data_json, updated_by, published_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, input.slug, input.status, input.verificationStatus, dataJson, admin.email, publishedAt, now, now)
          : type === "articles"
          ? env.DB.prepare("INSERT INTO cms_articles (id, slug, category, status, verification_status, data_json, updated_by, published_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, input.slug, input.category!.trim(), input.status, input.verificationStatus, dataJson, admin.email, publishedAt, now, now)
          : type === "certificates"
            ? env.DB.prepare("INSERT INTO certificates (id, slug, type, status, verification_status, data_json, updated_by, published_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, input.slug, input.type!.trim(), input.status, input.verificationStatus, dataJson, admin.email, publishedAt, now, now)
            : env.DB.prepare("INSERT INTO downloads (id, slug, type, status, verification_status, data_json, product_slug, locale, updated_by, published_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, input.slug, input.type, input.status, input.verificationStatus, dataJson, input.data!.productSlug || null, input.data!.locale, admin.email, publishedAt, now, now);
    try {
      await env.DB.batch([insert, env.DB.prepare("INSERT INTO content_events (id, entity_type, entity_id, action, actor_email, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), config.entity, id, eventAction, admin.email, now)]);
      return Response.json({ ok: true, id, status: input.status }, { status: 201 });
    } catch (writeError) { return contentWriteError(writeError); }
  }

  if (request.method === "PATCH" && recordId) {
    let input: ContentInput;
    try { input = await request.json() as ContentInput; } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
    const error = validateContentInput(type, input);
    if (error) return Response.json({ error }, { status: 400 });
    if (input.status === "published" && !rolePermissions[admin.role].has("content:publish")) return Response.json({ error: "Publishing permission required" }, { status: 403 });
    try {
      const currentColumns = type === "products" ? "slug, status, category" : "slug, status";
      const current = await env.DB.prepare(`SELECT ${currentColumns} FROM ${config.table} WHERE id = ?`).bind(recordId).first<{ slug: string; status: ContentStatus; category?: string }>();
      if (!current) return Response.json({ error: "Content record not found" }, { status: 404 });
      if (current.slug !== input.slug) return Response.json({ error: "Published route slugs are immutable; create a new record and configure a redirect before changing a public URL" }, { status: 400 });
      if (type === "products" && current.category !== input.category) return Response.json({ error: "Product route categories are immutable; create a governed redirect before changing the canonical product URL" }, { status: 400 });
      if (type === "downloads") {
        const relationshipError = await validatePublishedDownloadRelationship(input, env, recordId);
        if (relationshipError) return Response.json({ error: relationshipError }, { status: 400 });
      }
      if (type === "applications" || type === "articles") {
        const relationshipError = await validatePublishedContentRelationships(type, input, env);
        if (relationshipError) return Response.json({ error: relationshipError }, { status: 400 });
      }
      const now = Date.now();
      const publishedAt = input.status === "published" ? now : null;
      const dataJson = JSON.stringify(normalizedContentData(type, input.data!));
      const update = type === "products"
        ? env.DB.prepare("UPDATE cms_products SET slug = ?, code = ?, category = ?, status = ?, verification_status = ?, data_json = ?, updated_by = ?, published_at = ?, updated_at = ? WHERE id = ?").bind(input.slug, input.code!.trim(), input.category!.trim(), input.status, input.verificationStatus, dataJson, admin.email, publishedAt, now, recordId)
        : type === "categories"
          ? env.DB.prepare("UPDATE cms_categories SET slug = ?, status = ?, verification_status = ?, data_json = ?, updated_by = ?, published_at = ?, updated_at = ? WHERE id = ?").bind(input.slug, input.status, input.verificationStatus, dataJson, admin.email, publishedAt, now, recordId)
          : type === "company-profiles"
            ? env.DB.prepare("UPDATE company_profiles SET slug = ?, status = ?, verification_status = ?, data_json = ?, updated_by = ?, published_at = ?, updated_at = ? WHERE id = ?").bind(input.slug, input.status, input.verificationStatus, dataJson, admin.email, publishedAt, now, recordId)
          : type === "applications"
            ? env.DB.prepare("UPDATE cms_applications SET slug = ?, status = ?, verification_status = ?, data_json = ?, updated_by = ?, published_at = ?, updated_at = ? WHERE id = ?").bind(input.slug, input.status, input.verificationStatus, dataJson, admin.email, publishedAt, now, recordId)
            : type === "articles"
            ? env.DB.prepare("UPDATE cms_articles SET slug = ?, category = ?, status = ?, verification_status = ?, data_json = ?, updated_by = ?, published_at = ?, updated_at = ? WHERE id = ?").bind(input.slug, input.category!.trim(), input.status, input.verificationStatus, dataJson, admin.email, publishedAt, now, recordId)
            : type === "certificates"
              ? env.DB.prepare("UPDATE certificates SET slug = ?, type = ?, status = ?, verification_status = ?, data_json = ?, updated_by = ?, published_at = ?, updated_at = ? WHERE id = ?").bind(input.slug, input.type!.trim(), input.status, input.verificationStatus, dataJson, admin.email, publishedAt, now, recordId)
              : env.DB.prepare("UPDATE downloads SET slug = ?, type = ?, status = ?, verification_status = ?, data_json = ?, product_slug = ?, locale = ?, updated_by = ?, published_at = ?, updated_at = ? WHERE id = ?").bind(input.slug, input.type, input.status, input.verificationStatus, dataJson, input.data!.productSlug || null, input.data!.locale, admin.email, publishedAt, now, recordId);
      const action = input.status === "published" && current.status !== "published" ? "published" : input.status === "archived" ? "archived" : current.status === "published" && input.status !== "published" ? "unpublished" : "updated";
      await env.DB.batch([update, env.DB.prepare("INSERT INTO content_events (id, entity_type, entity_id, action, actor_email, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), config.entity, recordId, action, admin.email, now)]);
      return Response.json({ ok: true, id: recordId, status: input.status });
    } catch (writeError) { return contentWriteError(writeError); }
  }

  if (request.method === "DELETE" && recordId) {
    try {
      const current = await env.DB.prepare(`SELECT id FROM ${config.table} WHERE id = ?`).bind(recordId).first();
      if (!current) return Response.json({ error: "Content record not found" }, { status: 404 });
      const now = Date.now();
      const result = await env.DB.batch([
        env.DB.prepare(`UPDATE ${config.table} SET status = 'archived', published_at = NULL, updated_by = ?, updated_at = ? WHERE id = ?`).bind(admin.email, now, recordId),
        env.DB.prepare("INSERT INTO content_events (id, entity_type, entity_id, action, actor_email, created_at) VALUES (?, ?, ?, 'archived', ?, ?)").bind(crypto.randomUUID(), config.entity, recordId, admin.email, now),
      ]);
      return Response.json({ ok: true, id: recordId, status: "archived", result: result[0].success });
    } catch (writeError) { return contentWriteError(writeError); }
  }

  return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: recordId ? "PATCH, DELETE" : "GET, POST" } });
}

type TranslationInput = { entityType?: "product" | "category" | "company_profile" | "application" | "article" | "certificate" | "download"; entityId?: string; locale?: typeof contentLocales[number]; status?: ContentStatus; verificationStatus?: VerificationStatus; data?: Record<string, unknown> };

async function handleAdminTranslations(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/api\/admin\/translations\/([^/]+)$/);
  const recordId = match?.[1];
  const admin = await requireAdmin(request, env, request.method === "GET" ? "content:read" : "content:write");
  if (admin instanceof Response) return admin;
  if (!env.DB) return Response.json({ error: "Content storage is not configured" }, { status: 503 });
  if (request.method === "GET" && !recordId) {
    const entityType = url.searchParams.get("entityType") || "";
    const entityId = url.searchParams.get("entityId") || "";
    if (entityType && !["product", "category", "company_profile", "application", "article", "certificate", "download"].includes(entityType)) return Response.json({ error: "Invalid entity type" }, { status: 400 });
    try {
      const result = await env.DB.prepare("SELECT id, entity_type AS entityType, entity_id AS entityId, locale, status, verification_status AS verificationStatus, data_json AS dataJson, updated_by AS updatedBy, published_at AS publishedAt, updated_at AS updatedAt FROM content_translations WHERE (? = '' OR entity_type = ?) AND (? = '' OR entity_id = ?) ORDER BY entity_type, entity_id, locale").bind(entityType, entityType, entityId, entityId).all<Record<string, unknown>>();
      return Response.json({ records: normalizeContentRows(result.results) });
    } catch (error) { return storageError(error); }
  }
  if ((request.method === "POST" && !recordId) || (request.method === "PATCH" && recordId)) {
    let input: TranslationInput;
    try { input = await request.json() as TranslationInput; } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
    if (!input.entityType || !["product", "category", "company_profile", "application", "article", "certificate", "download"].includes(input.entityType) || !input.entityId || !input.locale || !contentLocales.includes(input.locale) || !input.status || !contentStatuses.includes(input.status) || !input.verificationStatus || !verificationStatuses.includes(input.verificationStatus) || !input.data || Array.isArray(input.data)) return Response.json({ error: "A valid entity, locale, state and translation payload are required" }, { status: 400 });
    if (input.status === "published" && input.verificationStatus !== "verified") return Response.json({ error: "Only verified translations can be published" }, { status: 400 });
    if (input.status === "published" && !rolePermissions[admin.role].has("content:publish")) return Response.json({ error: "Publishing permission required" }, { status: 403 });
    const entityConfig = Object.values(contentConfig).find(config => config.entity === input.entityType)!;
    try {
      const parent = await env.DB.prepare(`SELECT id FROM ${entityConfig.table} WHERE id = ?`).bind(input.entityId).first();
      if (!parent) return Response.json({ error: "Parent content not found" }, { status: 404 });
      if (recordId) {
        const existing = await env.DB.prepare("SELECT id FROM content_translations WHERE id = ?").bind(recordId).first();
        if (!existing) return Response.json({ error: "Translation not found" }, { status: 404 });
      }
      const id = recordId || crypto.randomUUID();
      const now = Date.now();
      const statement = recordId
        ? env.DB.prepare("UPDATE content_translations SET entity_type = ?, entity_id = ?, locale = ?, status = ?, verification_status = ?, data_json = ?, updated_by = ?, published_at = ?, updated_at = ? WHERE id = ?").bind(input.entityType, input.entityId, input.locale, input.status, input.verificationStatus, JSON.stringify(input.data), admin.email, input.status === "published" ? now : null, now, id)
        : env.DB.prepare("INSERT INTO content_translations (id, entity_type, entity_id, locale, status, verification_status, data_json, updated_by, published_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, input.entityType, input.entityId, input.locale, input.status, input.verificationStatus, JSON.stringify(input.data), admin.email, input.status === "published" ? now : null, now, now);
      await env.DB.batch([statement, env.DB.prepare("INSERT INTO content_events (id, entity_type, entity_id, action, actor_email, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(crypto.randomUUID(), input.entityType, id, input.status === "published" ? "published" : recordId ? "updated" : "created", admin.email, now)]);
      return Response.json({ ok: true, id, locale: input.locale, status: input.status }, { status: recordId ? 200 : 201 });
    } catch (error) { return contentWriteError(error); }
  }
  return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: recordId ? "PATCH" : "GET, POST" } });
}

type SeoInput = { path?: string; locale?: typeof contentLocales[number]; status?: "draft" | "published"; title?: string; description?: string; keywords?: string[] };

function validateSeoInput(input: SeoInput): string | null {
  if (!input.path || !/^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$/.test(input.path) || (input.path.length > 1 && input.path.endsWith("/")) || input.path === "/admin" || input.path.startsWith("/admin/")) return "Use a canonical public path without a locale, query, hash or trailing slash";
  if (!input.locale || !contentLocales.includes(input.locale)) return "A supported locale is required";
  if (!input.status || !["draft", "published"].includes(input.status)) return "Invalid SEO status";
  if (!input.title?.trim() || input.title.trim().length > 160) return "SEO title must be 1 to 160 characters";
  if (!input.description?.trim() || input.description.trim().length > 320) return "SEO description must be 1 to 320 characters";
  if (!Array.isArray(input.keywords) || input.keywords.length > 20 || input.keywords.some(value => typeof value !== "string" || !value.trim() || value.trim().length > 80)) return "Keywords must contain at most 20 non-empty short strings";
  if (input.status === "published" && !activePublicLocales.has(input.locale)) return "This locale can remain in draft until its public site routes are activated";
  return null;
}

async function handleAdminSeo(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/api\/admin\/seo(?:\/([^/]+))?$/);
  const recordId = match?.[1];
  const admin = await requireAdmin(request, env, request.method === "GET" ? "content:read" : "content:write");
  if (admin instanceof Response) return admin;
  if (!env.DB) return Response.json({ error: "SEO storage is not configured" }, { status: 503 });
  if (request.method === "GET" && !recordId) {
    try {
      const result = await env.DB.prepare("SELECT id, path, locale, status, title, description, keywords_json AS keywordsJson, updated_by AS updatedBy, created_at AS createdAt, updated_at AS updatedAt FROM seo_metadata ORDER BY path, locale").all<Record<string, unknown>>();
      const records = result.results.map(row => ({ ...row, keywords: Array.isArray(JSON.parse(String(row.keywordsJson || "[]"))) ? JSON.parse(String(row.keywordsJson || "[]")) : [], keywordsJson: undefined }));
      return Response.json({ records });
    } catch (error) { return storageError(error); }
  }
  if ((request.method === "POST" && !recordId) || (request.method === "PATCH" && recordId)) {
    let input: SeoInput;
    try { input = await request.json() as SeoInput; } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
    const error = validateSeoInput(input);
    if (error) return Response.json({ error }, { status: 400 });
    if (input.status === "published" && !rolePermissions[admin.role].has("content:publish")) return Response.json({ error: "Publishing permission required" }, { status: 403 });
    const id = recordId || crypto.randomUUID();
    const now = Date.now();
    const normalizedKeywords = Array.from(new Set(input.keywords!.map(value => value.trim())));
    if (recordId) {
      try {
        const current = await env.DB.prepare("SELECT path, locale FROM seo_metadata WHERE id = ?").bind(recordId).first<{ path: string; locale: string }>();
        if (!current) return Response.json({ error: "SEO record not found" }, { status: 404 });
        if (current.path !== input.path || current.locale !== input.locale) return Response.json({ error: "SEO path and language are immutable; create a separate entry for another canonical page or locale" }, { status: 400 });
      } catch (lookupError) { return storageError(lookupError); }
    }
    if (input.status === "published") {
      try {
        if (!await isPublicSeoPath(input.path!, env)) return Response.json({ error: "SEO metadata can be published only for a currently public canonical route" }, { status: 400 });
      } catch (routeError) { return storageError(routeError); }
    }
    const statement = recordId
      ? env.DB.prepare("UPDATE seo_metadata SET path = ?, locale = ?, status = ?, title = ?, description = ?, keywords_json = ?, updated_by = ?, updated_at = ? WHERE id = ?").bind(input.path, input.locale, input.status, input.title!.trim(), input.description!.trim(), JSON.stringify(normalizedKeywords), admin.email, now, id)
      : env.DB.prepare("INSERT INTO seo_metadata (id, path, locale, status, title, description, keywords_json, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, input.path, input.locale, input.status, input.title!.trim(), input.description!.trim(), JSON.stringify(normalizedKeywords), admin.email, now, now);
    const action = input.status === "published" ? "published" : recordId ? "updated" : "created";
    try {
      await env.DB.batch([statement, env.DB.prepare("INSERT INTO content_events (id, entity_type, entity_id, action, actor_email, created_at) VALUES (?, 'seo', ?, ?, ?, ?)").bind(crypto.randomUUID(), id, action, admin.email, now)]);
      return Response.json({ ok: true, id, status: input.status }, { status: recordId ? 200 : 201 });
    } catch (writeError) { return contentWriteError(writeError); }
  }
  return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: recordId ? "PATCH" : "GET, POST" } });
}

type AdminUserInput = { email?: string; role?: AdminRole; active?: boolean };

async function handleAdminUsers(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const recordId = url.pathname.match(/^\/api\/admin\/users(?:\/([^/]+))?$/)?.[1];
  const admin = await requireAdmin(request, env, "users:manage");
  if (admin instanceof Response) return admin;
  if (!env.DB) return Response.json({ error: "Admin storage is not configured" }, { status: 503 });
  if (request.method === "GET" && !recordId) {
    try {
      const result = await env.DB.prepare("SELECT id, email, role, active, created_at AS createdAt, updated_at AS updatedAt FROM admin_users ORDER BY email").all();
      return Response.json({ users: result.results, bootstrapAdmins: (env.ADMIN_EMAILS || "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean) });
    } catch (error) { return storageError(error); }
  }
  if ((request.method === "POST" && !recordId) || (request.method === "PATCH" && recordId)) {
    let input: AdminUserInput;
    try { input = await request.json() as AdminUserInput; } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
    const email = input.email?.trim().toLowerCase();
    if (!email || !/^\S+@\S+\.\S+$/.test(email) || !input.role || !(input.role in rolePermissions) || typeof input.active !== "boolean") return Response.json({ error: "Valid email, role and active state are required" }, { status: 400 });
    const id = recordId || crypto.randomUUID();
    const now = Date.now();
    if (recordId) {
      try { if (!await env.DB.prepare("SELECT id FROM admin_users WHERE id = ?").bind(recordId).first()) return Response.json({ error: "Admin user not found" }, { status: 404 }); } catch (lookupError) { return storageError(lookupError); }
    }
    const statement = recordId
      ? env.DB.prepare("UPDATE admin_users SET email = ?, role = ?, active = ?, updated_at = ? WHERE id = ?").bind(email, input.role, input.active ? 1 : 0, now, id)
      : env.DB.prepare("INSERT INTO admin_users (id, email, role, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)").bind(id, email, input.role, input.active ? 1 : 0, now, now);
    try {
      await env.DB.batch([statement, env.DB.prepare("INSERT INTO content_events (id, entity_type, entity_id, action, actor_email, created_at) VALUES (?, 'admin_user', ?, 'role_changed', ?, ?)").bind(crypto.randomUUID(), id, admin.email, now)]);
      return Response.json({ ok: true, id, email, role: input.role, active: input.active }, { status: recordId ? 200 : 201 });
    } catch (writeError) { return contentWriteError(writeError); }
  }
  return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: recordId ? "PATCH" : "GET, POST" } });
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/favicon.ico") return Response.redirect(new URL("/favicon.svg", request.url), 308);
    if (url.pathname === "/api/inquiry") return withResponseHeaders(await handleInquiry(request, env), request, env);
    if (url.pathname === "/api/analytics") return withResponseHeaders(await handleAnalyticsEvent(request, env), request, env);
    if (url.pathname === "/api/assistant/recommend") return withResponseHeaders(await handleAssistant(request, env), request, env);
    if (url.pathname === "/api/admin/documents") return withResponseHeaders(await handleAdminDocumentUpload(request, env), request, env);
    if (url.pathname === "/api/admin/inquiries" || url.pathname.startsWith("/api/admin/inquiries/")) return withResponseHeaders(await handleAdminInquiries(request, env), request, env);
    if (url.pathname === "/api/admin/analytics") return withResponseHeaders(await handleAdminAnalytics(request, env), request, env);
    if (url.pathname.startsWith("/api/admin/content/")) return withResponseHeaders(await handleAdminContent(request, env), request, env);
    if (url.pathname === "/api/admin/translations" || url.pathname.startsWith("/api/admin/translations/")) return withResponseHeaders(await handleAdminTranslations(request, env), request, env);
    if (url.pathname === "/api/admin/seo" || url.pathname.startsWith("/api/admin/seo/")) return withResponseHeaders(await handleAdminSeo(request, env), request, env);
    if (url.pathname === "/api/admin/users" || url.pathname.startsWith("/api/admin/users/")) return withResponseHeaders(await handleAdminUsers(request, env), request, env);
    if (url.pathname.startsWith("/documents/")) return withResponseHeaders(await handlePublicDocument(request, env), request, env);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return withResponseHeaders(await handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths), request, env);
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-site-pathname", url.pathname);
    const appRequest = new Request(request, { headers: requestHeaders });
    return withResponseHeaders(await handler.fetch(appRequest, env, ctx), request, env);
  },
};

export default worker;
