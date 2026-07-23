const {
  createAreaService,
  getAreasService,
  getAreaService,
  listActiveAreasService,
  updateAreaService,
  deleteAreaService
} = require('./area.service');

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const create = asyncHandler(async (req, res) => {
  const area = await createAreaService(req.body);
  res.status(201).json(area.rows[0]);
});

const getAll = asyncHandler(async (req, res) => {
  const result = await getAreasService(req.query);
  res.json({ success: true, ...result });
});

const listActive = asyncHandler(async (req, res) => {
  const result = await listActiveAreasService();
  res.json({ success: true, data: result.rows });
});

const getOne = asyncHandler(async (req, res) => {
  const area = await getAreaService(req.params.id);

  if (!area.rowCount)
    return res.status(404).json({ message: 'Área no encontrada' });

  res.json(area.rows[0]);
});

const update = asyncHandler(async (req, res) => {
  const updated = await updateAreaService(req.params.id, req.body);
  res.json(updated.rows[0]);
});

const remove = asyncHandler(async (req, res) => {
  await deleteAreaService(req.params.id);
  res.json({ message: 'Área eliminada correctamente' });
});

module.exports = {
  create,
  getAll,
  listActive,
  getOne,
  update,
  remove
};
