const AppError = require('../shared/utils/AppError');
const {
  getUsersService,
  createUserService,
  getUserService,
  updateUserService,
  deleteUserService,
  changeUserRoleService
} = require('./user.service');

const { findUserWithRolesAndPermissionsById } = require('./user.model');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const isAdminOrSelf = (user, id) =>
  user.roles.includes('admin') || user.id === id;

const getAll = asyncHandler(async (req, res) => {
  const result = await getUsersService(req.query);
  res.json({ success: true, ...result });
});

const create = asyncHandler(async (req, res) => {
  const user = await createUserService(req.body);
  res.status(201).json({ success: true, data: user });
});

const getOne = asyncHandler(async (req, res) => {
  const requestedId = req.params.id;

  if (!isAdminOrSelf(req.user, requestedId))
    throw new AppError('No autorizado', 403);

  const user = await getUserService(requestedId);
  res.json(user);
});

const getMe = asyncHandler(async (req, res) => {
  const user = await findUserWithRolesAndPermissionsById(req.user.id);

  if (!user)
    throw new AppError('Usuario no encontrado', 404);

  res.json({ success: true, data: user });
});

const update = asyncHandler(async (req, res) => {
  const requestedId = req.params.id;

  if (!isAdminOrSelf(req.user, requestedId))
    throw new AppError('No autorizado', 403);

  const updated = await updateUserService(
    requestedId,
    req.body,
    req.user
  );

  res.json(updated);
});

const updateMe = asyncHandler(async (req, res) => {
  const updated = await updateUserService(
    req.user.id,
    req.body,
    req.user
  );

  res.json(updated);
});

const remove = asyncHandler(async (req, res) => {
  const requestedId = req.params.id;

  if (!isAdminOrSelf(req.user, requestedId))
    throw new AppError('No autorizado', 403);

  await deleteUserService(requestedId);
  res.json({ message: 'Usuario eliminado correctamente' });
});

const removeMe = asyncHandler(async (req, res) => {
  await deleteUserService(req.user.id);
  res.json({ message: 'Cuenta eliminada correctamente' });
});

const changeRole = asyncHandler(async (req, res) => {
  const updated = await changeUserRoleService(
    req.params.id,
    req.body.role
  );

  res.json(updated);
});

module.exports = {
  getAll,
  create,
  getOne,
  getMe,
  update,
  updateMe,
  remove,
  removeMe,
  changeRole
};
