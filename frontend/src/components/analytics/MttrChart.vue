<script setup lang="ts">
import { computed } from "vue";
import { Bar } from "vue-chartjs";
import type { MttrSummary } from "@/types/analytics.types";

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

const chartOptions = {
  indexAxis: "y" as const,
  responsive: true,
  plugins: { legend: { display: false } },
  scales: { x: { beginAtZero: true } },
};
</script>

<template>
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
    <div class="flex items-center justify-between mb-3">
      <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">MTTR por Agente</p>
      <span v-if="data" class="text-sm font-bold text-indigo-600">{{ data.overallMttrHours }}h promedio</span>
    </div>

    <div v-if="loading" class="animate-pulse h-48 bg-gray-100 rounded-lg"></div>
    <div v-else-if="error" class="text-sm text-red-500">{{ error }}</div>
    <div v-else-if="!data || data.byAgent.length === 0" class="text-sm text-gray-400 py-12 text-center">
      No hay solicitudes resueltas asignadas a un agente en este rango.
    </div>
    <template v-else>
      <div class="h-48 mb-4">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
      <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500 pt-3 border-t border-gray-100">
        <div v-for="p in data.byPriority" :key="p.priority" class="flex justify-between">
          <span>{{ priorityLabels[p.priority] }}</span>
          <span class="font-medium text-gray-700">{{ p.avgHours }}h</span>
        </div>
      </div>
    </template>
  </div>
</template>
