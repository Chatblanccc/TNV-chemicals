import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { routePaths } from "./site-data";
import { localizedPath, type Locale } from "./i18n";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> { const h = await headers(); const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000"; const protocol = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https"); return (["en", "zh"] as Locale[]).flatMap(locale => routePaths.map(route => ({ url: `${protocol}://${host}${localizedPath(locale, route)}`, lastModified: new Date("2026-07-12"), changeFrequency: route.includes("insights") ? "monthly" : "weekly", priority: route === "/" ? 1 : .7 }))); }
