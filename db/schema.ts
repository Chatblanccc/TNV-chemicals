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
