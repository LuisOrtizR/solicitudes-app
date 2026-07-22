<script setup lang="ts">
import { computed } from "vue";
import { Doughnut } from "vue-chartjs";
import type { StatusDistributionItem } from "@/types/analytics.types";
import { useThemeStore } from "@/stores/theme.store";

const props = defineProps<{
  data: StatusDistributionItem[] | null;
  loading: boolean;
  error: string | null;
}>();

const statusLabels: Record<string, string> = {
  open: "Abierta",
  in_progress: "En Progreso",
  waiting_user: "Esperando Usuario",
  resolved: "Resuelta",
  closed: "Cerrada",
  rejected: "Rechazada",
};

const statusColors: Record<string, string> = {
  open: "#f59e0b",
  in_progress: "#3b82f6",
  waiting_user: "#8b5cf6",
  resolved: "#10b981",
  closed: "#9ca3af",
  rejected: "#ef4444",
};

const chartData = computed(() => {
  const items = props.data ?? [];
  return {
    labels: items.map((i) => statusLabels[i.status] ?? i.status),
    datasets: [
      {
        data: items.map((i) => i.count),
        backgroundColor: items.map((i) => statusColors[i.status] ?? "#d1d5db"),
        borderWidth: 0,
      },
    ],
  };
});

const themeStore = useThemeStore();

const chartOptions = computed(() => {
  const isDark = themeStore.mode === "dark";
  const textColor = isDark ? "#9ca3af" : "#6b7280";
  return {
    responsive: true,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: { boxWidth: 10, font: { size: 11 }, color: textColor },
      },
    },
  };
});
</script>

<template>
  <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-5">
    <p class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Distribución por Estado</p>

    <div v-if="loading" class="animate-pulse h-48 bg-gray-100 dark:bg-gray-800 rounded-lg"></div>
    <div v-else-if="error" class="text-sm text-red-500 dark:text-red-400">{{ error }}</div>
    <div v-else-if="!data || data.length === 0" class="text-sm text-gray-400 dark:text-gray-500 py-12 text-center">
      No hay solicitudes en este rango.
    </div>
    <div v-else class="h-56">
      <Doughnut :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>
