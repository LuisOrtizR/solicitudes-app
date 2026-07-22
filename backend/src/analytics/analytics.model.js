const pool = require('../shared/config/db');

const buildPriorityFilter = (params, priority) => {
  if (!priority) return '';
  params.push(priority);
  return `AND r.priority = $${params.length}`;
};

const getSlaData = async ({ dateFrom, dateTo, priority }) => {
  const params = [dateFrom, dateTo];
  const priorityFilter = buildPriorityFilter(params, priority);

  const byPriority = await pool.query(
    `SELECT
       r.priority,
       COUNT(*) FILTER (
         WHERE r.resolved_at <= r.created_at + (sr.hours_to_resolve || ' hours')::interval
       ) AS within,
       COUNT(*) AS total
     FROM requests r
     JOIN sla_rules sr ON sr.priority = r.priority
     WHERE r.deleted_at IS NULL
       AND r.status != 'rejected'
       AND r.resolved_at IS NOT NULL
       AND r.created_at BETWEEN $1 AND $2
       ${priorityFilter}
     GROUP BY r.priority`,
    params
  );

  const totals = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE r.status = 'rejected') AS rejected,
       COUNT(*) AS total_created
     FROM requests r
     WHERE r.deleted_at IS NULL
       AND r.created_at BETWEEN $1 AND $2
       ${priorityFilter}`,
    params
  );

  return { byPriorityRows: byPriority.rows, totalsRow: totals.rows[0] };
};

const getMttrData = async ({ dateFrom, dateTo, priority }) => {
  const params = [dateFrom, dateTo];
  const priorityFilter = buildPriorityFilter(params, priority);

  const baseWhere = `
    r.deleted_at IS NULL
    AND r.status != 'rejected'
    AND r.resolved_at IS NOT NULL
    AND r.created_at BETWEEN $1 AND $2
    ${priorityFilter}
  `;

  const overall = await pool.query(
    `SELECT AVG(EXTRACT(EPOCH FROM (r.resolved_at - r.created_at)) / 3600) AS avg_hours
     FROM requests r
     WHERE ${baseWhere}`,
    params
  );

  const byPriority = await pool.query(
    `SELECT r.priority, AVG(EXTRACT(EPOCH FROM (r.resolved_at - r.created_at)) / 3600) AS avg_hours
     FROM requests r
     WHERE ${baseWhere}
     GROUP BY r.priority`,
    params
  );

  const byAgent = await pool.query(
    `SELECT
       u.id AS agent_id,
       u.name AS agent_name,
       AVG(EXTRACT(EPOCH FROM (r.resolved_at - r.created_at)) / 3600) AS avg_hours,
       COUNT(*) AS tickets_resolved
     FROM requests r
     JOIN users u ON u.id = r.assigned_to
     WHERE ${baseWhere} AND r.assigned_to IS NOT NULL
     GROUP BY u.id, u.name
     ORDER BY tickets_resolved DESC`,
    params
  );

  return { overallRow: overall.rows[0], byPriorityRows: byPriority.rows, byAgentRows: byAgent.rows };
};

const getStatusDistribution = async ({ dateFrom, dateTo, priority }) => {
  const params = [dateFrom, dateTo];
  const priorityFilter = buildPriorityFilter(params, priority);

  return pool.query(
    `SELECT r.status, COUNT(*) AS count
     FROM requests r
     WHERE r.deleted_at IS NULL
       AND r.created_at BETWEEN $1 AND $2
       ${priorityFilter}
     GROUP BY r.status`,
    params
  );
};

const getAgentWorkload = async ({ priority } = {}) => {
  const params = [];
  const priorityFilter = buildPriorityFilter(params, priority);

  return pool.query(
    `SELECT
       u.id AS agent_id,
       u.name AS agent_name,
       COUNT(*) FILTER (WHERE r.status = 'open') AS open_tickets,
       COUNT(*) FILTER (WHERE r.status = 'in_progress') AS in_progress_tickets,
       COUNT(*) AS total_active
     FROM requests r
     JOIN users u ON u.id = r.assigned_to
     WHERE r.deleted_at IS NULL
       AND r.status IN ('open', 'in_progress')
       ${priorityFilter}
     GROUP BY u.id, u.name
     ORDER BY total_active DESC`,
    params
  );
};

const getTrendsData = async ({ dateFrom, dateTo, priority, granularity }) => {
  const truncUnit = granularity === 'month' ? 'month' : 'week';
  const stepInterval = granularity === 'month' ? '1 month' : '1 week';
  const params = [dateFrom, dateTo, truncUnit, stepInterval];
  const priorityFilter = buildPriorityFilter(params, priority);

  return pool.query(
    `WITH periods AS (
       SELECT generate_series(
         date_trunc($3, $1::timestamp),
         date_trunc($3, $2::timestamp),
         $4::interval
       ) AS period
     ),
     created_counts AS (
       SELECT date_trunc($3, r.created_at) AS period, COUNT(*) AS created
       FROM requests r
       WHERE r.deleted_at IS NULL
         AND r.created_at BETWEEN $1 AND $2
         ${priorityFilter}
       GROUP BY 1
     ),
     resolved_counts AS (
       SELECT date_trunc($3, r.resolved_at) AS period, COUNT(*) AS resolved
       FROM requests r
       WHERE r.deleted_at IS NULL
         AND r.resolved_at IS NOT NULL
         AND r.created_at BETWEEN $1 AND $2
         ${priorityFilter}
       GROUP BY 1
     )
     SELECT
       periods.period,
       COALESCE(created_counts.created, 0) AS created,
       COALESCE(resolved_counts.resolved, 0) AS resolved
     FROM periods
     LEFT JOIN created_counts ON created_counts.period = periods.period
     LEFT JOIN resolved_counts ON resolved_counts.period = periods.period
     ORDER BY periods.period`,
    params
  );
};

const getCategoryDistribution = async ({ dateFrom, dateTo, priority }) => {
  const params = [dateFrom, dateTo];
  const priorityFilter = buildPriorityFilter(params, priority);

  return pool.query(
    `SELECT r.category, COUNT(*) AS count
     FROM requests r
     WHERE r.deleted_at IS NULL
       AND r.created_at BETWEEN $1 AND $2
       ${priorityFilter}
     GROUP BY r.category`,
    params
  );
};

const getFirstResponseData = async ({ dateFrom, dateTo, priority }) => {
  const params = [dateFrom, dateTo];
  const priorityFilter = buildPriorityFilter(params, priority);

  return pool.query(
    `WITH first_response AS (
       SELECT
         r.id,
         r.priority,
         EXTRACT(EPOCH FROM (MIN(rh.created_at) - r.created_at)) / 3600 AS hours
       FROM requests r
       JOIN request_history rh
         ON rh.request_id = r.id AND rh.changed_by != r.user_id
       WHERE r.deleted_at IS NULL
         AND r.created_at BETWEEN $1 AND $2
         ${priorityFilter}
       GROUP BY r.id, r.priority
     )
     SELECT priority, AVG(hours) AS avg_hours
     FROM first_response
     GROUP BY ROLLUP(priority)
     ORDER BY priority NULLS LAST`,
    params
  );
};

module.exports = {
  getSlaData,
  getMttrData,
  getStatusDistribution,
  getAgentWorkload,
  getTrendsData,
  getCategoryDistribution,
  getFirstResponseData,
};

// Mejora futura: si el volumen de `requests` crece significativamente, estas
// agregaciones son candidatas a materialized views o a un job de node-cron
// (ya es dependencia del proyecto) que precalcule un resumen diario. No se
// implementa ahora — el volumen actual (cientos/pocos miles de filas) no lo justifica.
