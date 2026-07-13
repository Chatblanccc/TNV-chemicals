"use client";

import { useEffect, useMemo, useState } from "react";
import { contentLocales, localeRegistry, type ContentLocale } from "./locales";

export type TranslatableEntity = "product" | "category" | "company_profile" | "application" | "article" | "certificate" | "download";

type TranslationRecord = {
  id: string;
  entityType: TranslatableEntity;
  entityId: string;
  locale: ContentLocale;
  status: "draft" | "review" | "published" | "archived";
  verificationStatus: "pending" | "verified" | "rejected";
  data: Record<string, unknown>;
  updatedBy: string;
  updatedAt: number;
};

const plannedLocales = contentLocales.filter(locale => !localeRegistry[locale].active);

const templates: Record<TranslatableEntity, Record<string, unknown>> = {
  product: { name: "", description: "", use: "", packaging: "", moq: "", applications: [], benefits: [], specs: [] },
  category: { name: "", description: "" },
  company_profile: { legalName: "", businessType: "", manufacturingCapability: "", exportMarkets: [], address: "" },
  application: { name: "", intro: "", challenges: [] },
  article: { title: "", summary: "", type: "", author: "", sectionHeading: "", body: "", checklist: [], faq: [] },
  certificate: { name: "", description: "" },
  download: { name: "", description: "" },
};

function formatData(data: Record<string, unknown>) {
  return JSON.stringify(data, null, 2);
}

export function AdminTranslations({ entityType, entityId, interfaceLocale }: { entityType: TranslatableEntity; entityId: string; interfaceLocale: "en" | "zh" }) {
  const [records, setRecords] = useState<TranslationRecord[]>([]);
  const [translationLocale, setTranslationLocale] = useState<ContentLocale>(plannedLocales[0]);
  const [status, setStatus] = useState<TranslationRecord["status"]>("draft");
  const [verificationStatus, setVerificationStatus] = useState<TranslationRecord["verificationStatus"]>("pending");
  const [dataText, setDataText] = useState(() => formatData(templates[entityType]));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const selectedRecord = useMemo(() => records.find(record => record.locale === translationLocale), [records, translationLocale]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/admin/translations?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error((await response.json() as { error?: string }).error || "Unable to load translations");
        return response.json() as Promise<{ records: TranslationRecord[] }>;
      })
      .then(result => {
        setRecords(result.records);
        const record = result.records.find(item => item.locale === plannedLocales[0]);
        setStatus(record?.status || "draft");
        setVerificationStatus(record?.verificationStatus || "pending");
        setDataText(formatData(record?.data || templates[entityType]));
        setError("");
      })
      .catch(loadError => {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load translations");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [entityId, entityType]);

  function changeLocale(nextLocale: ContentLocale) {
    const record = records.find(item => item.locale === nextLocale);
    setTranslationLocale(nextLocale);
    setStatus(record?.status || "draft");
    setVerificationStatus(record?.verificationStatus || "pending");
    setDataText(formatData(record?.data || templates[entityType]));
    setNotice("");
    setError("");
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true); setError(""); setNotice("");
    try {
      const data = JSON.parse(dataText) as unknown;
      if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Translation data must be a JSON object");
      const response = await fetch(`/api/admin/translations${selectedRecord ? `/${selectedRecord.id}` : ""}`, {
        method: selectedRecord ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId, locale: translationLocale, status, verificationStatus, data }),
      });
      const result = await response.json() as { error?: string; id?: string };
      if (!response.ok) throw new Error(result.error || "Unable to save translation");
      const refreshed = await fetch(`/api/admin/translations?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`);
      if (!refreshed.ok) throw new Error("Translation saved, but the list could not be refreshed");
      setRecords((await refreshed.json() as { records: TranslationRecord[] }).records);
      setNotice(interfaceLocale === "zh" ? "翻译已保存。" : "Translation saved.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save translation");
    } finally { setSaving(false); }
  }

  return <section className="translation-workspace" aria-labelledby="translation-heading">
    <div className="translation-heading">
      <span className="eyebrow">{interfaceLocale === "zh" ? "独立语言记录" : "INDEPENDENT LOCALE RECORDS"}</span>
      <h2 id="translation-heading">{interfaceLocale === "zh" ? "扩展语言审核" : "Expansion-language review"}</h2>
      <p>{interfaceLocale === "zh" ? "西班牙语、阿拉伯语和俄语各自保留草稿、验证与发布状态。启用公开路由前仍需完成整站翻译、法律文案和响应式审核。" : "Spanish, Arabic and Russian retain independent draft, verification and publication states. Public routes remain disabled until site-wide copy, legal content and responsive QA are complete."}</p>
    </div>
    <form className="translation-editor" onSubmit={save} dir={localeRegistry[translationLocale].direction}>
      <div className="editor-grid">
        <label><span>{interfaceLocale === "zh" ? "语言" : "Language"}</span><select value={translationLocale} onChange={event => changeLocale(event.target.value as ContentLocale)}>{plannedLocales.map(locale => <option key={locale} value={locale}>{localeRegistry[locale].nativeLabel} · {localeRegistry[locale].label}</option>)}</select></label>
        <label><span>{interfaceLocale === "zh" ? "发布状态" : "Publishing status"}</span><select value={status} onChange={event => setStatus(event.target.value as TranslationRecord["status"])}><option value="draft">Draft</option><option value="review">Review</option><option value="published">Published</option><option value="archived">Archived</option></select></label>
        <label><span>{interfaceLocale === "zh" ? "验证状态" : "Verification status"}</span><select value={verificationStatus} onChange={event => setVerificationStatus(event.target.value as TranslationRecord["verificationStatus"])}><option value="pending">Pending verification</option><option value="verified">Verified</option><option value="rejected">Rejected</option></select></label>
      </div>
      <label><span>{interfaceLocale === "zh" ? "结构化翻译数据" : "Structured translation data"}</span><textarea className="translation-json" rows={16} spellCheck={false} value={dataText} onChange={event => setDataText(event.target.value)} aria-describedby="translation-help"/></label>
      <p id="translation-help" className="field-help">{interfaceLocale === "zh" ? "保留模板字段名，只翻译文本值。数组与规格必须保持有效 JSON 结构。" : "Keep template field names unchanged and translate text values only. Arrays and specification pairs must remain valid JSON."}</p>
      {loading && <p role="status">{interfaceLocale === "zh" ? "正在读取翻译…" : "Loading translations…"}</p>}
      {status === "published" && <p className="publishing-warning">{interfaceLocale === "zh" ? "只有经过母语审核并标记为已验证的翻译才能发布。" : "Only native-language-reviewed translations marked as verified can be published."}</p>}
      {error && <p className="form-message error" role="alert">{error}</p>}
      {notice && <p className="form-message success" role="status">{notice}</p>}
      <button className="button button-dark" type="submit" disabled={saving || loading}>{saving ? (interfaceLocale === "zh" ? "正在保存…" : "Saving…") : (interfaceLocale === "zh" ? "保存翻译" : "Save translation")}</button>
    </form>
  </section>;
}
