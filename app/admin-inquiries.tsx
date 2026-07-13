"use client";

import Link from "next/link";
import { ArrowClockwise, MagnifyingGlass } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

type InquiryStatus = "new" | "contacted" | "quotation_sent" | "negotiation" | "completed" | "archived";
type Inquiry = { id: string; status: InquiryStatus; area: string; productCode: string | null; quantity: string | null; unit: string | null; requirement: string; locale: string; notificationStatus: string; createdAt: number; updatedAt: number; email: string; company: string; country: string; phone: string | null };
const statuses: InquiryStatus[] = ["new", "contacted", "quotation_sent", "negotiation", "completed", "archived"];

export function AdminInquiries({ locale }: { locale: "en" | "zh" }) {
  const [items, setItems] = useState<Inquiry[]>([]);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"auth" | "forbidden" | "storage" | "generic" | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const copy = locale === "zh" ? { search: "搜索公司、邮箱、电话、产品或需求", all: "全部状态", refresh: "刷新", empty: "当前筛选条件下没有询盘。", auth: "请先登录，再访问询盘后台。", forbidden: "当前账号尚未加入管理员白名单。", storage: "询盘数据库尚未准备完成。", generic: "无法读取询盘，请稍后重试。", signIn: "使用 ChatGPT 登录", created: "提交时间", notification: "通知", requirement: "生产需求", purchase: "预计采购" } : { search: "Search company, email, phone, product or requirement", all: "All statuses", refresh: "Refresh", empty: "No inquiries match the current filters.", auth: "Sign in before opening the inquiry workspace.", forbidden: "This account is not configured in the admin allowlist.", storage: "The inquiry database is not ready yet.", generic: "Inquiries could not be loaded. Try again later.", signIn: "Sign in with ChatGPT", created: "Received", notification: "Notification", requirement: "Production requirement", purchase: "Estimated order" };
  const statusLabel = (value: string) => locale === "zh" ? ({ new: "新询盘", contacted: "已联系", quotation_sent: "已报价", negotiation: "洽谈中", completed: "已完成", archived: "已归档" }[value] || value) : value.replaceAll("_", " ");

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (query.trim()) params.set("q", query.trim());
    fetch(`/api/admin/inquiries?${params}`, { signal: controller.signal })
      .then(async response => {
        if (response.status === 401) { setError("auth"); return; }
        if (response.status === 403) { setError("forbidden"); return; }
        if (response.status === 503) { setError("storage"); return; }
        if (!response.ok) throw new Error("request failed");
        const result = await response.json() as { inquiries: Inquiry[] };
        setError(null);
        setItems(result.inquiries);
      })
      .catch(fetchError => { if (fetchError instanceof DOMException && fetchError.name === "AbortError") return; setError("generic"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [query, refreshKey, status]);

  const refresh = () => { setLoading(true); setError(null); setRefreshKey(value => value + 1); };

  const changeStatus = async (id: string, nextStatus: InquiryStatus) => {
    setUpdating(id);
    try {
      const response = await fetch(`/api/admin/inquiries/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus }) });
      if (!response.ok) throw new Error("update failed");
      setItems(current => current.map(item => item.id === id ? { ...item, status: nextStatus, updatedAt: Date.now() } : item));
    } catch { setError("generic"); } finally { setUpdating(null); }
  };

  if (error) return <section className="admin-state" role="alert"><h2>{error === "auth" ? copy.auth : error === "forbidden" ? copy.forbidden : error === "storage" ? copy.storage : copy.generic}</h2>{error === "auth" && <Link className="button button-dark" href={`/signin-with-chatgpt?return_to=${encodeURIComponent(`/${locale}/admin/inquiries`)}`}>{copy.signIn}</Link>}<button className="text-button" type="button" onClick={refresh}>{copy.refresh}</button></section>;

  return <section className="admin-inquiries">
    <div className="admin-toolbar"><label><span className="sr-only">{copy.search}</span><MagnifyingGlass size={17}/><input type="search" value={query} onChange={event => { setLoading(true); setQuery(event.target.value); }} placeholder={copy.search}/></label><select value={status} onChange={event => { setLoading(true); setStatus(event.target.value); }} aria-label={copy.all}><option value="">{copy.all}</option>{statuses.map(value => <option key={value} value={value}>{statusLabel(value)}</option>)}</select><button type="button" onClick={refresh} aria-label={copy.refresh}><ArrowClockwise size={18}/></button></div>
    {loading ? <div className="admin-loading" role="status">{locale === "zh" ? "正在读取询盘…" : "Loading inquiries…"}</div> : items.length === 0 ? <p className="admin-empty">{copy.empty}</p> : <div className="inquiry-list">{items.map(item => <article key={item.id}>
      <header><span>{item.productCode || item.area}</span><time dateTime={new Date(item.createdAt).toISOString()}>{new Date(item.createdAt).toLocaleString(locale === "zh" ? "zh-CN" : "en")}</time></header>
      <div className="inquiry-customer"><h2>{item.company}</h2><p>{item.email} · {item.country}{item.phone ? <> · {item.phone}</> : null}</p><p className="inquiry-purchase"><span>{copy.purchase}</span> {item.quantity && item.unit ? `${item.quantity} ${item.unit}` : locale === "zh" ? "历史询盘未记录" : "Not recorded on legacy inquiry"}</p></div>
      <div className="inquiry-requirement"><span>{copy.requirement}</span><p>{item.requirement}</p></div>
      <footer><label><span className="sr-only">{locale === "zh" ? "更新询盘状态" : "Update inquiry status"}</span><select value={item.status} disabled={updating === item.id} onChange={event => void changeStatus(item.id, event.target.value as InquiryStatus)}>{statuses.map(value => <option key={value} value={value}>{statusLabel(value)}</option>)}</select></label><small>{copy.notification}: {item.notificationStatus}</small><code>{item.id}</code></footer>
    </article>)}</div>}
  </section>;
}
