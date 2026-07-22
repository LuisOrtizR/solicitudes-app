<script setup lang="ts">
import { computed } from "vue";
import type { AgentWorkloadItem } from "@/types/analytics.types";
import BaseCard from "@/components/ui/BaseCard.vue";

const props = defineProps<{
  data: AgentWorkloadItem[] | null;
  loading: boolean;
  error: string | null;
}>();

const maxActive = computed(() => Math.max(1, ...(props.data ?? []).map((a) => a.totalActive)));
</script>

<template>
  <BaseCard>
    <p class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Carga de Trabajo por Agente</p>

    <div v-if="loading" class="animate-pulse space-y-2">
      <div class="h-8 bg-gray-100 dark:bg-gray-800 rounded-lg" v-for="n in 3" :key="n"></div>
    </div>

    <div v-else-if="error" class="text-sm text-red-500 dark:text-red-400">{{ error }}</div>

    <div v-else-if="!data || data.length === 0" class="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">
      Ningún agente tiene solicitudes activas asignadas ahora mismo.
    </div>

    <div v-else class="space-y-3">
      <div v-for="agent in data" :key="agent.agentId">
        <div class="flex justify-between items-baseline mb-1">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">{{ agent.agentName }}</span>
          <span class="text-xs text-gray-400 dark:text-gray-500">
            {{ agent.openTickets }} abiertas · {{ agent.inProgressTickets }} en progreso
          </span>
        </div>
        <div class="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            class="h-full bg-primary-500 dark:bg-primary-400 rounded-full"
            :style="{ width: `${(agent.totalActive / maxActive) * 100}%` }"
          ></div>
        </div>
      </div>
    </div>
  </BaseCard>
</template>
