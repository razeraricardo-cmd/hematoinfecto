import { db } from "./db";
import { 
  patients, evolutions, patientMessages,
  type Patient, type InsertPatient,
  type Evolution, type InsertEvolution,
  type PatientMessage, type InsertPatientMessage,
  type UpdatePatientRequest
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

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
}

export class DatabaseStorage implements IStorage {
  // Patients
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

  // Evolutions
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

  // Messages
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
}

export const storage = new DatabaseStorage();
