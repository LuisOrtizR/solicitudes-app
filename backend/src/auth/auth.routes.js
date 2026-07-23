const express = require('express');
const controller = require('./auth.controller');
const validate = require('../shared/middleware/validate.middleware');

const {
  loginSchema,
  refreshSchema,
  forgotSchema,
  resetSchema
} = require('./auth.validator');

const router = express.Router();

router.post('/login', validate(loginSchema), controller.login);
router.post('/refresh', validate(refreshSchema), controller.refresh);
router.post('/logout', controller.logout);
router.post('/forgot', validate(forgotSchema), controller.forgot);
router.post('/reset', validate(resetSchema), controller.reset);

module.exports = router;
