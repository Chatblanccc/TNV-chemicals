/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  INQUIRY_WEBHOOK_URL?: string;
  INQUIRY_WEBHOOK_TOKEN?: string;
  ADMIN_EMAILS?: string;
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
  return Response.json({ error: unavailable ? "Inquiry storage is not ready" : "Inquiry storage failed" }, { status: 503 });
}

function requireAdmin(request: Request, env: Env): Response | string {
  const email = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
  if (!email) return Response.json({ error: "Authentication required" }, { status: 401 });
  const allowed = new Set((env.ADMIN_EMAILS || "").split(",").map(value => value.trim().toLowerCase()).filter(Boolean));
  if (!allowed.has(email)) return Response.json({ error: "Admin access is not configured for this account" }, { status: 403 });
  return email;
}

const securityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "connect-src 'self'",
  "font-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data:",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
].join("; ");

function withResponseHeaders(response: Response, request: Request, env: Env): Response {
  const url = new URL(request.url);
  const headers = new Headers(response.headers);
  headers.set("Content-Security-Policy", securityPolicy);
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

async function handleAdminInquiries(request: Request, env: Env): Promise<Response> {
  const admin = requireAdmin(request, env);
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
        env.DB.prepare("INSERT INTO inquiry_events (id, inquiry_id, event_type, from_status, to_status, actor_email, created_at) VALUES (?, ?, 'status_changed', ?, ?, ?, ?)").bind(crypto.randomUUID(), match[1], current.status, payload.status, admin, now),
      ]);
      return Response.json({ ok: true, id: match[1], status: payload.status });
    } catch (error) {
      return storageError(error);
    }
  }
  return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: match ? "PATCH" : "GET" } });
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
    if (url.pathname === "/api/admin/inquiries" || url.pathname.startsWith("/api/admin/inquiries/")) return withResponseHeaders(await handleAdminInquiries(request, env), request, env);

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
