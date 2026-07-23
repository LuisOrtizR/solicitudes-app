const {
  createNewRequest,
  updateExistingRequest,
  getRequestById,
  deleteRequestById,
  listRequestsService,
  getHistoryByRequest
} = require('./request.service');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const create = asyncHandler(async (req, res) => {
  const result = await createNewRequest(req.body, req.user.id);
  res.status(201).json(result.rows[0]);
});

const getAll = asyncHandler(async (req, res) => {
  if (!canManageAllRequests(req.user))
    return res.status(403).json({ message: 'No autorizado: tu área no gestiona tickets' });

  const result = await listRequestsService({ ...req.query, scope: 'all' });
  res.json({ success: true, ...result });
});

const getMine = asyncHandler(async (req, res) => {
  const { assignedTo, ...rest } = req.query;
  const result = await listRequestsService({ ...rest, scope: 'mine', userId: req.user.id });
  res.json({ success: true, ...result });
});

const getAssigned = asyncHandler(async (req, res) => {
  const { assignedTo, ...rest } = req.query;
  const result = await listRequestsService({ ...rest, scope: 'assigned', userId: req.user.id });
  res.json({ success: true, ...result });
});

const canManageAllRequests = (user) => {
  if (!user.permissions?.includes('requests_read_all')) return false;
  if (user.roles.includes('admin') || user.roles.includes('admin_system')) return true;
  return user.area_name === 'Service Desk IT';
};

const isAssignedAgent = (user) => user.permissions?.includes('requests_manage_assigned');

const canViewRequest = (user, request) =>
  canManageAllRequests(user) ||
  request.user_id === user.id ||
  (isAssignedAgent(user) && request.assigned_to === user.id);

const getDeleted = asyncHandler(async (req, res) => {
  const { assignedTo, ...rest } = req.query;
  const scope = canManageAllRequests(req.user) ? 'deleted' : 'deleted-mine';
  const result = await listRequestsService({ ...rest, scope, userId: req.user.id });
  res.json({ success: true, ...result });
});

const getOne = asyncHandler(async (req, res) => {
  const result = await getRequestById(req.params.id);
  if (!result.rowCount)
    return res.status(404).json({ message: 'Solicitud no encontrada' });

  const request = result.rows[0];
  if (!canViewRequest(req.user, request))
    return res.status(403).json({ message: 'No autorizado' });

  res.json(request);
});

const update = asyncHandler(async (req, res) => {
  const result = await updateExistingRequest(req.params.id, req.body, req.user);
  if (!result.rowCount)
    return res.status(404).json({ message: 'Solicitud no encontrada o sin permiso' });
  res.json(result.rows[0]);
});

const remove = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const result = await deleteRequestById(req.params.id, req.user, reason);
  if (!result.rowCount)
    return res.status(404).json({ message: 'Solicitud no encontrada o sin permiso' });
  res.json({ message: 'Solicitud eliminada correctamente' });
});

const getHistory = asyncHandler(async (req, res) => {
  const request = await getRequestById(req.params.id);
  if (!request.rowCount)
    return res.status(404).json({ message: 'Solicitud no encontrada' });

  if (!canViewRequest(req.user, request.rows[0]))
    return res.status(403).json({ message: 'No autorizado' });

  const result = await getHistoryByRequest(req.params.id);
  res.json(result.rows);
});

module.exports = { create, getAll, getMine, getAssigned, getDeleted, getOne, update, remove, getHistory };