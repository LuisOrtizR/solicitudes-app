<script setup lang="ts">
import { computed } from "vue";
import { Line } from "vue-chartjs";
import type { TrendPoint } from "@/types/analytics.types";
import { useAnalyticsStore } from "@/stores/analytics.store";

const props = defineProps<{
  data: TrendPoint[] | null;
  loading: boolean;
  error: string | null;
}>();

const store = useAnalyticsStore();

const formatPeriod = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short" });

const chartData = computed(() => {
  const points = props.data ?? [];
  return {
    labels: points.map((p) => formatPeriod(p.period)),
    datasets: [
      {
        label: "Creadas",
        data: points.map((p) => p.created),
        borderColor: "#6366f1",
        backgroundColor: "#6366f1",
        tension: 0.3,
      },
      {
        label: "Resueltas",
        data: points.map((p) => p.resolved),
        borderColor: "#10b981",
        backgroundColor: "#10b981",
        tension: 0.3,
      },
    ],
  };
});

const chartOptions = {
  responsive: true,
  plugins: { legend: { position: "bottom" as const, labels: { boxWidth: 10, font: { size: 11 } } } },
  scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
};

const onGranularityChange = (e: Event) => {
  const value = (e.target as HTMLSelectElement).value as "week" | "month";
  store.setGranularity(value);
};
</script>

<template>
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
    <div class="flex items-center justify-between mb-3">
      <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tendencia: Creadas vs Resueltas</p>
      <select
        :value="store.granularity"
        @change="onGranularityChange"
        class="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white outline-none focus:ring-2 focus:ring-indigo-400"
      >
        <option value="week">Semanal</option>
        <option value="month">Mensual</option>
      </select>
    </div>

    <div v-if="loading" class="animate-pulse h-56 bg-gray-100 rounded-lg"></div>
    <div v-else-if="error" class="text-sm text-red-500">{{ error }}</div>
    <div v-else-if="!data || data.length === 0" class="text-sm text-gray-400 py-16 text-center">
      No hay datos en este rango.
    </div>
    <div v-else class="h-64">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>
