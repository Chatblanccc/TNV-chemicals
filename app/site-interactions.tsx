"use client";

import Link from "next/link";
import { ArrowUpRight, List, X } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

type NavItem = { href: string; label: string };

export function MobileNav({ items, ctaHref, ctaLabel, languageHref, languageLabel, labels }: { items: NavItem[]; ctaHref: string; ctaLabel: string; languageHref: string; languageLabel: string; labels: { open: string; close: string; navigation: string } }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        window.requestAnimationFrame(() => buttonRef.current?.focus());
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);
  return <div className="mobile-nav">
    <button ref={buttonRef} className="menu-button" type="button" aria-label={open ? labels.close : labels.open} aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(value => !value)}>
      {open ? <X size={23} weight="regular" /> : <List size={25} weight="regular" />}
    </button>
    {open && <div className="mobile-menu" id="mobile-menu">
      <nav aria-label={labels.navigation}>{items.map(item => <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>{item.label}<ArrowUpRight size={18} /></Link>)}</nav>
      <Link className="mobile-language" href={languageHref} onClick={() => setOpen(false)}>{languageLabel}<ArrowUpRight size={18} /></Link>
      <Link className="button" href={ctaHref} onClick={() => setOpen(false)}>{ctaLabel}<ArrowUpRight size={18} /></Link>
    </div>}
  </div>;
}

type InquiryErrors = Partial<Record<"email" | "area" | "company" | "country" | "quantity" | "unit" | "requirement" | "privacyAccepted", string>>;

export function InquiryForm({ compact = false, labels, productCode, initialRequirement, locale = "en", privacyHref }: {
  compact?: boolean;
  labels: Record<string, string>;
  productCode?: string;
  initialRequirement?: string;
  locale?: "en" | "zh";
  privacyHref?: string;
}) {
  return <InquiryFormInner compact={compact} labels={labels} productCode={productCode} initialRequirement={initialRequirement} locale={locale} privacyHref={privacyHref} />;
}

function InquiryFormInner({ compact = false, labels, productCode, initialRequirement, locale = "en", privacyHref = "/en/privacy-policy" }: {
  compact?: boolean;
  labels: Record<string, string>;
  productCode?: string;
  initialRequirement?: string;
  locale?: "en" | "zh";
  privacyHref?: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<InquiryErrors>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "ready" | "success" | "error">("idle");
  const [inquiryId, setInquiryId] = useState("");
  const clearError = (name: keyof InquiryErrors) => setErrors(current => current[name] ? { ...current, [name]: undefined } : current);
  const defaultArea = productCode?.startsWith("CC-") ? "colorants" : productCode?.startsWith("AD-") ? "additives" : productCode === "CUSTOM" ? "custom" : productCode ? "printing-inks" : "";

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") || "").trim();
    const next: InquiryErrors = {};
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = labels.emailError;
    if (!data.get("area")) next.area = labels.areaError;
    if (!compact) {
      if (!String(data.get("company") || "").trim()) next.company = labels.requiredError;
      if (!String(data.get("country") || "").trim()) next.country = labels.requiredError;
      const quantity = Number(String(data.get("quantity") || "").trim());
      if (!Number.isFinite(quantity) || quantity <= 0) next.quantity = labels.quantityError;
      if (!String(data.get("unit") || "").trim()) next.unit = labels.requiredError;
      if (!String(data.get("requirement") || "").trim()) next.requirement = labels.requirementError;
      if (data.get("privacyAccepted") !== "on") next.privacyAccepted = labels.privacyError;
    }
    setErrors(next);
    const first = Object.keys(next)[0];
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    if (compact) {
      setStatus("ready");
      return;
    }
    setStatus("submitting");
    try {
      const response = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          area: data.get("area"),
          company: data.get("company"),
          country: data.get("country"),
          phone: data.get("phone"),
          quantity: data.get("quantity"),
          unit: data.get("unit"),
          requirement: data.get("requirement"),
          privacyAccepted: data.get("privacyAccepted") === "on",
          productCode,
          locale,
          sourcePath: window.location.pathname,
          website: data.get("website"),
        }),
      });
      const result = await response.json() as { inquiryId?: string };
      if (!response.ok || !result.inquiryId) throw new Error("delivery failed");
      setInquiryId(result.inquiryId);
      setStatus("success");
      formRef.current?.reset();
    } catch {
      setStatus("error");
    }
  };

  if (status === "ready") return <div className="inquiry-ready" role="status" aria-live="polite">
    <span>{labels.readyEyebrow}</span>
    <h3>{labels.readyTitle}</h3>
    <p>{labels.readyBody}</p>
    <button type="button" className="text-button" onClick={() => setStatus("idle")}>{labels.editDraft}</button>
  </div>;

  if (status === "success") return <div className="inquiry-ready" role="status" aria-live="polite">
    <span>{labels.successEyebrow}</span>
    <h3>{labels.successTitle}</h3>
    <p>{labels.successBody}</p>
    <p className="inquiry-reference">{labels.reference}: <strong>{inquiryId}</strong></p>
  </div>;

  const fieldError = (name: keyof InquiryErrors) => errors[name] ? <span className="field-error" id={`${name}-error`}>{errors[name]}</span> : null;

  return <form ref={formRef} className="inquiry-form" action="/api/inquiry" method="post" noValidate onSubmit={submit} aria-label={labels.formLabel}>
    <input className="honeypot" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
    {productCode && <label className="full">{labels.productCode}<input name="productCode" value={productCode} readOnly /></label>}
    <label>{labels.email}
      <input name="email" type="email" placeholder="name@company.com" required autoComplete="email" onChange={() => clearError("email")} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} />
      {fieldError("email")}
    </label>
    <label>{labels.area}
      <select name="area" defaultValue={defaultArea} required onChange={() => clearError("area")} aria-invalid={Boolean(errors.area)} aria-describedby={errors.area ? "area-error" : undefined}>
        <option value="" disabled>{labels.selectArea}</option>
        <option value="printing-inks">{labels.printingInks}</option>
        <option value="colorants">{labels.colorants}</option>
        <option value="additives">{labels.additives}</option>
        <option value="custom">{labels.custom}</option>
      </select>
      {fieldError("area")}
    </label>
    {!compact && <>
      <label>{labels.company}<input name="company" required autoComplete="organization" placeholder={labels.companyPlaceholder} onChange={() => clearError("company")} aria-invalid={Boolean(errors.company)} aria-describedby={errors.company ? "company-error" : undefined} />{fieldError("company")}</label>
      <label>{labels.country}<input name="country" required autoComplete="country-name" placeholder={labels.countryPlaceholder} onChange={() => clearError("country")} aria-invalid={Boolean(errors.country)} aria-describedby={errors.country ? "country-error" : undefined} />{fieldError("country")}</label>
      <label>{labels.phone}<input name="phone" type="tel" maxLength={100} autoComplete="tel" placeholder={labels.phonePlaceholder} /></label>
      <label>{labels.quantity}<span className="quantity-field"><input name="quantity" type="number" min="0.01" step="any" inputMode="decimal" required placeholder={labels.quantityPlaceholder} onChange={() => clearError("quantity")} aria-invalid={Boolean(errors.quantity)} aria-describedby={errors.quantity ? "quantity-error" : undefined} /><select name="unit" defaultValue="" required onChange={() => clearError("unit")} aria-label={labels.unit} aria-invalid={Boolean(errors.unit)} aria-describedby={errors.unit ? "unit-error" : undefined}><option value="" disabled>{labels.unit}</option><option value="kg">{labels.unitKg}</option><option value="metric-tonne">{labels.unitTonne}</option><option value="litre">{labels.unitLitre}</option><option value="other">{labels.unitOther}</option></select></span>{fieldError("quantity")}{fieldError("unit")}</label>
      <label className="full">{labels.requirement}<textarea name="requirement" required maxLength={5000} rows={4} defaultValue={initialRequirement} placeholder={labels.requirementPlaceholder} onChange={() => clearError("requirement")} aria-invalid={Boolean(errors.requirement)} aria-describedby={errors.requirement ? "requirement-error" : undefined} />{fieldError("requirement")}</label>
      <label className="privacy-field full"><input name="privacyAccepted" type="checkbox" required onChange={() => clearError("privacyAccepted")} aria-invalid={Boolean(errors.privacyAccepted)} aria-describedby={errors.privacyAccepted ? "privacyAccepted-error" : undefined} /><span>{labels.privacyPrefix} <Link href={privacyHref}>{labels.privacyLink}</Link></span>{fieldError("privacyAccepted")}</label>
    </>}
    {status === "error" && <div className="form-status form-status-error full" role="alert">{labels.deliveryError}</div>}
    <button type="submit" className="button" disabled={status === "submitting"}>{status === "submitting" ? labels.preparing : labels.prepare}<ArrowUpRight size={18} /></button>
    <small>{labels.demoNote}</small>
  </form>;
}
