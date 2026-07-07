<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useAuthStore } from "@/stores/auth.store";
import { useRouter } from "vue-router";
import {
  Bars3Icon,
  XMarkIcon,
  ArrowLeftOnRectangleIcon,
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
  <div class="min-h-screen flex bg-gray-100">
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <div class="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p class="text-gray-600 text-sm">Cargando...</p>
      </div>
    </div>

    <template v-else>
      <aside class="hidden md:flex md:flex-col w-72 bg-white border-r border-gray-200 h-screen sticky top-0">
        <div class="px-6 py-6 border-b border-gray-100">
          <h1 class="text-xl font-bold text-gray-900 tracking-tight">
            HelpDesk {{ displayRole }}
          </h1>
          <p class="text-xs text-gray-400 mt-1">Panel de control</p>
        </div>

        <div class="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div class="h-10 w-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold">
            {{ auth.user?.name?.charAt(0) ?? "U" }}
          </div>
          <div class="min-w-0">
            <p class="text-sm font-medium text-gray-800 truncate">{{ auth.user?.name }}</p>
            <p class="text-xs text-gray-400 truncate">{{ auth.user?.email }}</p>
          </div>
        </div>

        <nav class="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <p class="px-4 text-xs font-semibold text-gray-400 uppercase mb-2">Solicitudes</p>

          <router-link to="/dashboard" v-slot="{ isExactActive, navigate }">
            <div
              @click="navigate"
              :class="[
                'px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer',
                isExactActive ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              ]"
            >
              🏠 Dashboard
            </div>
          </router-link>

          <router-link to="/dashboard/requests" v-slot="{ isActive, navigate }">
            <div
              @click="navigate"
              :class="[
                'px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer',
                isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              ]"
            >
              📋 Pendientes
            </div>
          </router-link>

          <router-link v-if="canManageRequests" to="/dashboard/manage-requests" v-slot="{ isActive, navigate }">
            <div
              @click="navigate"
              :class="[
                'px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer',
                isActive ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              ]"
            >
              🛠️ Gestionar
            </div>
          </router-link>

          <router-link to="/dashboard/deleted-requests" v-slot="{ isActive, navigate }">
            <div
              @click="navigate"
              :class="[
                'px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer',
                isActive ? 'bg-red-500 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              ]"
            >
              🗑️ Eliminadas
            </div>
          </router-link>

          <div v-if="canViewUsers || canViewRoles || canViewPermissions" class="pt-6">
            <p class="px-4 text-xs font-semibold text-gray-400 uppercase mb-2">Administración</p>

            <router-link v-if="canViewUsers" to="/dashboard/users" v-slot="{ isActive, navigate }">
              <div
                @click="navigate"
                :class="[
                  'px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer',
                  isActive ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                ]"
              >
                👥 Usuarios
              </div>
            </router-link>

            <router-link v-if="canViewRoles" to="/dashboard/roles" v-slot="{ isActive, navigate }">
              <div
                @click="navigate"
                :class="[
                  'px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer',
                  isActive ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                ]"
              >
                🎭 Roles
              </div>
            </router-link>

            <router-link v-if="canViewPermissions" to="/dashboard/permissions" v-slot="{ isActive, navigate }">
              <div
                @click="navigate"
                :class="[
                  'px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer',
                  isActive ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                ]"
              >
                🔑 Permisos
              </div>
            </router-link>
          </div>
        </nav>

        <div class="p-4 border-t border-gray-100">
          <button
            @click="handleLogout"
            class="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <ArrowLeftOnRectangleIcon class="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div v-if="mobileOpen" class="md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" @click="mobileOpen = false">
        <aside class="w-64 bg-white h-full shadow-xl" @click.stop>
          <div class="p-6 flex justify-between items-center border-b">
            <h2 class="text-lg font-semibold text-gray-800">Menú</h2>
            <button @click="mobileOpen = false"><XMarkIcon class="w-6 h-6 text-gray-600" /></button>
          </div>

          <nav class="p-4 space-y-2">
            <p class="px-4 text-xs font-semibold text-gray-400 uppercase mb-2">Solicitudes</p>

            <router-link to="/dashboard" v-slot="{ isExactActive, navigate }">
              <div
                @click="{ navigate(); mobileOpen = false }"
                :class="[
                  'px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer',
                  isExactActive ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100'
                ]"
              >
                🏠 Dashboard
              </div>
            </router-link>

            <router-link to="/dashboard/requests" v-slot="{ isActive, navigate }">
              <div
                @click="{ navigate(); mobileOpen = false }"
                :class="[
                  'px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer',
                  isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100'
                ]"
              >
                📋 Pendientes
              </div>
            </router-link>

            <router-link v-if="canManageRequests" to="/dashboard/manage-requests" v-slot="{ isActive, navigate }">
              <div
                @click="{ navigate(); mobileOpen = false }"
                :class="[
                  'px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer',
                  isActive ? 'bg-violet-600 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100'
                ]"
              >
                🛠️ Gestionar
              </div>
            </router-link>

            <router-link to="/dashboard/deleted-requests" v-slot="{ isActive, navigate }">
              <div
                @click="{ navigate(); mobileOpen = false }"
                :class="[
                  'px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer',
                  isActive ? 'bg-red-500 text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100'
                ]"
              >
                🗑️ Eliminadas
              </div>
            </router-link>

            <div v-if="canViewUsers || canViewRoles || canViewPermissions" class="border-t pt-3">
              <p class="px-4 text-xs font-semibold text-gray-400 uppercase mb-2">Administración</p>

              <router-link v-if="canViewUsers" to="/dashboard/users" v-slot="{ isActive, navigate }">
                <div
                  @click="{ navigate(); mobileOpen = false }"
                  :class="[
                    'px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer',
                    isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                  ]"
                >
                  👥 Usuarios
                </div>
              </router-link>

              <router-link v-if="canViewRoles" to="/dashboard/roles" v-slot="{ isActive, navigate }">
                <div
                  @click="{ navigate(); mobileOpen = false }"
                  :class="[
                    'px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer',
                    isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                  ]"
                >
                  🎭 Roles
                </div>
              </router-link>

              <router-link v-if="canViewPermissions" to="/dashboard/permissions" v-slot="{ isActive, navigate }">
                <div
                  @click="{ navigate(); mobileOpen = false }"
                  :class="[
                    'px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer',
                    isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                  ]"
                >
                  🔑 Permisos
                </div>
              </router-link>
            </div>
          </nav>

          <div class="p-4 border-t">
            <button @click="handleLogout" class="w-full bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl text-sm">
              Cerrar sesión
            </button>
          </div>
        </aside>
      </div>

      <main class="flex-1 flex flex-col">
        <div class="md:hidden bg-white border-b px-4 py-3">
          <div class="flex items-center justify-between">
            <button @click="mobileOpen = true">
              <Bars3Icon class="w-6 h-6 text-gray-700" />
            </button>
            <div class="text-right min-w-0">
              <p class="text-sm font-semibold text-gray-800 truncate">
                {{ auth.user?.name ?? 'HelpDesk' }}
              </p>
              <p class="text-xs text-gray-500 truncate">
                {{ displayRole }}
              </p>
            </div>
          </div>
        </div>

        <div class="flex-1 p-4 md:p-8">
          <div class="bg-white rounded-3xl shadow-sm border border-gray-200 p-6 min-h-[80vh]">
            <router-view />
          </div>
        </div>
      </main>
    </template>
  </div>
</template>