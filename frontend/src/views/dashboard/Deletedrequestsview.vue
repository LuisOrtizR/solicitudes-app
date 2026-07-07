<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { requestApi } from "@/api/endpoints/request.api";
import { useAuthStore } from "@/stores/auth.store";
import type { Request } from "@/types/request.types";

const authStore = useAuthStore();
const requests = ref<Request[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const showDetailModal = ref(false);
const detailRequest = ref<Request | null>(null);
const historyList = ref<any[]>([]);
const loadingHistory = ref(false);

const isAdmin = computed(() => authStore.isAdmin);

const fetchDeleted = async () => {
  loading.value = true;
  error.value = null;
  try {
    const res = await requestApi.getDeleted();
    requests.value = res.data;
  } catch (err: any) {
    error.value = err.response?.data?.message || "Error cargando solicitudes eliminadas";
  } finally {
    loading.value = false;
  }
};

const openDetail = async (r: Request) => {
  detailRequest.value = r;
  showDetailModal.value = true;
  historyList.value = [];
  loadingHistory.value = true;
  try {
    const res = await requestApi.history(r.id);
    historyList.value = res.data;
  } catch {
    historyList.value = [];
  } finally {
    loadingHistory.value = false;
  }
};

const priorityConfig: Record<string, { color: string; label: string }> = {
  low:    { color: "bg-slate-100 text-slate-600",         label: "Baja" },
  medium: { color: "bg-sky-100 text-sky-700",             label: "Media" },
  high:   { color: "bg-orange-100 text-orange-700",       label: "Alta" },
  urgent: { color: "bg-rose-100 text-rose-700 font-bold", label: "🔥 Urgente" },
};

const statusConfig: Record<string, { color: string; dot: string; label: string }> = {
  open:         { color: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",       dot: "bg-amber-400",   label: "Abierta" },
  in_progress:  { color: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",          dot: "bg-blue-400",    label: "En Progreso" },
  waiting_user: { color: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",    dot: "bg-violet-400",  label: "Esp. Usuario" },
  resolved:     { color: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200", dot: "bg-emerald-400", label: "Resuelta" },
  closed:       { color: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",         dot: "bg-gray-400",    label: "Cerrada" },
  rejected:     { color: "bg-red-50 text-red-700 ring-1 ring-red-200",             dot: "bg-red-400",     label: "Rechazada" },
};

const daysUntilPurge = (deletedAt: string) => {
  const deleted = new Date(deletedAt).getTime();
  const now = Date.now();
  const diff = Math.ceil((deleted + 15 * 24 * 60 * 60 * 1000 - now) / (1000 * 60 * 60 * 24));
  return Math.max(diff, 0);
};

onMounted(fetchDeleted);
</script>

<template>
  <div class="space-y-6">

    <div class="flex justify-between items-start">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 tracking-tight">
          {{ isAdmin ? 'Solicitudes Eliminadas' : 'Mis Solicitudes Eliminadas' }}
        </h1>
        <p class="text-sm text-gray-400 mt-0.5">
          Registros pendientes de purga definitiva tras 15 días
        </p>
      </div>
      <div class="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-xl">
        <span class="text-xs text-gray-500">Total</span>
        <span class="text-lg font-bold text-gray-800">{{ requests.length }}</span>
      </div>
    </div>

    <div v-if="error" class="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
      ⚠️ {{ error }}
    </div>

    <div v-if="loading" class="flex items-center justify-center py-12 gap-3 text-gray-400">
      <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" class="opacity-25"/>
        <path fill="currentColor" d="M4 12a8 8 0 018-8v8z" class="opacity-75"/>
      </svg>
      <span class="text-sm">Cargando...</span>
    </div>

    <div v-else class="hidden md:block">
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100 bg-gray-50">
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Solicitud</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Prioridad</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Usuario</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Motivo</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Eliminada el</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Purga en</th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="r in requests" :key="r.id" class="hover:bg-gray-50 transition-colors group">
                <td class="px-4 py-3 min-w-0">
                  <div class="font-medium text-gray-500 line-through truncate">{{ r.title }}</div>
                  <div class="text-xs text-gray-400 truncate max-w-xs">{{ r.description }}</div>
                </td>
                <td class="px-4 py-3">
                  <span :class="priorityConfig[r.priority]?.color" class="px-2 py-0.5 rounded-lg text-xs">
                    {{ priorityConfig[r.priority]?.label }}
                  </span>
                </td>
                <td class="px-4 py-3 text-xs text-gray-500">{{ r.email }}</td>
                <td class="px-4 py-3 max-w-xs">
                  <span class="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-lg line-clamp-2">
                    {{ r.deleted_reason || '—' }}
                  </span>
                </td>
                <td class="px-4 py-3 text-xs text-gray-400">
                  {{ new Date(r.deleted_at!).toLocaleString('es-ES') }}
                </td>
                <td class="px-4 py-3">
                  <span
                    class="text-xs px-2 py-1 rounded-lg font-medium"
                    :class="daysUntilPurge(r.deleted_at!) <= 3
                      ? 'bg-red-100 text-red-700'
                      : daysUntilPurge(r.deleted_at!) <= 7
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-gray-100 text-gray-600'"
                  >
                    {{ daysUntilPurge(r.deleted_at!) === 0 ? 'Hoy' : `${daysUntilPurge(r.deleted_at!)} día(s)` }}
                  </span>
                </td>
                <td class="px-4 py-3 text-right">
                  <div class="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      @click="openDetail(r)"
                      class="bg-gray-600 text-white px-3 py-1 rounded-lg text-xs hover:bg-gray-700"
                    >
                      Ver historial
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="requests.length === 0">
                <td colspan="7" class="px-4 py-12 text-center text-gray-400">
                  ✅ No hay solicitudes pendientes de purga.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="md:hidden space-y-3">
      <div v-for="r in requests" :key="r.id" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div class="flex justify-between items-start mb-2">
          <div class="flex-1 min-w-0 pr-2">
            <div class="font-semibold text-gray-500 line-through truncate">{{ r.title }}</div>
            <div class="text-xs text-gray-400 truncate">{{ r.description }}</div>
          </div>
          <span
            class="text-xs px-2 py-1 rounded-lg font-medium shrink-0"
            :class="daysUntilPurge(r.deleted_at!) <= 3
              ? 'bg-red-100 text-red-700'
              : daysUntilPurge(r.deleted_at!) <= 7
                ? 'bg-amber-100 text-amber-700'
                : 'bg-gray-100 text-gray-600'"
          >
            {{ daysUntilPurge(r.deleted_at!) === 0 ? 'Hoy' : `${daysUntilPurge(r.deleted_at!)} día(s)` }}
          </span>
        </div>
        <div class="flex items-center gap-2 mb-2">
          <span :class="priorityConfig[r.priority]?.color" class="px-2 py-0.5 rounded-lg text-xs">
            {{ priorityConfig[r.priority]?.label }}
          </span>
          <span class="text-xs text-gray-400">{{ r.email }}</span>
        </div>
        <div class="bg-red-50 rounded-xl px-3 py-2 mb-3">
          <p class="text-xs text-gray-400 mb-0.5">Motivo de eliminación</p>
          <p class="text-xs text-red-600">{{ r.deleted_reason || '—' }}</p>
        </div>
        <p class="text-xs text-gray-400 mb-3">
          Eliminada: {{ new Date(r.deleted_at!).toLocaleString('es-ES') }}
        </p>
        <button
          @click="openDetail(r)"
          class="w-full bg-gray-600 text-white py-2 rounded-xl text-sm hover:bg-gray-700"
        >
          Ver historial
        </button>
      </div>
    </div>

    <div
      v-if="showDetailModal"
      class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      @click="showDetailModal = false"
    >
      <div
        class="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
        @click.stop
      >
        <div class="flex items-center gap-3 mb-5">
          <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-lg shrink-0">
            🗑️
          </div>
          <div class="min-w-0">
            <h2 class="text-lg font-bold text-gray-900 leading-tight">Detalle de Solicitud Eliminada</h2>
            <p class="text-xs text-gray-400 truncate">{{ detailRequest?.title }}</p>
          </div>
        </div>

        <div class="space-y-3 text-sm">
          <div>
            <p class="text-gray-500 text-xs mb-0.5">Título</p>
            <p class="font-medium text-gray-700 line-through">{{ detailRequest?.title }}</p>
          </div>
          <div>
            <p class="text-gray-500 text-xs mb-0.5">Descripción</p>
            <p class="text-gray-700">{{ detailRequest?.description }}</p>
          </div>
          <div class="flex gap-2 flex-wrap">
            <span
              v-if="detailRequest?.status"
              :class="statusConfig[detailRequest.status]?.color"
              class="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
            >
              <span :class="statusConfig[detailRequest.status]?.dot" class="w-1.5 h-1.5 rounded-full"/>
              {{ statusConfig[detailRequest.status]?.label }}
            </span>
            <span
              v-if="detailRequest?.priority"
              :class="priorityConfig[detailRequest.priority]?.color"
              class="px-2 py-1 rounded-lg text-xs"
            >
              {{ priorityConfig[detailRequest.priority]?.label }}
            </span>
          </div>
          <div>
            <p class="text-gray-500 text-xs mb-0.5">Usuario</p>
            <p class="text-gray-700">{{ detailRequest?.email }}</p>
          </div>
          <div v-if="detailRequest?.resolution" class="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
            <p class="text-emerald-800 font-semibold text-xs mb-1">✅ Resolución</p>
            <p class="text-emerald-700 text-sm">{{ detailRequest.resolution }}</p>
          </div>
          <div class="bg-red-50 border border-red-200 rounded-xl p-3">
            <p class="text-red-800 font-semibold text-xs mb-1">🗑️ Motivo de eliminación</p>
            <p class="text-red-700 text-sm">{{ detailRequest?.deleted_reason || '—' }}</p>
            <p class="text-red-400 text-xs mt-1">
              Eliminada el {{ detailRequest?.deleted_at ? new Date(detailRequest.deleted_at).toLocaleString('es-ES') : '—' }}
              · Purga en {{ detailRequest?.deleted_at ? daysUntilPurge(detailRequest.deleted_at) : 0 }} día(s)
            </p>
          </div>
        </div>

        <div class="mt-6">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">📋 Historial de cambios</h3>
          <div v-if="loadingHistory" class="text-center text-gray-400 text-xs py-4">
            Cargando historial...
          </div>
          <div v-else-if="historyList.length === 0" class="text-center text-gray-400 text-xs py-4">
            Sin cambios registrados.
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="h in historyList"
              :key="h.id"
              class="rounded-xl px-3 py-2 text-xs"
              :class="h.new_value === 'deleted' ? 'bg-red-50 border border-red-100' : 'bg-gray-50'"
            >
              <div class="flex justify-between items-center mb-0.5">
                <span
                  class="font-medium"
                  :class="h.new_value === 'deleted' ? 'text-red-700' : 'text-gray-700'"
                >
                  {{ h.changed_by_name }}
                </span>
                <span class="text-gray-400">{{ new Date(h.created_at).toLocaleString('es-ES') }}</span>
              </div>
              <p :class="h.new_value === 'deleted' ? 'text-red-600' : 'text-gray-600'">
                {{ h.description }}
              </p>
            </div>
          </div>
        </div>

        <button
          @click="showDetailModal = false"
          class="w-full mt-6 bg-gray-100 text-gray-700 py-2.5 rounded-xl hover:bg-gray-200 text-sm"
        >
          Cerrar
        </button>
      </div>
    </div>

  </div>
</template>