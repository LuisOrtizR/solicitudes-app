const express = require('express');
const router = express.Router();

const controller = require('./area.controller');
const authenticate = require('../shared/middleware/authenticate.middleware');
const authorize = require('../shared/middleware/authorizePermission.middleware');
const validate = require('../shared/middleware/validate.middleware');

const {
  idParamSchema,
  createAreaSchema,
  updateAreaSchema,
  listAreasQuerySchema
} = require('./area.validator');

router.get('/active', authenticate, controller.listActive);

router.post(
  '/',
  authenticate,
  authorize('areas_manage'),
  validate(createAreaSchema),
  controller.create
);

router.get(
  '/',
  authenticate,
  authorize('areas_manage'),
  validate(listAreasQuerySchema, 'query'),
  controller.getAll
);

router.get(
  '/:id',
  authenticate,
  authorize('areas_manage'),
  validate(idParamSchema, 'params'),
  controller.getOne
);

router.put(
  '/:id',
  authenticate,
  authorize('areas_manage'),
  validate(idParamSchema, 'params'),
  validate(updateAreaSchema),
  controller.update
);

router.delete(
  '/:id',
  authenticate,
  authorize('areas_manage'),
  validate(idParamSchema, 'params'),
  controller.remove
);

module.exports = router;
