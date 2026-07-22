<script setup lang="ts">
import { computed } from "vue";
import type { AgentWorkloadItem } from "@/types/analytics.types";

const props = defineProps<{
  data: AgentWorkloadItem[] | null;
  loading: boolean;
  error: string | null;
}>();

const maxActive = computed(() => Math.max(1, ...(props.data ?? []).map((a) => a.totalActive)));
</script>

<template>
  <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
    <p class="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Carga de Trabajo por Agente</p>

    <div v-if="loading" class="animate-pulse space-y-2">
      <div class="h-8 bg-gray-100 rounded-lg" v-for="n in 3" :key="n"></div>
    </div>

    <div v-else-if="error" class="text-sm text-red-500">{{ error }}</div>

    <div v-else-if="!data || data.length === 0" class="text-sm text-gray-400 py-8 text-center">
      Ningún agente tiene solicitudes activas asignadas ahora mismo.
    </div>

    <div v-else class="space-y-3">
      <div v-for="agent in data" :key="agent.agentId">
        <div class="flex justify-between items-baseline mb-1">
          <span class="text-sm font-medium text-gray-700">{{ agent.agentName }}</span>
          <span class="text-xs text-gray-400">
            {{ agent.openTickets }} abiertas · {{ agent.inProgressTickets }} en progreso
          </span>
        </div>
        <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            class="h-full bg-indigo-500 rounded-full"
            :style="{ width: `${(agent.totalActive / maxActive) * 100}%` }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>
