const { z } = require('zod');

/* =====================================================
   VALIDAR UUID
===================================================== */
const idParamSchema = z.object({
  id: z.string().uuid('ID debe ser un UUID válido')
});

/* =====================================================
   CREAR ROL
===================================================== */
const createRoleSchema = z.object({
  name: z.string().min(3, 'Nombre mínimo 3 caracteres'),
  description: z.string().optional()
});

/* =====================================================
   ACTUALIZAR ROL
===================================================== */
const updateRoleSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional()
});

/* =====================================================
   ASIGNAR PERMISO
===================================================== */
const assignPermissionSchema = z.object({
  permissionId: z.string().uuid('permissionId debe ser UUID válido')
});

/* =====================================================
   LISTAR ROLES (paginación + búsqueda)
===================================================== */
const listRolesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(200).optional(),
  sort: z.enum(['name', 'created_at']).default('created_at'),
  order: z.enum(['ASC', 'DESC']).default('DESC'),
});

module.exports = {
  idParamSchema,
  createRoleSchema,
  updateRoleSchema,
  assignPermissionSchema,
  listRolesQuerySchema
};
