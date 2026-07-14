<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useAuthStore } from "@/stores/auth.store";
import { useRouter } from "vue-router";
import {
  Bars3Icon,
  XMarkIcon,
  ArrowLeftOnRectangleIcon,
  HomeIcon,
  ClipboardDocumentListIcon,
  WrenchScrewdriverIcon,
  TrashIcon,
  UsersIcon,
  ShieldCheckIcon,
  KeyIcon,
  TicketIcon,
} from "@heroicons/vue/24/outline";

const auth = useAuthStore();
const router = useRouter();
const mobileOpen = ref(false);
const loading = ref(true);

const displayRole = computed<string>(() => {
  const firstRole = auth.user?.roles?.[0];
  if (!firstRole) return "Usuario";
  if (firstRole === "admin") return "Admin";
  if (firstRole === "supervisor") return "Supervisor";
  return firstRole.charAt(0).toUpperCase() + firstRole.slice(1);
});

const canViewUsers = computed(() => auth.hasPermission("users_read") || auth.isAdmin);
const canViewRoles = computed(() => auth.hasPermission("manage_roles") || auth.isAdmin);
const canViewPermissions = computed(() => auth.hasPermission("manage_permissions") || auth.isAdmin);
const canManageRequests = computed(
  () => auth.hasPermission("requests_read.all") || auth.hasRole("supervisor") || auth.isAdmin
);

const navItems = computed(() => [
  { to: "/dashboard", label: "Dashboard", icon: HomeIcon, exact: true, show: true },
  { to: "/dashboard/requests", label: "Pendientes", icon: ClipboardDocumentListIcon, exact: false, show: true },
  { to: "/dashboard/manage-requests", label: "Gestionar", icon: WrenchScrewdriverIcon, exact: false, show: canManageRequests.value },
  { to: "/dashboard/deleted-requests", label: "Eliminadas", icon: TrashIcon, exact: false, show: true },
]);

const adminItems = computed(() => [
  { to: "/dashboard/users", label: "Usuarios", icon: UsersIcon, show: canViewUsers.value },
  { to: "/dashboard/roles", label: "Roles", icon: ShieldCheckIcon, show: canViewRoles.value },
  { to: "/dashboard/permissions", label: "Permisos", icon: KeyIcon, show: canViewPermissions.value },
]);

const showAdminSection = computed(() => canViewUsers.value || canViewRoles.value || canViewPermissions.value);

const handleLogout = async () => {
  await auth.logout();
  router.push("/login");
};

onMounted(async () => {
  if (!auth.user && auth.accessToken) {
    await auth.fetchUser();
  }
  loading.value = false;
});
</script>

<template>
  <div class="min-h-screen flex bg-gray-50">
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div class="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p class="text-gray-500 text-sm">Cargando...</p>
      </div>
    </div>

    <template v-else>
      <!-- SIDEBAR ESCRITORIO -->
      <aside class="hidden md:flex md:flex-col w-72 bg-slate-950 relative overflow-hidden h-screen sticky top-0">
        <div class="absolute -top-24 -left-24 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl" aria-hidden="true" />
        <div class="absolute bottom-0 -right-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" aria-hidden="true" />

        <div class="relative z-10 flex flex-col h-full">
          <div class="px-6 py-6 border-b border-white/10">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-lg bg-indigo-500 flex items-center justify-center shrink-0">
                <TicketIcon class="w-5 h-5 text-white" />
              </div>
              <div class="min-w-0">
                <span class="text-white font-semibold text-base tracking-tight block truncate">TicketFlow</span>
                <span class="text-slate-500 text-xs block truncate">Panel de control</span>
              </div>
            </div>
          </div>

          <div class="px-6 py-4 border-b border-white/10 flex items-center gap-3">
            <div class="h-10 w-10 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center font-semibold shrink-0">
              {{ auth.user?.name?.charAt(0) ?? "U" }}
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium text-white truncate">{{ auth.user?.name }}</p>
              <p class="text-xs text-slate-500 truncate">{{ displayRole }}</p>
            </div>
          </div>

          <nav class="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            <p class="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Solicitudes</p>

            <router-link
              v-for="item in navItems.filter(i => i.show)"
              :key="item.to"
              :to="item.to"
              v-slot="{ isActive, isExactActive, navigate }"
            >
              <div
                @click="navigate"
                :class="[
                  'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer',
                  (item.exact ? isExactActive : isActive)
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-950/50'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                ]"
              >
                <component :is="item.icon" class="w-4.5 h-4.5 shrink-0" />
                {{ item.label }}
              </div>
            </router-link>

            <div v-if="showAdminSection" class="pt-6">
              <p class="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Administración</p>

              <router-link
                v-for="item in adminItems.filter(i => i.show)"
                :key="item.to"
                :to="item.to"
                v-slot="{ isActive, navigate }"
              >
                <div
                  @click="navigate"
                  :class="[
                    'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer',
                    isActive ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-950/50' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  ]"
                >
                  <component :is="item.icon" class="w-4.5 h-4.5 shrink-0" />
                  {{ item.label }}
                </div>
              </router-link>
            </div>
          </nav>

          <div class="p-4 border-t border-white/10">
            <button
              @click="handleLogout"
              class="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              <ArrowLeftOnRectangleIcon class="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      <!-- MENÚ MÓVIL -->
      <div v-if="mobileOpen" class="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" @click="mobileOpen = false">
        <aside class="w-72 bg-slate-950 h-full shadow-xl relative overflow-hidden" @click.stop>
          <div class="absolute -top-24 -left-24 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl" aria-hidden="true" />

          <div class="relative z-10 flex flex-col h-full">
            <div class="p-6 flex justify-between items-center border-b border-white/10">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
                  <TicketIcon class="w-4.5 h-4.5 text-white" />
                </div>
                <span class="text-white font-semibold">TicketFlow</span>
              </div>
              <button @click="mobileOpen = false" class="text-slate-400 hover:text-white transition-colors">
                <XMarkIcon class="w-6 h-6" />
              </button>
            </div>

            <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
              <p class="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Solicitudes</p>

              <router-link
                v-for="item in navItems.filter(i => i.show)"
                :key="item.to"
                :to="item.to"
                v-slot="{ isActive, isExactActive, navigate }"
              >
                <div
                  @click="() => { navigate(); mobileOpen = false; }"
                  :class="[
                    'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer',
                    (item.exact ? isExactActive : isActive) ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  ]"
                >
                  <component :is="item.icon" class="w-4.5 h-4.5 shrink-0" />
                  {{ item.label }}
                </div>
              </router-link>

              <div v-if="showAdminSection" class="border-t border-white/10 pt-3 mt-3">
                <p class="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Administración</p>

                <router-link
                  v-for="item in adminItems.filter(i => i.show)"
                  :key="item.to"
                  :to="item.to"
                  v-slot="{ isActive, navigate }"
                >
                  <div
                    @click="() => { navigate(); mobileOpen = false; }"
                    :class="[
                      'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer',
                      isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    ]"
                  >
                    <component :is="item.icon" class="w-4.5 h-4.5 shrink-0" />
                    {{ item.label }}
                  </div>
                </router-link>
              </div>
            </nav>

            <div class="p-4 border-t border-white/10">
              <button @click="handleLogout" class="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 py-2.5 rounded-lg text-sm font-medium transition-colors">
                <ArrowLeftOnRectangleIcon class="w-4 h-4" />
                Cerrar sesión
              </button>
            </div>
          </div>
        </aside>
      </div>

      <!-- CONTENIDO -->
      <main class="flex-1 flex flex-col min-w-0">
        <div class="md:hidden bg-slate-950 px-4 py-3 flex items-center justify-between">
          <button @click="mobileOpen = true" class="text-slate-300 hover:text-white transition-colors">
            <Bars3Icon class="w-6 h-6" />
          </button>
          <div class="flex items-center gap-2">
            <div class="text-right min-w-0">
              <p class="text-sm font-semibold text-white truncate">{{ auth.user?.name ?? "TicketFlow" }}</p>
              <p class="text-xs text-slate-500 truncate">{{ displayRole }}</p>
            </div>
            <div class="h-8 w-8 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center font-semibold text-sm shrink-0">
              {{ auth.user?.name?.charAt(0) ?? "U" }}
            </div>
          </div>
        </div>

        <div class="flex-1 p-4 md:p-8">
          <div class="bg-white rounded-2xl shadow-sm border border-gray-200/70 p-6 min-h-[80vh]">
            <router-view />
          </div>
        </div>
      </main>
    </template>
  </div>
</template>
