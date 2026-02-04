import { z } from 'zod';
import {
  insertPatientSchema,
  insertEvolutionSchema,
  insertPatientMessageSchema,
  insertCultureSchema,
  insertAntibioticSchema,
  insertAlertSchema,
  insertTemplateSchema,
  patients,
  evolutions,
  patientMessages,
  cultures,
  antibiotics,
  alerts,
  templates,
  users,
  auditLogs,
  dashboardStats,
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  patients: {
    list: {
      method: 'GET' as const,
      path: '/api/patients',
      responses: {
        200: z.array(z.custom<typeof patients.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/patients/:id',
      responses: {
        200: z.custom<typeof patients.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/patients',
      input: insertPatientSchema,
      responses: {
        201: z.custom<typeof patients.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/patients/:id',
      input: insertPatientSchema.partial(),
      responses: {
        200: z.custom<typeof patients.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
  },
  evolutions: {
    list: {
      method: 'GET' as const,
      path: '/api/patients/:patientId/evolutions',
      responses: {
        200: z.array(z.custom<typeof evolutions.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/evolutions/:id',
      responses: {
        200: z.custom<typeof evolutions.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/evolutions',
      input: insertEvolutionSchema.extend({
        rawInput: z.string().optional(),
      }),
      responses: {
        201: z.custom<typeof evolutions.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    generate: {
      method: 'POST' as const,
      path: '/api/evolutions/generate',
      input: z.object({
        patientId: z.number(),
        rawInput: z.string(),
        includeImpression: z.boolean().optional(),
        includeSuggestions: z.boolean().optional(),
      }),
      responses: {
        200: z.object({
          content: z.string(),
          impression: z.string().optional(),
          missingDataAlerts: z.array(z.string()).optional(),
          readingSuggestions: z.array(z.object({
            title: z.string(),
            source: z.string(),
            summary: z.string(),
          })).optional(),
          structuredData: z.record(z.any()).optional(),
        }),
        400: errorSchemas.validation,
      },
    },
    export: {
      method: 'POST' as const,
      path: '/api/evolutions/:id/export',
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
  },
  messages: {
    list: {
      method: 'GET' as const,
      path: '/api/patients/:patientId/messages',
      responses: {
        200: z.array(z.custom<typeof patientMessages.$inferSelect>()),
      },
    },
    send: {
      method: 'POST' as const,
      path: '/api/patients/:patientId/messages',
      input: z.object({
        content: z.string(),
      }),
      responses: {
        200: z.object({
          userMessage: z.custom<typeof patientMessages.$inferSelect>(),
          assistantMessage: z.custom<typeof patientMessages.$inferSelect>(),
          evolution: z.custom<typeof evolutions.$inferSelect>().optional(),
        }),
        400: errorSchemas.validation,
      },
    },
  },
};

// === AUTH API ===
export const authApi = {
  login: {
    method: 'POST' as const,
    path: '/api/auth/login',
    input: z.object({
      username: z.string(),
      password: z.string(),
    }),
    responses: {
      200: z.object({
        user: z.custom<typeof users.$inferSelect>(),
        token: z.string(),
      }),
      401: errorSchemas.unauthorized,
    },
  },
  register: {
    method: 'POST' as const,
    path: '/api/auth/register',
    input: z.object({
      username: z.string().min(3),
      email: z.string().email(),
      password: z.string().min(6),
      name: z.string(),
      crm: z.string().optional(),
      role: z.enum(['resident', 'preceptor', 'admin']).optional(),
    }),
    responses: {
      201: z.custom<typeof users.$inferSelect>(),
      400: errorSchemas.validation,
    },
  },
  me: {
    method: 'GET' as const,
    path: '/api/auth/me',
    responses: {
      200: z.custom<typeof users.$inferSelect>(),
      401: errorSchemas.unauthorized,
    },
  },
  logout: {
    method: 'POST' as const,
    path: '/api/auth/logout',
    responses: {
      200: z.object({ message: z.string() }),
    },
  },
};

// === CULTURES API ===
export const culturesApi = {
  list: {
    method: 'GET' as const,
    path: '/api/patients/:patientId/cultures',
    responses: {
      200: z.array(z.custom<typeof cultures.$inferSelect>()),
    },
  },
  pending: {
    method: 'GET' as const,
    path: '/api/cultures/pending',
    responses: {
      200: z.array(z.custom<typeof cultures.$inferSelect>()),
    },
  },
  create: {
    method: 'POST' as const,
    path: '/api/cultures',
    input: insertCultureSchema,
    responses: {
      201: z.custom<typeof cultures.$inferSelect>(),
      400: errorSchemas.validation,
    },
  },
  update: {
    method: 'PATCH' as const,
    path: '/api/cultures/:id',
    input: insertCultureSchema.partial(),
    responses: {
      200: z.custom<typeof cultures.$inferSelect>(),
      404: errorSchemas.notFound,
    },
  },
  updateResult: {
    method: 'POST' as const,
    path: '/api/cultures/:id/result',
    input: z.object({
      status: z.enum(['negative', 'positive', 'contaminated']),
      organism: z.string().optional(),
      antibiogram: z.record(z.string()).optional(),
      positivityTime: z.string().optional(),
    }),
    responses: {
      200: z.custom<typeof cultures.$inferSelect>(),
      404: errorSchemas.notFound,
    },
  },
};

// === ANTIBIOTICS API ===
export const antibioticsApi = {
  list: {
    method: 'GET' as const,
    path: '/api/patients/:patientId/antibiotics',
    responses: {
      200: z.array(z.custom<typeof antibiotics.$inferSelect>()),
    },
  },
  active: {
    method: 'GET' as const,
    path: '/api/antibiotics/active',
    responses: {
      200: z.array(z.object({
        antibiotic: z.custom<typeof antibiotics.$inferSelect>(),
        patient: z.custom<typeof patients.$inferSelect>(),
        currentDay: z.number(),
      })),
    },
  },
  create: {
    method: 'POST' as const,
    path: '/api/antibiotics',
    input: insertAntibioticSchema,
    responses: {
      201: z.custom<typeof antibiotics.$inferSelect>(),
      400: errorSchemas.validation,
    },
  },
  update: {
    method: 'PATCH' as const,
    path: '/api/antibiotics/:id',
    input: insertAntibioticSchema.partial(),
    responses: {
      200: z.custom<typeof antibiotics.$inferSelect>(),
      404: errorSchemas.notFound,
    },
  },
  stop: {
    method: 'POST' as const,
    path: '/api/antibiotics/:id/stop',
    input: z.object({
      reason: z.string().optional(),
    }),
    responses: {
      200: z.custom<typeof antibiotics.$inferSelect>(),
      404: errorSchemas.notFound,
    },
  },
};

// === ALERTS API ===
export const alertsApi = {
  list: {
    method: 'GET' as const,
    path: '/api/alerts',
    responses: {
      200: z.array(z.custom<typeof alerts.$inferSelect>()),
    },
  },
  byPatient: {
    method: 'GET' as const,
    path: '/api/patients/:patientId/alerts',
    responses: {
      200: z.array(z.custom<typeof alerts.$inferSelect>()),
    },
  },
  unread: {
    method: 'GET' as const,
    path: '/api/alerts/unread',
    responses: {
      200: z.array(z.custom<typeof alerts.$inferSelect>()),
    },
  },
  create: {
    method: 'POST' as const,
    path: '/api/alerts',
    input: insertAlertSchema,
    responses: {
      201: z.custom<typeof alerts.$inferSelect>(),
      400: errorSchemas.validation,
    },
  },
  markRead: {
    method: 'POST' as const,
    path: '/api/alerts/:id/read',
    responses: {
      200: z.custom<typeof alerts.$inferSelect>(),
    },
  },
  resolve: {
    method: 'POST' as const,
    path: '/api/alerts/:id/resolve',
    responses: {
      200: z.custom<typeof alerts.$inferSelect>(),
    },
  },
};

// === TEMPLATES API ===
export const templatesApi = {
  list: {
    method: 'GET' as const,
    path: '/api/templates',
    responses: {
      200: z.array(z.custom<typeof templates.$inferSelect>()),
    },
  },
  get: {
    method: 'GET' as const,
    path: '/api/templates/:id',
    responses: {
      200: z.custom<typeof templates.$inferSelect>(),
      404: errorSchemas.notFound,
    },
  },
  create: {
    method: 'POST' as const,
    path: '/api/templates',
    input: insertTemplateSchema,
    responses: {
      201: z.custom<typeof templates.$inferSelect>(),
      400: errorSchemas.validation,
    },
  },
  update: {
    method: 'PATCH' as const,
    path: '/api/templates/:id',
    input: insertTemplateSchema.partial(),
    responses: {
      200: z.custom<typeof templates.$inferSelect>(),
      404: errorSchemas.notFound,
    },
  },
  delete: {
    method: 'DELETE' as const,
    path: '/api/templates/:id',
    responses: {
      200: z.object({ message: z.string() }),
      404: errorSchemas.notFound,
    },
  },
};

// === DASHBOARD API ===
export const dashboardApi = {
  stats: {
    method: 'GET' as const,
    path: '/api/dashboard/stats',
    responses: {
      200: z.object({
        totalPatients: z.number(),
        activePatients: z.number(),
        neutropenicPatients: z.number(),
        colonizedPatients: z.number(),
        pendingCultures: z.number(),
        activeAntibiotics: z.number(),
        atbReviewsToday: z.number(),
        byUnit: z.record(z.number()),
        byColonization: z.record(z.number()),
        recentAlerts: z.array(z.custom<typeof alerts.$inferSelect>()),
      }),
    },
  },
  atbTimeline: {
    method: 'GET' as const,
    path: '/api/dashboard/atb-timeline',
    responses: {
      200: z.array(z.object({
        patient: z.custom<typeof patients.$inferSelect>(),
        antibiotics: z.array(z.object({
          antibiotic: z.custom<typeof antibiotics.$inferSelect>(),
          currentDay: z.number(),
          reviewDates: z.array(z.object({
            day: z.number(),
            date: z.string(),
            isPast: z.boolean(),
          })),
        })),
      })),
    },
  },
};

// === SEARCH API ===
export const searchApi = {
  advanced: {
    method: 'POST' as const,
    path: '/api/search/advanced',
    input: z.object({
      query: z.string().optional(),
      colonization: z.array(z.string()).optional(),
      unit: z.array(z.string()).optional(),
      hasActiveATB: z.boolean().optional(),
      hasPendingCultures: z.boolean().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      sortBy: z.string().optional(),
      sortOrder: z.enum(['asc', 'desc']).optional(),
    }),
    responses: {
      200: z.array(z.custom<typeof patients.$inferSelect>()),
    },
  },
};

// === EXPORT API ===
export const exportApi = {
  pdf: {
    method: 'POST' as const,
    path: '/api/evolutions/:id/export-pdf',
    responses: {
      200: z.any(), // Binary PDF
      404: errorSchemas.notFound,
    },
  },
};

// === VOICE API ===
export const voiceApi = {
  transcribe: {
    method: 'POST' as const,
    path: '/api/voice/transcribe',
    responses: {
      200: z.object({
        text: z.string(),
      }),
    },
  },
  synthesize: {
    method: 'POST' as const,
    path: '/api/voice/synthesize',
    input: z.object({
      text: z.string(),
    }),
    responses: {
      200: z.any(), // Binary audio
    },
  },
};

// === OCR API ===
export const ocrApi = {
  analyze: {
    method: 'POST' as const,
    path: '/api/ocr/analyze',
    responses: {
      200: z.object({
        text: z.string(),
        labs: z.record(z.any()).optional(),
        structured: z.boolean(),
      }),
    },
  },
};

// === AUDIT API ===
export const auditApi = {
  list: {
    method: 'GET' as const,
    path: '/api/audit',
    responses: {
      200: z.array(z.custom<typeof auditLogs.$inferSelect>()),
    },
  },
  byEntity: {
    method: 'GET' as const,
    path: '/api/audit/:entityType/:entityId',
    responses: {
      200: z.array(z.custom<typeof auditLogs.$inferSelect>()),
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
