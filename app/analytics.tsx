"use client";

import { useEffect, useState } from "react";

type Consent = "accepted" | "declined" | null;
type AnalyticsProps = { enabled: boolean; measurementId?: string; locale: "en" | "zh"; path: string; query?: string; productCode?: string };

declare global {
  interface Window { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void }
}

const consentKey = "tnv-analytics-consent-v1";

function postEvent(body: Record<string, unknown>) {
  void fetch("/api/analytics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive: true }).catch(() => undefined);
}

function installGoogleAnalytics(measurementId: string) {
  if (document.querySelector(`script[data-tnv-ga="${measurementId}"]`)) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = (...args: unknown[]) => { window.dataLayer?.push(args); };
  window.gtag("consent", "default", { analytics_storage: "granted" });
  window.gtag("js", new Date());
  window.gtag("config", measurementId, { anonymize_ip: true, send_page_view: false });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  script.dataset.tnvGa = measurementId;
  document.head.appendChild(script);
}

export function Analytics({ enabled, measurementId, locale, path, query, productCode }: AnalyticsProps) {
  const [consent, setConsent] = useState<Consent>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const frame = window.requestAnimationFrame(() => {
      const stored = window.localStorage.getItem(consentKey);
      setConsent(stored === "accepted" || stored === "declined" ? stored : null);
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [enabled]);

  useEffect(() => {
    if (!enabled || consent !== "accepted") return;
    if (measurementId && /^G-[A-Z0-9]+$/.test(measurementId)) installGoogleAnalytics(measurementId);
    const common = { path: window.location.pathname, locale, referrer: document.referrer || undefined };
    postEvent({ ...common, eventType: "page_view" });
    if (query) postEvent({ ...common, eventType: "search", query });
    if (productCode) postEvent({ ...common, eventType: "product_view", productCode });
    window.gtag?.("event", "page_view", { page_path: path });
    if (query) window.gtag?.("event", "search", { search_term: query });
    if (productCode) window.gtag?.("event", "view_item", { items: [{ item_id: productCode }] });
  }, [consent, enabled, locale, measurementId, path, productCode, query]);

  useEffect(() => {
    if (!enabled || consent !== "accepted") return;
    const click = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[data-analytics-download]");
      if (!link) return;
      const code = link.dataset.productCode || undefined;
      postEvent({ eventType: "document_download", path: window.location.pathname, locale, productCode: code, referrer: document.referrer || undefined });
      window.gtag?.("event", "file_download", { file_name: link.href, item_id: code });
    };
    document.addEventListener("click", click);
    return () => document.removeEventListener("click", click);
  }, [consent, enabled, locale]);

  if (!enabled || !ready || consent) return null;
  const accept = () => { window.localStorage.setItem(consentKey, "accepted"); setConsent("accepted"); };
  const decline = () => { window.localStorage.setItem(consentKey, "declined"); setConsent("declined"); };
  return <aside className="analytics-consent" aria-label={locale === "zh" ? "分析数据设置" : "Analytics preferences"}><div><b>{locale === "zh" ? "是否允许匿名使用分析？" : "Allow anonymous usage analytics?"}</b><p>{locale === "zh" ? "经您同意后，我们记录页面、搜索、产品和询盘转化事件，不存储 IP 地址或个人资料。" : "With your consent, we record page, search, product and inquiry conversion events without storing IP addresses or personal profiles."}</p></div><div><button className="button button-dark" type="button" onClick={accept}>{locale === "zh" ? "允许" : "Allow"}</button><button className="text-button" type="button" onClick={decline}>{locale === "zh" ? "拒绝" : "Decline"}</button></div></aside>;
}
