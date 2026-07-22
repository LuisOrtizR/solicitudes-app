<script setup lang="ts">
import type { SlaSummary } from "@/types/analytics.types";

defineProps<{
  data: SlaSummary | null;
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
    <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Cumplimiento de SLA</p>

    <div v-if="loading" class="animate-pulse space-y-3">
      <div class="h-10 w-24 bg-gray-100 rounded-lg"></div>
      <div class="h-3 w-full bg-gray-100 rounded-full"></div>
    </div>

    <div v-else-if="error" class="text-sm text-red-500">{{ error }}</div>

    <div v-else-if="!data || data.totalResolved === 0" class="text-sm text-gray-400 py-4 text-center">
      No hay solicitudes resueltas en este rango.
    </div>

    <div v-else class="space-y-4">
      <div class="flex items-end gap-2">
        <span
          class="text-4xl font-bold"
          :class="data.withinSlaPercentage >= 80 ? 'text-emerald-600' : 'text-red-600'"
        >
          {{ data.withinSlaPercentage }}%
        </span>
        <span class="text-xs text-gray-400 mb-1.5">dentro de SLA ({{ data.totalResolved }} resueltas)</span>
      </div>

      <div v-if="data.rejectedPercentage > 0" class="text-xs text-gray-400">
        {{ data.rejectedPercentage }}% de las solicitudes creadas fueron rechazadas.
      </div>

      <div class="space-y-2">
        <div v-for="p in data.byPriority" :key="p.priority" class="flex items-center gap-2">
          <span class="text-xs text-gray-500 w-14 shrink-0">{{ priorityLabels[p.priority] }}</span>
          <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full"
              :class="p.withinSlaPercentage >= 80 ? 'bg-emerald-500' : 'bg-red-400'"
              :style="{ width: `${p.withinSlaPercentage}%` }"
            ></div>
          </div>
          <span class="text-xs text-gray-400 w-10 text-right shrink-0">{{ p.withinSlaPercentage }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>
