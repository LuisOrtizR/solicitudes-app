import { createRouter, createWebHistory } from "vue-router";
import AuthLayout from "@/layouts/AuthLayout.vue";
import DashboardLayout from "@/layouts/DashboardLayout.vue";
import { authGuard } from "./guards";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    /* ================= AUTH ================= */
    {
      path: "/",
      component: AuthLayout,
      children: [
        {
          path: "",
          redirect: "/login",
        },
        {
          path: "login",
          name: "login",
          component: () => import("@/views/auth/LoginView.vue"),
        },
        {
          path: "register",
          name: "register",
          component: () => import("@/views/auth/RegisterView.vue"),
        },
        {
          path: "forgot-password",
          name: "forgot-password",
          component: () => import("@/views/auth/ForgotPasswordView.vue"),
        },
        {
          path: "reset-password",
          name: "reset-password",
          component: () => import("@/views/auth/ResetPasswordView.vue"),
        },
      ],
    },

    /* ================= DASHBOARD ================= */
    {
      path: "/dashboard",
      component: DashboardLayout,
      beforeEnter: authGuard, // 🔥 Usar el guard
      children: [
        {
          path: "",
          name: "dashboard-home",
          component: () => import("@/views/dashboard/DashboardHome.vue"),
        },
        {
          path: "users",
          name: "users",
          component: () => import("@/views/dashboard/UsersView.vue"),
          meta: { requiresRole: 'admin' }, // Solo admin
        },
        {
          path: "roles",
          name: "roles",
          component: () => import("@/views/dashboard/RolesView.vue"),
          meta: { requiresRole: 'admin' },
        },
        {
          path: "permissions",
          name: "permissions",
          component: () => import("@/views/dashboard/PermissionsView.vue"),
          meta: { requiresRole: 'admin' },
        },
        {
          path: "requests",
          name: "requests",
          component: () => import("@/views/dashboard/RequestsView.vue"),
        },
        {
          path: "manage-requests",
          name: "manage-requests",
          component: () => import("@/views/dashboard/ManageRequestsView.vue"),
          meta: { requiresAnyRole: ['admin', 'supervisor'] }, // Admin o Supervisor
        },
        {
          path: "deleted-requests",
          name: "deleted-requests",
          component: () => import("@/views/dashboard/Deletedrequestsview.vue"),
        },
      ],
    },
  ],
});

export default router;