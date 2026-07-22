export interface SlaByPriority {
  priority: string;
  withinSlaPercentage: number;
  total: number;
}

export interface SlaSummary {
  withinSla: number;
  breachedSla: number;
  withinSlaPercentage: number;
  totalResolved: number;
  rejectedPercentage: number;
  byPriority: SlaByPriority[];
}

export interface MttrByPriority {
  priority: string;
  avgHours: number;
}

export interface MttrByAgent {
  agentId: string;
  agentName: string;
  avgHours: number;
  ticketsResolved: number;
}

export interface MttrSummary {
  overallMttrHours: number;
  byPriority: MttrByPriority[];
  byAgent: MttrByAgent[];
}

export interface StatusDistributionItem {
  status: string;
  count: number;
  percentage: number;
}

export interface AgentWorkloadItem {
  agentId: string;
  agentName: string;
  openTickets: number;
  inProgressTickets: number;
  totalActive: number;
}

export interface TrendPoint {
  period: string;
  created: number;
  resolved: number;
}

export interface CategoryDistributionItem {
  category: string;
  count: number;
  percentage: number;
}

export interface FirstResponseByPriority {
  priority: string;
  avgHours: number;
}

export interface FirstResponseSummary {
  overallAvgHours: number;
  byPriority: FirstResponseByPriority[];
}

export interface AnalyticsFilters {
  dateFrom?: string;
  dateTo?: string;
  priority?: string;
}

export interface TrendsFilters extends AnalyticsFilters {
  granularity?: "week" | "month";
}
