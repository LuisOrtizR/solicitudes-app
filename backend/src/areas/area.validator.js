const { z } = require('zod');

const idParamSchema = z.object({
  id: z.string().uuid('ID debe ser un UUID válido')
});

const createAreaSchema = z.object({
  nombre: z.string().min(2, 'Nombre mínimo 2 caracteres').max(100),
  descripcion: z.string().max(500).optional()
});

const updateAreaSchema = z.object({
  nombre: z.string().min(2, 'Nombre mínimo 2 caracteres').max(100),
  descripcion: z.string().max(500).optional(),
  activo: z.boolean().optional()
});

const listAreasQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(200).optional(),
  sort: z.enum(['nombre', 'created_at']).default('created_at'),
  order: z.enum(['ASC', 'DESC']).default('DESC'),
});

module.exports = {
  idParamSchema,
  createAreaSchema,
  updateAreaSchema,
  listAreasQuerySchema
};
