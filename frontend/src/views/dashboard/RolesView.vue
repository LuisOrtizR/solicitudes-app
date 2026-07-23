<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { roleApi, type Role } from "@/api/endpoints/role.api";
import { permissionApi, type Permission } from "@/api/endpoints/permission.api";
import { ExclamationTriangleIcon, ShieldCheckIcon, MagnifyingGlassIcon } from "@heroicons/vue/24/outline";
import BaseButton from "@/components/ui/BaseButton.vue";
import BaseInput from "@/components/ui/BaseInput.vue";
import Pagination from "@/components/ui/Pagination.vue";
import TableSkeleton from "@/components/ui/TableSkeleton.vue";
import { useListQuery } from "@/composables/useListQuery";

const permissions   = ref<Permission[]>([]);
const actionLoading = ref(false);
const searchPerm    = ref("");

const form     = ref({ name: "", description: "" });
const editForm = ref({ name: "", description: "" });

const editingRole          = ref<Role | null>(null);
const showEditModal        = ref(false);
const showPermissionsModal = ref(false);
const selectedRoleId       = ref<string | null>(null);
const rolePermissions      = ref<Permission[]>([]);

const filteredPermissions = computed(() => {
  if (!searchPerm.value) return permissions.value;
  return permissions.value.filter(p =>
    p.name.toLowerCase().includes(searchPerm.value.toLowerCase())
  );
});

const {
  page, limit, search: roleSearch, data: roles, total, totalPages,
  loading, error, refetch,
} = useListQuery<Role, Record<string, never>>(
  async (params) => (await roleApi.getAll(params)).data,
  { initialFilters: {}, filterLabels: {} }
);

const fetchPermissions = async () => {
  try {
    const res         = await permissionApi.getAll(1, 100);
    permissions.value = res.data.data;
  } catch (err) {
    console.error("Error cargando permisos:", err);
  }
};

const createRole = async () => {
  if (!form.value.name || actionLoading.value) return;
  actionLoading.value = true;
  try {
    await roleApi.create(form.value);
    form.value = { name: "", description: "" };
    await refetch();
  } catch (err: any) {
    alert(err.response?.data?.message || "Error creando rol");
  } finally {
    actionLoading.value = false;
  }
};

const openEditModal = (role: Role) => {
  editingRole.value = role;
  editForm.value    = { name: role.name, description: role.description || "" };
  showEditModal.value = true;
};

const updateRole = async () => {
  if (!editingRole.value || !editForm.value.name || actionLoading.value) return;
  actionLoading.value = true;
  try {
    await roleApi.update(editingRole.value.id, editForm.value);
    showEditModal.value = false;
    await refetch();
  } catch (err: any) {
    alert(err.response?.data?.message || "Error actualizando rol");
  } finally {
    actionLoading.value = false;
  }
};

const deleteRole = async (id: string) => {
  if (!confirm("¿Eliminar rol?") || actionLoading.value) return;
  actionLoading.value = true;
  try {
    await roleApi.delete(id);
    await refetch();
  } catch (err: any) {
    alert(err.response?.data?.message || "Error eliminando");
  } finally {
    actionLoading.value = false;
  }
};

const openPermissionsModal = async (roleId: string) => {
  selectedRoleId.value = roleId;
  searchPerm.value     = "";
  try {
    const res          = await roleApi.getPermissions(roleId);
    rolePermissions.value = res.data;
    showPermissionsModal.value = true;
  } catch (err: any) {
    alert(err.response?.data?.message || "Error cargando permisos");
  }
};

const assignPermission = async (permissionId: string) => {
  if (!selectedRoleId.value || actionLoading.value) return;
  actionLoading.value = true;
  try {
    await roleApi.assignPermission(selectedRoleId.value, permissionId);
    const p = permissions.value.find(p => p.id === permissionId);
    if (p) rolePermissions.value.push(p);
  } catch (err: any) {
    alert(err.response?.data?.message || "Error asignando permiso");
  } finally {
    actionLoading.value = false;
  }
};

const removePermission = async (permissionId: string) => {
  if (!selectedRoleId.value || actionLoading.value) return;
  actionLoading.value = true;
  try {
    await roleApi.removePermission(selectedRoleId.value, permissionId);
    rolePermissions.value = rolePermissions.value.filter(p => p.id !== permissionId);
  } catch (err: any) {
    alert(err.response?.data?.message || "Error quitando permiso");
  } finally {
    actionLoading.value = false;
  }
};

const hasPermission = (permissionId: string) =>
  rolePermissions.value.some(p => p.id === permissionId);

const selectedRole = computed(() =>
  roles.value.find(r => r.id === selectedRoleId.value)
);

onMounted(() => {
  refetch();
  fetchPermissions();
});
</script>

<template>
  <div class="space-y-5 min-w-0">

    <!-- HEADER -->
    <div class="flex justify-between items-start">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Roles</h1>
        <p class="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Gestión de roles y permisos</p>
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
        v-model="roleSearch"
        placeholder="Buscar rol..."
        class="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
      />
    </div>

    <!-- CREAR ROL -->
    <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
      <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Nuevo Rol</p>
      <div class="grid md:grid-cols-3 gap-3">
        <BaseInput v-model="form.name" placeholder="Nombre del rol" />
        <BaseInput v-model="form.description" placeholder="Descripción (opcional)" />
        <BaseButton
          variant="primary"
          :disabled="!form.name || actionLoading"
          @click="createRole"
        >
          <svg v-if="actionLoading" class="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="white" stroke-width="4" fill="none" class="opacity-25"/>
            <path fill="white" d="M4 12a8 8 0 018-8v8z" class="opacity-75"/>
          </svg>
          Crear Rol
        </BaseButton>
      </div>
    </div>

    <!-- ERROR -->
    <div v-if="error" class="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-red-600 dark:text-red-400 text-sm">
      <ExclamationTriangleIcon class="w-5 h-5 shrink-0" /> {{ error }}
      <button @click="refetch" class="ml-auto text-xs font-semibold underline hover:no-underline shrink-0">Reintentar</button>
    </div>

    <!-- LOADING -->
    <TableSkeleton v-if="loading" :rows="6" :columns="3" />

    <!-- TABLA DESKTOP -->
    <div v-else class="hidden md:block">
      <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Nombre</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Descripción</th>
                <th class="sticky right-0 px-4 py-3 text-right text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider bg-gray-50 dark:bg-gray-800/50">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50 dark:divide-gray-800">
              <tr v-for="role in roles" :key="role.id" class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                <td class="px-4 py-3">
                  <span class="font-medium text-gray-800 dark:text-white bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg text-sm">
                    {{ role.name }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{{ role.description || "—" }}</td>
                <td class="sticky right-0 px-4 py-3 text-right bg-white dark:bg-gray-900 group-hover:bg-gray-50 dark:group-hover:bg-gray-800/50">
                  <div class="flex items-center justify-end gap-2">
                    <button @click="openPermissionsModal(role.id)"
                      class="bg-emerald-500 dark:bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-600 dark:hover:bg-emerald-500 text-xs font-medium transition-colors whitespace-nowrap">
                      Permisos
                    </button>
                    <BaseButton variant="primary" class="!px-3 !py-1.5 !text-xs" @click="openEditModal(role)">
                      Editar
                    </BaseButton>
                    <BaseButton variant="danger" class="!px-3 !py-1.5 !text-xs" @click="deleteRole(role.id)">
                      Eliminar
                    </BaseButton>
                  </div>
                </td>
              </tr>
              <tr v-if="roles.length === 0">
                <td colspan="3" class="px-4 py-12 text-center">
                  <ShieldCheckIcon class="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p class="text-gray-400 dark:text-gray-500 text-sm">
                    {{ roleSearch ? "No se encontraron roles con esa búsqueda." : "No hay roles creados." }}
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
      <div v-for="role in roles" :key="role.id" class="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
        <div class="font-semibold text-gray-800 dark:text-white mb-1">{{ role.name }}</div>
        <div class="text-sm text-gray-400 dark:text-gray-500 mb-3">{{ role.description || "Sin descripción" }}</div>
        <div class="flex gap-2">
          <button @click="openPermissionsModal(role.id)" class="flex-1 bg-emerald-500 dark:bg-emerald-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-emerald-600 dark:hover:bg-emerald-500 transition-colors">Permisos</button>
          <BaseButton variant="primary" class="flex-1" @click="openEditModal(role)">Editar</BaseButton>
          <BaseButton variant="danger" class="flex-1" @click="deleteRole(role.id)">Eliminar</BaseButton>
        </div>
      </div>
      <div v-if="roles.length === 0" class="text-center py-12 text-gray-400 dark:text-gray-500">
        <ShieldCheckIcon class="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
        <p class="text-sm">{{ roleSearch ? "No se encontraron roles con esa búsqueda." : "No hay roles creados." }}</p>
      </div>
    </div>

    <!-- PAGINACIÓN -->
    <Pagination
      v-if="!loading && roles.length > 0"
      :page="page" :limit="limit" :total="total" :total-pages="totalPages"
      @update:page="page = $event"
      @update:limit="limit = $event"
    />

    <!-- MODAL EDITAR -->
    <div v-if="showEditModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" @click="showEditModal = false">
      <div class="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md shadow-2xl" @click.stop>
        <div class="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800">
          <h2 class="text-lg font-bold text-gray-900 dark:text-white">Editar Rol</h2>
          <button @click="showEditModal = false" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 transition-colors">✕</button>
        </div>
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Nombre</label>
            <BaseInput v-model="editForm.name" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Descripción</label>
            <BaseInput v-model="editForm.description" />
          </div>
          <div class="flex gap-3 pt-1">
            <BaseButton variant="primary" class="flex-1 !py-2.5" :disabled="actionLoading" @click="updateRole">
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

    <!-- MODAL PERMISOS -->
    <div v-if="showPermissionsModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" @click="showPermissionsModal = false">
      <div class="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl" @click.stop>

        <div class="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div>
            <h2 class="text-lg font-bold text-gray-900 dark:text-white">Permisos del Rol</h2>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              <span class="font-medium text-gray-600 dark:text-gray-300">{{ selectedRole?.name }}</span>
              · {{ rolePermissions.length }} asignados
            </p>
          </div>
          <button @click="showPermissionsModal = false" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 transition-colors">✕</button>
        </div>

        <!-- BUSCADOR -->
        <div class="px-6 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <BaseInput v-model="searchPerm" placeholder="Buscar permiso..." />
        </div>

        <!-- LISTA -->
        <div class="overflow-y-auto flex-1 p-4 space-y-2">
          <div
            v-for="p in filteredPermissions" :key="p.id"
            class="flex justify-between items-center p-3 rounded-xl border transition-colors"
            :class="hasPermission(p.id) ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900' : 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800'"
          >
            <div class="min-w-0 flex-1 pr-3">
              <div class="text-sm font-medium text-gray-800 dark:text-white truncate">{{ p.name }}</div>
              <div class="text-xs text-gray-400 dark:text-gray-500 truncate">{{ p.description }}</div>
            </div>
            <BaseButton
              v-if="!hasPermission(p.id)"
              variant="primary"
              class="!px-3 !py-1.5 !text-xs shrink-0"
              :disabled="actionLoading"
              @click="assignPermission(p.id)"
            >
              Asignar
            </BaseButton>
            <BaseButton
              v-else
              variant="danger"
              class="!px-3 !py-1.5 !text-xs shrink-0 !bg-white dark:!bg-gray-900"
              :disabled="actionLoading"
              @click="removePermission(p.id)"
            >
              Quitar
            </BaseButton>
          </div>
          <div v-if="filteredPermissions.length === 0" class="text-center py-8 text-gray-400 dark:text-gray-500 text-sm italic">
            No se encontraron permisos.
          </div>
        </div>

        <div class="p-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <BaseButton variant="secondary" class="w-full !py-2.5" @click="showPermissionsModal = false">
            Cerrar
          </BaseButton>
        </div>

      </div>
    </div>

  </div>
</template>