const pool = require('../shared/config/db');

const createRole = (name, description) =>
  pool.query(
    `INSERT INTO roles (name, description)
     VALUES ($1, $2)
     RETURNING *`,
    [name, description]
  );

const allowedRoleSort = ['name', 'created_at'];

const getRolesPaginated = (limit, offset, search, sort, order) => {
  const values = [];
  let where = '';
  let idx = 1;

  if (search) {
    where = `WHERE name ILIKE $${idx++}`;
    values.push(`%${search}%`);
  }

  const safeSort = allowedRoleSort.includes(sort) ? sort : 'created_at';
  const safeOrder = order === 'ASC' ? 'ASC' : 'DESC';

  values.push(limit, offset);

  return pool.query(
    `SELECT * FROM roles
     ${where}
     ORDER BY ${safeSort} ${safeOrder}
     LIMIT $${idx++} OFFSET $${idx}`,
    values
  );
};

const countRoles = (search) =>
  search
    ? pool.query(`SELECT COUNT(*) FROM roles WHERE name ILIKE $1`, [`%${search}%`])
    : pool.query(`SELECT COUNT(*) FROM roles`);

const getRoleById = (id) =>
  pool.query(`SELECT * FROM roles WHERE id = $1`, [id]);

const getRoleByName = (name) =>
  pool.query(`SELECT id FROM roles WHERE name = $1`, [name]);

const updateRole = (id, name, description) =>
  pool.query(
    `UPDATE roles
     SET name = $1,
         description = $2
     WHERE id = $3
     RETURNING *`,
    [name, description, id]
  );

const deleteRole = (id) =>
  pool.query(
    `DELETE FROM roles
     WHERE id = $1
     RETURNING id`,
    [id]
  );

const assignPermission = (roleId, permissionId) =>
  pool.query(
    `INSERT INTO role_permissions (role_id, permission_id)
     VALUES ($1, $2)`,
    [roleId, permissionId]
  );

const removePermission = (roleId, permissionId) =>
  pool.query(
    `DELETE FROM role_permissions
     WHERE role_id = $1 AND permission_id = $2`,
    [roleId, permissionId]
  );

const getRolePermissions = (roleId) =>
  pool.query(
    `SELECT p.id, p.name, p.description
     FROM permissions p
     JOIN role_permissions rp ON p.id = rp.permission_id
     WHERE rp.role_id = $1`,
    [roleId]
  );

module.exports = {
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
};
  