import { db } from "./db";
import {
  patients, evolutions, patientMessages, users, cultures, antibiotics, alerts, templates, auditLogs, dashboardStats,
  type Patient, type InsertPatient,
  type Evolution, type InsertEvolution,
  type PatientMessage, type InsertPatientMessage,
  type UpdatePatientRequest,
  type User, type InsertUser,
  type Culture, type InsertCulture,
  type Antibiotic, type InsertAntibiotic,
  type Alert, type InsertAlert,
  type Template, type InsertTemplate,
  type AuditLog, type InsertAuditLog,
} from "@shared/schema";
import { eq, desc, and, or, like, gte, lte, isNull, sql, asc } from "drizzle-orm";
import * as bcrypt from "crypto";

// Helper to hash password
function hashPassword(password: string): string {
  const salt = bcrypt.randomBytes(16).toString('hex');
  const hash = bcrypt.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  const hashBuffer = Buffer.from(hash, 'hex');
  const derivedKey = bcrypt.scryptSync(password, salt, 64);
  return bcrypt.timingSafeEqual(hashBuffer, derivedKey);
}

// Calculate antibiotic day (Dn)
function calculateATBDay(startDate: Date): number {
  const now = new Date();
  const start = new Date(startDate);
  const diffTime = now.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export interface IStorage {
  // Patients
  getPatients(): Promise<Patient[]>;
  getActivePatients(): Promise<Patient[]>;
  getPatient(id: number): Promise<Patient | undefined>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  updatePatient(id: number, patient: UpdatePatientRequest): Promise<Patient>;

  // Evolutions
  getEvolutions(patientId: number): Promise<Evolution[]>;
  getEvolution(id: number): Promise<Evolution | undefined>;
  createEvolution(evolution: InsertEvolution): Promise<Evolution>;
  getLatestEvolution(patientId: number): Promise<Evolution | undefined>;

  // Messages
  getMessages(patientId: number): Promise<PatientMessage[]>;
  createMessage(message: InsertPatientMessage): Promise<PatientMessage>;

  // Users
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  verifyUserPassword(username: string, password: string): Promise<User | null>;

  // Cultures
  getCultures(patientId: number): Promise<Culture[]>;
  getPendingCultures(): Promise<(Culture & { patient: Patient })[]>;
  getCulture(id: number): Promise<Culture | undefined>;
  createCulture(culture: InsertCulture): Promise<Culture>;
  updateCulture(id: number, culture: Partial<InsertCulture>): Promise<Culture>;

  // Antibiotics
  getAntibiotics(patientId: number): Promise<Antibiotic[]>;
  getActiveAntibiotics(): Promise<(Antibiotic & { patient: Patient; currentDay: number })[]>;
  getAntibiotic(id: number): Promise<Antibiotic | undefined>;
  createAntibiotic(antibiotic: InsertAntibiotic): Promise<Antibiotic>;
  updateAntibiotic(id: number, antibiotic: Partial<InsertAntibiotic>): Promise<Antibiotic>;
  stopAntibiotic(id: number, reason?: string): Promise<Antibiotic>;

  // Alerts
  getAlerts(): Promise<Alert[]>;
  getAlertsByPatient(patientId: number): Promise<Alert[]>;
  getUnreadAlerts(): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  markAlertRead(id: number): Promise<Alert>;
  resolveAlert(id: number, userId?: number): Promise<Alert>;

  // Templates
  getTemplates(): Promise<Template[]>;
  getTemplate(id: number): Promise<Template | undefined>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  updateTemplate(id: number, template: Partial<InsertTemplate>): Promise<Template>;
  deleteTemplate(id: number): Promise<void>;

  // Audit
  getAuditLogs(limit?: number): Promise<AuditLog[]>;
  getAuditLogsByEntity(entityType: string, entityId: number): Promise<AuditLog[]>;
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;

  // Dashboard
  getDashboardStats(): Promise<{
    totalPatients: number;
    activePatients: number;
    neutropenicPatients: number;
    colonizedPatients: number;
    pendingCultures: number;
    activeAntibiotics: number;
    atbReviewsToday: number;
    byUnit: Record<string, number>;
    byColonization: Record<string, number>;
    recentAlerts: Alert[];
  }>;
  getATBTimeline(): Promise<{
    patient: Patient;
    antibiotics: {
      antibiotic: Antibiotic;
      currentDay: number;
      reviewDates: { day: number; date: string; isPast: boolean }[];
    }[];
  }[]>;

  // Advanced Search
  advancedSearch(params: {
    query?: string;
    colonization?: string[];
    unit?: string[];
    hasActiveATB?: boolean;
    hasPendingCultures?: boolean;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<Patient[]>;
}

export class DatabaseStorage implements IStorage {
  // ==================== PATIENTS ====================
  async getPatients(): Promise<Patient[]> {
    return await db.select().from(patients).orderBy(desc(patients.createdAt));
  }

  async getActivePatients(): Promise<Patient[]> {
    return await db
      .select()
      .from(patients)
      .where(eq(patients.isActive, true))
      .orderBy(patients.leito, patients.name);
  }

  async getPatient(id: number): Promise<Patient | undefined> {
    const [patient] = await db.select().from(patients).where(eq(patients.id, id));
    return patient;
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const [patient] = await db.insert(patients).values(insertPatient).returning();
    return patient;
  }

  async updatePatient(id: number, updatePatient: UpdatePatientRequest): Promise<Patient> {
    const [patient] = await db
      .update(patients)
      .set({ ...updatePatient, updatedAt: new Date() })
      .where(eq(patients.id, id))
      .returning();
    return patient;
  }

  // ==================== EVOLUTIONS ====================
  async getEvolutions(patientId: number): Promise<Evolution[]> {
    return await db
      .select()
      .from(evolutions)
      .where(eq(evolutions.patientId, patientId))
      .orderBy(desc(evolutions.date));
  }

  async getEvolution(id: number): Promise<Evolution | undefined> {
    const [evolution] = await db.select().from(evolutions).where(eq(evolutions.id, id));
    return evolution;
  }

  async createEvolution(insertEvolution: InsertEvolution): Promise<Evolution> {
    const [evolution] = await db.insert(evolutions).values(insertEvolution).returning();
    return evolution;
  }

  async getLatestEvolution(patientId: number): Promise<Evolution | undefined> {
    const [evolution] = await db
      .select()
      .from(evolutions)
      .where(eq(evolutions.patientId, patientId))
      .orderBy(desc(evolutions.date))
      .limit(1);
    return evolution;
  }

  // ==================== MESSAGES ====================
  async getMessages(patientId: number): Promise<PatientMessage[]> {
    return await db
      .select()
      .from(patientMessages)
      .where(eq(patientMessages.patientId, patientId))
      .orderBy(patientMessages.createdAt);
  }

  async createMessage(message: InsertPatientMessage): Promise<PatientMessage> {
    const [created] = await db.insert(patientMessages).values(message).returning();
    return created;
  }

  // ==================== USERS ====================
  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(users.name);
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = hashPassword(insertUser.password);
    const [user] = await db.insert(users).values({
      ...insertUser,
      password: hashedPassword,
    }).returning();
    return user;
  }

  async updateUser(id: number, updateUser: Partial<InsertUser>): Promise<User> {
    const updateData = { ...updateUser, updatedAt: new Date() };
    if (updateData.password) {
      updateData.password = hashPassword(updateData.password);
    }
    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async verifyUserPassword(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (!user) return null;

    if (verifyPassword(password, user.password)) {
      // Update last login
      await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, user.id));
      return user;
    }
    return null;
  }

  // ==================== CULTURES ====================
  async getCultures(patientId: number): Promise<Culture[]> {
    return await db
      .select()
      .from(cultures)
      .where(eq(cultures.patientId, patientId))
      .orderBy(desc(cultures.collectionDate));
  }

  async getPendingCultures(): Promise<(Culture & { patient: Patient })[]> {
    const result = await db
      .select({
        culture: cultures,
        patient: patients,
      })
      .from(cultures)
      .innerJoin(patients, eq(cultures.patientId, patients.id))
      .where(eq(cultures.status, 'pending'))
      .orderBy(asc(cultures.collectionDate));

    return result.map(r => ({ ...r.culture, patient: r.patient }));
  }

  async getCulture(id: number): Promise<Culture | undefined> {
    const [culture] = await db.select().from(cultures).where(eq(cultures.id, id));
    return culture;
  }

  async createCulture(insertCulture: InsertCulture): Promise<Culture> {
    const [culture] = await db.insert(cultures).values(insertCulture).returning();

    // Create alert for pending culture
    await this.createAlert({
      patientId: culture.patientId,
      type: 'culture_pending',
      priority: 'medium',
      title: `Cultura pendente: ${culture.type}`,
      message: `${culture.type} coletada em ${new Date(culture.collectionDate).toLocaleDateString('pt-BR')} aguardando resultado`,
      relatedCultureId: culture.id,
    });

    return culture;
  }

  async updateCulture(id: number, updateCulture: Partial<InsertCulture>): Promise<Culture> {
    const [culture] = await db
      .update(cultures)
      .set({ ...updateCulture, updatedAt: new Date() })
      .where(eq(cultures.id, id))
      .returning();

    // If culture result came in, resolve the pending alert
    if (updateCulture.status && updateCulture.status !== 'pending') {
      const pendingAlerts = await db
        .select()
        .from(alerts)
        .where(and(
          eq(alerts.relatedCultureId, id),
          eq(alerts.isResolved, false)
        ));

      for (const alert of pendingAlerts) {
        await this.resolveAlert(alert.id);
      }

      // If positive, create high priority alert
      if (updateCulture.status === 'positive') {
        const patientData = await this.getPatient(culture.patientId);
        await this.createAlert({
          patientId: culture.patientId,
          type: 'culture_pending',
          priority: 'high',
          title: `Cultura POSITIVA: ${culture.type}`,
          message: `${updateCulture.organism || 'Organismo'} isolado em ${culture.type}. Verificar antibiograma e ajustar terapia.`,
          relatedCultureId: id,
        });
      }
    }

    return culture;
  }

  // ==================== ANTIBIOTICS ====================
  async getAntibiotics(patientId: number): Promise<Antibiotic[]> {
    return await db
      .select()
      .from(antibiotics)
      .where(eq(antibiotics.patientId, patientId))
      .orderBy(desc(antibiotics.startDate));
  }

  async getActiveAntibiotics(): Promise<(Antibiotic & { patient: Patient; currentDay: number })[]> {
    const result = await db
      .select({
        antibiotic: antibiotics,
        patient: patients,
      })
      .from(antibiotics)
      .innerJoin(patients, eq(antibiotics.patientId, patients.id))
      .where(eq(antibiotics.status, 'active'))
      .orderBy(asc(antibiotics.startDate));

    return result.map(r => ({
      ...r.antibiotic,
      patient: r.patient,
      currentDay: calculateATBDay(r.antibiotic.startDate),
    }));
  }

  async getAntibiotic(id: number): Promise<Antibiotic | undefined> {
    const [antibiotic] = await db.select().from(antibiotics).where(eq(antibiotics.id, id));
    return antibiotic;
  }

  async createAntibiotic(insertAntibiotic: InsertAntibiotic): Promise<Antibiotic> {
    const [antibiotic] = await db.insert(antibiotics).values(insertAntibiotic).returning();

    // Create review alerts for D3, D7, D14
    const reviewDays = [3, 7, 14];
    for (const day of reviewDays) {
      const reviewDate = new Date(antibiotic.startDate);
      reviewDate.setDate(reviewDate.getDate() + day - 1);

      await this.createAlert({
        patientId: antibiotic.patientId,
        type: 'atb_review',
        priority: day === 3 ? 'high' : 'medium',
        title: `Reavaliação ATB D${day}: ${antibiotic.name}`,
        message: `Reavaliar necessidade de ${antibiotic.name} (${antibiotic.indication || 'Indicação não especificada'})`,
        dueDate: reviewDate,
        relatedAntibioticId: antibiotic.id,
      });
    }

    return antibiotic;
  }

  async updateAntibiotic(id: number, updateAntibiotic: Partial<InsertAntibiotic>): Promise<Antibiotic> {
    const [antibiotic] = await db
      .update(antibiotics)
      .set({ ...updateAntibiotic, updatedAt: new Date() })
      .where(eq(antibiotics.id, id))
      .returning();
    return antibiotic;
  }

  async stopAntibiotic(id: number, reason?: string): Promise<Antibiotic> {
    const [antibiotic] = await db
      .update(antibiotics)
      .set({
        status: 'completed',
        endDate: new Date(),
        suspensionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(antibiotics.id, id))
      .returning();

    // Resolve all pending alerts for this antibiotic
    const pendingAlerts = await db
      .select()
      .from(alerts)
      .where(and(
        eq(alerts.relatedAntibioticId, id),
        eq(alerts.isResolved, false)
      ));

    for (const alert of pendingAlerts) {
      await this.resolveAlert(alert.id);
    }

    return antibiotic;
  }

  // ==================== ALERTS ====================
  async getAlerts(): Promise<Alert[]> {
    return await db
      .select()
      .from(alerts)
      .orderBy(desc(alerts.createdAt))
      .limit(100);
  }

  async getAlertsByPatient(patientId: number): Promise<Alert[]> {
    return await db
      .select()
      .from(alerts)
      .where(eq(alerts.patientId, patientId))
      .orderBy(desc(alerts.createdAt));
  }

  async getUnreadAlerts(): Promise<Alert[]> {
    return await db
      .select()
      .from(alerts)
      .where(and(
        eq(alerts.isRead, false),
        eq(alerts.isResolved, false)
      ))
      .orderBy(
        sql`CASE WHEN ${alerts.priority} = 'critical' THEN 1 WHEN ${alerts.priority} = 'high' THEN 2 WHEN ${alerts.priority} = 'medium' THEN 3 ELSE 4 END`,
        desc(alerts.createdAt)
      );
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const [alert] = await db.insert(alerts).values(insertAlert).returning();
    return alert;
  }

  async markAlertRead(id: number): Promise<Alert> {
    const [alert] = await db
      .update(alerts)
      .set({ isRead: true })
      .where(eq(alerts.id, id))
      .returning();
    return alert;
  }

  async resolveAlert(id: number, userId?: number): Promise<Alert> {
    const [alert] = await db
      .update(alerts)
      .set({
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy: userId,
      })
      .where(eq(alerts.id, id))
      .returning();
    return alert;
  }

  // ==================== TEMPLATES ====================
  async getTemplates(): Promise<Template[]> {
    return await db
      .select()
      .from(templates)
      .orderBy(templates.category, templates.name);
  }

  async getTemplate(id: number): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.id, id));
    return template;
  }

  async createTemplate(insertTemplate: InsertTemplate): Promise<Template> {
    const [template] = await db.insert(templates).values(insertTemplate).returning();
    return template;
  }

  async updateTemplate(id: number, updateTemplate: Partial<InsertTemplate>): Promise<Template> {
    const [template] = await db
      .update(templates)
      .set({ ...updateTemplate, updatedAt: new Date() })
      .where(eq(templates.id, id))
      .returning();
    return template;
  }

  async deleteTemplate(id: number): Promise<void> {
    await db.delete(templates).where(eq(templates.id, id));
  }

  // ==================== AUDIT ====================
  async getAuditLogs(limit: number = 100): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  async getAuditLogsByEntity(entityType: string, entityId: number): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .where(and(
        eq(auditLogs.entityType, entityType),
        eq(auditLogs.entityId, entityId)
      ))
      .orderBy(desc(auditLogs.createdAt));
  }

  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLogs).values(insertLog).returning();
    return log;
  }

  // ==================== DASHBOARD ====================
  async getDashboardStats() {
    // Get counts
    const allPatients = await db.select().from(patients);
    const activePatientsList = allPatients.filter(p => p.isActive);
    const colonizedPatients = activePatientsList.filter(p => p.colonization);

    // Pending cultures
    const pendingCulturesList = await db
      .select()
      .from(cultures)
      .where(eq(cultures.status, 'pending'));

    // Active antibiotics
    const activeATBs = await db
      .select()
      .from(antibiotics)
      .where(eq(antibiotics.status, 'active'));

    // ATB reviews due today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const atbReviewsToday = await db
      .select()
      .from(alerts)
      .where(and(
        eq(alerts.type, 'atb_review'),
        eq(alerts.isResolved, false),
        gte(alerts.dueDate, today),
        lte(alerts.dueDate, tomorrow)
      ));

    // By unit
    const byUnit: Record<string, number> = {};
    for (const p of activePatientsList) {
      const unit = p.unidade || 'Outros';
      byUnit[unit] = (byUnit[unit] || 0) + 1;
    }

    // By colonization
    const byColonization: Record<string, number> = {};
    for (const p of colonizedPatients) {
      const col = p.colonization || 'Outros';
      // Handle multiple colonizations
      const cols = col.split(/[,+]/);
      for (const c of cols) {
        const trimmed = c.trim();
        byColonization[trimmed] = (byColonization[trimmed] || 0) + 1;
      }
    }

    // Recent alerts (last 10 unread)
    const recentAlerts = await this.getUnreadAlerts();

    return {
      totalPatients: allPatients.length,
      activePatients: activePatientsList.length,
      neutropenicPatients: 0, // Would need labs data
      colonizedPatients: colonizedPatients.length,
      pendingCultures: pendingCulturesList.length,
      activeAntibiotics: activeATBs.length,
      atbReviewsToday: atbReviewsToday.length,
      byUnit,
      byColonization,
      recentAlerts: recentAlerts.slice(0, 10),
    };
  }

  async getATBTimeline() {
    const activePatientsList = await this.getActivePatients();
    const result: {
      patient: Patient;
      antibiotics: {
        antibiotic: Antibiotic;
        currentDay: number;
        reviewDates: { day: number; date: string; isPast: boolean }[];
      }[];
    }[] = [];

    for (const patient of activePatientsList) {
      const patientATBs = await db
        .select()
        .from(antibiotics)
        .where(and(
          eq(antibiotics.patientId, patient.id),
          eq(antibiotics.status, 'active')
        ));

      if (patientATBs.length > 0) {
        const atbsWithDays = patientATBs.map(atb => {
          const currentDay = calculateATBDay(atb.startDate);
          const reviewDays = [3, 7, 14];
          const reviewDates = reviewDays.map(day => {
            const reviewDate = new Date(atb.startDate);
            reviewDate.setDate(reviewDate.getDate() + day - 1);
            return {
              day,
              date: reviewDate.toISOString().split('T')[0],
              isPast: reviewDate < new Date(),
            };
          });

          return {
            antibiotic: atb,
            currentDay,
            reviewDates,
          };
        });

        result.push({
          patient,
          antibiotics: atbsWithDays,
        });
      }
    }

    return result;
  }

  // ==================== ADVANCED SEARCH ====================
  async advancedSearch(params: {
    query?: string;
    colonization?: string[];
    unit?: string[];
    hasActiveATB?: boolean;
    hasPendingCultures?: boolean;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<Patient[]> {
    let query = db.select().from(patients).where(eq(patients.isActive, true));

    // Build conditions array
    const conditions = [eq(patients.isActive, true)];

    // Text search
    if (params.query) {
      const searchTerm = `%${params.query}%`;
      conditions.push(
        or(
          like(patients.name, searchTerm),
          like(patients.hematologicalDiagnosis, searchTerm),
          like(patients.leito ?? '', searchTerm)
        )!
      );
    }

    // Colonization filter
    if (params.colonization && params.colonization.length > 0) {
      const colonizationConditions = params.colonization.map(col =>
        like(patients.colonization ?? '', `%${col}%`)
      );
      conditions.push(or(...colonizationConditions)!);
    }

    // Unit filter
    if (params.unit && params.unit.length > 0) {
      const unitConditions = params.unit.map(u => eq(patients.unidade, u));
      conditions.push(or(...unitConditions)!);
    }

    // Date range
    if (params.dateFrom) {
      conditions.push(gte(patients.dih, new Date(params.dateFrom)));
    }
    if (params.dateTo) {
      conditions.push(lte(patients.dih, new Date(params.dateTo)));
    }

    // Execute main query
    let results = await db
      .select()
      .from(patients)
      .where(and(...conditions));

    // Filter by active ATB (post-query filter)
    if (params.hasActiveATB) {
      const activeATBPatientIds = new Set(
        (await db.select().from(antibiotics).where(eq(antibiotics.status, 'active')))
          .map(a => a.patientId)
      );
      results = results.filter(p => activeATBPatientIds.has(p.id));
    }

    // Filter by pending cultures (post-query filter)
    if (params.hasPendingCultures) {
      const pendingCulturePatientIds = new Set(
        (await db.select().from(cultures).where(eq(cultures.status, 'pending')))
          .map(c => c.patientId)
      );
      results = results.filter(p => pendingCulturePatientIds.has(p.id));
    }

    // Sort
    if (params.sortBy) {
      const sortOrder = params.sortOrder === 'desc' ? -1 : 1;
      results.sort((a, b) => {
        const aVal = (a as any)[params.sortBy!];
        const bVal = (b as any)[params.sortBy!];
        if (aVal < bVal) return -1 * sortOrder;
        if (aVal > bVal) return 1 * sortOrder;
        return 0;
      });
    }

    return results;
  }
}

export const storage = new DatabaseStorage();
