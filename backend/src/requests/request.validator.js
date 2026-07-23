const { z } = require('zod');

const statusEnum = ['open', 'in_progress', 'waiting_user', 'resolved', 'closed', 'rejected'];
const priorityEnum = ['low', 'medium', 'high', 'urgent'];
const categoryEnum = ['soporte_tecnico', 'accesos_permisos', 'hardware', 'software', 'otro'];

const createRequestSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  priority: z.enum(priorityEnum).optional().default('medium'),
  category: z.enum(categoryEnum).optional().default('otro')
});

const updateRequestSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(5).optional(),
  status: z.enum(statusEnum).optional(),
  priority: z.enum(priorityEnum).optional(),
  category: z.enum(categoryEnum).optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  resolution: z.string().optional()
});

const deleteRequestSchema = z.object({
  reason: z.string().min(5, 'El motivo debe tener al menos 5 caracteres')
});

const listRequestsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(200).optional(),
  status: z.enum(statusEnum).optional(),
  assignedTo: z.string().uuid().optional(),
  sort: z.enum(['created_at', 'title', 'status', 'priority']).default('created_at'),
  order: z.enum(['ASC', 'DESC']).default('DESC'),
});

module.exports = {
  createRequestSchema,
  updateRequestSchema,
  deleteRequestSchema,
  listRequestsQuerySchema
};