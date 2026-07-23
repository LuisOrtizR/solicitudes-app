<script setup lang="ts">
withDefaults(
  defineProps<{
    rows?: number;
    columns?: number;
  }>(),
  { rows: 6, columns: 4 }
);
</script>

<template>
  <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
    <div class="divide-y divide-gray-50 dark:divide-gray-800">
      <div v-for="row in rows" :key="row" class="flex items-center gap-4 px-4 py-4 animate-pulse">
        <div
          v-for="col in columns"
          :key="col"
          class="h-4 bg-gray-200 dark:bg-gray-700 rounded"
          :class="col === 1 ? 'w-1/4' : col === columns ? 'w-16 ml-auto' : 'flex-1'"
        />
      </div>
    </div>
  </div>
</template>
