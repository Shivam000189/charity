import { Request, Response } from 'express';
import { getAdminOverviewMetrics, getAdminReports } from '../services/report.service';

export async function getOverviewMetrics(req: Request, res: Response): Promise<void> {
  try {
    const metrics = await getAdminOverviewMetrics();
    res.json({ success: true, metrics });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to fetch admin overview metrics.' });
  }
}

export async function getAggregateReports(req: Request, res: Response): Promise<void> {
  try {
    const reports = await getAdminReports();
    res.json({ success: true, reports });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to fetch aggregate reports.' });
  }
}
