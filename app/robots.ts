import type { MetadataRoute } from "next";
import { headers } from "next/headers";
export default async function robots(): Promise<MetadataRoute.Robots> { const h = await headers(); const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000"; const protocol = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https"); return { rules: [{ userAgent: "*", allow: "/", disallow: ["/en/admin/", "/zh/admin/"] }, { userAgent: "OAI-SearchBot", allow: "/", disallow: ["/en/admin/", "/zh/admin/"] }], sitemap: `${protocol}://${host}/sitemap.xml` }; }
