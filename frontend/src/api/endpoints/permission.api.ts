import api from "../axios";

export interface Permission {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  is_protected: boolean;
}

export interface PermissionListResponse {
  success: boolean;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  data: Permission[];
}

export interface CreatePermissionDTO {
  name: string;
  description?: string;
}

export const permissionApi = {
  getAll(
    page = 1,
    limit = 10,
    search = "",
    sort = "created_at",
    order: "ASC" | "DESC" = "DESC"
  ) {
    return api.get<PermissionListResponse>("/permissions", {
      params: { page, limit, search, sort, order },
    });
  },

  getById(uuid: string) {
    return api.get(`/permissions/${uuid}`);
  },

  create(data: CreatePermissionDTO) {
    return api.post("/permissions", data);
  },

  update(uuid: string, data: CreatePermissionDTO) {
    return api.put(`/permissions/${uuid}`, data);
  },

  delete(uuid: string) {
    return api.delete(`/permissions/${uuid}`);
  },
};
