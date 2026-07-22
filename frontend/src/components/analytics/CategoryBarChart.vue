<script setup lang="ts">
import { computed } from "vue";
import { Bar } from "vue-chartjs";
import type { CategoryDistributionItem } from "@/types/analytics.types";
import { useThemeStore } from "@/stores/theme.store";

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

const themeStore = useThemeStore();

const chartOptions = computed(() => {
  const isDark = themeStore.mode === "dark";
  const textColor = isDark ? "#9ca3af" : "#6b7280";
  const gridColor = isDark ? "#374151" : "#e5e7eb";
  return {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: textColor }, grid: { color: gridColor } },
      y: { beginAtZero: true, ticks: { precision: 0, color: textColor }, grid: { color: gridColor } },
    },
  };
});
</script>

<template>
  <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5">
    <p class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Distribución por Categoría</p>

    <div v-if="loading" class="animate-pulse h-48 bg-gray-100 dark:bg-gray-800 rounded-lg"></div>
    <div v-else-if="error" class="text-sm text-red-500 dark:text-red-400">{{ error }}</div>
    <div v-else-if="!data || data.length === 0" class="text-sm text-gray-400 dark:text-gray-500 py-12 text-center">
      No hay solicitudes en este rango.
    </div>
    <div v-else class="h-56">
      <Bar :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>
