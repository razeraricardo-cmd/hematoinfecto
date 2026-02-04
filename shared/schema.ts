import { pgTable, text, serial, integer, boolean, timestamp, jsonb, date, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// === USERS TABLE (Autenticação Multi-usuário) ===
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(), // hashed
  name: text("name").notNull(),
  role: text("role").notNull().default("resident"), // "resident" | "preceptor" | "admin"
  crm: text("crm"),
  institution: text("institution").default("IIER/HSP-UNIFESP"),
  isActive: boolean("is_active").default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// === CULTURES TABLE (Culturas para alertas) ===
export const cultures = pgTable("cultures", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "HMC" | "URC" | "LBA" | "LCR" | "Swab" | "Secreção" | "Outro"
  site: text("site"), // Local de coleta: "SP", "CVC MSD", "AVP MSE", etc.
  collectionDate: timestamp("collection_date").notNull(),
  resultDate: timestamp("result_date"),
  status: text("status").notNull().default("pending"), // "pending" | "negative" | "positive" | "contaminated"
  organism: text("organism"), // Organismo isolado
  antibiogram: jsonb("antibiogram"), // Antibiograma
  positivityTime: text("positivity_time"), // Tempo de positividade (TP)
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// === ANTIBIOTICS TABLE (Controle de ATB com dias) ===
export const antibiotics = pgTable("antibiotics", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // Nome do ATB
  dose: text("dose"), // Dose
  frequency: text("frequency"), // Frequência (ex: "6/6h", "12/12h")
  route: text("route").default("IV"), // Via: "IV", "VO", "IM"
  startDate: timestamp("start_date").notNull(), // D1
  endDate: timestamp("end_date"), // Data de término (se finalizado)
  indication: text("indication"), // Indicação
  status: text("status").notNull().default("active"), // "active" | "completed" | "suspended"
  suspensionReason: text("suspension_reason"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// === ALERTS TABLE (Sistema de Alertas) ===
export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "culture_pending" | "atb_review" | "lab_critical" | "prophylaxis" | "custom"
  priority: text("priority").notNull().default("medium"), // "low" | "medium" | "high" | "critical"
  title: text("title").notNull(),
  message: text("message").notNull(),
  dueDate: timestamp("due_date"), // Data limite/agendamento
  isRead: boolean("is_read").default(false),
  isResolved: boolean("is_resolved").default(false),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: integer("resolved_by").references(() => users.id),
  relatedCultureId: integer("related_culture_id").references(() => cultures.id),
  relatedAntibioticId: integer("related_antibiotic_id").references(() => antibiotics.id),
  metadata: jsonb("metadata"), // Dados adicionais
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// === TEMPLATES TABLE (Templates Personalizáveis) ===
export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // "evolution" | "interconsulta" | "alta" | "custom"
  content: text("content").notNull(), // Template com placeholders
  variables: jsonb("variables"), // Lista de variáveis do template
  isDefault: boolean("is_default").default(false),
  isPublic: boolean("is_public").default(true), // Visível para todos
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// === AUDIT LOGS TABLE (Histórico de Alterações) ===
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(), // "create" | "update" | "delete" | "export" | "login" | "logout"
  entityType: text("entity_type").notNull(), // "patient" | "evolution" | "culture" | "antibiotic" | etc.
  entityId: integer("entity_id"),
  previousData: jsonb("previous_data"), // Dados anteriores (para update/delete)
  newData: jsonb("new_data"), // Novos dados (para create/update)
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// === DASHBOARD STATS TABLE (Cache de estatísticas) ===
export const dashboardStats = pgTable("dashboard_stats", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  totalPatients: integer("total_patients").default(0),
  activePatients: integer("active_patients").default(0),
  neutropenicPatients: integer("neutropenic_patients").default(0),
  colonizedPatients: integer("colonized_patients").default(0),
  pendingCultures: integer("pending_cultures").default(0),
  activeAntibiotics: integer("active_antibiotics").default(0),
  byUnit: jsonb("by_unit"), // { "Hematologia": 10, "TMO": 5, "Externos": 3 }
  byColonization: jsonb("by_colonization"), // { "KPC": 3, "VRE": 2, "NDM": 1 }
  createdAt: timestamp("created_at").defaultNow(),
});

// === PATIENTS TABLE ===
export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  
  // Leito/Localização
  leito: text("leito"), // Ex: "CMM A0307"
  unidade: text("unidade"), // Ex: "Hematologia", "TMO", "Externos"
  
  // Datas importantes
  dih: timestamp("dih").notNull(), // Data de Internação Hospitalar
  
  // HD Hemato
  hematologicalDiagnosis: text("hematological_diagnosis").notNull(),
  hematologicalDiagnosisDate: timestamp("hematological_diagnosis_date"),
  
  // Tratamento Hemato
  currentProtocol: text("current_protocol"), // Protocolo QT atual
  previousProtocols: text("previous_protocols"), // Histórico
  tcth: text("tcth"), // Transplante de Células-Tronco Hematopoiéticas
  
  // Colonização (Vigilância)
  colonization: text("colonization"), // KPC, NDM, VRE, ESBL, etc
  colonizationDate: timestamp("colonization_date"),
  
  // HD Outros / Comorbidades
  comorbidities: text("comorbidities"),
  antecedents: text("antecedents"),
  
  // Checklist Pré-QT
  ecoTT: text("eco_tt"),
  carenciais: text("carenciais"),
  serologias: text("serologias"),
  ivermectina: text("ivermectina"),
  
  // Profilaxias Atuais
  prophylaxis: text("prophylaxis"),
  
  // MUC - Medicações de Uso Contínuo
  muc: text("muc"),
  
  // Preceptor padrão
  defaultPreceptor: text("default_preceptor"),
  
  // Status
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// === EVOLUTIONS TABLE ===
export const evolutions = pgTable("evolutions", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  date: timestamp("date").defaultNow().notNull(),
  content: text("content").notNull(), // The full evolution text
  
  // Impressão do caso (resumo)
  impression: text("impression"),
  
  // Dados estruturados para referência
  hdInfecto: jsonb("hd_infecto"), // Lista de diagnósticos infecciosos
  hdResolvidos: jsonb("hd_resolvidos"), // Problemas resolvidos
  atbAtuais: jsonb("atb_atuais"), // ATBs atuais com D1
  atbPrevios: jsonb("atb_previos"), // ATBs prévios
  labs: jsonb("labs"), // Labs do dia
  devices: jsonb("devices"), // Dispositivos
  exams: jsonb("exams"), // Exames físicos
  images: jsonb("images"), // Imagens
  cultures: jsonb("cultures"), // Culturas
  pendencies: jsonb("pendencies"), // Aguarda
  conducts: jsonb("conducts"), // Condutas
  
  // Sugestões de leitura
  readingSuggestions: jsonb("reading_suggestions"),
  
  // Alertas de dados faltantes
  missingDataAlerts: jsonb("missing_data_alerts"),
  
  // Metadata
  preceptorName: text("preceptor_name"),
  isDraft: boolean("is_draft").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// === PATIENT MESSAGES (Chat por paciente) ===
export const patientMessages = pgTable("patient_messages", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull().references(() => patients.id),
  role: text("role").notNull(), // "user" | "assistant"
  content: text("content").notNull(),
  
  // Tipo de mensagem
  messageType: text("message_type").default("chat"), // "chat" | "evolution" | "alert" | "summary"
  
  // Referência à evolução gerada (se aplicável)
  evolutionId: integer("evolution_id").references(() => evolutions.id),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===
export const patientsRelations = relations(patients, ({ many }) => ({
  evolutions: many(evolutions),
  messages: many(patientMessages),
}));

export const evolutionsRelations = relations(evolutions, ({ one }) => ({
  patient: one(patients, {
    fields: [evolutions.patientId],
    references: [patients.id],
  }),
}));

export const patientMessagesRelations = relations(patientMessages, ({ one }) => ({
  patient: one(patients, {
    fields: [patientMessages.patientId],
    references: [patients.id],
  }),
  evolution: one(evolutions, {
    fields: [patientMessages.evolutionId],
    references: [evolutions.id],
  }),
}));

// === SCHEMAS ===
export const insertPatientSchema = createInsertSchema(patients).omit({ 
  id: true, 
  createdAt: true,
  updatedAt: true,
});

export const insertEvolutionSchema = createInsertSchema(evolutions).omit({ 
  id: true, 
  createdAt: true 
});

export const insertPatientMessageSchema = createInsertSchema(patientMessages).omit({
  id: true,
  createdAt: true,
});

// === API CONTRACT TYPES ===
export type Patient = typeof patients.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;

export type Evolution = typeof evolutions.$inferSelect;
export type InsertEvolution = z.infer<typeof insertEvolutionSchema>;

export type PatientMessage = typeof patientMessages.$inferSelect;
export type InsertPatientMessage = z.infer<typeof insertPatientMessageSchema>;

export type CreatePatientRequest = InsertPatient;
export type UpdatePatientRequest = Partial<InsertPatient>;

export type CreateEvolutionRequest = InsertEvolution & {
  rawInput?: string;
  previousEvolutionId?: number;
};

export type GenerateEvolutionRequest = {
  patientId: number;
  rawInput: string;
  includeImpression?: boolean;
  includeSuggestions?: boolean;
};

export type SendMessageRequest = {
  patientId: number;
  content: string;
};

export type GenerationResponse = {
  content: string;
  impression?: string;
  missingDataAlerts?: string[];
  readingSuggestions?: { title: string; source: string; summary: string }[];
  structuredData?: Record<string, unknown>;
};

// === NEW RELATIONS ===
export const usersRelations = relations(users, ({ many }) => ({
  cultures: many(cultures),
  antibiotics: many(antibiotics),
  alerts: many(alerts),
  templates: many(templates),
  auditLogs: many(auditLogs),
}));

export const culturesRelations = relations(cultures, ({ one }) => ({
  patient: one(patients, {
    fields: [cultures.patientId],
    references: [patients.id],
  }),
  createdByUser: one(users, {
    fields: [cultures.createdBy],
    references: [users.id],
  }),
}));

export const antibioticsRelations = relations(antibiotics, ({ one }) => ({
  patient: one(patients, {
    fields: [antibiotics.patientId],
    references: [patients.id],
  }),
  createdByUser: one(users, {
    fields: [antibiotics.createdBy],
    references: [users.id],
  }),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  patient: one(patients, {
    fields: [alerts.patientId],
    references: [patients.id],
  }),
  relatedCulture: one(cultures, {
    fields: [alerts.relatedCultureId],
    references: [cultures.id],
  }),
  relatedAntibiotic: one(antibiotics, {
    fields: [alerts.relatedAntibioticId],
    references: [antibiotics.id],
  }),
  resolvedByUser: one(users, {
    fields: [alerts.resolvedBy],
    references: [users.id],
  }),
}));

export const templatesRelations = relations(templates, ({ one }) => ({
  createdByUser: one(users, {
    fields: [templates.createdBy],
    references: [users.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// === NEW SCHEMAS ===
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true,
});

export const insertCultureSchema = createInsertSchema(cultures).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAntibioticSchema = createInsertSchema(antibiotics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  createdAt: true,
});

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

// === NEW TYPES ===
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Culture = typeof cultures.$inferSelect;
export type InsertCulture = z.infer<typeof insertCultureSchema>;

export type Antibiotic = typeof antibiotics.$inferSelect;
export type InsertAntibiotic = z.infer<typeof insertAntibioticSchema>;

export type Alert = typeof alerts.$inferSelect;
export type InsertAlert = z.infer<typeof insertAlertSchema>;

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type DashboardStats = typeof dashboardStats.$inferSelect;

// === ADDITIONAL REQUEST TYPES ===
export type LoginRequest = {
  username: string;
  password: string;
};

export type RegisterRequest = {
  username: string;
  email: string;
  password: string;
  name: string;
  crm?: string;
  role?: string;
};

export type AdvancedSearchRequest = {
  query?: string;
  colonization?: string[];
  unit?: string[];
  hasActiveATB?: boolean;
  hasPendingCultures?: boolean;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export type ATBWithDays = Antibiotic & {
  currentDay: number; // Dn calculado
};
