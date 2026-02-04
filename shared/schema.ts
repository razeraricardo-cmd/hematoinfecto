import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

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
