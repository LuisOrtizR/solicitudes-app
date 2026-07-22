const { z } = require('zod');

const priorityEnum = ['low', 'medium', 'high', 'urgent'];

const isoDateString = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), { message: 'Fecha inválida' })
  .optional();

const analyticsQuerySchema = z.object({
  dateFrom: isoDateString,
  dateTo: isoDateString,
  priority: z.enum(priorityEnum).optional(),
});

const trendsQuerySchema = analyticsQuerySchema.extend({
  granularity: z.enum(['week', 'month']).optional().default('week'),
});

module.exports = { analyticsQuerySchema, trendsQuerySchema };
