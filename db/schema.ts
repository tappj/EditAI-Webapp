import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  installId: text("install_id").notNull(),
  credential: text("credential"),
  ownKey: text("own_key"),
  choice: text("choice"),
  owner: text("owner"),
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
  lastEvent: integer("last_event").notNull().default(0),
  consent: integer("consent").notNull().default(0),
  telemetry: integer("telemetry").notNull().default(1),
});
export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  title: text("title").notNull(),
  document: text("document").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
export const limits = sqliteTable("limits", {
  id: text("id").primaryKey(),
  count: integer("count").notNull(),
  expiresAt: integer("expires_at").notNull(),
});
export const assets = sqliteTable("assets", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  name: text("name").notNull(),
  bytes: integer("bytes").notNull(),
  mime: text("mime").notNull(),
  createdAt: integer("created_at").notNull(),
});
export const usage = sqliteTable("usage", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  kind: text("kind").notNull(),
  model: text("model").notNull(),
  createdAt: integer("created_at").notNull(),
  charge: integer("charge").notNull().default(0),
});

export const speechJobs = sqliteTable("speech_jobs", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  sourceId: text("source_id").notNull(),
  uploadId: text("upload_id").notNull(),
  jobId: text("job_id"),
  status: text("status").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const profiles = sqliteTable("profiles", {
  owner: text("owner").primaryKey(),
  name: text("name").notNull().default(""),
  avatar: text("avatar"),
  updatedAt: integer("updated_at").notNull(),
});

export const accountPreferences = sqliteTable("account_preferences", {
  owner: text("owner").primaryKey(),
  consent: integer("consent"),
  avatarPreset: text("avatar_preset").notNull().default("editAI"),
  appearance: text("appearance"),
});
