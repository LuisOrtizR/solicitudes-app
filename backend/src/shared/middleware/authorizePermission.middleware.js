const AppError = require('../utils/AppError');

const authorizePermission = (requiredPermission) => {
  return (req, res, next) => {

    if (!req.user)
      return next(new AppError('No autenticado', 401));

    const { permissions = [] } = req.user;

    if (!permissions.includes(requiredPermission))
      return next(
        new AppError(
          `Permiso requerido: ${requiredPermission}`,
          403
        )
      );

    next();
  };
};

module.exports = authorizePermission;
