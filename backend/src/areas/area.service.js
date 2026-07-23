const {
  createArea,
  getAreasPaginated,
  countAreas,
  getAreaById,
  getAreaByName,
  updateArea,
  deleteArea,
  getAllActiveAreas
} = require('./area.model');

const AppError = require('../shared/utils/AppError');

const SYSTEM_AREAS = ['Service Desk IT'];

const createAreaService = async ({ nombre, descripcion }) => {
  const exists = await getAreaByName(nombre);

  if (exists.rowCount)
    throw new AppError('El área ya existe', 409);

  return createArea(nombre, descripcion);
};

const getAreasService = async ({ page = 1, limit = 10, search, sort, order }) => {
  const offset = (page - 1) * limit;

  const data = await getAreasPaginated(limit, offset, search, sort, order);
  const totalResult = await countAreas(search);
  const total = Number(totalResult.rows[0].count);

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
    data: data.rows,
  };
};

const getAreaService = (id) => getAreaById(id);

const listActiveAreasService = () => getAllActiveAreas();

const updateAreaService = async (id, { nombre, descripcion, activo }) => {
  const existing = await getAreaById(id);

  if (!existing.rowCount)
    throw new AppError('Área no encontrada', 404);

  if (SYSTEM_AREAS.includes(existing.rows[0].nombre) && nombre !== existing.rows[0].nombre)
    throw new AppError(`El área "${existing.rows[0].nombre}" es del sistema y no puede renombrarse`, 403);

  return updateArea(id, nombre, descripcion, activo ?? existing.rows[0].activo);
};

const deleteAreaService = async (id) => {
  const existing = await getAreaById(id);

  if (!existing.rowCount)
    throw new AppError('Área no encontrada', 404);

  if (SYSTEM_AREAS.includes(existing.rows[0].nombre))
    throw new AppError(`El área "${existing.rows[0].nombre}" es del sistema y no puede eliminarse`, 403);

  return deleteArea(id);
};

module.exports = {
  createAreaService,
  getAreasService,
  getAreaService,
  listActiveAreasService,
  updateAreaService,
  deleteAreaService
};
