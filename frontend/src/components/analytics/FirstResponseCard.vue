<script setup lang="ts">
import type { FirstResponseSummary } from "@/types/analytics.types";

defineProps<{
  data: FirstResponseSummary | null;
  loading: boolean;
  error: string | null;
}>();

const priorityLabels: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};
</script>

<template>
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
    <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tiempo de Primera Respuesta</p>

    <div v-if="loading" class="animate-pulse space-y-2">
      <div class="h-10 w-24 bg-gray-100 rounded-lg"></div>
    </div>

    <div v-else-if="error" class="text-sm text-red-500">{{ error }}</div>

    <div v-else-if="!data || data.overallAvgHours === 0" class="text-sm text-gray-400 py-4 text-center">
      No hay respuestas registradas en este rango.
    </div>

    <div v-else class="space-y-3">
      <div class="text-4xl font-bold text-indigo-600">{{ data.overallAvgHours }}h</div>
      <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
        <div v-for="p in data.byPriority" :key="p.priority" class="flex justify-between">
          <span>{{ priorityLabels[p.priority] }}</span>
          <span class="font-medium text-gray-700">{{ p.avgHours }}h</span>
        </div>
      </div>
    </div>
  </div>
</template>
