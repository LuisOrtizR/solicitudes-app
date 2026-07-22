<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { requestApi } from "@/api/endpoints/request.api";
import { useAuthStore } from "@/stores/auth.store";
import type { Request } from "@/types/request.types";
import StatusBadge from "@/components/ui/StatusBadge.vue";
import PriorityBadge from "@/components/ui/PriorityBadge.vue";
import BaseButton from "@/components/ui/BaseButton.vue";
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  TrashIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/vue/24/outline";

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
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
          {{ isAdmin ? 'Solicitudes Eliminadas' : 'Mis Solicitudes Eliminadas' }}
        </h1>
        <p class="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
          Registros pendientes de purga definitiva tras 15 días
        </p>
      </div>
      <div class="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-xl">
        <span class="text-xs text-gray-500 dark:text-gray-400">Total</span>
        <span class="text-lg font-bold text-gray-800 dark:text-white">{{ requests.length }}</span>
      </div>
    </div>

    <div v-if="error" class="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-red-600 dark:text-red-400 text-sm">
<ExclamationTriangleIcon class="w-5 h-5 shrink-0" /> {{ error }}
    </div>

    <div v-if="loading" class="flex items-center justify-center py-12 gap-3 text-gray-400">
      <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" class="opacity-25"/>
        <path fill="currentColor" d="M4 12a8 8 0 018-8v8z" class="opacity-75"/>
      </svg>
      <span class="text-sm">Cargando...</span>
    </div>

    <div v-else class="hidden md:block">
      <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase">Solicitud</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase">Prioridad</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase">Usuario</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase">Motivo</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase">Eliminada el</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase">Purga en</th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50 dark:divide-gray-800">
              <tr v-for="r in requests" :key="r.id" class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                <td class="px-4 py-3 min-w-0">
                  <div class="font-medium text-gray-500 dark:text-gray-400 line-through truncate">{{ r.title }}</div>
                  <div class="text-xs text-gray-400 dark:text-gray-500 truncate max-w-xs">{{ r.description }}</div>
                </td>
                <td class="px-4 py-3">
                  <PriorityBadge :priority="r.priority" />
                </td>
                <td class="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">{{ r.email }}</td>
                <td class="px-4 py-3 max-w-xs">
                  <span class="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-1 rounded-lg line-clamp-2">
                    {{ r.deleted_reason || '—' }}
                  </span>
                </td>
                <td class="px-4 py-3 text-xs text-gray-400 dark:text-gray-500">
                  {{ new Date(r.deleted_at!).toLocaleString('es-ES') }}
                </td>
                <td class="px-4 py-3">
                  <span
                    class="text-xs px-2 py-1 rounded-lg font-medium"
                    :class="daysUntilPurge(r.deleted_at!) <= 3
                      ? 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400'
                      : daysUntilPurge(r.deleted_at!) <= 7
                        ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'"
                  >
                    {{ daysUntilPurge(r.deleted_at!) === 0 ? 'Hoy' : `${daysUntilPurge(r.deleted_at!)} día(s)` }}
                  </span>
                </td>
                <td class="px-4 py-3 text-right">
                  <div class="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <BaseButton variant="primary" class="!px-3 !py-1 !text-xs" @click="openDetail(r)">
                      Ver historial
                    </BaseButton>
                  </div>
                </td>
              </tr>
              <tr v-if="requests.length === 0">
                <td colspan="7" class="px-4 py-12 text-center text-gray-400 dark:text-gray-500">
                  <CheckCircleIcon class="w-8 h-8 mx-auto mb-2 text-emerald-300 dark:text-emerald-700" />
                  No hay solicitudes pendientes de purga.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="md:hidden space-y-3">
      <div v-for="r in requests" :key="r.id" class="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
        <div class="flex justify-between items-start mb-2">
          <div class="flex-1 min-w-0 pr-2">
            <div class="font-semibold text-gray-500 dark:text-gray-400 line-through truncate">{{ r.title }}</div>
            <div class="text-xs text-gray-400 dark:text-gray-500 truncate">{{ r.description }}</div>
          </div>
          <span
            class="text-xs px-2 py-1 rounded-lg font-medium shrink-0"
            :class="daysUntilPurge(r.deleted_at!) <= 3
              ? 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400'
              : daysUntilPurge(r.deleted_at!) <= 7
                ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'"
          >
            {{ daysUntilPurge(r.deleted_at!) === 0 ? 'Hoy' : `${daysUntilPurge(r.deleted_at!)} día(s)` }}
          </span>
        </div>
        <div class="flex items-center gap-2 mb-2">
          <PriorityBadge :priority="r.priority" />
          <span class="text-xs text-gray-400 dark:text-gray-500">{{ r.email }}</span>
        </div>
        <div class="bg-red-50 dark:bg-red-950/40 rounded-xl px-3 py-2 mb-3">
          <p class="text-xs text-gray-400 dark:text-gray-500 mb-0.5">Motivo de eliminación</p>
          <p class="text-xs text-red-600 dark:text-red-400">{{ r.deleted_reason || '—' }}</p>
        </div>
        <p class="text-xs text-gray-400 dark:text-gray-500 mb-3">
          Eliminada: {{ new Date(r.deleted_at!).toLocaleString('es-ES') }}
        </p>
        <BaseButton variant="primary" class="w-full" @click="openDetail(r)">
          Ver historial
        </BaseButton>
      </div>
    </div>

    <div
      v-if="showDetailModal"
      class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      @click="showDetailModal = false"
    >
      <div
        class="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg shadow-2xl p-6 max-h-[90vh] overflow-y-auto"
        @click.stop
      >
        <div class="flex items-center gap-3 mb-5">
          <div class="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
            <TrashIcon class="w-5 h-5" />
          </div>
          <div class="min-w-0">
            <h2 class="text-lg font-bold text-gray-900 dark:text-white leading-tight">Detalle de Solicitud Eliminada</h2>
            <p class="text-xs text-gray-400 dark:text-gray-500 truncate">{{ detailRequest?.title }}</p>
          </div>
        </div>

        <div class="space-y-3 text-sm">
          <div>
            <p class="text-gray-500 dark:text-gray-400 text-xs mb-0.5">Título</p>
            <p class="font-medium text-gray-700 dark:text-gray-300 line-through">{{ detailRequest?.title }}</p>
          </div>
          <div>
            <p class="text-gray-500 dark:text-gray-400 text-xs mb-0.5">Descripción</p>
            <p class="text-gray-700 dark:text-gray-300">{{ detailRequest?.description }}</p>
          </div>
          <div class="flex gap-2 flex-wrap">
            <StatusBadge v-if="detailRequest?.status" :status="detailRequest.status" />
            <PriorityBadge v-if="detailRequest?.priority" :priority="detailRequest.priority" />
          </div>
          <div>
            <p class="text-gray-500 dark:text-gray-400 text-xs mb-0.5">Usuario</p>
            <p class="text-gray-700 dark:text-gray-300">{{ detailRequest?.email }}</p>
          </div>
          <div v-if="detailRequest?.resolution" class="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl p-3">
            <p class="text-emerald-800 dark:text-emerald-400 font-semibold text-xs mb-1 flex items-center gap-1.5">
              <CheckCircleIcon class="w-3.5 h-3.5" /> Resolución
            </p>
            <p class="text-emerald-700 dark:text-emerald-300 text-sm">{{ detailRequest.resolution }}</p>
          </div>
          <div class="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl p-3">
            <p class="text-red-800 dark:text-red-400 font-semibold text-xs mb-1 flex items-center gap-1.5">
              <TrashIcon class="w-3.5 h-3.5" /> Motivo de eliminación
            </p>
            <p class="text-red-700 dark:text-red-300 text-sm">{{ detailRequest?.deleted_reason || '—' }}</p>
            <p class="text-red-400 dark:text-red-500 text-xs mt-1">
              Eliminada el {{ detailRequest?.deleted_at ? new Date(detailRequest.deleted_at).toLocaleString('es-ES') : '—' }}
              · Purga en {{ detailRequest?.deleted_at ? daysUntilPurge(detailRequest.deleted_at) : 0 }} día(s)
            </p>
          </div>
        </div>

        <div class="mt-6">
          <h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-1.5">
          <ClipboardDocumentListIcon class="w-4 h-4" /> Historial de cambios
        </h3>
          <div v-if="loadingHistory" class="text-center text-gray-400 dark:text-gray-500 text-xs py-4">
            Cargando historial...
          </div>
          <div v-else-if="historyList.length === 0" class="text-center text-gray-400 dark:text-gray-500 text-xs py-4">
            Sin cambios registrados.
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="h in historyList"
              :key="h.id"
              class="rounded-xl px-3 py-2 text-xs"
              :class="h.new_value === 'deleted' ? 'bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900' : 'bg-gray-50 dark:bg-gray-800'"
            >
              <div class="flex justify-between items-center mb-0.5">
                <span
                  class="font-medium"
                  :class="h.new_value === 'deleted' ? 'text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'"
                >
                  {{ h.changed_by_name }}
                </span>
                <span class="text-gray-400 dark:text-gray-500">{{ new Date(h.created_at).toLocaleString('es-ES') }}</span>
              </div>
              <p :class="h.new_value === 'deleted' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'">
                {{ h.description }}
              </p>
            </div>
          </div>
        </div>

        <BaseButton variant="secondary" class="w-full mt-6" @click="showDetailModal = false">
          Cerrar
        </BaseButton>
      </div>
    </div>

  </div>
</template>