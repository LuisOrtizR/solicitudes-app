<script setup lang="ts">
import { ref, onMounted } from "vue";
import { userApi, type User } from "@/api/endpoints/user.api";
import { roleApi, type Role } from "@/api/endpoints/role.api";

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
  if (role === "admin") return "bg-purple-100 text-purple-700";
  if (role === "user") return "bg-blue-100 text-blue-700";
  return "bg-gray-100 text-gray-700";
};
const statusClass = (active: boolean) => active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700";
const formatDate = (date: string) => new Date(date).toLocaleDateString();

// ----- On Mounted -----
onMounted(async () => {
  await fetchUsers();
  await fetchRoles();
});
</script>

<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-6 text-gray-800">
      Administración de Usuarios
    </h1>

    <div v-if="loading" class="text-gray-500">Cargando usuarios...</div>
    <div v-if="error" class="text-red-500 mb-4">{{ error }}</div>

    <!-- Tabla de usuarios -->
    <div class="hidden md:block overflow-x-auto">
      <table class="w-full bg-white rounded-2xl shadow border border-gray-100">
        <thead class="bg-gray-100 text-gray-700 text-sm">
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
          <tr v-for="user in users" :key="user.id" class="border-t hover:bg-gray-50 transition">
            <td class="p-4 font-medium text-gray-800">{{ user.name }}</td>
            <td class="p-4 text-gray-600">{{ user.email }}</td>
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
            <td class="p-4 text-sm text-gray-500">{{ formatDate(user.created_at) }}</td>
            <td class="p-4 text-right space-x-2">
              <button @click="openEditModal(user)" class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition">Editar</button>
              <button @click="deleteUser(user.id)" class="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition">Eliminar</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal editar usuario -->
    <div v-if="showEditModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" @click="closeEditModal">
      <div class="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" @click.stop>
        <h2 class="text-xl font-bold mb-6 text-gray-800">Editar Usuario</h2>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-1">Nombre</label>
            <input v-model="editForm.name" type="text" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-600 mb-1">Email</label>
            <input v-model="editForm.email" type="email" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-600 mb-1">Rol</label>
            <select v-model="editForm.role" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option v-for="role in roles" :key="role.id" :value="role.name">{{ role.name }}</option>
            </select>
          </div>
        </div>

        <div class="flex gap-4 mt-6">
          <button @click="updateUser" class="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">Guardar</button>
          <button @click="closeEditModal" class="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition">Cancelar</button>
        </div>
      </div>
    </div>
  </div>
</template>
