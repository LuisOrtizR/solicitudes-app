import { defineStore } from "pinia";
import { analyticsApi } from "@/api/endpoints/analytics.api";
import type {
  SlaSummary,
  MttrSummary,
  StatusDistributionItem,
  AgentWorkloadItem,
  TrendPoint,
  CategoryDistributionItem,
  FirstResponseSummary,
  AnalyticsFilters,
} from "@/types/analytics.types";

interface MetricState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface AnalyticsState {
  filters: AnalyticsFilters;
  granularity: "week" | "month";
  sla: MetricState<SlaSummary>;
  mttr: MetricState<MttrSummary>;
  statusDistribution: MetricState<StatusDistributionItem[]>;
  agentWorkload: MetricState<AgentWorkloadItem[]>;
  trends: MetricState<TrendPoint[]>;
  categoryDistribution: MetricState<CategoryDistributionItem[]>;
  firstResponseTime: MetricState<FirstResponseSummary>;
}

const emptyMetric = <T>(): MetricState<T> => ({ data: null, loading: false, error: null });

type MetricKey =
  | "sla"
  | "mttr"
  | "statusDistribution"
  | "agentWorkload"
  | "trends"
  | "categoryDistribution"
  | "firstResponseTime";

export const useAnalyticsStore = defineStore("analytics", {
  state: (): AnalyticsState => ({
    filters: {},
    granularity: "week",
    sla: emptyMetric<SlaSummary>(),
    mttr: emptyMetric<MttrSummary>(),
    statusDistribution: emptyMetric<StatusDistributionItem[]>(),
    agentWorkload: emptyMetric<AgentWorkloadItem[]>(),
    trends: emptyMetric<TrendPoint[]>(),
    categoryDistribution: emptyMetric<CategoryDistributionItem[]>(),
    firstResponseTime: emptyMetric<FirstResponseSummary>(),
  }),

  actions: {
    async fetchAll(filters: AnalyticsFilters = {}) {
      this.filters = filters;

      const tasks: Array<{ key: MetricKey; run: () => Promise<{ data: unknown }> }> = [
        { key: "sla", run: () => analyticsApi.getSla(filters) },
        { key: "mttr", run: () => analyticsApi.getMttr(filters) },
        { key: "statusDistribution", run: () => analyticsApi.getStatusDistribution(filters) },
        { key: "agentWorkload", run: () => analyticsApi.getAgentWorkload(filters) },
        { key: "trends", run: () => analyticsApi.getTrends({ ...filters, granularity: this.granularity }) },
        { key: "categoryDistribution", run: () => analyticsApi.getCategoryDistribution(filters) },
        { key: "firstResponseTime", run: () => analyticsApi.getFirstResponseTime(filters) },
      ];

      for (const task of tasks) {
        (this[task.key] as MetricState<unknown>).loading = true;
        (this[task.key] as MetricState<unknown>).error = null;
      }

      await Promise.allSettled(
        tasks.map(async (task) => {
          const metric = this[task.key] as MetricState<unknown>;
          try {
            const res = await task.run();
            metric.data = res.data;
          } catch (err) {
            const reason = err as { response?: { data?: { message?: string } } };
            metric.error = reason?.response?.data?.message || "Error cargando esta métrica";
          } finally {
            metric.loading = false;
          }
        })
      );
    },

    async setGranularity(granularity: "week" | "month") {
      this.granularity = granularity;
      this.trends.loading = true;
      this.trends.error = null;

      try {
        const res = await analyticsApi.getTrends({ ...this.filters, granularity });
        this.trends.data = res.data;
      } catch (err) {
        const reason = err as { response?: { data?: { message?: string } } };
        this.trends.error = reason.response?.data?.message || "Error cargando la tendencia";
      } finally {
        this.trends.loading = false;
      }
    },
  },
});
