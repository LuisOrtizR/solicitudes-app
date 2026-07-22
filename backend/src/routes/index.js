const express = require('express');

const authRoutes = require('../auth/auth.routes');
const userRoutes = require('../users/user.routes');
const roleRoutes = require('../roles/role.routes');
const permissionRoutes = require('../permissions/permission.routes');
const requestRoutes = require('../requests/request.routes');
const analyticsRoutes = require('../analytics/analytics.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/permissions', permissionRoutes);
router.use('/requests', requestRoutes);
router.use('/analytics', analyticsRoutes);

module.exports = router;