import type { Metadata } from "next";
import { headers } from "next/headers";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";

const sans = Manrope({ variable: "--font-sans", subsets: ["latin"] });
const editorial = Cormorant_Garamond({ variable: "--font-editorial", subsets: ["latin"], style: ["normal", "italic"], weight: ["500", "600"] });

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);
  return {
    metadataBase,
    title: { default: "TNV Chemicals | Industrial Ink & Chemical Solutions", template: "%s | TNV Chemicals" },
    description: "Application-led printing ink and chemical solutions for international industrial buyers.",
    openGraph: { title: "TNV Chemicals", description: "Industrial chemistry, built around your process.", type: "website", images: [{ url: "/og.png", width: 1536, height: 1024, alt: "TNV Chemicals — Industrial chemistry, built around your process." }] },
    twitter: { card: "summary_large_image", title: "TNV Chemicals", description: "Industrial chemistry, built around your process.", images: ["/og.png"] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${sans.variable} ${editorial.variable}`}>{children}<script dangerouslySetInnerHTML={{__html: `document.documentElement.lang=location.pathname.startsWith('/zh')?'zh-CN':'en'`}} /></body></html>;
}
