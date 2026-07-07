export type Role = string;
export type Permission = string;

// Este User es para el CRUD de administración de usuarios
export interface User {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
  created_at: string;
  role: string;
}