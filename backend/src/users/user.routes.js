const express = require('express');
const router = express.Router();

const controller = require('./user.controller');
const authenticate = require('../shared/middleware/authenticate.middleware');
const authorizePermission = require('../shared/middleware/authorizePermission.middleware');
const validate = require('../shared/middleware/validate.middleware');

const {
  idParamSchema,
  updateUserSchema,
  createUserSchema,
  changeRoleSchema,
  listUsersQuerySchema
} = require('./user.validator');

router.get('/me', authenticate, controller.getMe);
router.put('/me', authenticate, validate(updateUserSchema), controller.updateMe);
router.delete('/me', authenticate, controller.removeMe);

router.get(
  '/',
  authenticate,
  authorizePermission('users_read'),
  validate(listUsersQuerySchema, 'query'),
  controller.getAll
);

router.post(
  '/',
  authenticate,
  authorizePermission('users_create'),
  validate(createUserSchema),
  controller.create
);

router.get(
  '/:id',
  authenticate,
  authorizePermission('users_read'),
  validate(idParamSchema, 'params'),
  controller.getOne
);

router.put(
  '/:id',
  authenticate,
  authorizePermission('users_update'),
  validate(idParamSchema, 'params'),
  validate(updateUserSchema),
  controller.update
);

router.delete(
  '/:id',
  authenticate,
  authorizePermission('users_delete'),
  validate(idParamSchema, 'params'),
  controller.remove
);

router.patch(
  '/:id/role',
  authenticate,
  authorizePermission('users_change_role'),
  validate(idParamSchema, 'params'),
  validate(changeRoleSchema),
  controller.changeRole
);

module.exports = router;
