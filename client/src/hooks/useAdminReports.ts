import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type {
  AdminOverviewMetrics,
  AdminAggregateReports,
  OverviewApiResponse,
  ReportsApiResponse,
} from '../types/report';

export function useAdminReports() {
  const [metrics, setMetrics] = useState<AdminOverviewMetrics | null>(null);
  const [reports, setReports] = useState<AdminAggregateReports | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      const res = await api.get<OverviewApiResponse>('/api/admin/reports/overview');
      if (res.metrics) setMetrics(res.metrics);
    } catch (err: any) {
      console.error('Failed to load admin overview metrics:', err);
    }
  }, []);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovRes, repRes] = await Promise.all([
        api.get<OverviewApiResponse>('/api/admin/reports/overview'),
        api.get<ReportsApiResponse>('/api/admin/reports/aggregate'),
      ]);

      if (ovRes.metrics) setMetrics(ovRes.metrics);
      if (repRes.reports) setReports(repRes.reports);
    } catch (err: any) {
      console.error('Failed to load admin reports:', err);
      setError(err?.message || 'Failed to load report data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return {
    metrics,
    reports,
    loading,
    error,
    refresh: fetchReports,
    fetchOverview,
  };
}
