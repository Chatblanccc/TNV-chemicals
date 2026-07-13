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
  {
    slug: "how-to-select-water-based-flexo-ink", title: "How to Select Water-Based Flexographic Ink", type: "Selection guide", category: "application-guides", categoryName: "Application guides", updated: "2026-07-13", readingMinutes: 6,
    summary: "A buyer-focused checklist covering substrate, press speed, drying, resistance and color control.",
    relatedProductSlugs: ["water-based-flexographic-ink"], relatedApplicationSlugs: ["paper-corrugated", "flexible-packaging"],
    sections: [
      { heading: "Begin with the substrate, not the color", headingZh: "先确认承印材料，而不是先看颜色", paragraphs: ["Paper, corrugated board and film do not present the same surface, absorbency or treatment. Record the exact substrate supplier, grade, treatment and batch before comparing ink samples.", "A product family can be a useful starting point, but the final grade should follow an application review and a controlled production trial."], paragraphsZh: ["纸张、瓦楞纸板与薄膜的表面、吸收性和处理方式并不相同。比较油墨样品前，应记录准确的材料供应商、等级、表面处理与批次。", "产品系列可以作为起点，但最终牌号仍应经过应用评估与受控生产试验。"] },
      { heading: "Define the production window", headingZh: "明确生产窗口", paragraphs: ["Document press configuration, anilox specification, running speed, drying capacity and downstream converting. These conditions determine whether transfer, drying and press cleanliness can remain stable together."], paragraphsZh: ["记录印刷设备配置、网纹辊规格、运行速度、干燥能力与后加工步骤。这些条件共同影响转移、干燥和设备清洁性能能否保持稳定。"] },
      { heading: "Turn performance language into testable targets", headingZh: "把性能描述转化为可测试目标", paragraphs: ["Replace broad requests such as strong adhesion or good resistance with the actual test method, conditioning time, acceptance threshold and end-use condition. Do not compare results produced with different methods."], paragraphsZh: ["将“附着力强”或“耐性好”等宽泛要求，转化为实际测试方法、调节时间、验收阈值和最终使用条件。不同方法产生的结果不应直接比较。"] },
    ],
    checklist: ["Exact substrate and surface treatment", "Press, anilox and target speed", "Drying configuration and available energy", "Color standard and viewing condition", "Finishing steps and end-use resistance targets"],
    checklistZh: ["准确的承印材料与表面处理", "印刷设备、网纹辊与目标速度", "干燥配置与可用能量", "颜色标准与观察条件", "后加工步骤与最终耐性目标"],
    faq: [["Can one flexographic ink grade work on every substrate?", "No universal result should be assumed. Substrate, treatment, process and end-use requirements need to be qualified together."], ["What should be sent with a sample request?", "Send the substrate, process settings, color target, resistance requirements, estimated volume and the current production issue."]],
    faqZh: [["一种柔版油墨牌号能否适用于所有材料？", "不能假定存在通用结果。承印材料、表面处理、工艺与最终使用要求需要一起评估。"], ["申请样品时应提供哪些信息？", "请提供承印材料、工艺设置、颜色目标、耐性要求、预计用量及当前生产问题。"]],
  },
  {
    slug: "ink-sample-evaluation-checklist", title: "Ink Sample Evaluation Checklist", type: "Technical guide", category: "technical-guides", categoryName: "Technical guides", updated: "2026-07-13", readingMinutes: 7,
    summary: "What to document before, during and after a production trial so results can be compared.",
    relatedProductSlugs: ["water-based-flexographic-ink", "water-based-gravure-ink", "solvent-based-packaging-ink"], relatedApplicationSlugs: ["paper-corrugated", "label-printing"],
    sections: [
      { heading: "Before the trial", headingZh: "试验之前", paragraphs: ["Assign a sample identifier and record the substrate batch, press configuration, target speed, drying setup, color reference and acceptance criteria. Keep a retained sample of every material being compared."], paragraphsZh: ["为样品分配唯一编号，并记录材料批次、设备配置、目标速度、干燥设置、颜色参考与验收标准。对参与比较的每种材料保留样品。"] },
      { heading: "During the trial", headingZh: "试验过程中", paragraphs: ["Change one controlled variable at a time. Record viscosity or other process readings only with the verified method, instrument, temperature and time. Photograph or retain representative print samples at each stable condition."], paragraphsZh: ["每次只改变一个受控变量。仅在明确测试方法、仪器、温度和时间的情况下记录黏度或其他工艺读数，并在每个稳定条件下拍照或保留代表性印样。"] },
      { heading: "After the trial", headingZh: "试验之后", paragraphs: ["Condition samples for the agreed period before testing. Record the method and result for every requirement, then link the approved print, settings and material identifiers in one review record."], paragraphsZh: ["测试前按约定时间对样品进行状态调节。记录每项要求的测试方法与结果，并将批准印样、设备设置和材料编号关联到同一份评审记录中。"] },
    ],
    checklist: ["Sample and batch identifiers", "Substrate supplier, grade and treatment", "Press settings and production speed", "Ambient and drying conditions", "Color, adhesion and resistance results", "Approved sample and reviewer"],
    checklistZh: ["样品与批次编号", "材料供应商、等级与处理方式", "设备设置与生产速度", "环境与干燥条件", "颜色、附着与耐性结果", "批准样品与评审人员"],
    faq: [["Why is one-variable-at-a-time testing useful?", "It makes the source of a performance change easier to identify and reduces misleading comparisons."], ["Should a visually acceptable print be approved immediately?", "Visual appearance is only one checkpoint. Complete the agreed conditioning, finishing and resistance tests first."]],
    faqZh: [["为什么每次只改变一个变量？", "这样更容易识别性能变化的来源，并减少误导性的比较。"], ["外观合格的印样能否立即批准？", "视觉外观只是一个检查点。应先完成约定的状态调节、后加工和耐性测试。"]],
  },
  {
    slug: "tds-sds-coa-explained", title: "TDS, SDS and COA: What Industrial Buyers Need", type: "Procurement guide", category: "procurement-guides", categoryName: "Procurement guides", updated: "2026-07-13", readingMinutes: 5,
    summary: "A practical explanation of the three document types and when to request each one.",
    relatedProductSlugs: [], relatedApplicationSlugs: [],
    sections: [
      { heading: "TDS: product guidance", headingZh: "TDS：产品技术指导", paragraphs: ["A technical data sheet normally describes a product or grade, typical properties, intended use and handling guidance. Typical values should not be treated as a batch certificate or a guaranteed limit unless the document explicitly says so."], paragraphsZh: ["技术数据表通常描述产品或牌号、典型性质、预期用途及操作指导。除非文件明确说明，否则典型值不应被视为批次证明或保证限值。"] },
      { heading: "SDS: hazard and safe handling information", headingZh: "SDS：危害与安全操作信息", paragraphs: ["A safety data sheet communicates classification, hazards, protective measures, storage, transport and emergency information for a defined product and market. Request the current language and jurisdiction-specific version."], paragraphsZh: ["安全数据表针对特定产品和市场传达分类、危害、防护措施、储存、运输与应急信息。应索取当前语言及适用司法辖区的版本。"] },
      { heading: "COA: batch-specific results", headingZh: "COA：批次检测结果", paragraphs: ["A certificate of analysis reports results for an identified batch against the supplier's approved specification. Confirm the batch number, issue date, test items, limits and release status before relying on it."], paragraphsZh: ["分析证书依据供应商批准的规格报告特定批次的结果。使用前应确认批号、签发日期、测试项目、限值及放行状态。"] },
    ],
    checklist: ["Correct product and grade", "Current revision or issue date", "Applicable market and language", "Batch number where relevant", "Named test method and limits where relevant", "Authorized issuer or release status"],
    checklistZh: ["正确的产品与牌号", "当前修订版或签发日期", "适用市场与语言", "相关情况下的批号", "相关情况下的测试方法与限值", "授权签发方或放行状态"],
    faq: [["Can a TDS replace an SDS?", "No. They serve different purposes and should not be treated as interchangeable."], ["Is a COA the same for every shipment?", "A COA should identify the relevant batch. Confirm that it matches the delivered material."], ["When should documents be requested?", "Request them before qualification or purchase when they affect safety, compliance, testing or acceptance."]],
    faqZh: [["TDS 能否替代 SDS？", "不能。两者用途不同，不应互相替代。"], ["每批货物的 COA 是否相同？", "COA 应识别对应批次，并应确认其与交付材料一致。"], ["应在什么时候索取文件？", "当文件影响安全、合规、测试或验收时，应在选型或采购前索取。"]],
  },
];

export const knowledgeCategories = Array.from(new Map(articles.map(article => [article.category, article.categoryName])).entries()).map(([slug, name]) => ({ slug, name }));

export const routePaths = ["/", "/search", "/assistant", "/company-profile", "/products", "/applications", "/custom-solutions", "/quality-compliance", "/technical-library", "/certificates", "/downloads", "/about", "/about/factory", "/about/research-development", "/about/quality-control", "/insights", "/knowledge", "/admin", "/admin/inquiries", "/admin/content", "/admin/seo", "/admin/analytics", "/admin/users", "/contact", "/request-quote", "/privacy-policy", "/terms"];
