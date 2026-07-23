<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { permissionApi, type Permission } from "@/api/endpoints/permission.api";
import { ExclamationTriangleIcon, InboxIcon, MagnifyingGlassIcon } from "@heroicons/vue/24/outline";
import BaseButton from "@/components/ui/BaseButton.vue";
import BaseInput from "@/components/ui/BaseInput.vue";
import Pagination from "@/components/ui/Pagination.vue";
import TableSkeleton from "@/components/ui/TableSkeleton.vue";

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

const onLimitChange = (newLimit: number) => {
  limit.value = newLimit;
  fetchPermissions(1);
};

let searchDebounce: ReturnType<typeof setTimeout> | undefined;
watch(search, () => {
  if (searchDebounce) clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => fetchPermissions(1), 300);
});

onMounted(() => fetchPermissions());
</script>

<template>
  <div class="space-y-5 min-w-0">

    <!-- HEADER -->
    <div class="flex justify-between items-start">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
          Gestión de Permisos
        </h1>
        <p class="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
          Administración de permisos del sistema
        </p>
      </div>

      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-xl">
          <span class="text-xs text-gray-500 dark:text-gray-400">Total</span>
          <span class="text-lg font-bold text-gray-800 dark:text-white">
            {{ total }}
          </span>
        </div>

        <BaseButton variant="primary" @click="openCreate">+ Nuevo</BaseButton>
      </div>
    </div>

    <!-- BUSCADOR -->
    <div class="relative max-w-sm">
      <MagnifyingGlassIcon class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
      <input
        v-model="search"
        placeholder="Buscar permiso..."
        class="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
      />
    </div>

    <!-- ERROR -->
    <div
      v-if="error"
      class="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-red-600 dark:text-red-400 text-sm"
    >
      <ExclamationTriangleIcon class="w-5 h-5 shrink-0" /> {{ error }}
      <button @click="fetchPermissions(currentPage)" class="ml-auto text-xs font-semibold underline hover:no-underline shrink-0">Reintentar</button>
    </div>

    <!-- LOADING -->
    <TableSkeleton v-if="loading" :rows="6" :columns="3" />

    <!-- TABLA -->
    <div v-else class="hidden md:block">
      <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm table-fixed">
            <colgroup>
              <col class="w-56" />
              <col class="w-auto" />
              <col class="w-40" />
            </colgroup>

            <thead>
              <tr class="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  Descripción
                </th>
                <th class="sticky right-0 px-4 py-3 text-right text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider bg-gray-50 dark:bg-gray-800/50">
                  Acciones
                </th>
              </tr>
            </thead>

            <tbody class="divide-y divide-gray-50 dark:divide-gray-800">
              <tr
                v-for="p in permissions"
                :key="p.id"
                :class="[
                  'transition-colors group',
                  p.is_protected
                    ? 'bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                ]"
              >
                <td class="px-4 py-3 min-w-0">
                  <div class="flex items-center gap-2">
                    <span
                      class="font-mono text-xs px-2.5 py-1 rounded-lg whitespace-nowrap"
                      :class="p.is_protected
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        : 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400'"
                    >
                      {{ p.name }}
                    </span>

                    <span
                      v-if="p.is_protected"
                      class="text-[10px] uppercase font-semibold text-gray-400 dark:text-gray-500"
                    >
                      Sistema
                    </span>
                  </div>
                </td>

                <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 truncate">
                  {{ p.description || "— Sin descripción —" }}
                </td>

                <td
                  class="sticky right-0 px-4 py-3 text-right"
                  :class="p.is_protected ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-900 group-hover:bg-gray-50 dark:group-hover:bg-gray-800/50'"
                >
                  <div v-if="!p.is_protected" class="flex justify-end gap-2">
                    <BaseButton variant="primary" class="!px-3 !py-1.5 !text-xs" @click="openEdit(p)">
                      Editar
                    </BaseButton>

                    <BaseButton variant="danger" class="!px-3 !py-1.5 !text-xs" @click="deletePermission(p)">
                      Eliminar
                    </BaseButton>
                  </div>
                </td>
              </tr>

              <tr v-if="permissions.length === 0">
                <td colspan="3" class="px-4 py-12 text-center">
                  <InboxIcon class="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p class="text-gray-400 dark:text-gray-500 text-sm">
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
    <Pagination
      v-if="!loading && permissions.length > 0"
      :page="currentPage"
      :limit="limit"
      :total="total"
      :total-pages="totalPages"
      @update:page="fetchPermissions($event)"
      @update:limit="onLimitChange"
    />

    <!-- MODAL -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      @click="showModal = false"
    >
      <div
        class="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md shadow-2xl"
        @click.stop
      >
        <div class="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
          <h2 class="text-lg font-bold text-gray-900 dark:text-white">
            {{ isEditing ? "Editar Permiso" : "Nuevo Permiso" }}
          </h2>
          <button
            @click="showModal = false"
            class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            ✕
          </button>
        </div>

        <div class="p-6 space-y-4">
          <div>
            <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Nombre
            </label>
            <BaseInput v-model="form.name" placeholder="Ej: users_create" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Descripción
            </label>
            <BaseInput v-model="form.description" placeholder="Descripción del permiso" />
          </div>

          <div class="flex gap-3 pt-2">
            <BaseButton variant="primary" class="flex-1 !py-2.5" @click="savePermission">
              Guardar
            </BaseButton>

            <BaseButton variant="secondary" class="flex-1 !py-2.5" @click="showModal = false">
              Cancelar
            </BaseButton>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>
