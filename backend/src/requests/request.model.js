const pool = require('../shared/config/db');

const createRequest = (title, description, userId, priority = 'medium', category = 'otro') =>
  pool.query(
    `INSERT INTO requests (title, description, user_id, priority, category, status)
     VALUES ($1, $2, $3, $4, $5, 'open')
     RETURNING *`,
    [title, description, userId, priority, category]
  );

const getRequestById = (id) =>
  pool.query(
    `SELECT r.*, u.email
     FROM requests r
     JOIN users u ON u.id = r.user_id
     WHERE r.id = $1`,
    [id]
  );

const updateRequestFull = (id, data) => {
  const fields = [
    `title       = COALESCE($1, title)`,
    `description = COALESCE($2, description)`,
    `status      = COALESCE($3, status)`,
    `priority    = COALESCE($4, priority)`,
    `category    = COALESCE($5, category)`,
    `assigned_to = COALESCE($6, assigned_to)`,
    `resolution  = COALESCE($7, resolution)`,
    `updated_at  = NOW()`
  ];

  if (data.status === 'resolved') fields.push(`resolved_at = NOW()`);
  if (data.status === 'closed')   fields.push(`closed_at   = NOW()`);

  return pool.query(
    `UPDATE requests
     SET ${fields.join(', ')}
     WHERE id = $8
     RETURNING *`,
    [
      data.title       ?? null,
      data.description ?? null,
      data.status      ?? null,
      data.priority    ?? null,
      data.category    ?? null,
      data.assigned_to ?? null,
      data.resolution  ?? null,
      id
    ]
  );
};

const softDeleteRequest = (id, reason) =>
  pool.query(
    `UPDATE requests
     SET deleted_at = NOW(), deleted_reason = $1
     WHERE id = $2
     RETURNING id`,
    [reason, id]
  );

const getExpiredDeletedRequests = () =>
  pool.query(
    `SELECT r.id, r.title, r.deleted_reason, u.email
     FROM requests r
     JOIN users u ON u.id = r.user_id
     WHERE r.deleted_at IS NOT NULL
       AND r.deleted_at <= NOW() - INTERVAL '15 days'`
  );

const hardDeleteRequest = (id) =>
  pool.query(`DELETE FROM requests WHERE id = $1`, [id]);

const logRequestHistory = (requestId, changedBy, changes) => {
  if (!changes.length) return Promise.resolve({ rows: [] });

  const values = [];
  const params = [];
  let i = 1;

  changes.forEach(({ field, oldValue, newValue, description }) => {
    values.push(`($${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++})`);
    params.push(requestId, changedBy, field, oldValue ?? null, newValue ?? null, description ?? null);
  });

  return pool.query(
    `INSERT INTO request_history (request_id, changed_by, field, old_value, new_value, description)
     VALUES ${values.join(', ')}`,
    params
  );
};

const getRequestHistory = (requestId) =>
  pool.query(
    `SELECT
       rh.id,
       rh.field,
       rh.old_value,
       rh.new_value,
       rh.description,
       rh.created_at,
       u.name  AS changed_by_name,
       u.email AS changed_by_email
     FROM request_history rh
     JOIN users u ON u.id = rh.changed_by
     WHERE rh.request_id = $1
     ORDER BY rh.created_at DESC`,
    [requestId]
  );

const _buildRequestConditions = ({ scope, userId, search, status, assignedTo }) => {
  const conditions = [];
  const values = [];
  let idx = 1;

  if (scope === 'mine' || scope === 'deleted-mine') {
    conditions.push(scope === 'mine' ? 'r.deleted_at IS NULL' : 'r.deleted_at IS NOT NULL');
    conditions.push(`r.user_id = $${idx++}`);
    values.push(userId);
  } else {
    conditions.push(scope === 'all' ? 'r.deleted_at IS NULL' : 'r.deleted_at IS NOT NULL');
  }

  if (search) {
    conditions.push(`(r.title ILIKE $${idx} OR r.description ILIKE $${idx})`);
    values.push(`%${search}%`);
    idx++;
  }
  if (status) {
    conditions.push(`r.status = $${idx++}`);
    values.push(status);
  }
  if (assignedTo) {
    conditions.push(`r.assigned_to = $${idx++}`);
    values.push(assignedTo);
  }

  return { where: conditions.join(' AND '), values, nextIdx: idx };
};

const allowedRequestSort = ['created_at', 'title', 'status', 'priority'];

const getRequests = ({ scope, userId, limit, offset, search, status, assignedTo, sort, order }) => {
  const { where, values, nextIdx } = _buildRequestConditions({ scope, userId, search, status, assignedTo });

  const safeSort = allowedRequestSort.includes(sort) ? sort : 'created_at';
  const safeOrder = order === 'ASC' ? 'ASC' : 'DESC';

  const finalValues = [...values, limit, offset];

  return pool.query(
    `SELECT r.*, u.email
     FROM requests r
     JOIN users u ON u.id = r.user_id
     WHERE ${where}
     ORDER BY r.${safeSort} ${safeOrder}
     LIMIT $${nextIdx} OFFSET $${nextIdx + 1}`,
    finalValues
  );
};

const countRequests = ({ scope, userId, search, status, assignedTo }) => {
  const { where, values } = _buildRequestConditions({ scope, userId, search, status, assignedTo });

  return pool.query(
    `SELECT COUNT(*) FROM requests r WHERE ${where}`,
    values
  );
};

module.exports = {
  createRequest,
  getRequestById,
  updateRequestFull,
  softDeleteRequest,
  getExpiredDeletedRequests,
  hardDeleteRequest,
  logRequestHistory,
  getRequestHistory,
  getRequests,
  countRequests
};