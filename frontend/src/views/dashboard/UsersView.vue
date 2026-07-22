<script setup lang="ts">
import { ref, onMounted } from "vue";
import { userApi, type User } from "@/api/endpoints/user.api";
import { roleApi, type Role } from "@/api/endpoints/role.api";
import BaseButton from "@/components/ui/BaseButton.vue";

// ----- Datos -----
const users = ref<User[]>([]);
const roles = ref<Role[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

// ----- Modal de edición -----
const showEditModal = ref(false);
const editingUser = ref<User | null>(null);
const editForm = ref({
  name: "",
  email: "",
  role: ""
});

// ----- Funciones API -----
const fetchUsers = async () => {
  loading.value = true;
  error.value = null;
  try {
    const res = await userApi.getAll();
    users.value = res.data.data;
  } catch (err: any) {
    error.value = err.response?.data?.message || "Error cargando usuarios";
  } finally {
    loading.value = false;
  }
};

const fetchRoles = async () => {
  try {
    const res = await roleApi.getAll();
    roles.value = res.data;
  } catch (err: any) {
    console.error("Error cargando roles:", err);
  }
};

// ----- Editar usuario -----
const openEditModal = (user: User) => {
  editingUser.value = user;
  editForm.value = {
    name: user.name,
    email: user.email,
    role: user.roles?.[0] || ""
  };
  showEditModal.value = true;
};

const closeEditModal = () => {
  showEditModal.value = false;
  editingUser.value = null;
  editForm.value = { name: "", email: "", role: "" };
};

const updateUser = async () => {
  if (!editingUser.value) return;
  if (!editForm.value.name.trim() || !editForm.value.email.trim()) return;

  try {
    // Actualizar datos básicos
    await userApi.update(editingUser.value.id, {
      name: editForm.value.name,
      email: editForm.value.email
    });

    // Cambiar rol
    if (editForm.value.role) {
      await userApi.changeRole(editingUser.value.id, { role: editForm.value.role });
    }

    await fetchUsers();
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
    await fetchUsers();
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
  await fetchUsers();
  await fetchRoles();
});
</script>

<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
      Administración de Usuarios
    </h1>

    <div v-if="loading" class="text-gray-500 dark:text-gray-400">Cargando usuarios...</div>
    <div v-if="error" class="text-red-500 dark:text-red-400 mb-4">{{ error }}</div>

    <!-- Tabla de usuarios -->
    <div class="hidden md:block overflow-x-auto">
      <table class="w-full bg-white dark:bg-gray-900 rounded-2xl shadow border border-gray-100 dark:border-gray-800">
        <thead class="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm">
          <tr>
            <th class="p-4 text-left">Nombre</th>
            <th class="p-4 text-left">Email</th>
            <th class="p-4 text-left">Rol</th>
            <th class="p-4 text-left">Estado</th>
            <th class="p-4 text-left">Creado</th>
            <th class="p-4 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id" class="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            <td class="p-4 font-medium text-gray-800 dark:text-white">{{ user.name }}</td>
            <td class="p-4 text-gray-600 dark:text-gray-400">{{ user.email }}</td>
            <td class="p-4">
              <span :class="roleClass(getRole(user))" class="px-3 py-1 rounded-full text-xs font-semibold">
                {{ getRole(user) }}
              </span>
            </td>
            <td class="p-4">
              <span :class="statusClass(user.is_active)" class="px-3 py-1 rounded-full text-xs font-semibold">
                {{ user.is_active ? "Activo" : "Inactivo" }}
              </span>
            </td>
            <td class="p-4 text-sm text-gray-500 dark:text-gray-400">{{ formatDate(user.created_at) }}</td>
            <td class="p-4 text-right space-x-2">
              <BaseButton variant="primary" @click="openEditModal(user)" class="px-4 py-2 text-sm">Editar</BaseButton>
              <BaseButton variant="danger-solid" @click="deleteUser(user.id)" class="px-4 py-2 text-sm">Eliminar</BaseButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

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
        </div>

        <div class="flex gap-4 mt-6">
          <BaseButton variant="primary" @click="updateUser" class="flex-1 py-2">Guardar</BaseButton>
          <BaseButton variant="secondary" @click="closeEditModal" class="flex-1 py-2">Cancelar</BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>
