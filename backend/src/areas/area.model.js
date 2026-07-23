const pool = require('../shared/config/db');

const createArea = (nombre, descripcion) =>
  pool.query(
    `INSERT INTO areas (nombre, descripcion)
     VALUES ($1, $2)
     RETURNING *`,
    [nombre, descripcion]
  );

const allowedAreaSort = ['nombre', 'created_at'];

const getAreasPaginated = (limit, offset, search, sort, order) => {
  const values = [];
  let where = '';
  let idx = 1;

  if (search) {
    where = `WHERE nombre ILIKE $${idx++}`;
    values.push(`%${search}%`);
  }

  const safeSort = allowedAreaSort.includes(sort) ? sort : 'created_at';
  const safeOrder = order === 'ASC' ? 'ASC' : 'DESC';

  values.push(limit, offset);

  return pool.query(
    `SELECT * FROM areas
     ${where}
     ORDER BY ${safeSort} ${safeOrder}
     LIMIT $${idx++} OFFSET $${idx}`,
    values
  );
};

const countAreas = (search) =>
  search
    ? pool.query(`SELECT COUNT(*) FROM areas WHERE nombre ILIKE $1`, [`%${search}%`])
    : pool.query(`SELECT COUNT(*) FROM areas`);

const getAreaById = (id) =>
  pool.query(`SELECT * FROM areas WHERE id = $1`, [id]);

const getAreaByName = (nombre) =>
  pool.query(`SELECT id FROM areas WHERE nombre = $1`, [nombre]);

const updateArea = (id, nombre, descripcion, activo) =>
  pool.query(
    `UPDATE areas
     SET nombre = $1,
         descripcion = $2,
         activo = $3
     WHERE id = $4
     RETURNING *`,
    [nombre, descripcion, activo, id]
  );

const deleteArea = (id) =>
  pool.query(
    `DELETE FROM areas
     WHERE id = $1
     RETURNING id`,
    [id]
  );

const getAllActiveAreas = () =>
  pool.query(`SELECT id, nombre, descripcion FROM areas WHERE activo = true ORDER BY nombre`);

module.exports = {
  createArea,
  getAreasPaginated,
  countAreas,
  getAreaById,
  getAreaByName,
  updateArea,
  deleteArea,
  getAllActiveAreas
};
