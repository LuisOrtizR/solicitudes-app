<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  page: number;
  totalPages: number;
  total: number;
  limit: number;
}>();

const emit = defineEmits<{
  "update:page": [value: number];
  "update:limit": [value: number];
}>();

const rangeStart = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.limit + 1));
const rangeEnd = computed(() => Math.min(props.page * props.limit, props.total));

const onLimitChange = (e: Event) => {
  emit("update:limit", Number((e.target as HTMLSelectElement).value));
};
</script>

<template>
  <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4">
    <span class="text-sm text-gray-500 dark:text-gray-400">
      Mostrando {{ rangeStart }}-{{ rangeEnd }} de {{ total }}
    </span>
    <div class="flex items-center gap-3">
      <select
        :value="limit"
        @change="onLimitChange"
        class="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option :value="10">10 / página</option>
        <option :value="20">20 / página</option>
        <option :value="50">50 / página</option>
      </select>
      <div class="flex items-center gap-2">
        <button
          :disabled="page <= 1"
          @click="emit('update:page', page - 1)"
          class="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300 transition-colors"
        >
          Anterior
        </button>
        <span class="text-sm text-gray-600 dark:text-gray-300 px-2 whitespace-nowrap">
          Página {{ page }} de {{ totalPages || 1 }}
        </span>
        <button
          :disabled="page >= totalPages"
          @click="emit('update:page', page + 1)"
          class="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300 transition-colors"
        >
          Siguiente
        </button>
      </div>
    </div>
  </div>
</template>
