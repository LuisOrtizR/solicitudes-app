<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useAnalyticsStore } from "@/stores/analytics.store";
import SlaSummaryCard from "@/components/analytics/SlaSummaryCard.vue";
import FirstResponseCard from "@/components/analytics/FirstResponseCard.vue";
import StatusDonutChart from "@/components/analytics/StatusDonutChart.vue";
import CategoryBarChart from "@/components/analytics/CategoryBarChart.vue";
import MttrChart from "@/components/analytics/MttrChart.vue";
import AgentWorkloadTable from "@/components/analytics/AgentWorkloadTable.vue";
import TrendLineChart from "@/components/analytics/TrendLineChart.vue";
import BaseButton from "@/components/ui/BaseButton.vue";

const store = useAnalyticsStore();

const dateFrom = ref("");
const dateTo = ref("");

const applyFilters = () => {
  store.fetchAll({
    dateFrom: dateFrom.value || undefined,
    dateTo: dateTo.value || undefined,
  });
};

onMounted(() => {
  store.fetchAll({});
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Analítica</h1>
        <p class="text-sm text-gray-400 dark:text-gray-500 mt-0.5">Indicadores de gestión de solicitudes</p>
      </div>

      <div class="flex items-center gap-2">
        <input
          v-model="dateFrom"
          type="date"
          class="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-primary-400"
        />
        <span class="text-gray-400 dark:text-gray-500 text-sm">a</span>
        <input
          v-model="dateTo"
          type="date"
          class="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-primary-400"
        />
        <BaseButton variant="primary" class="!px-4 !py-1.5" @click="applyFilters">Aplicar</BaseButton>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
      <SlaSummaryCard :data="store.sla.data" :loading="store.sla.loading" :error="store.sla.error" />
      <FirstResponseCard
        :data="store.firstResponseTime.data"
        :loading="store.firstResponseTime.loading"
        :error="store.firstResponseTime.error"
      />
      <StatusDonutChart
        :data="store.statusDistribution.data"
        :loading="store.statusDistribution.loading"
        :error="store.statusDistribution.error"
      />

      <div class="lg:col-span-2">
        <MttrChart :data="store.mttr.data" :loading="store.mttr.loading" :error="store.mttr.error" />
      </div>
      <AgentWorkloadTable
        :data="store.agentWorkload.data"
        :loading="store.agentWorkload.loading"
        :error="store.agentWorkload.error"
      />

      <div class="lg:col-span-2">
        <TrendLineChart :data="store.trends.data" :loading="store.trends.loading" :error="store.trends.error" />
      </div>
      <CategoryBarChart
        :data="store.categoryDistribution.data"
        :loading="store.categoryDistribution.loading"
        :error="store.categoryDistribution.error"
      />
    </div>
  </div>
</template>
