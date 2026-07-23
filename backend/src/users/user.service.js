const bcrypt = require('bcryptjs');
const pool = require('../shared/config/db');
const {
  createUser,
  getUsersPaginated,
  countUsersFiltered,
  getUserById,
  updateUser,
  deleteUser,
  updateUserRole,
  findUserWithRolesAndPermissionsById,
  emailExists
} = require('./user.model');

const AppError = require('../shared/utils/AppError');

const getUsersService = async ({ page = 1, limit = 10, search, role, is_active, area_id, sort, order }) => {
  const offset = (page - 1) * limit;

  const data = await getUsersPaginated({ limit, offset, search, role, isActive: is_active, areaId: area_id, sort, order });
  const total = await countUsersFiltered({ search, role, isActive: is_active, areaId: area_id });

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
    data,
  };
};

const createUserService = async ({ name, email, password, role, area_id }) => {
  const exists = await emailExists(email);
  if (exists)
    throw new AppError('El email ya está en uso', 400);

  const roleResult = await pool.query('SELECT id FROM roles WHERE name = $1', [role]);
  if (!roleResult.rowCount)
    throw new AppError('Rol no encontrado', 404);

  const hashed = await bcrypt.hash(password.trim(), 12);
  const user = await createUser(name.trim(), email, hashed, area_id ?? null);

  await pool.query(
    `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
    [user.id, roleResult.rows[0].id]
  );

  return user;
};

const getUserService = async (id) => {
  const user = await getUserById(id);
  if (!user) throw new AppError('Usuario no encontrado', 404);
  return user;
};

const updateUserService = async (id, data, currentUser) => {
  const user = await findUserWithRolesAndPermissionsById(id);
  if (!user) throw new AppError('Usuario no encontrado', 404);

  const areaId = data.area_id !== undefined ? data.area_id : user.area_id;

  if (user.is_protected) {

    if (data.email && data.email !== user.email) {
      throw new AppError('No se puede modificar el email del Super Admin', 403);
    }

    return updateUser(id, data.name || user.name, user.email, areaId);
  }

  if (data.email) {
    const exists = await emailExists(data.email, id);
    if (exists)
      throw new AppError('El email ya está en uso', 400);
  }

  const updated = await updateUser(id, data.name, data.email, areaId);
  if (!updated) throw new AppError('Usuario no encontrado', 404);

  return updated;
};

const deleteUserService = async (id) => {
  const user = await findUserWithRolesAndPermissionsById(id);

  if (!user)
    throw new AppError('Usuario no encontrado', 404);

  if (user.is_protected)
    throw new AppError('No se puede eliminar un usuario protegido', 403);

  const deleted = await deleteUser(id);
  if (!deleted)
    throw new AppError('Usuario no encontrado', 404);

  return true;
};

const changeUserRoleService = async (id, role) => {
  const user = await findUserWithRolesAndPermissionsById(id);

  if (!user)
    throw new AppError('Usuario no encontrado', 404);

  if (user.is_protected)
    throw new AppError('No se puede modificar el rol del Super Admin', 403);

  return updateUserRole(id, role);
};

module.exports = {
  getUsersService,
  createUserService,
  getUserService,
  updateUserService,
  deleteUserService,
  changeUserRoleService
};