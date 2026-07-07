<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { requestApi } from "@/api/endpoints/request.api";
import api from "@/api/axios";
import type { Request, RequestStatus, RequestPriority } from "@/types/request.types";
import { useAuthStore } from "@/stores/auth.store";
import { useRouter } from "vue-router";

const auth   = useAuthStore();
const router = useRouter();

const requests       = ref<Request[]>([]);
const users          = ref<{ id: string; name: string; email: string }[]>([]);
const loading        = ref(false);
const error          = ref<string | null>(null);
const showModal      = ref(false);
const current        = ref<Request | null>(null);
const saving         = ref(false);
const filterStatus   = ref<string>("all");
const filterPriority = ref<string>("all");
const form           = ref({
  status:      "open" as RequestStatus,
  priority:    "medium" as RequestPriority,
  assigned_to: null as string | null,
  resolution:  "",
});
const history        = ref<any[]>([]);
const showHistory    = ref(false);
const historyLoading = ref(false);

const showDeleteModal  = ref(false);
const deleteTargetId   = ref<string | null>(null);
const deleteReason     = ref("");
const deleteReasonError = ref(false);

const canManage = computed(() =>
  auth.hasPermission("requests_read_all") || auth.hasRole("admin") || auth.hasRole("supervisor")
);
const canDelete = computed(() =>
  auth.hasPermission("requests_delete") || auth.isAdmin
);
const isLocked = computed(() =>
  ["closed", "rejected"].includes(current.value?.status ?? "")
);

const filtered = computed(() => {
  return requests.value.filter(r => {
    const matchStatus   = filterStatus.value   === "all" || r.status   === filterStatus.value;
    const matchPriority = filterPriority.value === "all" || r.priority === filterPriority.value;
    return matchStatus && matchPriority;
  });
});

onMounted(async () => {
  if (!canManage.value) { router.push("/dashboard"); return; }
  await Promise.all([loadRequests(), loadUsers()]);
});

const loadRequests = async () => {
  loading.value = true;
  error.value   = null;
  try {
    const res = await requestApi.getAll();
    requests.value = Array.isArray(res.data) ? res.data : [];
  } catch {
    error.value = "Error cargando solicitudes";
  } finally {
    loading.value = false;
  }
};

const loadUsers = async () => {
  try {
    const res = await api.get("/users");
    const raw = res.data;
    if (Array.isArray(raw))            users.value = raw;
    else if (Array.isArray(raw?.data)) users.value = raw.data;
    else if (Array.isArray(raw?.rows)) users.value = raw.rows;
    else                               users.value = [];
  } catch { users.value = []; }
};

const openModal = (r: Request) => {
  current.value     = r;
  showHistory.value = false;
  history.value     = [];
  form.value = {
    status:      r.status,
    priority:    r.priority,
    assigned_to: r.assigned_to ?? null,
    resolution:  r.resolution  ?? "",
  };
  showModal.value = true;
};

const closeModal = () => { showModal.value = false; };

const save = async () => {
  if (!current.value || saving.value) return;
  saving.value = true;
  try {
    await requestApi.update(current.value.id, {
      status:      form.value.status,
      priority:    form.value.priority,
      assigned_to: form.value.assigned_to,
      resolution:  form.value.resolution || undefined,
    });
    closeModal();
    loadRequests();
  } catch (e: any) {
    alert(e.response?.data?.message || "Error actualizando solicitud");
  } finally {
    saving.value = false;
  }
};

const loadHistory = async () => {
  if (!current.value) return;
  historyLoading.value = true;
  showHistory.value    = false;
  try {
    const res     = await requestApi.history(current.value.id);
    history.value = Array.isArray(res.data) ? res.data : [];
  } catch {
    history.value = [];
  } finally {
    historyLoading.value = false;
    showHistory.value    = true;
  }
};

const openDeleteModal = (id: string) => {
  deleteTargetId.value   = id;
  deleteReason.value     = "";
  deleteReasonError.value = false;
  showDeleteModal.value  = true;
};

const closeDeleteModal = () => {
  showDeleteModal.value  = false;
  deleteTargetId.value   = null;
  deleteReason.value     = "";
  deleteReasonError.value = false;
};

const confirmDelete = async () => {
  if (!deleteReason.value.trim()) {
    deleteReasonError.value = true;
    return;
  }
  if (!deleteTargetId.value) return;
  try {
    await requestApi.delete(deleteTargetId.value, deleteReason.value.trim());
    closeDeleteModal();
    loadRequests();
  } catch (e: any) {
    alert(e.response?.data?.message || "Error eliminando");
  }
};

const getUserName = (id: string | null | undefined) => {
  if (!id) return "—";
  if (!Array.isArray(users.value) || !users.value.length) return "...";
  const u = users.value.find(u => u.id === id);
  return u ? u.name : "—";
};

const statusConfig: Record<string, { color: string; dot: string; label: string }> = {
  open:         { color: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",       dot: "bg-amber-400",   label: "Abierta" },
  in_progress:  { color: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",          dot: "bg-blue-400",    label: "En Progreso" },
  waiting_user: { color: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",    dot: "bg-violet-400",  label: "Esp. Usuario" },
  resolved:     { color: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", dot: "bg-emerald-400", label: "Resuelta" },
  closed:       { color: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",         dot: "bg-gray-400",    label: "Cerrada" },
  rejected:     { color: "bg-red-50 text-red-700 ring-1 ring-red-200",             dot: "bg-red-400",     label: "Rechazada" },
};

const priorityConfig: Record<string, { color: string; label: string }> = {
  low:    { color: "bg-slate-100 text-slate-600",         label: "Baja" },
  medium: { color: "bg-sky-100 text-sky-700",             label: "Media" },
  high:   { color: "bg-orange-100 text-orange-700",       label: "Alta" },
  urgent: { color: "bg-rose-100 text-rose-700 font-bold", label: "🔥 Urgente" },
};

const counters = computed(() => [
  { status: "open",         label: "Abiertas",    color: "border-amber-400",   num: "text-amber-600",   bg: "bg-amber-50" },
  { status: "in_progress",  label: "En Progreso", color: "border-blue-400",    num: "text-blue-600",    bg: "bg-blue-50" },
  { status: "waiting_user", label: "Esperando",   color: "border-violet-400",  num: "text-violet-600",  bg: "bg-violet-50" },
  { status: "resolved",     label: "Resueltas",   color: "border-emerald-400", num: "text-emerald-600", bg: "bg-emerald-50" },
  { status: "closed",       label: "Cerradas",    color: "border-gray-400",    num: "text-gray-600",    bg: "bg-gray-50" },
  { status: "rejected",     label: "Rechazadas",  color: "border-red-400",     num: "text-red-600",     bg: "bg-red-50" },
]);
</script>

<template>
  <div v-if="!canManage" class="flex flex-col items-center justify-center py-24 gap-3">
    <div class="text-5xl">⛔</div>
    <h2 class="text-xl font-bold text-gray-700">Acceso Denegado</h2>
    <p class="text-gray-400 text-sm">No tienes permisos para gestionar tickets.</p>
  </div>

  <div v-else class="space-y-5 min-w-0">

    <div class="flex justify-between items-start">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Gestión de Tickets</h1>
        <p class="text-sm text-gray-400 mt-0.5">Panel para Admin y Supervisores</p>
      </div>
      <div class="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-xl shrink-0">
        <span class="text-xs text-gray-500">Total</span>
        <span class="text-lg font-bold text-gray-800">{{ requests.length }}</span>
      </div>
    </div>

    <div v-if="error" class="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
      <span>⚠️</span> {{ error }}
    </div>

    <div class="grid grid-cols-3 md:grid-cols-6 gap-2">
      <div
        v-for="c in counters" :key="c.status"
        :class="[c.bg, c.color, 'border-l-4 rounded-xl p-3 flex flex-col gap-0.5 cursor-pointer transition-opacity', filterStatus === c.status ? 'opacity-100 ring-2 ring-offset-1' : 'opacity-80 hover:opacity-100']"
        @click="filterStatus = filterStatus === c.status ? 'all' : c.status"
      >
        <span :class="[c.num, 'text-xl font-bold leading-none']">
          {{ requests.filter(r => r.status === c.status).length }}
        </span>
        <span class="text-xs text-gray-500 leading-tight">{{ c.label }}</span>
      </div>
    </div>

    <div class="flex flex-wrap gap-2 items-center">
      <select v-model="filterStatus" class="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white outline-none focus:ring-2 focus:ring-blue-400">
        <option value="all">Todos los estados</option>
        <option value="open">Abierta</option>
        <option value="in_progress">En Progreso</option>
        <option value="waiting_user">Esp. Usuario</option>
        <option value="resolved">Resuelta</option>
        <option value="closed">Cerrada</option>
        <option value="rejected">Rechazada</option>
      </select>
      <select v-model="filterPriority" class="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white outline-none focus:ring-2 focus:ring-blue-400">
        <option value="all">Todas las prioridades</option>
        <option value="low">Baja</option>
        <option value="medium">Media</option>
        <option value="high">Alta</option>
        <option value="urgent">Urgente</option>
      </select>
      <button
        v-if="filterStatus !== 'all' || filterPriority !== 'all'"
        @click="filterStatus = 'all'; filterPriority = 'all'"
        class="text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
      >
        ✕ Limpiar filtros
      </button>
      <span class="text-xs text-gray-400 ml-auto">{{ filtered.length }} resultado{{ filtered.length !== 1 ? 's' : '' }}</span>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-12 gap-3 text-gray-400">
      <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" class="opacity-25"/>
        <path fill="currentColor" d="M4 12a8 8 0 018-8v8z" class="opacity-75"/>
      </svg>
      <span class="text-sm">Cargando...</span>
    </div>

    <div v-else class="hidden md:block min-w-0">
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm table-fixed">
            <colgroup>
              <col class="w-20">
              <col class="w-auto">
              <col class="w-32">
              <col class="w-32">
              <col class="w-24">
              <col class="w-28">
              <col class="w-24">
              <col class="w-28">
            </colgroup>
            <thead>
              <tr class="border-b border-gray-100 bg-gray-50">
                <th class="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">ID</th>
                <th class="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Solicitud</th>
                <th class="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Usuario</th>
                <th class="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Asignado</th>
                <th class="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Prior.</th>
                <th class="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
                <th class="px-3 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Fecha</th>
                <th class="px-3 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="r in filtered" :key="r.id" class="hover:bg-gray-50 transition-colors group">
                <td class="px-3 py-3">
                  <span class="font-mono text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                    #{{ r.id.slice(0, 6) }}
                  </span>
                </td>
                <td class="px-3 py-3 min-w-0">
                  <div class="font-medium text-gray-800 truncate">{{ r.title }}</div>
                  <div class="text-xs text-gray-400 truncate">{{ r.description }}</div>
                </td>
                <td class="px-3 py-3 min-w-0">
                  <span class="text-xs text-gray-600 truncate block">{{ r.email }}</span>
                </td>
                <td class="px-3 py-3 min-w-0">
                  <span class="text-xs text-gray-500 truncate block">{{ getUserName(r.assigned_to) }}</span>
                </td>
                <td class="px-3 py-3">
                  <span :class="priorityConfig[r.priority]?.color" class="px-2 py-0.5 rounded-lg text-xs whitespace-nowrap">
                    {{ priorityConfig[r.priority]?.label }}
                  </span>
                </td>
                <td class="px-3 py-3">
                  <span :class="statusConfig[r.status]?.color" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs whitespace-nowrap">
                    <span :class="statusConfig[r.status]?.dot" class="w-1.5 h-1.5 rounded-full shrink-0"></span>
                    {{ statusConfig[r.status]?.label }}
                  </span>
                </td>
                <td class="px-3 py-3 text-xs text-gray-400 whitespace-nowrap">
                  {{ new Date(r.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short" }) }}
                </td>
                <td class="px-3 py-3 text-right">
                  <div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button @click="openModal(r)" class="bg-blue-600 text-white px-2.5 py-1 rounded-lg hover:bg-blue-700 text-xs font-medium transition-colors whitespace-nowrap">
                      Gestionar
                    </button>
                    <button v-if="canDelete" @click="openDeleteModal(r.id)" class="text-red-500 border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-50 text-xs font-medium transition-colors whitespace-nowrap">
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="filtered.length === 0">
                <td colspan="8" class="px-4 py-12 text-center">
                  <div class="text-3xl mb-2">📭</div>
                  <p class="text-gray-400 text-sm">No hay solicitudes con estos filtros.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="md:hidden space-y-3">
      <div v-for="r in filtered" :key="r.id" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div class="flex justify-between items-start mb-2">
          <div class="flex-1 min-w-0 pr-2">
            <div class="font-semibold text-gray-800 truncate">{{ r.title }}</div>
            <div class="text-xs text-gray-400 mt-0.5 truncate">{{ r.description }}</div>
          </div>
          <span :class="statusConfig[r.status]?.color" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs shrink-0">
            <span :class="statusConfig[r.status]?.dot" class="w-1.5 h-1.5 rounded-full"></span>
            {{ statusConfig[r.status]?.label }}
          </span>
        </div>
        <div class="flex items-center gap-2 mb-2">
          <span :class="priorityConfig[r.priority]?.color" class="px-2 py-0.5 rounded-lg text-xs">{{ priorityConfig[r.priority]?.label }}</span>
          <span class="text-xs text-gray-400 truncate">{{ r.email }}</span>
        </div>
        <div class="text-xs text-gray-400 mb-3">🔧 {{ getUserName(r.assigned_to) }}</div>
        <div class="flex gap-2">
          <button @click="openModal(r)" class="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">Gestionar</button>
          <button v-if="canDelete" @click="openDeleteModal(r.id)" class="flex-1 bg-red-50 text-red-600 border border-red-200 py-2 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors">Eliminar</button>
        </div>
      </div>
      <div v-if="filtered.length === 0" class="text-center py-12 text-gray-400">
        <div class="text-3xl mb-2">📭</div>
        <p class="text-sm">No hay solicitudes con estos filtros.</p>
      </div>
    </div>

    <!-- MODAL GESTIONAR -->
    <div v-if="showModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" @click="closeModal">
      <div class="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" @click.stop>

        <div class="flex justify-between items-center p-6 border-b border-gray-100">
          <div>
            <h2 class="text-lg font-bold text-gray-900">Gestionar Ticket</h2>
            <p class="text-xs text-gray-400 mt-0.5 font-mono">#{{ current?.id.slice(0, 6) }}</p>
          </div>
          <button @click="closeModal" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">✕</button>
        </div>

        <div class="p-6 space-y-5">
          <div class="bg-gray-50 rounded-2xl p-4 space-y-2">
            <div class="flex justify-between items-start gap-3">
              <p class="font-semibold text-gray-800">{{ current?.title }}</p>
              <span :class="statusConfig[current?.status ?? 'open']?.color" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs shrink-0">
                <span :class="statusConfig[current?.status ?? 'open']?.dot" class="w-1.5 h-1.5 rounded-full"></span>
                {{ statusConfig[current?.status ?? "open"]?.label }}
              </span>
            </div>
            <p class="text-sm text-gray-500">{{ current?.description }}</p>
            <div class="flex flex-wrap gap-x-4 gap-y-1 pt-1">
              <span class="text-xs text-gray-400">👤 {{ current?.email }}</span>
              <span class="text-xs text-gray-400">📅 {{ current ? new Date(current.created_at).toLocaleString("es-ES") : "" }}</span>
              <span class="text-xs text-gray-400">🔧 {{ getUserName(current?.assigned_to) }}</span>
            </div>
          </div>

          <div v-if="isLocked" class="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
            <span class="text-2xl">🔒</span>
            <div>
              <p class="text-sm font-semibold text-red-700">Solicitud bloqueada</p>
              <p class="text-xs text-red-500 mt-0.5">Está <strong>{{ statusConfig[current?.status ?? ""]?.label }}</strong> y no puede modificarse.</p>
            </div>
          </div>

          <div v-else class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Estado</label>
                <select v-model="form.status" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none">
                  <option value="open">Abierta</option>
                  <option value="in_progress">En Progreso</option>
                  <option value="waiting_user">Esperando Usuario</option>
                  <option value="resolved">Resuelta</option>
                  <option value="closed">Cerrada</option>
                  <option value="rejected">Rechazada</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Prioridad</label>
                <select v-model="form.priority" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none">
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Asignar a</label>
              <select v-model="form.assigned_to" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none">
                <option :value="null">— Sin asignar —</option>
                <option v-for="u in users" :key="u.id" :value="u.id">{{ u.name }} ({{ u.email }})</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {{ form.status === "resolved" ? "✅ Resolución" : "📝 Notas / Resolución" }}
              </label>
              <textarea
                v-model="form.resolution" rows="4"
                class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none resize-none"
                :placeholder="form.status === 'resolved' ? 'Describe cómo se resolvió...' : 'Notas internas o comentarios...'"
              />
            </div>
          </div>

          <div class="border border-gray-100 rounded-2xl overflow-hidden">
            <button @click="loadHistory" :disabled="historyLoading"
              class="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
              <span class="flex items-center gap-2 font-medium">
                <span>📋</span>
                <span>{{ historyLoading ? "Cargando..." : showHistory ? "Actualizar historial" : "Ver historial de cambios" }}</span>
              </span>
              <span v-if="history.length > 0" class="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {{ history.length }} cambios
              </span>
            </button>
            <div v-if="showHistory && !historyLoading" class="border-t border-gray-100">
              <div v-if="history.length === 0" class="px-4 py-6 text-center text-sm text-gray-400 italic">Sin cambios registrados.</div>
              <div v-else class="max-h-52 overflow-y-auto divide-y divide-gray-50">
                <div v-for="h in history" :key="h.id" class="px-4 py-3 flex items-start gap-3 hover:bg-gray-50">
                  <div class="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold shrink-0 mt-0.5">
                    {{ h.changed_by_name?.charAt(0)?.toUpperCase() ?? "?" }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-medium text-gray-700">{{ h.description }}</p>
                    <p class="text-xs text-gray-400 mt-0.5">{{ h.changed_by_name }} · {{ new Date(h.created_at).toLocaleString("es-ES") }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex gap-3 pt-1">
            <button v-if="!isLocked" @click="save" :disabled="saving"
              class="flex-1 bg-blue-600 text-white py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 flex justify-center items-center gap-2 font-medium text-sm transition-colors">
              <svg v-if="saving" class="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="white" stroke-width="4" fill="none" class="opacity-25"/>
                <path fill="white" d="M4 12a8 8 0 018-8v8z" class="opacity-75"/>
              </svg>
              {{ saving ? "Guardando..." : "Guardar Cambios" }}
            </button>
            <button @click="closeModal" class="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl hover:bg-gray-200 font-medium text-sm transition-colors">
              {{ isLocked ? "Cerrar" : "Cancelar" }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL ELIMINAR -->
    <div v-if="showDeleteModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" @click="closeDeleteModal">
      <div class="bg-white rounded-3xl w-full max-w-md shadow-2xl" @click.stop>

        <div class="flex justify-between items-center p-6 border-b border-gray-100">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-xl">🗑️</div>
            <div>
              <h2 class="text-base font-bold text-gray-900">Eliminar Solicitud</h2>
              <p class="text-xs text-gray-400 mt-0.5">Esta acción no se puede deshacer</p>
            </div>
          </div>
          <button @click="closeDeleteModal" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">✕</button>
        </div>

        <div class="p-6 space-y-4">
          <div class="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-2">
            <span class="text-amber-500 mt-0.5">⚠️</span>
            <p class="text-xs text-amber-700">
              La solicitud pasará a eliminados y será <strong>purgada automáticamente después de 15 días</strong>.
            </p>
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Motivo de eliminación <span class="text-red-500">*</span>
            </label>
            <textarea
              v-model="deleteReason"
              rows="3"
              :class="['w-full px-3 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-red-400 focus:border-transparent outline-none resize-none transition-colors', deleteReasonError ? 'border-red-400 bg-red-50' : 'border-gray-200']"
              placeholder="Describe el motivo por el que se elimina esta solicitud..."
              @input="deleteReasonError = false"
            />
            <p v-if="deleteReasonError" class="text-xs text-red-500 mt-1">El motivo es obligatorio para eliminar.</p>
          </div>

          <div class="flex gap-3 pt-1">
            <button @click="confirmDelete" class="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl font-medium text-sm transition-colors">
              Confirmar eliminación
            </button>
            <button @click="closeDeleteModal" class="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl hover:bg-gray-200 font-medium text-sm transition-colors">
              Cancelar
            </button>
          </div>
        </div>

      </div>
    </div>

  </div>
</template>