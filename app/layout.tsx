import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(process.env.SITE_URL || `${protocol}://${host}`);
  const launchReady = process.env.SITE_LAUNCH_READY === "true";
  const googleVerification = process.env.GOOGLE_SITE_VERIFICATION;
  return {
    metadataBase,
    title: { default: "TNV Chemicals | Industrial Ink & Chemical Solutions", template: "%s | TNV Chemicals" },
    description: "Application-led printing ink and chemical solutions for international industrial buyers.",
    icons: { icon: "/favicon.svg" },
    robots: launchReady
      ? { index: true, follow: true }
      : { index: false, follow: false, noarchive: true, nosnippet: true },
    openGraph: { title: "TNV Chemicals", description: "Industrial chemistry, built around your process.", type: "website", images: [{ url: "/og.jpg", width: 1536, height: 1024, alt: "TNV Chemicals — Industrial chemistry, built around your process." }] },
    twitter: { card: "summary_large_image", title: "TNV Chemicals", description: "Industrial chemistry, built around your process.", images: ["/og.jpg"] },
    ...(googleVerification ? { verification: { google: googleVerification } } : {}),
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get("x-site-pathname") || requestHeaders.get("x-forwarded-uri") || "/en";
  const language = pathname === "/zh" || pathname.startsWith("/zh/") ? "zh-CN" : "en";
  return <html lang={language}><head><link rel="preload" href="/fonts/manrope-latin-variable.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/><link rel="preload" href="/fonts/cormorant-garamond-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/><link rel="preload" href="/fonts/cormorant-garamond-latin-italic.woff2" as="font" type="font/woff2" crossOrigin="anonymous"/></head><body>{children}</body></html>;
}
