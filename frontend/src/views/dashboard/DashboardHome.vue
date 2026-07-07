<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useAuthStore } from "@/stores/auth.store";
import { userApi } from "@/api/endpoints/user.api";
import { roleApi } from "@/api/endpoints/role.api";
import { permissionApi } from "@/api/endpoints/permission.api";
import { requestApi } from "@/api/endpoints/request.api";

const authStore = useAuthStore();

// Stats
const stats = ref({
  users: 0,
  roles: 0,
  permissions: 0,
  requests: {
    total: 0,
    open: 0,
    in_progress: 0,
    waiting_user: 0,
    resolved: 0,
    closed: 0,
    rejected: 0,
  },
});

const recentRequests = ref<any[]>([]);
const loading = ref(false);

const isAdmin = computed(() => authStore.isAdmin);

// Porcentajes para barras de progreso
const activePercent = computed(() =>
  stats.value.requests.total
    ? ((stats.value.requests.open + stats.value.requests.in_progress) /
        stats.value.requests.total) *
      100
    : 0
);
const resolvedPercent = computed(() =>
  stats.value.requests.total
    ? ((stats.value.requests.resolved + stats.value.requests.closed) /
        stats.value.requests.total) *
      100
    : 0
);
const rejectedPercent = computed(() =>
  stats.value.requests.total
    ? (stats.value.requests.rejected / stats.value.requests.total) * 100
    : 0
);

// Cargar estadísticas
const loadStats = async () => {
  loading.value = true;

  try {
    if (isAdmin.value) {
      // --- Usuarios ---
      // userApi.getAll() → { data: User[], total: number }
      const usersRes = await userApi.getAll();
      stats.value.users = usersRes.data.total;

      // --- Roles ---
      // roleApi.getAll() → Role[]  (array directo)
      const rolesRes = await roleApi.getAll();
      stats.value.roles = rolesRes.data.length;

      // --- Permisos ---
      // permissionApi.getAll() → { success, total, page, limit, totalPages, data }
      const permsRes = await permissionApi.getAll();
      stats.value.permissions = permsRes.data.total;

      // --- Solicitudes (todas) ---
      // requestApi.getAll() → Request[]  (array directo)
      const requestsRes = await requestApi.getAll();
      const requests = requestsRes.data;

      fillRequestStats(requests);
      recentRequests.value = requests.slice(0, 5);
    } else {
      // Usuario normal: solo sus solicitudes
      const requestsRes = await requestApi.getMine();
      const requests = requestsRes.data;

      fillRequestStats(requests);
      recentRequests.value = requests.slice(0, 5);
    }
  } catch (error) {
    console.error("Error cargando stats:", error);
  } finally {
    loading.value = false;
  }
};

const fillRequestStats = (requests: any[]) => {
  stats.value.requests.total       = requests.length;
  stats.value.requests.open        = requests.filter((r) => r.status === "open").length;
  stats.value.requests.in_progress = requests.filter((r) => r.status === "in_progress").length;
  stats.value.requests.waiting_user = requests.filter((r) => r.status === "waiting_user").length;
  stats.value.requests.resolved    = requests.filter((r) => r.status === "resolved").length;
  stats.value.requests.closed      = requests.filter((r) => r.status === "closed").length;
  stats.value.requests.rejected    = requests.filter((r) => r.status === "rejected").length;
};

// Colores de estado
const getStatusColor = (status: string) => {
  switch (status) {
    case "open":          return "bg-blue-100 text-blue-700";
    case "in_progress":   return "bg-indigo-100 text-indigo-700";
    case "waiting_user":  return "bg-yellow-100 text-yellow-700";
    case "resolved":      return "bg-green-100 text-green-700";
    case "closed":        return "bg-gray-100 text-gray-600";
    case "rejected":      return "bg-red-100 text-red-700";
    default:              return "bg-gray-100 text-gray-600";
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case "open":          return "Abierta";
    case "in_progress":   return "En progreso";
    case "waiting_user":  return "Esperando usuario";
    case "resolved":      return "Resuelta";
    case "closed":        return "Cerrada";
    case "rejected":      return "Rechazada";
    default:              return status;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "urgent": return "bg-red-500";
    case "high":   return "bg-orange-500";
    case "medium": return "bg-yellow-400";
    case "low":    return "bg-green-400";
    default:       return "bg-gray-300";
  }
};

onMounted(loadStats);
</script>
<template>
  <div class="space-y-6">

    <!-- HEADER -->
    <div class="space-y-1">
      <h1 class="text-2xl md:text-3xl font-bold text-gray-800 wrap-break-word">
        ¡Bienvenido, {{ authStore.user?.name }}!
      </h1>
      <p class="text-sm md:text-base text-gray-500">
        {{ isAdmin ? "Panel de Administración" : "Mi Panel" }}
      </p>
    </div>

    <!-- LOADING -->
    <div v-if="loading" class="text-gray-400 py-16 text-center">
      Cargando estadísticas...
    </div>

    <template v-else>

      <!-- STATS CARDS -->
      <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">

        <div
          v-if="isAdmin"
          class="bg-white rounded-2xl shadow-sm p-5 border border-gray-100"
        >
          <p class="text-xs text-gray-400 font-medium">Total Usuarios</p>
          <p class="text-2xl md:text-3xl font-bold text-gray-800 mt-1">
            {{ stats.users }}
          </p>
        </div>

        <div
          v-if="isAdmin"
          class="bg-white rounded-2xl shadow-sm p-5 border border-gray-100"
        >
          <p class="text-xs text-gray-400 font-medium">Total Roles</p>
          <p class="text-2xl md:text-3xl font-bold text-gray-800 mt-1">
            {{ stats.roles }}
          </p>
        </div>

        <div
          v-if="isAdmin"
          class="bg-white rounded-2xl shadow-sm p-5 border border-gray-100"
        >
          <p class="text-xs text-gray-400 font-medium">Total Permisos</p>
          <p class="text-2xl md:text-3xl font-bold text-gray-800 mt-1">
            {{ stats.permissions }}
          </p>
        </div>

        <div class="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
          <p class="text-xs text-gray-400 font-medium">
            {{ isAdmin ? "Total Solicitudes" : "Mis Solicitudes" }}
          </p>
          <p class="text-2xl md:text-3xl font-bold text-gray-800 mt-1">
            {{ stats.requests.total }}
          </p>
          <p class="text-xs text-gray-400 mt-1">
            {{ stats.requests.open }} abiertas · {{ stats.requests.in_progress }} en progreso
          </p>
        </div>

      </div>

      <!-- DESGLOSE -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">

        <div class="bg-white rounded-2xl shadow-sm p-5 border border-gray-100 space-y-3">
          <div class="flex justify-between items-center">
            <h3 class="text-sm font-semibold text-gray-700">Activas</h3>
            <span class="text-xs font-bold text-blue-600">
              {{ stats.requests.open + stats.requests.in_progress }}
            </span>
          </div>
          <div class="w-full bg-gray-100 rounded-full h-2">
            <div
              class="bg-blue-500 h-2 rounded-full transition-all"
              :style="{ width: `${activePercent}%` }"
            />
          </div>
          <div class="text-xs text-gray-500 space-y-1">
            <div>Abiertas: {{ stats.requests.open }}</div>
            <div>En progreso: {{ stats.requests.in_progress }}</div>
            <div>Esp. usuario: {{ stats.requests.waiting_user }}</div>
          </div>
        </div>

        <div class="bg-white rounded-2xl shadow-sm p-5 border border-gray-100 space-y-3">
          <div class="flex justify-between items-center">
            <h3 class="text-sm font-semibold text-gray-700">Resueltas</h3>
            <span class="text-xs font-bold text-green-600">
              {{ stats.requests.resolved + stats.requests.closed }}
            </span>
          </div>
          <div class="w-full bg-gray-100 rounded-full h-2">
            <div
              class="bg-green-500 h-2 rounded-full transition-all"
              :style="{ width: `${resolvedPercent}%` }"
            />
          </div>
          <div class="text-xs text-gray-500 space-y-1">
            <div>Resueltas: {{ stats.requests.resolved }}</div>
            <div>Cerradas: {{ stats.requests.closed }}</div>
          </div>
        </div>

        <div class="bg-white rounded-2xl shadow-sm p-5 border border-gray-100 space-y-3">
          <div class="flex justify-between items-center">
            <h3 class="text-sm font-semibold text-gray-700">Rechazadas</h3>
            <span class="text-xs font-bold text-red-600">
              {{ stats.requests.rejected }}
            </span>
          </div>
          <div class="w-full bg-gray-100 rounded-full h-2">
            <div
              class="bg-red-500 h-2 rounded-full transition-all"
              :style="{ width: `${rejectedPercent}%` }"
            />
          </div>
          <p class="text-xs text-gray-500">
            {{ rejectedPercent.toFixed(0) }}% del total
          </p>
        </div>

      </div>

      <!-- SOLICITUDES RECIENTES -->
      <div class="bg-white rounded-2xl shadow-sm p-5 md:p-6 border border-gray-100 space-y-4">

        <h2 class="text-lg md:text-xl font-bold text-gray-800">
          Solicitudes Recientes
        </h2>

        <div v-if="recentRequests.length === 0" class="text-gray-400 text-center py-10">
          No hay solicitudes registradas
        </div>

        <div v-else class="space-y-3">

          <div
            v-for="request in recentRequests"
            :key="request.id"
            class="flex flex-col md:flex-row md:items-center gap-3 p-4 bg-gray-50 rounded-xl"
          >
            <div class="flex items-start gap-3 flex-1 min-w-0">
              <div
                class="w-2 h-12 rounded-full shrink-0"
                :class="getPriorityColor(request.priority)"
              />

              <div class="min-w-0 space-y-1">
                <h3 class="font-semibold text-gray-800 text-sm md:text-base wrap-break-word">
                  {{ request.title }}
                </h3>

                <p class="text-xs md:text-sm text-gray-500 wrap-break-word">
                  {{ request.description }}
                </p>

                <div class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
                  <span v-if="isAdmin">{{ request.email }}</span>
                  <span>{{ new Date(request.created_at).toLocaleDateString("es-ES") }}</span>
                  <span v-if="request.priority" class="capitalize">
                    Prioridad: {{ request.priority }}
                  </span>
                </div>
              </div>
            </div>

            <span
              :class="getStatusColor(request.status)"
              class="self-start md:self-auto px-3 py-1 rounded-full text-xs font-medium"
            >
              {{ getStatusText(request.status) }}
            </span>
          </div>

        </div>

        <router-link
          to="/dashboard/requests"
          class="block text-center text-sm md:text-base text-blue-600 hover:text-blue-700 font-medium"
        >
          Ver todas las solicitudes →
        </router-link>

      </div>

    </template>
  </div>
</template>
