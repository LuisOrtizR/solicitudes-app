<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { requestApi } from "@/api/endpoints/request.api";
import type { Request, RequestStatus, RequestPriority } from "@/types/request.types";
import { useAuthStore } from "@/stores/auth.store";

const authStore = useAuthStore();
const requests = ref<Request[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const showCreateModal = ref(false);
const showEditModal = ref(false);
const showDetailModal = ref(false);
const showDeleteModal = ref(false);

const editingRequest = ref<Request | null>(null);
const detailRequest = ref<Request | null>(null);
const deletingRequest = ref<Request | null>(null);
const historyList = ref<any[]>([]);
const loadingHistory = ref(false);
const deleteReason = ref("");
const deleteError = ref("");

const createForm = ref({
  title: "",
  description: "",
  priority: "medium" as RequestPriority,
});

const editForm = ref({
  title: "",
  description: "",
  priority: "medium" as RequestPriority,
});

const isAdmin = computed(() => authStore.isAdmin);

const isOwner = (r: Request) => authStore.user?.id === r.user_id;

const canEdit = (r: Request) =>
  !isAdmin.value && isOwner(r) && r.status === "open";

const canDelete = (r: Request) =>
  isAdmin.value || (isOwner(r) && r.status === "open");

const fetchRequests = async () => {
  loading.value = true;
  error.value = null;
  try {
    const res = isAdmin.value
      ? await requestApi.getAll()
      : await requestApi.getMine();
    requests.value = res.data;
  } catch (err: any) {
    error.value = err.response?.data?.message || "Error cargando solicitudes";
  } finally {
    loading.value = false;
  }
};

const createRequest = async () => {
  if (!createForm.value.title || !createForm.value.description) return;
  try {
    await requestApi.create(createForm.value);
    showCreateModal.value = false;
    createForm.value = { title: "", description: "", priority: "medium" };
    fetchRequests();
  } catch (err: any) {
    alert(err.response?.data?.message || "Error creando solicitud");
  }
};

const openEditModal = (r: Request) => {
  if (!canEdit(r)) return;
  editingRequest.value = r;
  editForm.value = { title: r.title, description: r.description, priority: r.priority };
  showEditModal.value = true;
};

const updateRequest = async () => {
  if (!editingRequest.value) return;
  try {
    await requestApi.update(editingRequest.value.id, {
      title: editForm.value.title,
      description: editForm.value.description,
    });
    showEditModal.value = false;
    fetchRequests();
  } catch (err: any) {
    alert(err.response?.data?.message || "Error actualizando solicitud");
  }
};

const openDeleteModal = (r: Request) => {
  if (!canDelete(r)) return;
  deletingRequest.value = r;
  deleteReason.value = "";
  deleteError.value = "";
  showDeleteModal.value = true;
};

const confirmDelete = async () => {
  if (!deletingRequest.value) return;
  if (deleteReason.value.trim().length < 5) {
    deleteError.value = "El motivo debe tener al menos 5 caracteres";
    return;
  }
  try {
    await requestApi.delete(deletingRequest.value.id, deleteReason.value);
    showDeleteModal.value = false;
    deletingRequest.value = null;
    fetchRequests();
  } catch (err: any) {
    deleteError.value = err.response?.data?.message || "Error eliminando";
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

const statusConfig: Record<string, { color: string; dot: string; label: string }> = {
  open:         { color: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",        dot: "bg-amber-400",   label: "Abierta" },
  in_progress:  { color: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",           dot: "bg-blue-400",    label: "En Progreso" },
  waiting_user: { color: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",     dot: "bg-violet-400",  label: "Esp. Usuario" },
  resolved:     { color: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",  dot: "bg-emerald-400", label: "Resuelta" },
  closed:       { color: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",          dot: "bg-gray-400",    label: "Cerrada" },
  rejected:     { color: "bg-red-50 text-red-700 ring-1 ring-red-200",              dot: "bg-red-400",     label: "Rechazada" },
};

const priorityConfig: Record<string, { color: string; label: string }> = {
  low:    { color: "bg-slate-100 text-slate-600",         label: "Baja" },
  medium: { color: "bg-sky-100 text-sky-700",             label: "Media" },
  high:   { color: "bg-orange-100 text-orange-700",       label: "Alta" },
  urgent: { color: "bg-rose-100 text-rose-700 font-bold", label: "🔥 Urgente" },
};

onMounted(fetchRequests);
</script>

<template>
  <div class="space-y-6">

    <div class="flex justify-between items-start">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 tracking-tight">
          {{ isAdmin ? "Todas las Solicitudes" : "Mis Solicitudes" }}
        </h1>
        <p class="text-sm text-gray-400 mt-0.5">
          {{ isAdmin ? "Vista administrativa global" : "Solo ves tus propias solicitudes" }}
        </p>
      </div>
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-xl">
          <span class="text-xs text-gray-500">Total</span>
          <span class="text-lg font-bold text-gray-800">{{ requests.length }}</span>
        </div>
        <button
          @click="showCreateModal = true"
          class="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 text-sm font-medium transition-colors"
        >
          + Nueva
        </button>
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
          <table class="w-full text-sm table-fixed">
            <colgroup>
              <col class="w-auto"/>
              <col class="w-28"/>
              <col class="w-32"/>
              <col class="w-40"/>
              <col class="w-28"/>
              <col class="w-44"/>
            </colgroup>
            <thead>
              <tr class="border-b border-gray-100 bg-gray-50">
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Solicitud</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Prioridad</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Estado</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Usuario</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Fecha</th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="r in requests" :key="r.id" class="hover:bg-gray-50 transition-colors group">
                <td class="px-4 py-3 min-w-0">
                  <div class="font-medium text-gray-800 truncate">{{ r.title }}</div>
                  <div class="text-xs text-gray-400 truncate">{{ r.description }}</div>
                </td>
                <td class="px-4 py-3">
                  <span :class="priorityConfig[r.priority]?.color" class="px-2 py-0.5 rounded-lg text-xs">
                    {{ priorityConfig[r.priority]?.label }}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <span :class="statusConfig[r.status]?.color" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs">
                    <span :class="statusConfig[r.status]?.dot" class="w-1.5 h-1.5 rounded-full"/>
                    {{ statusConfig[r.status]?.label }}
                  </span>
                </td>
                <td class="px-4 py-3 text-xs text-gray-500">
                  {{ r.email }}
                  <span v-if="isOwner(r)" class="ml-1 bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs">Tú</span>
                </td>
                <td class="px-4 py-3 text-xs text-gray-400">
                  {{ new Date(r.created_at).toLocaleDateString("es-ES") }}
                </td>
                <td class="px-4 py-3 text-right">
                  <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button @click="openDetail(r)" class="bg-gray-600 text-white px-3 py-1 rounded-lg text-xs hover:bg-gray-700">
                      Ver
                    </button>
                    <button
                      v-if="canEdit(r)"
                      @click="openEditModal(r)"
                      class="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs hover:bg-blue-700"
                    >
                      Editar
                    </button>
                    <button
                      v-if="canDelete(r)"
                      @click="openDeleteModal(r)"
                      class="text-red-500 border border-red-200 px-3 py-1 rounded-lg text-xs hover:bg-red-50"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="requests.length === 0">
                <td colspan="6" class="px-4 py-12 text-center text-gray-400">
                  📭 No hay solicitudes registradas.
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
            <div class="font-semibold text-gray-800 truncate">{{ r.title }}</div>
            <div class="text-xs text-gray-400 truncate">{{ r.description }}</div>
          </div>
          <span :class="statusConfig[r.status]?.color" class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs shrink-0">
            <span :class="statusConfig[r.status]?.dot" class="w-1.5 h-1.5 rounded-full"/>
            {{ statusConfig[r.status]?.label }}
          </span>
        </div>
        <div class="flex items-center gap-2 mb-3">
          <span :class="priorityConfig[r.priority]?.color" class="px-2 py-0.5 rounded-lg text-xs">
            {{ priorityConfig[r.priority]?.label }}
          </span>
          <span class="text-xs text-gray-400">{{ r.email }}</span>
        </div>
        <div class="flex gap-2">
          <button @click="openDetail(r)" class="flex-1 bg-gray-600 text-white py-2 rounded-xl text-sm">Ver</button>
          <button v-if="canEdit(r)" @click="openEditModal(r)" class="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm">Editar</button>
          <button v-if="canDelete(r)" @click="openDeleteModal(r)" class="flex-1 border border-red-200 text-red-500 py-2 rounded-xl text-sm">Eliminar</button>
        </div>
      </div>
    </div>

    <div v-if="showCreateModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" @click="showCreateModal = false">
      <div class="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6" @click.stop>
        <h2 class="text-lg font-bold mb-4">Nueva Solicitud</h2>
        <input v-model="createForm.title" class="w-full px-3 py-2 border border-gray-200 rounded-xl mb-3" placeholder="Título"/>
        <textarea v-model="createForm.description" rows="4" class="w-full px-3 py-2 border border-gray-200 rounded-xl mb-3" placeholder="Descripción"/>
        <select v-model="createForm.priority" class="w-full px-3 py-2 border border-gray-200 rounded-xl mb-4">
          <option value="low">Baja</option>
          <option value="medium">Media</option>
          <option value="high">Alta</option>
          <option value="urgent">Urgente</option>
        </select>
        <div class="flex gap-3">
          <button @click="createRequest" class="flex-1 bg-blue-600 text-white py-2.5 rounded-xl hover:bg-blue-700">Crear</button>
          <button @click="showCreateModal = false" class="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl hover:bg-gray-200">Cancelar</button>
        </div>
      </div>
    </div>

    <div v-if="showEditModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" @click="showEditModal = false">
      <div class="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6" @click.stop>
        <h2 class="text-lg font-bold mb-1">Editar Solicitud</h2>
        <p class="text-xs text-amber-600 mb-4">⚠️ Solo puedes editar mientras la solicitud esté Abierta</p>
        <input v-model="editForm.title" class="w-full px-3 py-2 border border-gray-200 rounded-xl mb-3" placeholder="Título"/>
        <textarea v-model="editForm.description" rows="4" class="w-full px-3 py-2 border border-gray-200 rounded-xl mb-4" placeholder="Descripción"/>
        <div class="flex gap-3">
          <button @click="updateRequest" class="flex-1 bg-blue-600 text-white py-2.5 rounded-xl hover:bg-blue-700">Guardar</button>
          <button @click="showEditModal = false" class="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl hover:bg-gray-200">Cancelar</button>
        </div>
      </div>
    </div>

    <div v-if="showDeleteModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" @click="showDeleteModal = false">
      <div class="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6" @click.stop>
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-lg">
            🗑️
          </div>
          <div>
            <h2 class="text-lg font-bold text-gray-900">Eliminar Solicitud</h2>
            <p class="text-xs text-gray-400 truncate max-w-xs">{{ deletingRequest?.title }}</p>
          </div>
        </div>
        <p class="text-sm text-gray-600 mb-4">
          Esta acción no se puede deshacer. Por favor indica el motivo de la eliminación:
        </p>
        <textarea
          v-model="deleteReason"
          rows="3"
          placeholder="Ej: Solicitud duplicada, información incorrecta..."
          class="w-full px-3 py-2 border rounded-xl text-sm resize-none mb-2"
          :class="deleteError ? 'border-red-300' : 'border-gray-200'"
        />
        <p v-if="deleteError" class="text-red-500 text-xs mb-3">⚠️ {{ deleteError }}</p>
        <div class="flex gap-3 mt-2">
          <button
            @click="confirmDelete"
            class="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            Confirmar eliminación
          </button>
          <button
            @click="showDeleteModal = false"
            class="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm hover:bg-gray-200"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>

    <div v-if="showDetailModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" @click="showDetailModal = false">
      <div class="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 max-h-[90vh] overflow-y-auto" @click.stop>
        <h2 class="text-lg font-bold mb-4">Detalle de Solicitud</h2>
        <div class="space-y-3 text-sm">
          <div>
            <p class="text-gray-500">Título</p>
            <p class="font-medium">{{ detailRequest?.title }}</p>
          </div>
          <div>
            <p class="text-gray-500">Descripción</p>
            <p>{{ detailRequest?.description }}</p>
          </div>
          <div class="flex gap-3">
            <span :class="statusConfig[detailRequest?.status ?? 'open']?.color" class="px-2 py-1 rounded-lg text-xs">
              {{ statusConfig[detailRequest?.status ?? 'open']?.label }}
            </span>
            <span :class="priorityConfig[detailRequest?.priority ?? 'medium']?.color" class="px-2 py-1 rounded-lg text-xs">
              {{ priorityConfig[detailRequest?.priority ?? 'medium']?.label }}
            </span>
          </div>
          <div>
            <p class="text-gray-500">Creado por</p>
            <p>{{ detailRequest?.email }}</p>
          </div>
          <div v-if="detailRequest?.resolution" class="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p class="text-emerald-800 font-semibold text-sm mb-1">✅ Resolución</p>
            <p class="text-emerald-700 text-sm">{{ detailRequest?.resolution }}</p>
          </div>
        </div>

        <div class="mt-6">
          <h3 class="text-sm font-semibold text-gray-700 mb-3">📋 Historial de cambios</h3>
          <div v-if="loadingHistory" class="text-center text-gray-400 text-xs py-4">Cargando historial...</div>
          <div v-else-if="historyList.length === 0" class="text-center text-gray-400 text-xs py-4">
            Sin cambios registrados aún.
          </div>
          <div v-else class="space-y-2">
            <div v-for="h in historyList" :key="h.id" class="bg-gray-50 rounded-xl px-3 py-2 text-xs">
              <div class="flex justify-between items-center mb-0.5">
                <span class="font-medium text-gray-700">{{ h.changed_by_name }}</span>
                <span class="text-gray-400">{{ new Date(h.created_at).toLocaleString('es-ES') }}</span>
              </div>
              <p class="text-gray-600">{{ h.description }}</p>
            </div>
          </div>
        </div>

        <button @click="showDetailModal = false" class="w-full mt-6 bg-gray-100 text-gray-700 py-2.5 rounded-xl hover:bg-gray-200">
          Cerrar
        </button>
      </div>
    </div>

  </div>
</template>