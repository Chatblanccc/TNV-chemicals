/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  INQUIRY_WEBHOOK_URL?: string;
  INQUIRY_WEBHOOK_TOKEN?: string;
  ADMIN_EMAILS?: string;
  ANALYTICS_ENABLED?: string;
  AI_ASSISTANT_ENDPOINT?: string;
  AI_ASSISTANT_TOKEN?: string;
  SITE_LAUNCH_READY?: string;
  DB: D1Database;
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
  const email = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
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
  const required = ["email", "area", "company", "country", "requirement", "privacyAccepted"];
  if (required.some(key => key === "privacyAccepted" ? input[key] !== true : !text(key))) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!/^\S+@\S+\.\S+$/.test(text("email")) || text("requirement").length > 5000) {
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
    await env.DB.prepare("INSERT INTO customers (id, email, company, country, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET company = excluded.company, country = excluded.country, updated_at = excluded.updated_at")
      .bind(customerId, text("email").toLowerCase(), text("company"), text("country"), timestamp, timestamp).run();
    await env.DB.batch([
      env.DB.prepare("INSERT INTO inquiries (id, customer_id, status, area, product_code, requirement, locale, notification_status, source_path, created_at, updated_at) VALUES (?, (SELECT id FROM customers WHERE email = ?), 'new', ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(inquiryId, text("email").toLowerCase(), text("area"), text("productCode") || null, text("requirement"), text("locale") === "zh" ? "zh" : "en", notificationStatus, text("sourcePath") || null, timestamp, timestamp),
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
        body: JSON.stringify({ inquiryId, receivedAt, email: text("email"), area: text("area"), company: text("company"), country: text("country"), requirement: text("requirement"), productCode: text("productCode") || undefined, locale: text("locale") || "en" }),
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
      const result = await env.DB.prepare("SELECT i.id, i.status, i.area, i.product_code AS productCode, i.requirement, i.locale, i.notification_status AS notificationStatus, i.created_at AS createdAt, i.updated_at AS updatedAt, c.email, c.company, c.country FROM inquiries i JOIN customers c ON c.id = i.customer_id WHERE (? = '' OR i.status = ?) AND (? = '' OR c.email LIKE ? OR c.company LIKE ? OR i.product_code LIKE ? OR i.requirement LIKE ?) ORDER BY i.created_at DESC LIMIT 100")
        .bind(status, status, query, pattern, pattern, pattern, pattern).all();
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
const contentLocales = ["en", "zh", "es", "ar", "ru"] as const;

function isSafeFileUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try { return new URL(value).protocol === "https:"; } catch { return false; }
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
  if (type === "products" && typeof input.data.casNumber === "string" && input.data.casNumber && !/^[0-9]{2,7}-[0-9]{2}-[0-9]$/.test(input.data.casNumber)) return "CAS number must use the standard hyphenated format";
  if (type === "categories" && typeof input.data.nameEn !== "string") return "Category English name is required";
  if (type === "company-profiles" && input.slug !== "tnv-chemicals") return "The governed company profile must use the canonical tnv-chemicals slug";
  if (type === "company-profiles" && typeof input.data.legalNameEn !== "string") return "Verified English legal entity name is required";
  if (type === "company-profiles" && typeof input.data.email === "string" && input.data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.data.email)) return "Use a valid verified contact email";
  if (type === "company-profiles" && typeof input.data.websiteUrl === "string" && input.data.websiteUrl && !isSafeFileUrl(input.data.websiteUrl)) return "The verified website URL must use HTTPS";
  if (type === "applications" && (typeof input.data.nameEn !== "string" || typeof input.data.introEn !== "string")) return "Application English name and introduction are required";
  if (type === "articles" && (!input.category?.trim() || typeof input.data.titleEn !== "string" || typeof input.data.summaryEn !== "string")) return "Article category, English title and summary are required";
  if (type === "certificates" && (!input.type?.trim() || typeof input.data.nameEn !== "string")) return "Certificate type and English name are required";
  if (type === "downloads" && (!input.type || !downloadTypes.includes(input.type) || typeof input.data.nameEn !== "string")) return "Download type and English name are required";
  if ((type === "certificates" || type === "downloads") && input.status === "published" && !isSafeFileUrl(input.data.fileUrl)) return "A verified HTTPS or site-relative file URL is required before publication";
  return null;
}

function contentWriteError(error: unknown): Response {
  const message = error instanceof Error ? error.message : "";
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
    const id = crypto.randomUUID();
    const now = Date.now();
    const publishedAt = input.status === "published" ? now : null;
    const dataJson = JSON.stringify(input.data);
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
            : env.DB.prepare("INSERT INTO downloads (id, slug, type, status, verification_status, data_json, updated_by, published_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, input.slug, input.type, input.status, input.verificationStatus, dataJson, admin.email, publishedAt, now, now);
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
      const current = await env.DB.prepare(`SELECT status FROM ${config.table} WHERE id = ?`).bind(recordId).first<{ status: ContentStatus }>();
      if (!current) return Response.json({ error: "Content record not found" }, { status: 404 });
      const now = Date.now();
      const publishedAt = input.status === "published" ? now : null;
      const dataJson = JSON.stringify(input.data);
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
              : env.DB.prepare("UPDATE downloads SET slug = ?, type = ?, status = ?, verification_status = ?, data_json = ?, updated_by = ?, published_at = ?, updated_at = ? WHERE id = ?").bind(input.slug, input.type, input.status, input.verificationStatus, dataJson, admin.email, publishedAt, now, recordId);
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
  if (!input.path?.startsWith("/") || input.path.startsWith("//") || input.path === "/admin" || input.path.startsWith("/admin/")) return "A public site path is required";
  if (!input.locale || !contentLocales.includes(input.locale)) return "A supported locale is required";
  if (!input.status || !["draft", "published"].includes(input.status)) return "Invalid SEO status";
  if (!input.title?.trim() || input.title.trim().length > 160) return "SEO title must be 1 to 160 characters";
  if (!input.description?.trim() || input.description.trim().length > 320) return "SEO description must be 1 to 320 characters";
  if (!Array.isArray(input.keywords) || input.keywords.some(value => typeof value !== "string" || value.length > 80)) return "Keywords must be a list of short strings";
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
    if (recordId) {
      try { if (!await env.DB.prepare("SELECT id FROM seo_metadata WHERE id = ?").bind(recordId).first()) return Response.json({ error: "SEO record not found" }, { status: 404 }); } catch (lookupError) { return storageError(lookupError); }
    }
    const statement = recordId
      ? env.DB.prepare("UPDATE seo_metadata SET path = ?, locale = ?, status = ?, title = ?, description = ?, keywords_json = ?, updated_by = ?, updated_at = ? WHERE id = ?").bind(input.path, input.locale, input.status, input.title!.trim(), input.description!.trim(), JSON.stringify(input.keywords), admin.email, now, id)
      : env.DB.prepare("INSERT INTO seo_metadata (id, path, locale, status, title, description, keywords_json, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, input.path, input.locale, input.status, input.title!.trim(), input.description!.trim(), JSON.stringify(input.keywords), admin.email, now, now);
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
    if (url.pathname === "/api/admin/inquiries" || url.pathname.startsWith("/api/admin/inquiries/")) return withResponseHeaders(await handleAdminInquiries(request, env), request, env);
    if (url.pathname === "/api/admin/analytics") return withResponseHeaders(await handleAdminAnalytics(request, env), request, env);
    if (url.pathname.startsWith("/api/admin/content/")) return withResponseHeaders(await handleAdminContent(request, env), request, env);
    if (url.pathname === "/api/admin/translations" || url.pathname.startsWith("/api/admin/translations/")) return withResponseHeaders(await handleAdminTranslations(request, env), request, env);
    if (url.pathname === "/api/admin/seo" || url.pathname.startsWith("/api/admin/seo/")) return withResponseHeaders(await handleAdminSeo(request, env), request, env);
    if (url.pathname === "/api/admin/users" || url.pathname.startsWith("/api/admin/users/")) return withResponseHeaders(await handleAdminUsers(request, env), request, env);

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
