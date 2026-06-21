import { z } from "zod";

export const runtimeScheduleSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("one_time"), totalHours: z.number().positive().max(1_000_000) }),
  z.object({
    kind: z.literal("recurring"),
    hoursPerDay: z.number().positive().max(24),
    daysPerWeek: z.number().positive().max(7),
  }),
]);

export const estimateRequestSchema = z.object({
  currency: z.literal("USD"),
  lines: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        meterId: z.string().min(1).max(300),
        quantity: z.number().positive().max(1_000_000),
        usageAmount: z.number().nonnegative().max(1_000_000_000),
        schedule: runtimeScheduleSchema.optional(),
        confirmed: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(100),
});

export const aiDraftSchema = z.object({
  summary: z.string(),
  lines: z.array(
    z.object({
      provider: z.enum(["aws", "azure", "gcp"]),
      category: z.enum(["compute", "block_storage", "object_storage", "database", "egress", "other"]),
      region: z.string().nullable(),
      searchTerms: z.string(),
      quantity: z.number().positive(),
      usageAmount: z.number().nonnegative(),
      schedule: z
        .object({
          kind: z.enum(["one_time", "recurring"]),
          totalHours: z.number().nullable(),
          hoursPerDay: z.number().nullable(),
          daysPerWeek: z.number().nullable(),
        })
        .nullable(),
      unresolved: z.array(z.string()),
    }),
  ),
  warnings: z.array(z.string()),
});
