const authService = require('./auth.service');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const login = asyncHandler(async (req, res) => {
  const result = await authService.loginUser(req.body);

  res.json({
    success: true,
    data: result
  });
});

const refresh = asyncHandler(async (req, res) => {
  const result = await authService.refreshSession(req.body.refreshToken);

  res.json({
    success: true,
    data: result
  });
});

const logout = asyncHandler(async (req, res) => {
  await authService.logoutSession(req.body.refreshToken);

  res.json({
    success: true,
    message: 'Sesión cerrada correctamente'
  });
});

const forgot = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body.email);

  res.json({
    success: true,
    message: 'Si el usuario existe, se envió un correo.'
  });
});

const reset = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  await authService.resetPassword(token, password);

  res.json({
    success: true,
    message: 'Contraseña actualizada correctamente'
  });
});

module.exports = {
  login,
  refresh,
  logout,
  forgot,
  reset
};
