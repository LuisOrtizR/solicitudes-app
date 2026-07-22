const express = require('express');
const router  = express.Router();

const controller = require('./request.controller');
const authenticate = require('../shared/middleware/authenticate.middleware');
const authorize    = require('../shared/middleware/authorizePermission.middleware');
const validate     = require('../shared/middleware/validate.middleware');
const {
  createRequestSchema,
  updateRequestSchema,
  deleteRequestSchema,
  listRequestsQuerySchema
} = require('./request.validator');

router.post(
  '/',
  authenticate,
  authorize('requests_create'),
  validate(createRequestSchema),
  controller.create
);

router.get(
  '/',
  authenticate,
  authorize('requests_read_all'),
  validate(listRequestsQuerySchema, 'query'),
  controller.getAll
);

router.get(
  '/mine',
  authenticate,
  authorize('requests_read'),
  validate(listRequestsQuerySchema, 'query'),
  controller.getMine
);

router.get(
  '/deleted',
  authenticate,
  authorize('requests_read'),
  validate(listRequestsQuerySchema, 'query'),
  controller.getDeleted
);

router.get(
  '/:id',
  authenticate,
  authorize('requests_read'),
  controller.getOne
);

router.get(
  '/:id/history',
  authenticate,
  authorize('requests_read'),
  controller.getHistory
);

router.put(
  '/:id',
  authenticate,
  validate(updateRequestSchema),
  controller.update
);

router.delete(
  '/:id',
  authenticate,
  validate(deleteRequestSchema),
  controller.remove
);

module.exports = router;