import api from "../axios";

export interface Role {
  id: string;
  name: string;
  description: string | null;
}

export interface CreateRoleDTO {
  name: string;
  description?: string;
}

export interface UpdateRoleDTO {
  name: string;
  description?: string;
}

export interface RoleListParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: "ASC" | "DESC";
}

export interface RoleListResponse {
  success: boolean;
  data: Role[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const roleApi = {
  getAll(params: RoleListParams = {}) {
    return api.get<RoleListResponse>("/roles", { params });
  },

  create(data: CreateRoleDTO) {
    return api.post<Role>("/roles", data);
  },

  update(id: string, data: UpdateRoleDTO) {
    return api.put<Role>(`/roles/${id}`, data);
  },

  delete(id: string) {
    return api.delete(`/roles/${id}`);
  },

  assignPermission(roleId: string, permissionId: string) {
    return api.post(`/roles/${roleId}/permissions`, { permissionId });
  },
  removePermission(roleId: string, permissionId: string) {
  return api.delete(`/roles/${roleId}/permissions/${permissionId}`);
  },
  getPermissions(roleId: string) {
    return api.get(`/roles/${roleId}/permissions`);
  },
};