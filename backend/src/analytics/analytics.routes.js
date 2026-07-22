const express = require('express');
const router = express.Router();

const controller = require('./analytics.controller');
const authenticate = require('../shared/middleware/authenticate.middleware');
const authorize = require('../shared/middleware/authorizePermission.middleware');
const validate = require('../shared/middleware/validate.middleware');
const { analyticsQuerySchema, trendsQuerySchema } = require('./analytics.validator');

router.get(
  '/sla',
  authenticate,
  authorize('analytics_read'),
  validate(analyticsQuerySchema, 'query'),
  controller.getSla
);

router.get(
  '/mttr',
  authenticate,
  authorize('analytics_read'),
  validate(analyticsQuerySchema, 'query'),
  controller.getMttr
);

router.get(
  '/status-distribution',
  authenticate,
  authorize('analytics_read'),
  validate(analyticsQuerySchema, 'query'),
  controller.getStatusDistribution
);

router.get(
  '/agent-workload',
  authenticate,
  authorize('analytics_read'),
  validate(analyticsQuerySchema, 'query'),
  controller.getAgentWorkload
);

router.get(
  '/trends',
  authenticate,
  authorize('analytics_read'),
  validate(trendsQuerySchema, 'query'),
  controller.getTrends
);

router.get(
  '/category-distribution',
  authenticate,
  authorize('analytics_read'),
  validate(analyticsQuerySchema, 'query'),
  controller.getCategoryDistribution
);

router.get(
  '/first-response-time',
  authenticate,
  authorize('analytics_read'),
  validate(analyticsQuerySchema, 'query'),
  controller.getFirstResponseTime
);

module.exports = router;
