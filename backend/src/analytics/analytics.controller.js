const service = require('./analytics.service');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const getSla = asyncHandler(async (req, res) => {
  res.json(await service.getSlaSummary(req.query));
});

const getMttr = asyncHandler(async (req, res) => {
  res.json(await service.getMttrSummary(req.query));
});

const getStatusDistribution = asyncHandler(async (req, res) => {
  res.json(await service.getStatusDistributionSummary(req.query));
});

const getAgentWorkload = asyncHandler(async (req, res) => {
  res.json(await service.getAgentWorkloadSummary(req.query));
});

const getTrends = asyncHandler(async (req, res) => {
  res.json(await service.getTrendsSummary(req.query));
});

const getCategoryDistribution = asyncHandler(async (req, res) => {
  res.json(await service.getCategoryDistributionSummary(req.query));
});

const getFirstResponseTime = asyncHandler(async (req, res) => {
  res.json(await service.getFirstResponseSummary(req.query));
});

module.exports = {
  getSla,
  getMttr,
  getStatusDistribution,
  getAgentWorkload,
  getTrends,
  getCategoryDistribution,
  getFirstResponseTime,
};
