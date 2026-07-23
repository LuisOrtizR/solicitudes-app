import api from "../axios";

export interface Area {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  created_at: string;
}

export interface CreateAreaDTO {
  nombre: string;
  descripcion?: string;
}

export interface UpdateAreaDTO {
  nombre: string;
  descripcion?: string;
  activo?: boolean;
}

export interface AreaListParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: "ASC" | "DESC";
}

export interface AreaListResponse {
  success: boolean;
  data: Area[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ActiveAreasResponse {
  success: boolean;
  data: Area[];
}

export const areaApi = {
  getAll(params: AreaListParams = {}) {
    return api.get<AreaListResponse>("/areas", { params });
  },

  listActive() {
    return api.get<ActiveAreasResponse>("/areas/active");
  },

  create(data: CreateAreaDTO) {
    return api.post<Area>("/areas", data);
  },

  update(id: string, data: UpdateAreaDTO) {
    return api.put<Area>(`/areas/${id}`, data);
  },

  delete(id: string) {
    return api.delete(`/areas/${id}`);
  },
};
