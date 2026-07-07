import api from "@/api/axios";
import type {
  AuthResponse,
  RefreshResponse,
  RegisterDTO,
  LoginDTO,
} from "@/types/auth.types";

export const authApi = {
  login(payload: LoginDTO) {
    return api.post<AuthResponse>("/auth/login", payload);
  },

  register(payload: RegisterDTO) {
    return api.post<AuthResponse>("/auth/register", payload);
  },

  refresh(refreshToken: string) {
    return api.post<RefreshResponse>("/auth/refresh", { refreshToken });
  },

  logout(refreshToken: string) {
    return api.post("/auth/logout", { refreshToken });
  },

  forgot(email: string) {
    return api.post("/auth/forgot", { email });
  },

  reset(token: string, password: string) {
    return api.post("/auth/reset", { token, password });
  },
};