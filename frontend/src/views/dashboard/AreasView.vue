<script setup lang="ts">
import { ref, onMounted } from "vue";
import { areaApi, type Area } from "@/api/endpoints/area.api";
import { ExclamationTriangleIcon, BuildingOffice2Icon, MagnifyingGlassIcon } from "@heroicons/vue/24/outline";
import BaseButton from "@/components/ui/BaseButton.vue";
import BaseInput from "@/components/ui/BaseInput.vue";
import Pagination from "@/components/ui/Pagination.vue";
import TableSkeleton from "@/components/ui/TableSkeleton.vue";
import { useListQuery } from "@/composables/useListQuery";

const actionLoading = ref(false);

const form     = ref({ nombre: "", descripcion: "" });
const editForm = ref({ nombre: "", descripcion: "", activo: true });

const editingArea    = ref<Area | null>(null);
const showEditModal  = ref(false);

const {
  page, limit, search: areaSearch, data: areas, total, totalPages,
  loading, error, refetch,
} = useListQuery<Area, Record<string, never>>(
  async (params) => (await areaApi.getAll(params)).data,
  { initialFilters: {}, filterLabels: {} }
);

const createArea = async () => {
  if (!form.value.nombre || actionLoading.value) return;
  actionLoading.value = true;
  try {
    await areaApi.create(form.value);
    form.value = { nombre: "", descripcion: "" };
    await refetch();
  } catch (err: any) {
    alert(err.response?.data?.message || "Error creando área");
  } finally {
    actionLoading.value = false;
  }
};

const openEditModal = (area: Area) => {
  editingArea.value = area;
  editForm.value    = { nombre: area.nombre, descripcion: area.descripcion || "", activo: area.activo };
  showEditModal.value = true;
};

const updateArea = async () => {
  if (!editingArea.value || !editForm.value.nombre || actionLoading.value) return;
  actionLoading.value = true;
  try {
    await areaApi.update(editingArea.value.id, editForm.value);
    showEditModal.value = false;
    await refetch();
  } catch (err: any) {
    alert(err.response?.data?.message || "Error actualizando área");
  } finally {
    actionLoading.value = false;
  }
};

const deleteArea = async (id: string) => {
  if (!confirm("¿Eliminar área?") || actionLoading.value) return;
  actionLoading.value = true;
  try {
    await areaApi.delete(id);
    await refetch();
  } catch (err: any) {
    alert(err.response?.data?.message || "Error eliminando área");
  } finally {
    actionLoading.value = false;
  }
};

onMounted(() => {
  refetch();
});
</script>

<template>
  <div class="space-y-5 min-w-0">

    <!-- HEADER -->
    <div class="flex justify-between items-start">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Áreas</h1>
        <p class="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Gestión de áreas del sistema</p>
      </div>
      <div class="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-xl shrink-0">
        <span class="text-xs text-gray-500 dark:text-gray-400">Total</span>
        <span class="text-lg font-bold text-gray-800 dark:text-white">{{ total }}</span>
      </div>
    </div>

    <!-- BUSCADOR -->
    <div class="relative max-w-sm">
      <MagnifyingGlassIcon class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
      <input
        v-model="areaSearch"
        placeholder="Buscar área..."
        class="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
      />
    </div>

    <!-- CREAR ÁREA -->
    <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
      <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Nueva Área</p>
      <div class="grid md:grid-cols-3 gap-3">
        <BaseInput v-model="form.nombre" placeholder="Nombre del área" />
        <BaseInput v-model="form.descripcion" placeholder="Descripción (opcional)" />
        <BaseButton
          variant="primary"
          :disabled="!form.nombre || actionLoading"
          @click="createArea"
        >
          <svg v-if="actionLoading" class="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="white" stroke-width="4" fill="none" class="opacity-25"/>
            <path fill="white" d="M4 12a8 8 0 018-8v8z" class="opacity-75"/>
          </svg>
          Crear Área
        </BaseButton>
      </div>
    </div>

    <!-- ERROR -->
    <div v-if="error" class="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-red-600 dark:text-red-400 text-sm">
      <ExclamationTriangleIcon class="w-5 h-5 shrink-0" /> {{ error }}
      <button @click="refetch" class="ml-auto text-xs font-semibold underline hover:no-underline shrink-0">Reintentar</button>
    </div>

    <!-- LOADING -->
    <TableSkeleton v-if="loading" :rows="6" :columns="4" />

    <!-- TABLA DESKTOP -->
    <div v-else class="hidden md:block">
      <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Nombre</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Descripción</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Estado</th>
                <th class="sticky right-0 px-4 py-3 text-right text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider bg-gray-50 dark:bg-gray-800/50">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50 dark:divide-gray-800">
              <tr v-for="area in areas" :key="area.id" class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                <td class="px-4 py-3">
                  <span class="font-medium text-gray-800 dark:text-white bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg text-sm">
                    {{ area.nombre }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{{ area.descripcion || "—" }}</td>
                <td class="px-4 py-3">
                  <span
                    class="px-3 py-1 rounded-full text-xs font-semibold"
                    :class="area.activo ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400'"
                  >
                    {{ area.activo ? "Activa" : "Inactiva" }}
                  </span>
                </td>
                <td class="sticky right-0 px-4 py-3 text-right bg-white dark:bg-gray-900 group-hover:bg-gray-50 dark:group-hover:bg-gray-800/50">
                  <div class="flex items-center justify-end gap-2">
                    <BaseButton variant="primary" class="!px-3 !py-1.5 !text-xs" @click="openEditModal(area)">
                      Editar
                    </BaseButton>
                    <BaseButton variant="danger" class="!px-3 !py-1.5 !text-xs" @click="deleteArea(area.id)">
                      Eliminar
                    </BaseButton>
                  </div>
                </td>
              </tr>
              <tr v-if="areas.length === 0">
                <td colspan="4" class="px-4 py-12 text-center">
                  <BuildingOffice2Icon class="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p class="text-gray-400 dark:text-gray-500 text-sm">
                    {{ areaSearch ? "No se encontraron áreas con esa búsqueda." : "No hay áreas creadas." }}
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- CARDS MOBILE -->
    <div v-if="!loading" class="md:hidden space-y-3">
      <div v-for="area in areas" :key="area.id" class="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
        <div class="flex justify-between items-start mb-1">
          <div class="font-semibold text-gray-800 dark:text-white">{{ area.nombre }}</div>
          <span
            class="px-2.5 py-1 rounded-full text-xs font-semibold shrink-0"
            :class="area.activo ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400'"
          >
            {{ area.activo ? "Activa" : "Inactiva" }}
          </span>
        </div>
        <div class="text-sm text-gray-400 dark:text-gray-500 mb-3">{{ area.descripcion || "Sin descripción" }}</div>
        <div class="flex gap-2">
          <BaseButton variant="primary" class="flex-1" @click="openEditModal(area)">Editar</BaseButton>
          <BaseButton variant="danger" class="flex-1" @click="deleteArea(area.id)">Eliminar</BaseButton>
        </div>
      </div>
      <div v-if="areas.length === 0" class="text-center py-12 text-gray-400 dark:text-gray-500">
        <BuildingOffice2Icon class="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
        <p class="text-sm">{{ areaSearch ? "No se encontraron áreas con esa búsqueda." : "No hay áreas creadas." }}</p>
      </div>
    </div>

    <!-- PAGINACIÓN -->
    <Pagination
      v-if="!loading && areas.length > 0"
      :page="page" :limit="limit" :total="total" :total-pages="totalPages"
      @update:page="page = $event"
      @update:limit="limit = $event"
    />

    <!-- MODAL EDITAR -->
    <div v-if="showEditModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" @click="showEditModal = false">
      <div class="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md shadow-2xl" @click.stop>
        <div class="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
          <h2 class="text-lg font-bold text-gray-900 dark:text-white">Editar Área</h2>
          <button @click="showEditModal = false" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 transition-colors">✕</button>
        </div>
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Nombre</label>
            <BaseInput v-model="editForm.nombre" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Descripción</label>
            <BaseInput v-model="editForm.descripcion" />
          </div>
          <div class="flex items-center gap-2">
            <input id="area-activo" v-model="editForm.activo" type="checkbox" class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500" />
            <label for="area-activo" class="text-sm text-gray-600 dark:text-gray-300">Área activa</label>
          </div>
          <div class="flex gap-3 pt-1">
            <BaseButton variant="primary" class="flex-1 !py-2.5" :disabled="actionLoading" @click="updateArea">
              <svg v-if="actionLoading" class="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="white" stroke-width="4" fill="none" class="opacity-25"/>
                <path fill="white" d="M4 12a8 8 0 018-8v8z" class="opacity-75"/>
              </svg>
              Guardar
            </BaseButton>
            <BaseButton variant="secondary" class="flex-1 !py-2.5" @click="showEditModal = false">
              Cancelar
            </BaseButton>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
