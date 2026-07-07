/* ======================================================
   USER CON ROLES Y PERMISOS (PARA AUTH)
====================================================== */

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  permissions: string[];
}

/* ======================================================
   AUTH REQUESTS
====================================================== */

export interface RegisterDTO {
  name: string;
  email: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RefreshDTO {
  refreshToken: string;
}

export interface ForgotPasswordDTO {
  email: string;
}

export interface ResetPasswordDTO {
  token: string;
  password: string;
}

/* ======================================================
   AUTH RESPONSES (ALINEADO A TU BACKEND)
====================================================== */

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  success: boolean;
  data: AuthTokens;
}

export interface RefreshResponse {
  success: boolean;
  data: {
    accessToken: string;
  };
}

export interface MessageResponse {
  success: boolean;
  message: string;
}

/* ======================================================
   AUTH STORE STATE
====================================================== */

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  loading: boolean;
}