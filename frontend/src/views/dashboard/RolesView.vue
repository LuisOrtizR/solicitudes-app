<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { roleApi, type Role } from "@/api/endpoints/role.api";
import { permissionApi, type Permission } from "@/api/endpoints/permission.api";

const roles         = ref<Role[]>([]);
const permissions   = ref<Permission[]>([]);
const loading       = ref(false);
const actionLoading = ref(false);
const error         = ref<string | null>(null);
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

const fetchRoles = async () => {
  loading.value = true;
  error.value   = null;
  try {
    const res  = await roleApi.getAll();
    roles.value = res.data;
  } catch (err: any) {
    error.value = err.response?.data?.message || "Error cargando roles";
  } finally {
    loading.value = false;
  }
};

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
    await fetchRoles();
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
    await fetchRoles();
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
    roles.value = roles.value.filter(r => r.id !== id);
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
  fetchRoles();
  fetchPermissions();
});
</script>

<template>
  <div class="space-y-5 min-w-0">

    <!-- HEADER -->
    <div class="flex justify-between items-start">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Roles</h1>
        <p class="text-sm text-gray-400 mt-0.5">Gestión de roles y permisos</p>
      </div>
      <div class="flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-xl shrink-0">
        <span class="text-xs text-gray-500">Total</span>
        <span class="text-lg font-bold text-gray-800">{{ roles.length }}</span>
      </div>
    </div>

    <!-- CREAR ROL -->
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Nuevo Rol</p>
      <div class="grid md:grid-cols-3 gap-3">
        <input
          v-model="form.name"
          placeholder="Nombre del rol"
          class="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none"
        />
        <input
          v-model="form.description"
          placeholder="Descripción (opcional)"
          class="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none"
        />
        <button
          @click="createRole"
          :disabled="!form.name || actionLoading"
          class="bg-blue-600 text-white rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          <svg v-if="actionLoading" class="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="white" stroke-width="4" fill="none" class="opacity-25"/>
            <path fill="white" d="M4 12a8 8 0 018-8v8z" class="opacity-75"/>
          </svg>
          Crear Rol
        </button>
      </div>
    </div>

    <!-- ERROR -->
    <div v-if="error" class="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
      <span>⚠️</span> {{ error }}
    </div>

    <!-- LOADING -->
    <div v-if="loading" class="flex items-center justify-center py-12 gap-3 text-gray-400">
      <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none" class="opacity-25"/>
        <path fill="currentColor" d="M4 12a8 8 0 018-8v8z" class="opacity-75"/>
      </svg>
      <span class="text-sm">Cargando roles...</span>
    </div>

    <!-- TABLA DESKTOP -->
    <div v-else class="hidden md:block">
      <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-100 bg-gray-50">
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Nombre</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Descripción</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="role in roles" :key="role.id" class="hover:bg-gray-50 transition-colors group">
              <td class="px-4 py-3">
                <span class="font-medium text-gray-800 bg-gray-100 px-2.5 py-1 rounded-lg text-sm">
                  {{ role.name }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm text-gray-500">{{ role.description || "—" }}</td>
              <td class="px-4 py-3 text-right">
                <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button @click="openPermissionsModal(role.id)"
                    class="bg-emerald-500 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-600 text-xs font-medium transition-colors">
                    Permisos
                  </button>
                  <button @click="openEditModal(role)"
                    class="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-xs font-medium transition-colors">
                    Editar
                  </button>
                  <button @click="deleteRole(role.id)"
                    class="text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 text-xs font-medium transition-colors">
                    Eliminar
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="roles.length === 0">
              <td colspan="3" class="px-4 py-12 text-center">
                <div class="text-3xl mb-2">🎭</div>
                <p class="text-gray-400 text-sm">No hay roles creados.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- CARDS MOBILE -->
    <div class="md:hidden space-y-3">
      <div v-for="role in roles" :key="role.id" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div class="font-semibold text-gray-800 mb-1">{{ role.name }}</div>
        <div class="text-sm text-gray-400 mb-3">{{ role.description || "Sin descripción" }}</div>
        <div class="flex gap-2">
          <button @click="openPermissionsModal(role.id)" class="flex-1 bg-emerald-500 text-white py-2 rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors">Permisos</button>
          <button @click="openEditModal(role)" class="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">Editar</button>
          <button @click="deleteRole(role.id)" class="flex-1 bg-red-50 text-red-600 border border-red-200 py-2 rounded-xl text-sm font-medium hover:bg-red-100 transition-colors">Eliminar</button>
        </div>
      </div>
    </div>

    <!-- MODAL EDITAR -->
    <div v-if="showEditModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" @click="showEditModal = false">
      <div class="bg-white rounded-3xl w-full max-w-md shadow-2xl" @click.stop>
        <div class="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 class="text-lg font-bold text-gray-900">Editar Rol</h2>
          <button @click="showEditModal = false" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">✕</button>
        </div>
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Nombre</label>
            <input v-model="editForm.name" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none" />
          </div>
          <div>
            <label class="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Descripción</label>
            <input v-model="editForm.description" class="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none" />
          </div>
          <div class="flex gap-3 pt-1">
            <button @click="updateRole" :disabled="actionLoading"
              class="flex-1 bg-blue-600 text-white py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium text-sm transition-colors flex items-center justify-center gap-2">
              <svg v-if="actionLoading" class="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="white" stroke-width="4" fill="none" class="opacity-25"/>
                <path fill="white" d="M4 12a8 8 0 018-8v8z" class="opacity-75"/>
              </svg>
              Guardar
            </button>
            <button @click="showEditModal = false" class="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl hover:bg-gray-200 font-medium text-sm transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL PERMISOS -->
    <div v-if="showPermissionsModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" @click="showPermissionsModal = false">
      <div class="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl" @click.stop>

        <div class="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
          <div>
            <h2 class="text-lg font-bold text-gray-900">Permisos del Rol</h2>
            <p class="text-xs text-gray-400 mt-0.5">
              <span class="font-medium text-gray-600">{{ selectedRole?.name }}</span>
              · {{ rolePermissions.length }} asignados
            </p>
          </div>
          <button @click="showPermissionsModal = false" class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">✕</button>
        </div>

        <!-- BUSCADOR -->
        <div class="px-6 py-3 border-b border-gray-100 shrink-0">
          <input
            v-model="searchPerm"
            placeholder="Buscar permiso..."
            class="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none"
          />
        </div>

        <!-- LISTA -->
        <div class="overflow-y-auto flex-1 p-4 space-y-2">
          <div
            v-for="p in filteredPermissions" :key="p.id"
            class="flex justify-between items-center p-3 rounded-xl border transition-colors"
            :class="hasPermission(p.id) ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'"
          >
            <div class="min-w-0 flex-1 pr-3">
              <div class="text-sm font-medium text-gray-800 truncate">{{ p.name }}</div>
              <div class="text-xs text-gray-400 truncate">{{ p.description }}</div>
            </div>
            <button
              v-if="!hasPermission(p.id)"
              @click="assignPermission(p.id)"
              :disabled="actionLoading"
              class="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-xs font-medium transition-colors disabled:opacity-50 shrink-0"
            >
              Asignar
            </button>
            <button
              v-else
              @click="removePermission(p.id)"
              :disabled="actionLoading"
              class="bg-white text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 text-xs font-medium transition-colors disabled:opacity-50 shrink-0"
            >
              Quitar
            </button>
          </div>
          <div v-if="filteredPermissions.length === 0" class="text-center py-8 text-gray-400 text-sm italic">
            No se encontraron permisos.
          </div>
        </div>

        <div class="p-4 border-t border-gray-100 shrink-0">
          <button @click="showPermissionsModal = false" class="w-full bg-gray-100 text-gray-700 py-2.5 rounded-xl hover:bg-gray-200 font-medium text-sm transition-colors">
            Cerrar
          </button>
        </div>

      </div>
    </div>

  </div>
</template>