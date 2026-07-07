import api from "../axios";
import type { Request, CreateRequestDTO, UpdateRequestDTO } from "@/types/request.types";

export const requestApi = {
  create:     (data: CreateRequestDTO)             => api.post<Request>("/requests", data),
  getAll:     ()                                   => api.get<Request[]>("/requests"),
  getMine:    ()                                   => api.get<Request[]>("/requests/mine"),
  getDeleted: ()                                   => api.get<Request[]>("/requests/deleted"),
  getOne:     (id: string)                         => api.get<Request>(`/requests/${id}`),
  update:     (id: string, data: UpdateRequestDTO) => api.put<Request>(`/requests/${id}`, data),
  delete:     (id: string, reason: string)         => api.delete(`/requests/${id}`, { data: { reason } }),
  history:    (id: string)                         => api.get<any[]>(`/requests/${id}/history`),
};