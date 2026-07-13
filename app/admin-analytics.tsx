"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Row = { label?: string; eventType?: string; count: number };
type Report = { enabled: boolean; periodDays: number; totals: Row[]; countries: Row[]; paths: Row[]; searches: Row[]; products: Row[] };

function ReportList({ title, rows, empty }: { title: string; rows: Row[]; empty: string }) {
  return <section><h2>{title}</h2>{rows.length === 0 ? <p>{empty}</p> : <ol>{rows.map((row, index) => <li key={`${row.label || row.eventType}-${index}`}><span>{row.label || row.eventType}</span><b>{row.count}</b></li>)}</ol>}</section>;
}

export function AdminAnalytics({ locale }: { locale: "en" | "zh" }) {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/analytics", { signal: controller.signal }).then(async response => { const result = await response.json() as Report & { error?: string }; if (!response.ok) throw new Error(result.error || "Unable to load analytics"); setReport(result); }).catch(loadError => { if (loadError instanceof DOMException && loadError.name === "AbortError") return; setError(loadError instanceof Error ? loadError.message : "Unable to load analytics"); });
    return () => controller.abort();
  }, []);
  if (error === "Authentication required") return <section className="admin-state" role="alert"><h2>{locale === "zh" ? "请先登录，再查看分析数据。" : "Sign in before opening analytics."}</h2><Link className="button button-dark" href={`/signin-with-chatgpt?return_to=${encodeURIComponent(`/${locale}/admin/analytics`)}`}>{locale === "zh" ? "使用 ChatGPT 登录" : "Sign in with ChatGPT"}</Link></section>;
  if (error) return <section className="admin-state" role="alert"><h2>{error}</h2></section>;
  if (!report) return <section className="admin-state"><h2>{locale === "zh" ? "正在加载分析数据…" : "Loading analytics…"}</h2></section>;
  const empty = locale === "zh" ? "当前周期暂无经同意记录的数据。" : "No consented data has been recorded for this period.";
  return <section className="analytics-report"><header><div><span className="eyebrow">{locale === "zh" ? "最近 30 天" : "LAST 30 DAYS"}</span><h2>{locale === "zh" ? "获客与内容表现" : "Acquisition and content performance"}</h2></div><p>{report.enabled ? (locale === "zh" ? "匿名分析已启用。" : "Anonymous analytics are enabled.") : (locale === "zh" ? "分析收集尚未启用。" : "Analytics collection is not enabled.")}</p></header><div className="analytics-totals">{report.totals.length ? report.totals.map(row => <div key={row.eventType}><span>{row.eventType?.replaceAll("_", " ")}</span><b>{row.count}</b></div>) : <p>{empty}</p>}</div><div className="analytics-breakdown"><ReportList title={locale === "zh" ? "国家 / 地区" : "Countries"} rows={report.countries} empty={empty}/><ReportList title={locale === "zh" ? "热门页面" : "Top pages"} rows={report.paths} empty={empty}/><ReportList title={locale === "zh" ? "站内搜索词" : "Site searches"} rows={report.searches} empty={empty}/><ReportList title={locale === "zh" ? "产品关注" : "Product interest"} rows={report.products} empty={empty}/></div></section>;
}
