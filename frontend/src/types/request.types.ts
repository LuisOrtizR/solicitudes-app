export type RequestStatus =
  | "open"
  | "in_progress"
  | "waiting_user"
  | "resolved"
  | "closed"
  | "rejected";

export type RequestPriority =
  | "low"
  | "medium"
  | "high"
  | "urgent";

export type RequestCategory =
  | "soporte_tecnico"
  | "accesos_permisos"
  | "hardware"
  | "software"
  | "otro";

export interface Request {
  id: string;
  title: string;
  description: string;
  status: RequestStatus;
  priority: RequestPriority;
  category: RequestCategory;
  user_id: string;
  assigned_to: string | null;
  resolution: string | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
  closed_at?: string | null;
  deleted_at?: string | null;
  deleted_reason?: string | null;
  email?: string;
}

export interface CreateRequestDTO {
  title: string;
  description: string;
  priority?: RequestPriority;
  category?: RequestCategory;
}

export interface UpdateRequestDTO {
  title?: string;
  description?: string;
  status?: RequestStatus;
  priority?: RequestPriority;
  category?: RequestCategory;
  assigned_to?: string | null;
  resolution?: string | null;
}