import { z } from "zod";

/** Status of a single service / dependency as reported by the health endpoints. */
export const ServiceStatusSchema = z.enum(["ok", "unreachable", "not_configured"]);
export type ServiceStatus = z.infer<typeof ServiceStatusSchema>;
export type DependencyStatus = ServiceStatus;

export const HealthReportSchema = z.object({
  status: z.enum(["ok", "degraded"]),
  version: z.string(),
  timestamp: z.string(),
  services: z.object({
    api: z.literal("ok"),
    db: ServiceStatusSchema,
    retrieval: ServiceStatusSchema,
  }),
});
export type HealthReport = z.infer<typeof HealthReportSchema>;

export const ReadinessReportSchema = HealthReportSchema.extend({
  ready: z.boolean(),
});
export type ReadinessReport = z.infer<typeof ReadinessReportSchema>;

/** Success envelope wrapping every API payload: { success: true, message, data }. */
export const ApiResponseEnvelope = <T extends z.ZodType>(data: T) =>
  z.object({
    success: z.literal(true),
    message: z.string(),
    data,
  });
export type ApiResponseEnvelope<T> = {
  success: true;
  message: string;
  data: T;
};

export const HealthResponseEnvelope = ApiResponseEnvelope(HealthReportSchema);
export type HealthResponseEnvelope = z.infer<typeof HealthResponseEnvelope>;

/** Error envelope: { success: false, message, error_code, data, timestamp }. */
export const ApiErrorSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  error_code: z.string().nullable(),
  data: z.array(z.unknown()).nullable(),
  timestamp: z.string(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
