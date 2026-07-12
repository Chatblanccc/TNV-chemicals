/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  INQUIRY_WEBHOOK_URL?: string;
  INQUIRY_WEBHOOK_TOKEN?: string;
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
  if (!env.INQUIRY_WEBHOOK_URL) {
    return Response.json({ error: "Inquiry delivery is not configured" }, { status: 503 });
  }
  const webhookUrl = new URL(env.INQUIRY_WEBHOOK_URL);
  if (webhookUrl.protocol !== "https:") return Response.json({ error: "Inquiry delivery is misconfigured" }, { status: 503 });
  const inquiryId = crypto.randomUUID();
  const upstream = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(env.INQUIRY_WEBHOOK_TOKEN ? { Authorization: `Bearer ${env.INQUIRY_WEBHOOK_TOKEN}` } : {}),
    },
    body: JSON.stringify({
      inquiryId,
      receivedAt: new Date().toISOString(),
      email: text("email"),
      area: text("area"),
      company: text("company"),
      country: text("country"),
      requirement: text("requirement"),
      productCode: text("productCode") || undefined,
      locale: text("locale") || "en",
    }),
  });
  if (!upstream.ok) return Response.json({ error: "Inquiry delivery failed" }, { status: 502 });
  return Response.json({ ok: true, inquiryId }, { status: 201 });
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
