export const company = {
  brand: "TNV Chemicals",
  legalName: "[Official English Legal Name — pending verification]",
  email: "[sales email pending]",
  phone: "[phone / WhatsApp pending]",
  address: "[registered factory address pending]",
};

export const products = [
  { slug: "water-based-flexographic-ink", code: "WB-FX Series", name: "Water-Based Flexographic Ink", category: "printing-inks", categoryName: "Printing Inks", use: "Paper, corrugated board and selected film applications", benefits: ["Fast drying", "Clean press performance", "Custom color matching"], specs: [["Color", "Custom / Pantone reference"], ["Viscosity", "To be verified by grade"], ["Solid content", "To be verified by grade"], ["Packaging", "To be verified"], ["Shelf life", "To be verified"]] },
  { slug: "water-based-gravure-ink", code: "WB-GR Series", name: "Water-Based Gravure Ink", category: "printing-inks", categoryName: "Printing Inks", use: "High-volume paper and selected flexible packaging printing", benefits: ["Controlled transfer", "Stable tone", "Application-led formulation"], specs: [["Color", "Custom color matching"], ["Viscosity", "To be verified by grade"], ["Substrate", "Paper / verified films"], ["Packaging", "To be verified"], ["Shelf life", "To be verified"]] },
  { slug: "solvent-based-packaging-ink", code: "SB-PK Series", name: "Solvent-Based Packaging Ink", category: "printing-inks", categoryName: "Printing Inks", use: "Flexible packaging structures requiring reliable print performance", benefits: ["Strong color development", "Controlled drying", "Substrate-specific grades"], specs: [["Print method", "Gravure / flexographic options"], ["Resin system", "To be verified"], ["Color", "Custom"], ["Packaging", "To be verified"], ["Storage", "Refer to verified SDS"]] },
  { slug: "industrial-color-concentrate", code: "CC-IND Series", name: "Industrial Color Concentrate", category: "colorants", categoryName: "Colorants & Concentrates", use: "Industrial tinting and formulation workflows", benefits: ["Repeatable dosing", "Color development", "Formulation support"], specs: [["Carrier", "To be verified"], ["Color strength", "To be verified"], ["Compatibility", "Application test required"], ["Packaging", "To be verified"], ["MOQ", "To be verified"]] },
  { slug: "functional-printing-additive", code: "AD-FN Series", name: "Functional Printing Additive", category: "additives", categoryName: "Functional Additives", use: "Fine-tuning flow, drying and surface performance", benefits: ["Targeted adjustment", "Small-batch evaluation", "Technical guidance"], specs: [["Function", "Grade dependent"], ["Recommended dosage", "Testing required"], ["Appearance", "To be verified"], ["Packaging", "To be verified"], ["Storage", "To be verified"]] },
  { slug: "custom-ink-formulation", code: "CUSTOM", name: "Custom Ink Formulation", category: "custom-solutions", categoryName: "Custom Solutions", use: "Buyer-specific substrate, process and performance requirements", benefits: ["Application briefing", "Lab sample pathway", "Scale-up support"], specs: [["Inputs required", "Substrate, press, speed, target performance"], ["Sample", "Subject to technical review"], ["MOQ", "To be confirmed"], ["Lead time", "To be confirmed"], ["Documentation", "Available after validation"]] },
];

export const applications = [
  { slug: "flexible-packaging", name: "Flexible Packaging", intro: "Select an ink system around the film structure, print method, drying capacity and end-use performance—not color alone.", challenges: ["Adhesion across changing film treatments", "Drying balance at production speed", "Resistance targets after lamination"] },
  { slug: "paper-corrugated", name: "Paper & Corrugated", intro: "Build reliable print density and rub performance while respecting absorbency, press speed and downstream converting.", challenges: ["Variation in paper absorbency", "Color consistency between batches", "Fast turnaround and press cleanliness"] },
  { slug: "label-printing", name: "Labels & Specialty Print", intro: "Match the formulation to the label stock, press configuration and finishing process for a stable production window.", challenges: ["Fine graphics and text definition", "Surface resistance", "Compatibility with coatings and adhesives"] },
];

export const articles = [
  { slug: "how-to-select-water-based-flexo-ink", title: "How to Select Water-Based Flexographic Ink", type: "Selection guide", summary: "A buyer-focused checklist covering substrate, press speed, drying, resistance and color control." },
  { slug: "ink-sample-evaluation-checklist", title: "Ink Sample Evaluation Checklist", type: "Technical guide", summary: "What to document before, during and after a production trial so results can be compared." },
  { slug: "tds-sds-coa-explained", title: "TDS, SDS and COA: What Industrial Buyers Need", type: "Procurement guide", summary: "A practical explanation of the three document types and when to request each one." },
];

export const routePaths = ["/", "/products", ...products.map(p => `/products/${p.category}/${p.slug}`), "/applications", ...applications.map(a => `/applications/${a.slug}`), "/custom-solutions", "/quality-compliance", "/technical-library", "/about", "/about/factory", "/about/research-development", "/about/quality-control", "/insights", ...articles.map(a => `/insights/${a.slug}`), "/contact", "/request-quote", "/privacy-policy", "/terms"];
