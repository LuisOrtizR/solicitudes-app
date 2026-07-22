const { z } = require('zod');

const idParamSchema = z.object({
  id: z.string().uuid('ID debe ser un UUID válido')
});

const updateUserSchema = z.object({
  name: z.string().min(3, 'Nombre mínimo 3 caracteres'),
  email: z.string().email('Email inválido')
});

const changeRoleSchema = z.object({
  role: z.string().min(3)
});

const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(200).optional(),
  role: z.string().min(1).max(50).optional(),
  is_active: z.coerce.boolean().optional(),
  sort: z.enum(['name', 'email', 'created_at']).default('created_at'),
  order: z.enum(['ASC', 'DESC']).default('DESC'),
});

module.exports = {
  idParamSchema,
  updateUserSchema,
  changeRoleSchema,
  listUsersQuerySchema
};
