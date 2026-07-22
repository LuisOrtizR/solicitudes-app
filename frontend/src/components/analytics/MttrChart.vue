<script setup lang="ts">
import { computed } from "vue";
import { Bar } from "vue-chartjs";
import type { MttrSummary } from "@/types/analytics.types";
import { useThemeStore } from "@/stores/theme.store";

const props = defineProps<{
  data: MttrSummary | null;
  loading: boolean;
  error: string | null;
}>();

const priorityLabels: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

const chartData = computed(() => {
  const agents = props.data?.byAgent ?? [];
  return {
    labels: agents.map((a) => a.agentName),
    datasets: [
      {
        label: "MTTR (horas)",
        data: agents.map((a) => a.avgHours),
        backgroundColor: "#6366f1",
        borderRadius: 6,
      },
    ],
  };
});

const themeStore = useThemeStore();

const chartOptions = computed(() => {
  const isDark = themeStore.mode === "dark";
  const textColor = isDark ? "#9ca3af" : "#6b7280";
  const gridColor = isDark ? "#374151" : "#e5e7eb";
  return {
    indexAxis: "y" as const,
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { beginAtZero: true, ticks: { color: textColor }, grid: { color: gridColor } },
      y: { ticks: { color: textColor }, grid: { color: gridColor } },
    },
  };
});
</script>

<template>
  <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5">
    <div class="flex items-center justify-between mb-3">
      <p class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">MTTR por Agente</p>
      <span v-if="data" class="text-sm font-bold text-primary-600 dark:text-primary-400">{{ data.overallMttrHours }}h promedio</span>
    </div>

    <div v-if="loading" class="animate-pulse h-48 bg-gray-100 dark:bg-gray-800 rounded-lg"></div>
    <div v-else-if="error" class="text-sm text-red-500 dark:text-red-400">{{ error }}</div>
    <div v-else-if="!data || data.byAgent.length === 0" class="text-sm text-gray-400 dark:text-gray-500 py-12 text-center">
      No hay solicitudes resueltas asignadas a un agente en este rango.
    </div>
    <template v-else>
      <div class="h-48 mb-4">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
      <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-100 dark:border-gray-800">
        <div v-for="p in data.byPriority" :key="p.priority" class="flex justify-between">
          <span>{{ priorityLabels[p.priority] }}</span>
          <span class="font-medium text-gray-700 dark:text-gray-300">{{ p.avgHours }}h</span>
        </div>
      </div>
    </template>
  </div>
</template>
