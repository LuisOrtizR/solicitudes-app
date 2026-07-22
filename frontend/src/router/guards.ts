import { useAuthStore } from "@/stores/auth.store";
import type { NavigationGuardNext, RouteLocationNormalized } from "vue-router";

export const authGuard = async (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
) => {
  const auth = useAuthStore();

  // Verificar si requiere autenticación
  if (!auth.accessToken) {
    return next("/login");
  }

  // El perfil (roles/permisos) aún no se ha cargado, por ejemplo tras
  // recargar la página o navegar directo a una URL con rol requerido.
  if (!auth.user) {
    try {
      await auth.fetchUser();
    } catch {
      return next("/login");
    }
  }

  // Verificar si requiere un rol específico
  if (to.meta.requiresRole) {
    const role = to.meta.requiresRole as string;
    if (!auth.hasRole(role)) {
      return next("/dashboard"); // Redirigir si no tiene el rol
    }
  }

  // Verificar si requiere ALGUNO de varios roles
  if (to.meta.requiresAnyRole) {
    const roles = to.meta.requiresAnyRole as string[];
    const hasAnyRole = roles.some(role => auth.hasRole(role));
    if (!hasAnyRole) {
      return next("/dashboard");
    }
  }

  // Verificar si requiere un permiso específico
  if (to.meta.requiresPermission) {
    const permission = to.meta.requiresPermission as string;
    if (!auth.hasPermission(permission)) {
      return next("/dashboard");
    }
  }

  next();
};