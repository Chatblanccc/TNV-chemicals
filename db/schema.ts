import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const customers = sqliteTable("customers", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  company: text("company").notNull(),
  country: text("country").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, table => [uniqueIndex("customers_email_unique").on(table.email)]);

export const inquiries = sqliteTable("inquiries", {
  id: text("id").primaryKey(),
  customerId: text("customer_id").notNull().references(() => customers.id),
  status: text("status", { enum: ["new", "contacted", "quotation_sent", "negotiation", "completed", "archived"] }).notNull().default("new"),
  area: text("area").notNull(),
  productCode: text("product_code"),
  requirement: text("requirement").notNull(),
  locale: text("locale", { enum: ["en", "zh"] }).notNull().default("en"),
  notificationStatus: text("notification_status", { enum: ["not_configured", "pending", "sent", "failed"] }).notNull().default("not_configured"),
  sourcePath: text("source_path"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, table => [index("inquiries_status_created_idx").on(table.status, table.createdAt), index("inquiries_customer_idx").on(table.customerId)]);

export const inquiryEvents = sqliteTable("inquiry_events", {
  id: text("id").primaryKey(),
  inquiryId: text("inquiry_id").notNull().references(() => inquiries.id),
  eventType: text("event_type", { enum: ["created", "status_changed", "notification_sent", "notification_failed"] }).notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status"),
  actorEmail: text("actor_email"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, table => [index("inquiry_events_inquiry_idx").on(table.inquiryId, table.createdAt)]);

export const adminUsers = sqliteTable("admin_users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  role: text("role", { enum: ["admin", "marketing", "sales", "editor"] }).notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, table => [uniqueIndex("admin_users_email_unique").on(table.email)]);

export const cmsProducts = sqliteTable("cms_products", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  code: text("code").notNull(),
  category: text("category").notNull(),
  status: text("status", { enum: ["draft", "review", "published", "archived"] }).notNull().default("draft"),
  verificationStatus: text("verification_status", { enum: ["pending", "verified", "rejected"] }).notNull().default("pending"),
  dataJson: text("data_json").notNull(),
  updatedBy: text("updated_by").notNull(),
  publishedAt: integer("published_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, table => [uniqueIndex("cms_products_slug_unique").on(table.slug), index("cms_products_status_idx").on(table.status, table.updatedAt)]);

export const cmsArticles = sqliteTable("cms_articles", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  category: text("category").notNull(),
  status: text("status", { enum: ["draft", "review", "published", "archived"] }).notNull().default("draft"),
  verificationStatus: text("verification_status", { enum: ["pending", "verified", "rejected"] }).notNull().default("pending"),
  dataJson: text("data_json").notNull(),
  updatedBy: text("updated_by").notNull(),
  publishedAt: integer("published_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, table => [uniqueIndex("cms_articles_slug_unique").on(table.slug), index("cms_articles_status_idx").on(table.status, table.updatedAt)]);

export const certificates = sqliteTable("certificates", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  type: text("type").notNull(),
  status: text("status", { enum: ["draft", "review", "published", "archived"] }).notNull().default("draft"),
  verificationStatus: text("verification_status", { enum: ["pending", "verified", "rejected"] }).notNull().default("pending"),
  dataJson: text("data_json").notNull(),
  updatedBy: text("updated_by").notNull(),
  publishedAt: integer("published_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, table => [uniqueIndex("certificates_slug_unique").on(table.slug), index("certificates_status_idx").on(table.status, table.updatedAt)]);

export const downloads = sqliteTable("downloads", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull(),
  type: text("type", { enum: ["sds", "tds", "coa", "catalog", "certificate", "other"] }).notNull(),
  status: text("status", { enum: ["draft", "review", "published", "archived"] }).notNull().default("draft"),
  verificationStatus: text("verification_status", { enum: ["pending", "verified", "rejected"] }).notNull().default("pending"),
  dataJson: text("data_json").notNull(),
  updatedBy: text("updated_by").notNull(),
  publishedAt: integer("published_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, table => [uniqueIndex("downloads_slug_unique").on(table.slug), index("downloads_status_idx").on(table.status, table.updatedAt)]);

export const seoMetadata = sqliteTable("seo_metadata", {
  id: text("id").primaryKey(),
  path: text("path").notNull(),
  locale: text("locale", { enum: ["en", "zh"] }).notNull(),
  status: text("status", { enum: ["draft", "published"] }).notNull().default("draft"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  keywordsJson: text("keywords_json").notNull().default("[]"),
  updatedBy: text("updated_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
}, table => [uniqueIndex("seo_metadata_path_locale_unique").on(table.path, table.locale), index("seo_metadata_status_idx").on(table.status, table.updatedAt)]);

export const contentEvents = sqliteTable("content_events", {
  id: text("id").primaryKey(),
  entityType: text("entity_type", { enum: ["product", "article", "certificate", "download", "seo", "admin_user"] }).notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action", { enum: ["created", "updated", "submitted", "published", "unpublished", "archived", "role_changed"] }).notNull(),
  actorEmail: text("actor_email").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
}, table => [index("content_events_entity_idx").on(table.entityType, table.entityId, table.createdAt)]);
