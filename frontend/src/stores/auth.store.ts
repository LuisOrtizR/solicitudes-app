  import { defineStore } from "pinia";
  import { authApi } from "@/api/endpoints/auth.api";
  import { userApi } from "@/api/endpoints/user.api";
  import type { AuthState, RegisterDTO, LoginDTO } from "@/types/auth.types";
  import {
    setAccessToken,
    setRefreshToken,
    clearTokens,
    getAccessToken,
    getRefreshToken,
  } from "@/utils/token";

  export const useAuthStore = defineStore("auth", {
    state: (): AuthState => ({
      user: null,
      accessToken: getAccessToken(),
      refreshToken: getRefreshToken(),
      loading: false,
    }),

    getters: {
      isAdmin: (state) => state.user?.roles?.includes("admin") || false,
      hasRole: (state) => (role: string) => state.user?.roles?.includes(role) || false,
      hasPermission: (state) => (permission: string) => 
        state.user?.permissions?.includes(permission) || false,
    },

    actions: {
      /* ================= FETCH USER ================= */
  async fetchUser(): Promise<void> {
    try {
      const response = await userApi.getMe();
      // 🔥 Acceder a response.data.data en lugar de solo response.data
      this.user = response.data.data;
      
      console.log('✅ Usuario cargado:', this.user); // Debug
      console.log('✅ Roles:', this.user?.roles); // Debug
      console.log('✅ Permisos:', this.user?.permissions); // Debug
    } catch (error) {
      console.error("Error fetching user:", error);
      this.user = null;
    }
      },

      /* ================= LOGIN ================= */
      async login(payload: LoginDTO): Promise<void> {
        this.loading = true;

        try {
          const response = await authApi.login(payload);

          const { accessToken, refreshToken } = response.data.data;

          this.accessToken = accessToken;
          this.refreshToken = refreshToken;

          setAccessToken(accessToken);
          setRefreshToken(refreshToken);

          // Cargar datos del usuario con roles y permisos
          await this.fetchUser();

        } catch (error) {
          throw error;
        } finally {
          this.loading = false;
        }
      },

      /* ================= REGISTER ================= */
      async register(payload: RegisterDTO): Promise<void> {
        this.loading = true;

        try {
          const response = await authApi.register(payload);

          const { accessToken, refreshToken } = response.data.data;

          this.accessToken = accessToken;
          this.refreshToken = refreshToken;

          setAccessToken(accessToken);
          setRefreshToken(refreshToken);

          // Cargar datos del usuario
          await this.fetchUser();

        } catch (error) {
          throw error;
        } finally {
          this.loading = false;
        }
      },

      /* ================= REFRESH ================= */
      async refresh(): Promise<void> {
        if (!this.refreshToken) return;

        try {
          const response = await authApi.refresh(this.refreshToken);

          const { accessToken } = response.data.data;

          this.accessToken = accessToken;
          setAccessToken(accessToken);
        } catch (error) {
          this.logout();
        }
      },

      /* ================= LOGOUT ================= */
      async logout(): Promise<void> {
        try {
          if (this.refreshToken) {
            await authApi.logout(this.refreshToken);
          }
        } finally {
          this.user = null;
          this.accessToken = null;
          this.refreshToken = null;

          clearTokens();
        }
      },
    },
  });