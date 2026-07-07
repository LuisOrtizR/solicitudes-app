<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { permissionApi, type Permission } from "@/api/endpoints/permission.api";

const permissions = ref<Permission[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const currentPage = ref(1);
const totalPages = ref(1);
const total = ref(0);
const limit = ref(10);

const search = ref("");
const sort = ref<"name" | "created_at">("created_at");
const order = ref<"ASC" | "DESC">("DESC");

const showModal = ref(false);
const isEditing = ref(false);
const selectedId = ref<string | null>(null);

const form = ref({
  name: "",
  description: "",
});

const fetchPermissions = async (page = 1) => {
  loading.value = true;
  error.value = null;

  try {
    const res = await permissionApi.getAll(
      page,
      limit.value,
      search.value,
      sort.value,
      order.value
    );

    permissions.value = res.data.data;
    currentPage.value = res.data.page;
    totalPages.value = res.data.totalPages;
    total.value = res.data.total;
  } catch (err: any) {
    error.value = err.response?.data?.message || "Error cargando permisos";
  } finally {
    loading.value = false;
  }
};

const openCreate = () => {
  form.value = { name: "", description: "" };
  selectedId.value = null;
  isEditing.value = false;
  showModal.value = true;
};

const openEdit = (p: Permission) => {
  if (p.is_protected) return;

  form.value = {
    name: p.name,
    description: p.description || "",
  };

  selectedId.value = p.id;
  isEditing.value = true;
  showModal.value = true;
};

const savePermission = async () => {
  try {
    if (isEditing.value && selectedId.value) {
      await permissionApi.update(selectedId.value, form.value);
    } else {
      await permissionApi.create(form.value);
    }

    showModal.value = false;
    fetchPermissions(currentPage.value);
  } catch (err: any) {
    alert(err.response?.data?.message || "Error guardando permiso");
  }
};

const deletePermission = async (p: Permission) => {
  if (p.is_protected) return;
  if (!confirm("¿Eliminar permiso?")) return;

  try {
    await permissionApi.delete(p.id);
    fetchPermissions(currentPage.value);
  } catch (err: any) {
    alert(err.response?.data?.message || "Error eliminando permiso");
  }
};

const pageNumbers = computed(() => {
  const start = Math.max(1, currentPage.value - 1);
  const end = Math.min(totalPages.value, start + 2);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
});

onMounted(() => fetchPermissions());
</script>

<template>
  <div class="space-y-5 min-w-0">

    <!-- HEADER -->
    <div class="flex justify-between items-start">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 tracking-tight">
          Gestión de Permisos
        </h1>
        <p class="text-sm text-gray-400 mt-0.5">
          Administración de permisos del sistema
        </p>
      </div>

      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-xl">
          <span class="text-xs text-gray-500">Total</span>
          <span class="text-lg font-bold text-gray-800">
            {{ total }}
          </span>
        </div>

        <button
          @click="openCreate"
          class="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Nuevo
        </button>
      </div>
    </div>

    <!-- ERROR -->
    <div
      v-if="error"
      class="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm"
    >
      ⚠️ {{ error }}
    </div>

    <!-- LOADING -->
    <div
      v-if="loading"
      class="flex items-center justify-center py-12 gap-3 text-gray-400"
    >
      <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" class="opacity-25"/>
        <path fill="currentColor" d="M4 12a8 8 0 018-8v8z" class="opacity-75"/>
      </svg>
      <span class="text-sm">Cargando permisos...</span>
    </div>

    <!-- TABLA -->
    <div v-else class="hidden md:block">
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm table-fixed">
            <colgroup>
              <col class="w-56" />
              <col class="w-auto" />
              <col class="w-40" />
            </colgroup>

            <thead>
              <tr class="border-b border-gray-100 bg-gray-50">
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Nombre
                </th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Descripción
                </th>
                <th class="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody class="divide-y divide-gray-50">
              <tr
                v-for="p in permissions"
                :key="p.id"
                :class="[
                  'transition-colors group',
                  p.is_protected
                    ? 'bg-gray-50 text-gray-400'
                    : 'hover:bg-gray-50'
                ]"
              >
                <td class="px-4 py-3 min-w-0">
                  <div class="flex items-center gap-2">
                    <span
                      class="font-mono text-xs px-2.5 py-1 rounded-lg whitespace-nowrap"
                      :class="p.is_protected
                        ? 'bg-gray-200 text-gray-500'
                        : 'bg-blue-50 text-blue-600'"
                    >
                      {{ p.name }}
                    </span>

                    <span
                      v-if="p.is_protected"
                      class="text-[10px] uppercase font-semibold text-gray-400"
                    >
                      Sistema
                    </span>
                  </div>
                </td>

                <td class="px-4 py-3 text-sm text-gray-600 truncate">
                  {{ p.description || "— Sin descripción —" }}
                </td>

                <td class="px-4 py-3 text-right">
                  <div
                    v-if="!p.is_protected"
                    class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <button
                      @click="openEdit(p)"
                      class="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                    >
                      Editar
                    </button>

                    <button
                      @click="deletePermission(p)"
                      class="text-red-500 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors"
                    >
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>

              <tr v-if="permissions.length === 0">
                <td colspan="3" class="px-4 py-12 text-center">
                  <div class="text-3xl mb-2">📭</div>
                  <p class="text-gray-400 text-sm">
                    No hay permisos registrados.
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- PAGINACIÓN -->
    <div
      v-if="totalPages > 1"
      class="flex justify-between items-center pt-4"
    >
      <span class="text-sm text-gray-500">
        Página {{ currentPage }} de {{ totalPages }}
      </span>

      <div class="flex gap-2">
        <button
          v-for="page in pageNumbers"
          :key="page"
          @click="fetchPermissions(page)"
          :class="[
            'px-3 py-1 rounded-lg text-sm transition-colors',
            page === currentPage
              ? 'bg-blue-600 text-white'
              : 'border border-gray-200 hover:bg-gray-50'
          ]"
        >
          {{ page }}
        </button>
      </div>
    </div>

    <!-- MODAL -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      @click="showModal = false"
    >
      <div
        class="bg-white rounded-3xl w-full max-w-md shadow-2xl"
        @click.stop
      >
        <div class="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 class="text-lg font-bold text-gray-900">
            {{ isEditing ? "Editar Permiso" : "Nuevo Permiso" }}
          </h2>
          <button
            @click="showModal = false"
            class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        <div class="p-6 space-y-4">
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Nombre
            </label>
            <input
              v-model="form.name"
              class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none"
              placeholder="Ej: users_create"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Descripción
            </label>
            <input
              v-model="form.description"
              class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none"
              placeholder="Descripción del permiso"
            />
          </div>

          <div class="flex gap-3 pt-2">
            <button
              @click="savePermission"
              class="flex-1 bg-blue-600 text-white py-2.5 rounded-xl hover:bg-blue-700 font-medium text-sm transition-colors"
            >
              Guardar
            </button>

            <button
              @click="showModal = false"
              class="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl hover:bg-gray-200 font-medium text-sm transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
