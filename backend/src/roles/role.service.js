const {
  createRole,
  getRolesPaginated,
  countRoles,
  getRoleById,
  getRoleByName,
  updateRole,
  deleteRole,
  assignPermission,
  removePermission,
  getRolePermissions
} = require('./role.model');

const { findById } = require('../permissions/permission.model');
const AppError = require('../shared/utils/AppError');

const SYSTEM_ROLES = ['admin', 'admin_system', 'user'];

const ADMIN_BASE_PERMISSIONS = [
  'users_create', 'users_read', 'users_update', 'users_delete', 'users_change_role',
  'requests_create', 'requests_read', 'requests_read_all',
  'requests_update', 'requests_delete',
  'create_roles', 'view_roles', 'edit_roles', 'delete_roles',
  'assign_permissions',
  'permissions_create', 'permissions_read', 'permissions_update', 'permissions_delete',
  'areas_manage'
];

const PROTECTED_ROLE_PERMISSIONS = {
  admin: ADMIN_BASE_PERMISSIONS,
  admin_system: ADMIN_BASE_PERMISSIONS,
  user: [
    'requests_create',
    'requests_read'
  ]
};

const createRoleService = async ({ name, description }) => {
  const exists = await getRoleByName(name);

  if (exists.rowCount)
    throw new AppError('El rol ya existe', 409);

  return createRole(name, description);
};

const getRolesService = async ({ page = 1, limit = 10, search, sort, order }) => {
  const offset = (page - 1) * limit;

  const data = await getRolesPaginated(limit, offset, search, sort, order);
  const totalResult = await countRoles(search);
  const total = Number(totalResult.rows[0].count);

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
    data: data.rows,
  };
};

const getRoleService = (id) => getRoleById(id);

const updateRoleService = async (id, { name, description }) => {
  const existing = await getRoleById(id);

  if (!existing.rowCount)
    throw new AppError('Rol no encontrado', 404);

  if (SYSTEM_ROLES.includes(existing.rows[0].name))
    throw new AppError(`El rol "${existing.rows[0].name}" es del sistema y no puede modificarse`, 403);

  return updateRole(id, name, description);
};

const deleteRoleService = async (id) => {
  const existing = await getRoleById(id);

  if (!existing.rowCount)
    throw new AppError('Rol no encontrado', 404);

  if (SYSTEM_ROLES.includes(existing.rows[0].name))
    throw new AppError(`El rol "${existing.rows[0].name}" es del sistema y no puede eliminarse`, 403);

  return deleteRole(id);
};

const assignPermissionService = (roleId, permissionId) =>
  assignPermission(roleId, permissionId);

const removePermissionService = async (roleId, permissionId) => {
  const role = await getRoleById(roleId);

  if (!role.rowCount)
    throw new AppError('Rol no encontrado', 404);

  const roleName = role.rows[0].name;
  const protectedPerms = PROTECTED_ROLE_PERMISSIONS[roleName];

  if (protectedPerms) {
    const perm = await findById(permissionId);

    if (!perm.rowCount)
      throw new AppError('Permiso no encontrado', 404);

    if (protectedPerms.includes(perm.rows[0].name))
      throw new AppError(
        `El permiso "${perm.rows[0].name}" es base del rol "${roleName}" y no puede removerse`,
        403
      );
  }

  return removePermission(roleId, permissionId);
};

const getRolePermissionsService = (roleId) =>
  getRolePermissions(roleId);

module.exports = {
  createRoleService,
  getRolesService,
  getRoleService,
  updateRoleService,
  deleteRoleService,
  assignPermissionService,
  removePermissionService,
  getRolePermissionsService
};