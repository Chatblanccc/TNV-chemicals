import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { routePaths } from "./site-data";
import { localizedPath } from "./i18n";
import { activeLocales } from "./locales";
import { loadPublishedSiteContent } from "./published-content";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> { if (process.env.SITE_LAUNCH_READY !== "true") return []; const h = await headers(); const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000"; const protocol = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https"); const base = process.env.SITE_URL || `${protocol}://${host}`; const content = await loadPublishedSiteContent(); const dynamicRoutes = [...content.products.map(product => `/products/${product.category}/${product.slug}`), ...content.applications.map(application => `/applications/${application.slug}`), ...content.articles.flatMap(article => [`/knowledge/${article.slug}`, `/insights/${article.slug}`, `/knowledge/${article.category}`])]; const publicRoutes = Array.from(new Set([...routePaths, ...dynamicRoutes])).filter(route => route !== "/admin" && !route.startsWith("/admin/")); return activeLocales.flatMap(locale => publicRoutes.map(route => ({ url: `${base}${localizedPath(locale, route)}` }))); }
