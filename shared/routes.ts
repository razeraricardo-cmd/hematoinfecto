import { z } from 'zod';
import { insertPatientSchema, insertEvolutionSchema, insertPatientMessageSchema, patients, evolutions, patientMessages } from './schema';

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
