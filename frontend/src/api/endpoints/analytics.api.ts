import api from "../axios";
import type {
  SlaSummary,
  MttrSummary,
  StatusDistributionItem,
  AgentWorkloadItem,
  TrendPoint,
  CategoryDistributionItem,
  FirstResponseSummary,
  AnalyticsFilters,
  TrendsFilters,
} from "@/types/analytics.types";

const toParams = (filters: AnalyticsFilters) => ({
  dateFrom: filters.dateFrom,
  dateTo: filters.dateTo,
  priority: filters.priority,
});

export const analyticsApi = {
  getSla: (filters: AnalyticsFilters) =>
    api.get<SlaSummary>("/analytics/sla", { params: toParams(filters) }),

  getMttr: (filters: AnalyticsFilters) =>
    api.get<MttrSummary>("/analytics/mttr", { params: toParams(filters) }),

  getStatusDistribution: (filters: AnalyticsFilters) =>
    api.get<StatusDistributionItem[]>("/analytics/status-distribution", { params: toParams(filters) }),

  getAgentWorkload: (filters: AnalyticsFilters) =>
    api.get<AgentWorkloadItem[]>("/analytics/agent-workload", { params: { priority: filters.priority } }),

  getTrends: (filters: TrendsFilters) =>
    api.get<TrendPoint[]>("/analytics/trends", { params: { ...toParams(filters), granularity: filters.granularity } }),

  getCategoryDistribution: (filters: AnalyticsFilters) =>
    api.get<CategoryDistributionItem[]>("/analytics/category-distribution", { params: toParams(filters) }),

  getFirstResponseTime: (filters: AnalyticsFilters) =>
    api.get<FirstResponseSummary>("/analytics/first-response-time", { params: toParams(filters) }),
};
