<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { requestApi } from "@/api/endpoints/request.api";
import api from "@/api/axios";
import type { Request, RequestStatus, RequestPriority } from "@/types/request.types";
import { useAuthStore } from "@/stores/auth.store";
import { useRouter } from "vue-router";
import StatusBadge from "@/components/ui/StatusBadge.vue";
import PriorityBadge from "@/components/ui/PriorityBadge.vue";
import BaseButton from "@/components/ui/BaseButton.vue";
import Pagination from "@/components/ui/Pagination.vue";
import TableSkeleton from "@/components/ui/TableSkeleton.vue";
import { useListQuery } from "@/composables/useListQuery";
import {
  NoSymbolIcon,
  ExclamationTriangleIcon,
  InboxIcon,
  TrashIcon,
  ClipboardDocumentListIcon,
  LockClosedIcon,
  UserIcon,
  CalendarDaysIcon,
  WrenchScrewdriverIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  MagnifyingGlassIcon,
} from "@heroicons/vue/24/outline";

const auth   = useAuthStore();
const router = useRouter();

const users          = ref<{ id: string; name: string; email: string }[]>([]);
const showModal      = ref(false);
const current        = ref<Request | null>(null);
const saving         = ref(false);
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

interface ManageFilters {
  status?: string;
  assignedTo?: string;
}

const statusFilterLabels: Record<string, string> = {
  open: "Abierta", in_progress: "En Progreso", waiting_user: "Esp. Usuario",
  resolved: "Resuelta", closed: "Cerrada", rejected: "Rechazada",
};

const {
  page, limit, search, filters, data: requests, total, totalPages,
  loading, error, activeFilterChips, setFilter, clearFilter, refetch,
} = useListQuery<Request, ManageFilters>(
  async (params) => (await requestApi.getAll(params)).data,
  {
    initialFilters: { status: undefined, assignedTo: undefined },
    filterLabels: {
      status: (v) => `Estado: ${statusFilterLabels[v] ?? v}`,
      assignedTo: (v) => `Agente: ${getUserName(v)}`,
    },
  }
);

onMounted(async () => {
  if (!canManage.value) { router.push("/dashboard"); return; }
  await loadUsers();
  await refetch();
});

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
    refetch();
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
    refetch();
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

const statusLabels: Record<string, string> = {
  open: "Abierta",
  in_progress: "En Progreso",
  waiting_user: "Esp. Usuario",
  resolved: "Resuelta",
  closed: "Cerrada",
  rejected: "Rechazada",
};

const counters = computed(() => [
  { status: "open",         label: "Abiertas",    color: "border-amber-400 dark:border-amber-500",   num: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-50 dark:bg-amber-950/30" },
  { status: "in_progress",  label: "En Progreso", color: "border-blue-400 dark:border-blue-500",    num: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-50 dark:bg-blue-950/30" },
  { status: "waiting_user", label: "Esperando",   color: "border-violet-400 dark:border-violet-500",  num: "text-violet-600 dark:text-violet-400",  bg: "bg-violet-50 dark:bg-violet-950/30" },
  { status: "resolved",     label: "Resueltas",   color: "border-emerald-400 dark:border-emerald-500", num: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  { status: "closed",       label: "Cerradas",    color: "border-gray-400 dark:border-gray-600",    num: "text-gray-600 dark:text-gray-400",    bg: "bg-gray-50 dark:bg-gray-800" },
  { status: "rejected",     label: "Rechazadas",  color: "border-red-400 dark:border-red-500",     num: "text-red-600 dark:text-red-400",     bg: "bg-red-50 dark:bg-red-950/30" },
]);
</script>

<template>
  <div v-if="!canManage" class="flex flex-col items-center justify-center py-24 gap-3">
    <div class="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-400 dark:text-red-500 flex items-center justify-center">
      <NoSymbolIcon class="w-8 h-8" />
    </div>
    <h2 class="text-xl font-bold text-gray-700 dark:text-gray-200">Acceso Denegado</h2>
    <p class="text-gray-400 dark:text-gray-500 text-sm">No tienes permisos para gestionar tickets.</p>
  </div>

  <div v-else class="space-y-5 min-w-0">

    <div class="flex justify-between items-start">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Gestión de Tickets</h1>
        <p class="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Panel para Admin y Supervisores</p>
      </div>
      <div class="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-xl shrink-0">
        <span class="text-xs text-gray-500 dark:text-gray-400">Total</span>
        <span class="text-lg font-bold text-gray-800 dark:text-white">{{ total }}</span>
      </div>
    </div>

    <div v-if="error" class="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-red-600 dark:text-red-400 text-sm">
      <ExclamationTriangleIcon class="w-5 h-5 shrink-0" /> {{ error }}
      <button @click="refetch" class="ml-auto text-xs font-semibold underline hover:no-underline shrink-0">Reintentar</button>
    </div>

    <div class="grid grid-cols-3 md:grid-cols-6 gap-2">
      <div
        v-for="c in counters" :key="c.status"
        :class="[c.bg, c.color, 'border-l-4 rounded-xl p-3 flex flex-col gap-0.5 cursor-pointer transition-opacity', filters.status === c.status ? 'opacity-100 ring-2 ring-offset-1' : 'opacity-80 hover:opacity-100']"
        @click="filters.status === c.status ? clearFilter('status') : setFilter('status', c.status)"
      >
        <span :class="[c.num, 'text-xl font-bold leading-none']">
          {{ filters.status === c.status ? total : '—' }}
        </span>
        <span class="text-xs text-gray-500 dark:text-gray-400 leading-tight">{{ c.label }}</span>
      </div>
    </div>

    <div class="flex flex-wrap gap-2 items-center">
      <div class="relative flex-1 max-w-xs">
        <MagnifyingGlassIcon class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
        <input
          v-model="search"
          placeholder="Buscar ticket..."
          class="w-full pl-9 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-400"
        />
      </div>
      <select
        :value="filters.status ?? ''"
        @change="setFilter('status', ($event.target as HTMLSelectElement).value || undefined)"
        class="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary-400"
      >
        <option value="">Todos los estados</option>
        <option value="open">Abierta</option>
        <option value="in_progress">En Progreso</option>
        <option value="waiting_user">Esp. Usuario</option>
        <option value="resolved">Resuelta</option>
        <option value="closed">Cerrada</option>
        <option value="rejected">Rechazada</option>
      </select>
      <select
        :value="filters.assignedTo ?? ''"
        @change="setFilter('assignedTo', ($event.target as HTMLSelectElement).value || undefined)"
        class="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary-400"
      >
        <option value="">Todos los agentes</option>
        <option v-for="u in users" :key="u.id" :value="u.id">{{ u.name }}</option>
      </select>
      <span class="text-xs text-gray-400 dark:text-gray-500 ml-auto">{{ total }} resultado{{ total !== 1 ? 's' : '' }}</span>
    </div>

    <div v-if="activeFilterChips.length" class="flex flex-wrap gap-2">
      <span
        v-for="chip in activeFilterChips" :key="chip.key"
        class="inline-flex items-center gap-1 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 rounded-full text-xs px-3 py-1"
      >
        {{ chip.label }}
        <button @click="clearFilter(chip.key as keyof typeof filters)" class="hover:text-primary-900 dark:hover:text-primary-200">✕</button>
      </span>
    </div>

    <TableSkeleton v-if="loading" :rows="6" :columns="7" />

    <div v-else class="hidden md:block min-w-0">
      <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
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
              <tr class="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th class="px-3 py-3 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">ID</th>
                <th class="px-3 py-3 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Solicitud</th>
                <th class="px-3 py-3 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Usuario</th>
                <th class="px-3 py-3 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Asignado</th>
                <th class="px-3 py-3 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Prior.</th>
                <th class="px-3 py-3 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Estado</th>
                <th class="px-3 py-3 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Fecha</th>
                <th class="sticky right-0 px-3 py-3 text-right text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider bg-gray-50 dark:bg-gray-800/50">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50 dark:divide-gray-800">
              <tr v-for="r in requests" :key="r.id" class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                <td class="px-3 py-3">
                  <span class="font-mono text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                    #{{ r.id.slice(0, 6) }}
                  </span>
                </td>
                <td class="px-3 py-3 min-w-0">
                  <div class="font-medium text-gray-800 dark:text-white truncate">{{ r.title }}</div>
                  <div class="text-xs text-gray-400 dark:text-gray-500 truncate">{{ r.description }}</div>
                </td>
                <td class="px-3 py-3 min-w-0">
                  <span class="text-xs text-gray-600 dark:text-gray-400 truncate block">{{ r.email }}</span>
                </td>
                <td class="px-3 py-3 min-w-0">
                  <span class="text-xs text-gray-500 dark:text-gray-400 truncate block">{{ getUserName(r.assigned_to) }}</span>
                </td>
                <td class="px-3 py-3">
                  <PriorityBadge :priority="r.priority" />
                </td>
                <td class="px-3 py-3">
                  <StatusBadge :status="r.status" />
                </td>
                <td class="px-3 py-3 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                  {{ new Date(r.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short" }) }}
                </td>
                <td class="sticky right-0 px-3 py-3 text-right bg-white dark:bg-gray-900 group-hover:bg-gray-50 dark:group-hover:bg-gray-800/50">
                  <div class="flex items-center justify-end gap-1">
                    <BaseButton variant="primary" class="!px-2.5 !py-1 !text-xs" @click="openModal(r)">
                      Gestionar
                    </BaseButton>
                    <BaseButton v-if="canDelete" variant="danger" class="!px-2.5 !py-1 !text-xs" @click="openDeleteModal(r.id)">
                      Eliminar
                    </BaseButton>
                  </div>
                </td>
              </tr>
              <tr v-if="requests.length === 0">
                <td colspan="8" class="px-4 py-12 text-center">
                  <InboxIcon class="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p class="text-gray-400 dark:text-gray-500 text-sm">
                    {{ search || filters.status || filters.assignedTo ? "No hay solicitudes con estos filtros." : "No hay solicitudes registradas." }}
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-if="!loading" class="md:hidden space-y-3">
      <div v-for="r in requests" :key="r.id" class="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
        <div class="flex justify-between items-start mb-2">
          <div class="flex-1 min-w-0 pr-2">
            <div class="font-semibold text-gray-800 dark:text-white truncate">{{ r.title }}</div>
            <div class="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">{{ r.description }}</div>
          </div>
          <StatusBadge :status="r.status" class="shrink-0" />
        </div>
        <div class="flex items-center gap-2 mb-2">
          <PriorityBadge :priority="r.priority" />
          <span class="text-xs text-gray-400 dark:text-gray-500 truncate">{{ r.email }}</span>
        </div>
        <div class="text-xs text-gray-400 dark:text-gray-500 mb-3 flex items-center gap-1">
          <WrenchScrewdriverIcon class="w-3.5 h-3.5" /> {{ getUserName(r.assigned_to) }}
        </div>
        <div class="flex gap-2">
          <BaseButton variant="primary" class="flex-1" @click="openModal(r)">Gestionar</BaseButton>
          <BaseButton v-if="canDelete" variant="danger" class="flex-1" @click="openDeleteModal(r.id)">Eliminar</BaseButton>
        </div>
      </div>
      <div v-if="requests.length === 0" class="text-center py-12 text-gray-400 dark:text-gray-500">
        <InboxIcon class="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
        <p class="text-sm">
          {{ search || filters.status || filters.assignedTo ? "No hay solicitudes con estos filtros." : "No hay solicitudes registradas." }}
        </p>
      </div>
    </div>

    <Pagination
      v-if="!loading && requests.length > 0"
      :page="page" :limit="limit" :total="total" :total-pages="totalPages"
      @update:page="page = $event"
      @update:limit="limit = $event"
    />

    <!-- MODAL GESTIONAR -->
    <div v-if="showModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" @click="closeModal">
      <div class="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" @click.stop>

        <div class="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 class="text-lg font-bold text-gray-900 dark:text-white">Gestionar Ticket</h2>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-mono">#{{ current?.id.slice(0, 6) }}</p>
          </div>
          <button @click="closeModal" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">✕</button>
        </div>

        <div class="p-6 space-y-5">
          <div class="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 space-y-2">
            <div class="flex justify-between items-start gap-3">
              <p class="font-semibold text-gray-800 dark:text-white">{{ current?.title }}</p>
              <StatusBadge :status="current?.status ?? 'open'" class="shrink-0" />
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400">{{ current?.description }}</p>
            <div class="flex flex-wrap gap-x-4 gap-y-1.5 pt-1 items-center">
              <span class="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1"><UserIcon class="w-3.5 h-3.5" /> {{ current?.email }}</span>
              <span class="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1"><CalendarDaysIcon class="w-3.5 h-3.5" /> {{ current ? new Date(current.created_at).toLocaleString("es-ES") : "" }}</span>
              <span class="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1"><WrenchScrewdriverIcon class="w-3.5 h-3.5" /> {{ getUserName(current?.assigned_to) }}</span>
            </div>
          </div>

          <div v-if="isLocked" class="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl">
            <div class="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-500 dark:text-red-400 flex items-center justify-center shrink-0">
              <LockClosedIcon class="w-4.5 h-4.5" />
            </div>
            <div>
              <p class="text-sm font-semibold text-red-700 dark:text-red-400">Solicitud bloqueada</p>
              <p class="text-xs text-red-500 dark:text-red-400/80 mt-0.5">Está <strong>{{ statusLabels[current?.status ?? ""] }}</strong> y no puede modificarse.</p>
            </div>
          </div>

          <div v-else class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Estado</label>
                <select v-model="form.status" class="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none">
                  <option value="open">Abierta</option>
                  <option value="in_progress">En Progreso</option>
                  <option value="waiting_user">Esperando Usuario</option>
                  <option value="resolved">Resuelta</option>
                  <option value="closed">Cerrada</option>
                  <option value="rejected">Rechazada</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Prioridad</label>
                <select v-model="form.priority" class="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none">
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Asignar a</label>
              <select v-model="form.assigned_to" class="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none">
                <option :value="null">— Sin asignar —</option>
                <option v-for="u in users" :key="u.id" :value="u.id">{{ u.name }} ({{ u.email }})</option>
              </select>
            </div>
            <div>
              <label class="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                <component :is="form.status === 'resolved' ? CheckCircleIcon : PencilSquareIcon" class="w-3.5 h-3.5" />
                {{ form.status === "resolved" ? "Resolución" : "Notas / Resolución" }}
              </label>
              <textarea
                v-model="form.resolution" rows="4"
                class="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 focus:ring-2 focus:ring-primary-400 focus:border-transparent outline-none resize-none"
                :placeholder="form.status === 'resolved' ? 'Describe cómo se resolvió...' : 'Notas internas o comentarios...'"
              />
            </div>
          </div>

          <div class="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
            <button @click="loadHistory" :disabled="historyLoading"
              class="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors disabled:opacity-50">
              <span class="flex items-center gap-2 font-medium">
                <ClipboardDocumentListIcon class="w-4 h-4" />
                <span>{{ historyLoading ? "Cargando..." : showHistory ? "Actualizar historial" : "Ver historial de cambios" }}</span>
              </span>
              <span v-if="history.length > 0" class="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                {{ history.length }} cambios
              </span>
            </button>
            <div v-if="showHistory && !historyLoading" class="border-t border-gray-100 dark:border-gray-800">
              <div v-if="history.length === 0" class="px-4 py-6 text-center text-sm text-gray-400 dark:text-gray-500 italic">Sin cambios registrados.</div>
              <div v-else class="max-h-52 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
                <div v-for="h in history" :key="h.id" class="px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <div class="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-500/10 flex items-center justify-center text-primary-600 dark:text-primary-400 text-xs font-bold shrink-0 mt-0.5">
                    {{ h.changed_by_name?.charAt(0)?.toUpperCase() ?? "?" }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-xs font-medium text-gray-700 dark:text-gray-300">{{ h.description }}</p>
                    <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{{ h.changed_by_name }} · {{ new Date(h.created_at).toLocaleString("es-ES") }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex gap-3 pt-1">
            <BaseButton v-if="!isLocked" variant="primary" class="flex-1 !py-2.5" :disabled="saving" @click="save">
              <svg v-if="saving" class="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="white" stroke-width="4" fill="none" class="opacity-25"/>
                <path fill="white" d="M4 12a8 8 0 018-8v8z" class="opacity-75"/>
              </svg>
              {{ saving ? "Guardando..." : "Guardar Cambios" }}
            </BaseButton>
            <BaseButton variant="secondary" class="flex-1 !py-2.5" @click="closeModal">
              {{ isLocked ? "Cerrar" : "Cancelar" }}
            </BaseButton>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL ELIMINAR -->
    <div v-if="showDeleteModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" @click="closeDeleteModal">
      <div class="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md shadow-2xl" @click.stop>

        <div class="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center text-red-500 dark:text-red-400"><TrashIcon class="w-5 h-5" /></div>
            <div>
              <h2 class="text-base font-bold text-gray-900 dark:text-white">Eliminar Solicitud</h2>
              <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Esta acción no se puede deshacer</p>
            </div>
          </div>
          <button @click="closeDeleteModal" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">✕</button>
        </div>

        <div class="p-6 space-y-4">
          <div class="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-2xl px-4 py-3 flex items-start gap-2">
            <ExclamationTriangleIcon class="w-4 h-4 text-amber-500 dark:text-amber-400 mt-0.5 shrink-0" />
            <p class="text-xs text-amber-700 dark:text-amber-400">
              La solicitud pasará a eliminados y será <strong>purgada automáticamente después de 15 días</strong>.
            </p>
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Motivo de eliminación <span class="text-red-500 dark:text-red-400">*</span>
            </label>
            <textarea
              v-model="deleteReason"
              rows="3"
              :class="['w-full px-3 py-2.5 border rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 focus:ring-2 focus:ring-red-400 focus:border-transparent outline-none resize-none transition-colors', deleteReasonError ? 'border-red-400 dark:border-red-700 bg-red-50 dark:bg-red-950/30' : 'border-gray-200 dark:border-gray-700']"
              placeholder="Describe el motivo por el que se elimina esta solicitud..."
              @input="deleteReasonError = false"
            />
            <p v-if="deleteReasonError" class="text-xs text-red-500 dark:text-red-400 mt-1">El motivo es obligatorio para eliminar.</p>
          </div>

          <div class="flex gap-3 pt-1">
            <BaseButton variant="danger-solid" class="flex-1 !py-2.5" @click="confirmDelete">
              Confirmar eliminación
            </BaseButton>
            <BaseButton variant="secondary" class="flex-1 !py-2.5" @click="closeDeleteModal">
              Cancelar
            </BaseButton>
          </div>
        </div>

      </div>
    </div>

  </div>
</template>