<script setup lang="ts">
import { computed } from "vue";
import { Bar } from "vue-chartjs";
import type { CategoryDistributionItem } from "@/types/analytics.types";

const props = defineProps<{
  data: CategoryDistributionItem[] | null;
  loading: boolean;
  error: string | null;
}>();

const categoryLabels: Record<string, string> = {
  soporte_tecnico: "Soporte Técnico",
  accesos_permisos: "Accesos y Permisos",
  hardware: "Hardware",
  software: "Software",
  otro: "Otro",
};

const chartData = computed(() => {
  const items = props.data ?? [];
  return {
    labels: items.map((i) => categoryLabels[i.category] ?? i.category),
    datasets: [
      {
        label: "Solicitudes",
        data: items.map((i) => i.count),
        backgroundColor: "#6366f1",
        borderRadius: 6,
      },
    ],
  };
});

const chartOptions = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
};
</script>

<template>
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
    <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Distribución por Categoría</p>

    <div v-if="loading" class="animate-pulse h-48 bg-gray-100 rounded-lg"></div>
    <div v-else-if="error" class="text-sm text-red-500">{{ error }}</div>
    <div v-else-if="!data || data.length === 0" class="text-sm text-gray-400 py-12 text-center">
      No hay solicitudes en este rango.
    </div>
    <div v-else class="h-56">
      <Bar :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>
