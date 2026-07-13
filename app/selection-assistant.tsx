"use client";

import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react";
import { useState } from "react";
import type { PublishedProduct } from "./published-content";

type Result = { configured?: boolean; status?: string; message?: string; summary?: string; productSlugs?: string[]; questions?: string[]; error?: string };

export function SelectionAssistant({ locale, products }: { locale: "en" | "zh"; products: PublishedProduct[] }) {
  const [requirement, setRequirement] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "result" | "error">("idle");
  const [result, setResult] = useState<Result | null>(null);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("loading");
    setResult(null);
    try {
      const response = await fetch("/api/assistant/recommend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requirement, locale, context: "TNV Chemicals public selection assistant" }) });
      const payload = await response.json() as Result;
      setResult(payload);
      setStatus(response.ok ? "result" : payload.status === "not_connected" ? "result" : "error");
    } catch { setResult({ message: locale === "zh" ? "推荐服务暂时不可用，请提交技术询盘。" : "The recommendation service is unavailable. Submit a technical inquiry instead." }); setStatus("error"); }
  };
  const related = products.filter(product => result?.productSlugs?.includes(product.slug));
  const inquiryHref = `/${locale}/request-quote?brief=${encodeURIComponent(requirement.slice(0, 1000))}`;
  return <main><section className="assistant-hero"><div><span className="eyebrow">{locale === "zh" ? "选型助手接口" : "SELECTION ASSISTANT"}</span><h1>{locale === "zh" ? "先描述生产需求，再进入人工核实。" : "Describe the production need, then move into human verification."}</h1><p>{locale === "zh" ? "该入口为未来 AI 推荐服务保留。任何推荐都必须基于已验证产品数据，并在报价或试样前由技术人员复核。" : "This interface reserves the future AI recommendation service. Any recommendation must use verified product data and receive technical review before quotation or sampling."}</p></div><div className="assistant-boundary"><span>{locale === "zh" ? "发布边界" : "PUBLICATION BOUNDARY"}</span><ul><li>{locale === "zh" ? "不会生成未核实的产品参数" : "No invented product parameters"}</li><li>{locale === "zh" ? "不会把模型输出当作技术承诺" : "Model output is not a technical commitment"}</li><li>{locale === "zh" ? "可将需求带入正式询盘" : "Requirements can continue into a formal inquiry"}</li></ul></div></section><section className="assistant-workspace"><form onSubmit={submit}><label htmlFor="assistant-requirement">{locale === "zh" ? "生产需求" : "Production requirement"}</label><textarea id="assistant-requirement" required minLength={20} maxLength={2000} rows={8} value={requirement} onChange={event => setRequirement(event.target.value)} placeholder={locale === "zh" ? "请说明承印材料、印刷方式、设备速度、干燥条件、后加工与目标性能。" : "Describe the substrate, print method, press speed, drying, finishing and target performance."}/><button className="button button-dark" type="submit" disabled={status === "loading"}>{status === "loading" ? (locale === "zh" ? "正在分析…" : "Analyzing…") : (locale === "zh" ? "分析需求" : "Analyze requirement")}<ArrowUpRight aria-hidden="true" size={17}/></button></form><div className="assistant-result" aria-live="polite">{status === "idle" ? <p>{locale === "zh" ? "输入详细需求后，系统会调用已配置的推荐服务；若尚未接入，则直接转入人工询盘。" : "Enter a detailed requirement. The configured recommendation service will respond, or the workflow will move directly to a human inquiry if it is not connected."}</p> : result && <><span className="eyebrow">{result.status === "review_required" ? (locale === "zh" ? "需要人工复核" : "HUMAN REVIEW REQUIRED") : (locale === "zh" ? "服务状态" : "SERVICE STATUS")}</span><h2>{result.summary || result.message || result.error}</h2>{related.length > 0 && <div className="assistant-products">{related.map(product => <Link key={product.slug} href={`/${locale}/products/${product.category}/${product.slug}`}><span>{product.code}</span><b>{locale === "zh" ? product.nameZh || product.name : product.name}</b><ArrowUpRight aria-hidden="true" size={17}/></Link>)}</div>}{result.questions?.length ? <ul>{result.questions.map(question => <li key={question}>{question}</li>)}</ul> : null}<Link className="button" href={inquiryHref}>{locale === "zh" ? "转入技术询盘" : "Continue to technical inquiry"}<ArrowUpRight aria-hidden="true" size={17}/></Link></>}</div></section></main>;
}
