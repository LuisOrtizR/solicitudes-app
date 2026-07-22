const {
  getSlaData,
  getMttrData,
  getStatusDistribution,
  getAgentWorkload,
  getTrendsData,
  getCategoryDistribution,
  getFirstResponseData,
} = require('./analytics.model');

const PRIORITY_ORDER = ['low', 'medium', 'high', 'urgent'];
const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 30 * 6;

const resolveDateRange = (dateFrom, dateTo) => {
  const to = dateTo ? new Date(dateTo) : new Date();
  const from = dateFrom ? new Date(dateFrom) : new Date(to.getTime() - SIX_MONTHS_MS);
  return { dateFrom: from.toISOString(), dateTo: to.toISOString() };
};

const round1 = (n) => Math.round((Number(n) || 0) * 10) / 10;

const getSlaSummary = async (filters) => {
  const range = resolveDateRange(filters.dateFrom, filters.dateTo);
  const { byPriorityRows, totalsRow } = await getSlaData({ ...range, priority: filters.priority });

  let withinSla = 0;
  let totalResolved = 0;

  const byPriority = PRIORITY_ORDER.map((priority) => {
    const row = byPriorityRows.find((r) => r.priority === priority);
    const within = row ? Number(row.within) : 0;
    const total = row ? Number(row.total) : 0;
    withinSla += within;
    totalResolved += total;
    return {
      priority,
      withinSlaPercentage: total ? round1((within / total) * 100) : 0,
      total,
    };
  });

  const totalCreated = Number(totalsRow.total_created) || 0;
  const rejected = Number(totalsRow.rejected) || 0;

  return {
    withinSla,
    breachedSla: totalResolved - withinSla,
    withinSlaPercentage: totalResolved ? round1((withinSla / totalResolved) * 100) : 0,
    totalResolved,
    rejectedPercentage: totalCreated ? round1((rejected / totalCreated) * 100) : 0,
    byPriority,
  };
};

const getMttrSummary = async (filters) => {
  const range = resolveDateRange(filters.dateFrom, filters.dateTo);
  const { overallRow, byPriorityRows, byAgentRows } = await getMttrData({ ...range, priority: filters.priority });

  const byPriority = PRIORITY_ORDER.map((priority) => {
    const row = byPriorityRows.find((r) => r.priority === priority);
    return { priority, avgHours: row ? round1(row.avg_hours) : 0 };
  });

  const byAgent = byAgentRows.map((row) => ({
    agentId: row.agent_id,
    agentName: row.agent_name,
    avgHours: round1(row.avg_hours),
    ticketsResolved: Number(row.tickets_resolved),
  }));

  return {
    overallMttrHours: round1(overallRow && overallRow.avg_hours),
    byPriority,
    byAgent,
  };
};

const getStatusDistributionSummary = async (filters) => {
  const range = resolveDateRange(filters.dateFrom, filters.dateTo);
  const { rows } = await getStatusDistribution({ ...range, priority: filters.priority });

  const total = rows.reduce((sum, r) => sum + Number(r.count), 0);

  return rows.map((r) => ({
    status: r.status,
    count: Number(r.count),
    percentage: total ? round1((Number(r.count) / total) * 100) : 0,
  }));
};

const getAgentWorkloadSummary = async (filters) => {
  const { rows } = await getAgentWorkload({ priority: filters.priority });

  return rows.map((r) => ({
    agentId: r.agent_id,
    agentName: r.agent_name,
    openTickets: Number(r.open_tickets),
    inProgressTickets: Number(r.in_progress_tickets),
    totalActive: Number(r.total_active),
  }));
};

const getTrendsSummary = async (filters) => {
  const range = resolveDateRange(filters.dateFrom, filters.dateTo);
  const granularity = filters.granularity === 'month' ? 'month' : 'week';
  const { rows } = await getTrendsData({ ...range, priority: filters.priority, granularity });

  return rows.map((r) => ({
    period: new Date(r.period).toISOString(),
    created: Number(r.created),
    resolved: Number(r.resolved),
  }));
};

const getCategoryDistributionSummary = async (filters) => {
  const range = resolveDateRange(filters.dateFrom, filters.dateTo);
  const { rows } = await getCategoryDistribution({ ...range, priority: filters.priority });

  const total = rows.reduce((sum, r) => sum + Number(r.count), 0);

  return rows.map((r) => ({
    category: r.category,
    count: Number(r.count),
    percentage: total ? round1((Number(r.count) / total) * 100) : 0,
  }));
};

const getFirstResponseSummary = async (filters) => {
  const range = resolveDateRange(filters.dateFrom, filters.dateTo);
  const { rows } = await getFirstResponseData({ ...range, priority: filters.priority });

  const overallRow = rows.find((r) => r.priority === null);
  const byPriority = PRIORITY_ORDER.map((priority) => {
    const row = rows.find((r) => r.priority === priority);
    return { priority, avgHours: row ? round1(row.avg_hours) : 0 };
  });

  return {
    overallAvgHours: round1(overallRow && overallRow.avg_hours),
    byPriority,
  };
};

module.exports = {
  getSlaSummary,
  getMttrSummary,
  getStatusDistributionSummary,
  getAgentWorkloadSummary,
  getTrendsSummary,
  getCategoryDistributionSummary,
  getFirstResponseSummary,
};
