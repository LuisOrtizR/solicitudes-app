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

export const roleApi = {
  getAll() {
    return api.get<Role[]>("/roles");
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