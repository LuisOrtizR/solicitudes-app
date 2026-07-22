import api from "../axios";
import type { Request, CreateRequestDTO, UpdateRequestDTO } from "@/types/request.types";

export interface RequestListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  assignedTo?: string;
  sort?: string;
  order?: "ASC" | "DESC";
}

export interface RequestListResponse {
  success: boolean;
  data: Request[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const requestApi = {
  create:     (data: CreateRequestDTO)             => api.post<Request>("/requests", data),
  getAll:     (params: RequestListParams = {})     => api.get<RequestListResponse>("/requests", { params }),
  getMine:    (params: RequestListParams = {})     => api.get<RequestListResponse>("/requests/mine", { params }),
  getDeleted: (params: RequestListParams = {})     => api.get<RequestListResponse>("/requests/deleted", { params }),
  getOne:     (id: string)                         => api.get<Request>(`/requests/${id}`),
  update:     (id: string, data: UpdateRequestDTO) => api.put<Request>(`/requests/${id}`, data),
  delete:     (id: string, reason: string)         => api.delete(`/requests/${id}`, { data: { reason } }),
  history:    (id: string)                         => api.get<any[]>(`/requests/${id}/history`),
};
