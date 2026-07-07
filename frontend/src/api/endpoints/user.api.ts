import api from "../axios"

export interface User {
  id: string
  name: string
  email: string
  roles: string[]
  permissions: string[]
  is_active: boolean
  created_at: string
}

export interface UserListResponse {
  data: User[]
  total: number
  page: number
  limit: number
}

export interface ApiResponse<T> {
  data: T
}


export const userApi = {
  getAll() {
    return api.get<UserListResponse>("/users")
  },

  getOne(id: string) {
  return api.get<ApiResponse<User>>(`/users/${id}`)
  },

  getMe() {
  return api.get<ApiResponse<User>>("/users/me")
  },

  create(data: { name: string; email: string; password: string }) {
    return api.post("/users", data)
  },

  update(id: string, data: { name: string; email: string }) {
    return api.put(`/users/${id}`, data)
  },

  changeRole(id: string, data: { role: string }) {
    return api.patch(`/users/${id}/role`, data)
  },

  delete(id: string) {
    return api.delete(`/users/${id}`)
  },

  deleteMe() {
    return api.delete("/users/me")
  }
}
