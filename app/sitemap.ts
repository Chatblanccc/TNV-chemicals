import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { routePaths } from "./site-data";
import { localizedPath, type Locale } from "./i18n";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> { if (process.env.SITE_LAUNCH_READY !== "true") return []; const h = await headers(); const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000"; const protocol = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https"); const base = process.env.SITE_URL || `${protocol}://${host}`; return (["en", "zh"] as Locale[]).flatMap(locale => routePaths.map(route => ({ url: `${base}${localizedPath(locale, route)}` }))); }
