<script setup lang="ts">
import { ref, onMounted } from "vue";
import { userApi, type User } from "@/api/endpoints/user.api";
import { roleApi, type Role } from "@/api/endpoints/role.api";
import { areaApi, type Area } from "@/api/endpoints/area.api";
import { useAuthStore } from "@/stores/auth.store";
import BaseButton from "@/components/ui/BaseButton.vue";
import Pagination from "@/components/ui/Pagination.vue";
import TableSkeleton from "@/components/ui/TableSkeleton.vue";
import { useListQuery } from "@/composables/useListQuery";
import { MagnifyingGlassIcon, ExclamationTriangleIcon, InboxIcon } from "@heroicons/vue/24/outline";

const auth = useAuthStore();

// ----- Datos -----
const roles = ref<Role[]>([]);
const areas = ref<Area[]>([]);

// ----- Modal de creación -----
const showCreateModal = ref(false);
const createForm = ref({
  name: "",
  email: "",
  password: "",
  role: "user",
  area_id: "" as string | ""
});
const createError = ref<string | null>(null);

// ----- Modal de edición -----
const showEditModal = ref(false);
const editingUser = ref<User | null>(null);
const editForm = ref({
  name: "",
  email: "",
  role: "",
  area_id: "" as string | ""
});

interface UserFilters {
  role?: string;
  is_active?: string;
}

const {
  page, limit, search, filters, data: users, total, totalPages,
  loading, error, activeFilterChips, setFilter, clearFilter, refetch,
} = useListQuery<User, UserFilters>(
  async (params) => {
    const { is_active, ...rest } = params;
    const apiParams = is_active !== undefined ? { ...rest, is_active: is_active === "true" } : rest;
    return (await userApi.getAll(apiParams)).data;
  },
  {
    initialFilters: { role: undefined, is_active: undefined },
    filterLabels: {
      role: (v) => `Rol: ${v}`,
      is_active: (v) => `Estado: ${v === "true" ? "Activo" : "Inactivo"}`,
    },
  }
);

// ----- Funciones API -----
const fetchRoles = async () => {
  try {
    const res = await roleApi.getAll({ limit: 100 });
    roles.value = res.data.data;
  } catch (err: any) {
    console.error("Error cargando roles:", err);
  }
};

const fetchAreas = async () => {
  try {
    const res = await areaApi.listActive();
    areas.value = res.data.data;
  } catch (err: any) {
    console.error("Error cargando áreas:", err);
  }
};

// ----- Crear usuario -----
const openCreateModal = () => {
  createForm.value = { name: "", email: "", password: "", role: "user", area_id: "" };
  createError.value = null;
  showCreateModal.value = true;
};

const closeCreateModal = () => {
  showCreateModal.value = false;
  createError.value = null;
};

const createUser = async () => {
  createError.value = null;
  if (!createForm.value.name.trim() || !createForm.value.email.trim() || !createForm.value.password.trim()) return;

  try {
    await userApi.create({
      name: createForm.value.name,
      email: createForm.value.email,
      password: createForm.value.password,
      role: createForm.value.role,
      area_id: createForm.value.area_id || null
    });

    await refetch();
    closeCreateModal();
  } catch (err: any) {
    createError.value = err.response?.data?.message || "Error creando usuario";
  }
};

// ----- Editar usuario -----
const openEditModal = (user: User) => {
  editingUser.value = user;
  editForm.value = {
    name: user.name,
    email: user.email,
    role: user.roles?.[0] || "",
    area_id: user.area_id || ""
  };
  showEditModal.value = true;
};

const closeEditModal = () => {
  showEditModal.value = false;
  editingUser.value = null;
  editForm.value = { name: "", email: "", role: "", area_id: "" };
};

const updateUser = async () => {
  if (!editingUser.value) return;
  if (!editForm.value.name.trim() || !editForm.value.email.trim()) return;

  try {
    // Actualizar datos básicos
    await userApi.update(editingUser.value.id, {
      name: editForm.value.name,
      email: editForm.value.email,
      area_id: editForm.value.area_id || null
    });

    // Cambiar rol
    if (editForm.value.role) {
      await userApi.changeRole(editingUser.value.id, { role: editForm.value.role });
    }

    await refetch();
    closeEditModal();
  } catch (err: any) {
    alert(err.response?.data?.message || "Error actualizando usuario");
  }
};

// ----- Eliminar usuario -----
const deleteUser = async (id: string) => {
  if (!confirm("¿Eliminar usuario?")) return;
  try {
    await userApi.delete(id);
    await refetch();
  } catch (err: any) {
    alert(err.response?.data?.message || "Error eliminando usuario");
  }
};

// ----- Helpers -----
const getRole = (user: User) => user.roles?.[0] || "Sin rol";
const roleClass = (role: string) => {
  if (role === "admin") return "bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400";
  if (role === "user") return "bg-primary-100 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400";
  return "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300";
};
const statusClass = (active: boolean) =>
  active
    ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
    : "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400";
const formatDate = (date: string) => new Date(date).toLocaleDateString();

// ----- On Mounted -----
onMounted(async () => {
  await fetchRoles();
  await fetchAreas();
  await refetch();
});
</script>

<template>
  <div class="space-y-5 min-w-0">

    <div class="flex justify-between items-start">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
          Administración de Usuarios
        </h1>
        <p class="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Gestión de cuentas y roles</p>
      </div>
      <div class="flex items-center gap-3 shrink-0">
        <div class="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-xl">
          <span class="text-xs text-gray-500 dark:text-gray-400">Total</span>
          <span class="text-lg font-bold text-gray-800 dark:text-white">{{ total }}</span>
        </div>
        <BaseButton v-if="auth.hasPermission('users_create')" variant="primary" @click="openCreateModal">
          + Nuevo Usuario
        </BaseButton>
      </div>
    </div>

    <!-- BUSCADOR + FILTROS -->
    <div class="flex flex-col sm:flex-row gap-3 sm:items-center">
      <div class="relative flex-1 max-w-sm">
        <MagnifyingGlassIcon class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
        <input
          v-model="search"
          placeholder="Buscar usuario..."
          class="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      <select
        :value="filters.role ?? ''"
        @change="setFilter('role', ($event.target as HTMLSelectElement).value || undefined)"
        class="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option value="">Todos los roles</option>
        <option v-for="r in roles" :key="r.id" :value="r.name">{{ r.name }}</option>
      </select>
      <select
        :value="filters.is_active ?? ''"
        @change="setFilter('is_active', ($event.target as HTMLSelectElement).value || undefined)"
        class="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option value="">Todos los estados</option>
        <option value="true">Activo</option>
        <option value="false">Inactivo</option>
      </select>
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

    <div v-if="error" class="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-red-600 dark:text-red-400 text-sm">
      <ExclamationTriangleIcon class="w-5 h-5 shrink-0" /> {{ error }}
      <button @click="refetch" class="ml-auto text-xs font-semibold underline hover:no-underline shrink-0">Reintentar</button>
    </div>

    <TableSkeleton v-if="loading" :rows="6" :columns="5" />

    <!-- Tabla de usuarios (desktop) -->
    <div v-else class="hidden md:block">
      <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Nombre</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Email</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Rol</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Área</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Estado</th>
                <th class="px-4 py-3 text-left text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Creado</th>
                <th class="sticky right-0 px-4 py-3 text-right text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider bg-gray-50 dark:bg-gray-800/50">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50 dark:divide-gray-800">
              <tr v-for="user in users" :key="user.id" class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                <td class="px-4 py-3 font-medium text-gray-800 dark:text-white">{{ user.name }}</td>
                <td class="px-4 py-3 text-gray-600 dark:text-gray-400">{{ user.email }}</td>
                <td class="px-4 py-3">
                  <span :class="roleClass(getRole(user))" class="px-3 py-1 rounded-full text-xs font-semibold">
                    {{ getRole(user) }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{{ user.area_name || "— Sin área —" }}</td>
                <td class="px-4 py-3">
                  <span :class="statusClass(user.is_active)" class="px-3 py-1 rounded-full text-xs font-semibold">
                    {{ user.is_active ? "Activo" : "Inactivo" }}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{{ formatDate(user.created_at) }}</td>
                <td class="sticky right-0 px-4 py-3 text-right bg-white dark:bg-gray-900 group-hover:bg-gray-50 dark:group-hover:bg-gray-800/50">
                  <div class="flex items-center justify-end gap-2">
                    <BaseButton variant="primary" class="!px-3 !py-1.5 !text-xs" @click="openEditModal(user)">Editar</BaseButton>
                    <BaseButton variant="danger-solid" class="!px-3 !py-1.5 !text-xs" @click="deleteUser(user.id)">Eliminar</BaseButton>
                  </div>
                </td>
              </tr>
              <tr v-if="users.length === 0">
                <td colspan="7" class="p-8 text-center text-gray-400 dark:text-gray-500">
                  <InboxIcon class="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  {{ search || filters.role || filters.is_active ? "No hay usuarios con estos filtros." : "No hay usuarios registrados." }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- CARDS MOBILE -->
    <div v-if="!loading" class="md:hidden space-y-3">
      <div v-if="users.length === 0" class="text-center py-12 text-gray-400 dark:text-gray-500">
        <InboxIcon class="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
        <p class="text-sm">{{ search || filters.role || filters.is_active ? "No hay usuarios con estos filtros." : "No hay usuarios registrados." }}</p>
      </div>
      <div v-for="user in users" :key="user.id" class="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
        <div class="flex justify-between items-start mb-2">
          <div class="min-w-0">
            <div class="font-semibold text-gray-800 dark:text-white truncate">{{ user.name }}</div>
            <div class="text-xs text-gray-400 dark:text-gray-500 truncate">{{ user.email }}</div>
          </div>
          <span :class="statusClass(user.is_active)" class="px-2.5 py-1 rounded-full text-xs font-semibold shrink-0">
            {{ user.is_active ? "Activo" : "Inactivo" }}
          </span>
        </div>
        <div class="flex items-center gap-2 mb-1">
          <span :class="roleClass(getRole(user))" class="px-2.5 py-1 rounded-full text-xs font-semibold">
            {{ getRole(user) }}
          </span>
          <span class="text-xs text-gray-400 dark:text-gray-500">{{ formatDate(user.created_at) }}</span>
        </div>
        <div class="text-xs text-gray-400 dark:text-gray-500 mb-3">{{ user.area_name || "— Sin área —" }}</div>
        <div class="flex gap-2">
          <BaseButton variant="primary" class="flex-1" @click="openEditModal(user)">Editar</BaseButton>
          <BaseButton variant="danger-solid" class="flex-1" @click="deleteUser(user.id)">Eliminar</BaseButton>
        </div>
      </div>
    </div>

    <!-- PAGINACIÓN -->
    <Pagination
      v-if="!loading && users.length > 0"
      :page="page" :limit="limit" :total="total" :total-pages="totalPages"
      @update:page="page = $event"
      @update:limit="limit = $event"
    />

    <!-- Modal editar usuario -->
    <div v-if="showEditModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click="closeEditModal">
      <div class="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-xl" @click.stop>
        <h2 class="text-xl font-bold mb-6 text-gray-800 dark:text-white">Editar Usuario</h2>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Nombre</label>
            <input v-model="editForm.name" type="text" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"/>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Email</label>
            <input v-model="editForm.email" type="email" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"/>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Rol</label>
            <select v-model="editForm.role" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option v-for="role in roles" :key="role.id" :value="role.name">{{ role.name }}</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Área</label>
            <select v-model="editForm.area_id" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">— Sin área —</option>
              <option v-for="area in areas" :key="area.id" :value="area.id">{{ area.nombre }}</option>
            </select>
          </div>
        </div>

        <div class="flex gap-4 mt-6">
          <BaseButton variant="primary" @click="updateUser" class="flex-1 py-2">Guardar</BaseButton>
          <BaseButton variant="secondary" @click="closeEditModal" class="flex-1 py-2">Cancelar</BaseButton>
        </div>
      </div>
    </div>

    <!-- Modal crear usuario -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click="closeCreateModal">
      <div class="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-xl" @click.stop>
        <h2 class="text-xl font-bold mb-6 text-gray-800 dark:text-white">Nuevo Usuario</h2>

        <div v-if="createError" class="mb-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg text-red-600 dark:text-red-400 text-sm">
          <ExclamationTriangleIcon class="w-4 h-4 shrink-0" /> {{ createError }}
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Nombre</label>
            <input v-model="createForm.name" type="text" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"/>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Email</label>
            <input v-model="createForm.email" type="email" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"/>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Contraseña</label>
            <input v-model="createForm.password" type="password" placeholder="Mínimo 8 caracteres" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"/>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Rol</label>
            <select v-model="createForm.role" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option v-for="role in roles" :key="role.id" :value="role.name">{{ role.name }}</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Área</label>
            <select v-model="createForm.area_id" class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">— Sin área —</option>
              <option v-for="area in areas" :key="area.id" :value="area.id">{{ area.nombre }}</option>
            </select>
          </div>
        </div>

        <div class="flex gap-4 mt-6">
          <BaseButton variant="primary" @click="createUser" class="flex-1 py-2">Crear</BaseButton>
          <BaseButton variant="secondary" @click="closeCreateModal" class="flex-1 py-2">Cancelar</BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>
