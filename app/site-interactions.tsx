"use client";

import Link from "next/link";
import { ArrowUpRight, List, X } from "@phosphor-icons/react";
import { useRef, useState } from "react";

type NavItem = { href: string; label: string };

export function MobileNav({ items, ctaHref, ctaLabel }: { items: NavItem[]; ctaHref: string; ctaLabel: string }) {
  const [open, setOpen] = useState(false);
  return <div className="mobile-nav">
    <button className="menu-button" type="button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(value => !value)}>
      {open ? <X size={23} weight="regular" /> : <List size={25} weight="regular" />}
    </button>
    {open && <div className="mobile-menu" id="mobile-menu">
      <nav aria-label="Mobile navigation">{items.map(item => <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}<ArrowUpRight size={18} /></Link>)}</nav>
      <Link className="button" href={ctaHref} onClick={() => setOpen(false)}>{ctaLabel}<ArrowUpRight size={18} /></Link>
    </div>}
  </div>;
}

type InquiryErrors = Partial<Record<"email" | "area" | "company" | "country" | "requirement", string>>;

export function InquiryForm({ compact = false, labels }: {
  compact?: boolean;
  labels: Record<string, string>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<InquiryErrors>({});
  const [status, setStatus] = useState<"idle" | "preparing" | "ready">("idle");
  const clearError = (name: keyof InquiryErrors) => setErrors(current => current[name] ? { ...current, [name]: undefined } : current);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") || "").trim();
    const next: InquiryErrors = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = labels.emailError;
    if (!data.get("area")) next.area = labels.areaError;
    if (!compact) {
      if (!String(data.get("company") || "").trim()) next.company = labels.requiredError;
      if (!String(data.get("country") || "").trim()) next.country = labels.requiredError;
      if (!String(data.get("requirement") || "").trim()) next.requirement = labels.requirementError;
    }
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setStatus("preparing");
    window.setTimeout(() => setStatus("ready"), 650);
  };

  if (status === "ready") return <div className="inquiry-ready" role="status" aria-live="polite">
    <span>{labels.readyEyebrow}</span>
    <h3>{labels.readyTitle}</h3>
    <p>{labels.readyBody}</p>
    <button type="button" className="text-button" onClick={() => setStatus("idle")}>{labels.editDraft}</button>
  </div>;

  const fieldError = (name: keyof InquiryErrors) => errors[name] ? <span className="field-error" id={`${name}-error`}>{errors[name]}</span> : null;

  return <form ref={formRef} className="inquiry-form" noValidate onSubmit={submit} aria-label={labels.formLabel}>
    <label>{labels.email}
      <input name="email" type="email" placeholder="name@company.com" onChange={() => clearError("email")} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} />
      {fieldError("email")}
    </label>
    <label>{labels.area}
      <select name="area" defaultValue="" onChange={() => clearError("area")} aria-invalid={Boolean(errors.area)} aria-describedby={errors.area ? "area-error" : undefined}>
        <option value="" disabled>{labels.selectArea}</option>
        <option value="printing-inks">{labels.printingInks}</option>
        <option value="colorants">{labels.colorants}</option>
        <option value="additives">{labels.additives}</option>
        <option value="custom">{labels.custom}</option>
      </select>
      {fieldError("area")}
    </label>
    {!compact && <>
      <label>{labels.company}<input name="company" placeholder={labels.companyPlaceholder} onChange={() => clearError("company")} aria-invalid={Boolean(errors.company)} aria-describedby={errors.company ? "company-error" : undefined} />{fieldError("company")}</label>
      <label>{labels.country}<input name="country" placeholder={labels.countryPlaceholder} onChange={() => clearError("country")} aria-invalid={Boolean(errors.country)} aria-describedby={errors.country ? "country-error" : undefined} />{fieldError("country")}</label>
      <label className="full">{labels.requirement}<textarea name="requirement" rows={4} placeholder={labels.requirementPlaceholder} onChange={() => clearError("requirement")} aria-invalid={Boolean(errors.requirement)} aria-describedby={errors.requirement ? "requirement-error" : undefined} />{fieldError("requirement")}</label>
    </>}
    <button type="submit" className="button" disabled={status === "preparing"}>{status === "preparing" ? labels.preparing : labels.prepare}<ArrowUpRight size={18} /></button>
    <small>{labels.demoNote}</small>
  </form>;
}
