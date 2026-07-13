"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Locale = "en" | "zh";
type RedirectStatus = "draft" | "published" | "archived";
type RedirectRecord = { id: string; sourcePath: string; destinationPath: string; status: RedirectStatus; updatedBy: string };
type RedirectForm = { sourcePath: string; destinationPath: string; status: "draft" | "published" };

const emptyForm = (): RedirectForm => ({ sourcePath: "", destinationPath: "", status: "draft" });

export function AdminRedirects({ locale }: { locale: Locale }) {
  const [records, setRecords] = useState<RedirectRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<RedirectForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = async () => {
    const response = await fetch("/api/admin/redirects");
    const result = await response.json() as { records?: RedirectRecord[]; error?: string };
    if (!response.ok) throw new Error(result.error || "Unable to load redirects");
    setRecords(result.records || []);
  };

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/redirects", { signal: controller.signal }).then(async response => {
      const result = await response.json() as { records?: RedirectRecord[]; error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to load redirects");
      setRecords(result.records || []);
    }).catch(loadError => {
      if (loadError instanceof DOMException && loadError.name === "AbortError") return;
      setError(loadError instanceof Error ? loadError.message : "Unable to load redirects");
    }).finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const select = (record: RedirectRecord) => {
    setSelectedId(record.id);
    setForm({ sourcePath: record.sourcePath, destinationPath: record.destinationPath, status: record.status === "published" ? "published" : "draft" });
    setError("");
    setNotice("");
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/redirects${selectedId ? `/${selectedId}` : ""}`, { method: selectedId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const result = await response.json() as { error?: string; id?: string };
      if (!response.ok) throw new Error(result.error || "Unable to save redirect");
      await load();
      setSelectedId(result.id || selectedId);
      setNotice(locale === "zh" ? "重定向设置已保存。" : "Redirect saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save redirect");
    } finally { setSaving(false); }
  };

  const archive = async () => {
    if (!selectedId) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/admin/redirects/${selectedId}`, { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to archive redirect");
      await load();
      setSelectedId(null);
      setForm(emptyForm());
      setNotice(locale === "zh" ? "重定向已归档，旧路径不再跳转。" : "Redirect archived; the source path no longer redirects.");
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "Unable to archive redirect");
    } finally { setSaving(false); }
  };

  if (error === "Authentication required" && records.length === 0) return <section className="admin-state" role="alert"><h2>{locale === "zh" ? "请先登录，再访问重定向后台。" : "Sign in before opening redirect management."}</h2><Link className="button button-dark" href={`/signin-with-chatgpt?return_to=${encodeURIComponent(`/${locale}/admin/redirects`)}`}>{locale === "zh" ? "使用 ChatGPT 登录" : "Sign in with ChatGPT"}</Link></section>;

  return <section className="settings-workspace">
    <aside className="settings-list">
      <button className="button button-dark" type="button" onClick={() => { setSelectedId(null); setForm(emptyForm()); setError(""); setNotice(""); }}>{locale === "zh" ? "新建重定向" : "New redirect"}</button>
      {loading ? <p>{locale === "zh" ? "正在读取重定向…" : "Loading redirects…"}</p> : records.length === 0 ? <p>{locale === "zh" ? "尚未配置重定向。" : "No redirects are configured."}</p> : records.map(record => <button key={record.id} type="button" className={record.id === selectedId ? "active" : ""} onClick={() => select(record)}><b>{record.sourcePath}</b><span>{record.status}</span><small>→ {record.destinationPath}</small></button>)}
    </aside>
    <form className="settings-editor" onSubmit={save}>
      <label><span>{locale === "zh" ? "旧路径" : "Source path"}</span><input required readOnly={Boolean(selectedId)} aria-describedby="redirect-path-help" pattern="/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:/[a-z0-9]+(?:-[a-z0-9]+)*)*)" placeholder="/products/old-category/old-product" value={form.sourcePath} onChange={event => setForm(current => ({ ...current, sourcePath: event.target.value }))}/></label>
      <label><span>{locale === "zh" ? "目标 canonical 路径" : "Destination canonical path"}</span><input required aria-describedby="redirect-path-help" pattern="/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:/[a-z0-9]+(?:-[a-z0-9]+)*)*)?" placeholder="/products/new-category/new-product" value={form.destinationPath} onChange={event => setForm(current => ({ ...current, destinationPath: event.target.value }))}/></label>
      <p className="field-help" id="redirect-path-help">{locale === "zh" ? "路径不含语言前缀、查询参数或末尾斜杠。旧路径保存后锁定；发布前目标必须是当前公开 canonical 页面，且不能形成连续跳转。" : "Omit locale prefixes, queries and trailing slashes. The source locks after creation; publication requires a current public canonical destination and forbids redirect chains."}</p>
      <label><span>{locale === "zh" ? "状态" : "Status"}</span><select value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value as RedirectForm["status"] }))}><option value="draft">Draft</option><option value="published">Published</option></select></label>
      {form.status === "published" && <p className="publishing-warning">{locale === "zh" ? "发布后，英文和中文旧路径都会使用 308 永久重定向，并保留查询参数。" : "Publishing sends both English and Chinese source paths through a permanent 308 redirect while preserving query parameters."}</p>}
      {error && <p className="form-message error" role="alert">{error}</p>}
      {notice && <p className="form-message success" role="status">{notice}</p>}
      <div className="editor-actions"><button className="button button-dark" type="submit" disabled={saving}>{saving ? (locale === "zh" ? "正在保存…" : "Saving…") : (locale === "zh" ? "保存重定向" : "Save redirect")}</button>{selectedId && <button className="text-button" type="button" disabled={saving} onClick={() => void archive()}>{locale === "zh" ? "归档" : "Archive"}</button>}</div>
    </form>
  </section>;
}
