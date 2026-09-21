import { pool } from '../config/database';

export interface AdminOverviewMetrics {
  totalUsers: number;
  activeSubscribers: number;
  upcomingDraw: {
    id: string;
    title: string;
    scheduledMonth: string;
    drawDate: string;
    status: string;
  } | null;
  pendingWinnerReviews: number;
  pendingPayments: number;
  totalPrizePool: number;
}

export interface CharityReportItem {
  id: string;
  name: string;
  category: string;
  subscriptionContributorsCount: number;
  totalDonationsAmount: number;
  donationsCount: number;
}

export interface AdminAggregateReports {
  totalUsers: {
    totalUsers: number;
    activeSubscribers: number;
    visitorsCount: number;
  };
  totalPrizePool: {
    totalPrizePoolPublished: number;
    completedDrawsCount: number;
    totalWinnersAwarded: number;
  };
  charityTotals: {
    charities: CharityReportItem[];
    totalIndependentDonations: number;
  };
  drawStatistics: {
    totalDraws: number;
    publishedDraws: number;
    scheduledOrOpenDraws: number;
    totalEntries: number;
    totalWinners: number;
  };
}

/**
 * Returns executive overview metrics for the main /admin dashboard
 */
export async function getAdminOverviewMetrics(): Promise<AdminOverviewMetrics> {
  // 1. Total users & active subscribers
  const usersRes = await pool.query(`SELECT COUNT(*)::int AS cnt FROM public.users`);
  const subsRes = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM public.subscriptions WHERE status = 'active'`
  );

  // 2. Upcoming draw
  const drawRes = await pool.query(
    `SELECT id, name, scheduled_month, draw_date, status
       FROM public.draws
      WHERE status IN ('open', 'scheduled')
      ORDER BY draw_date ASC
      LIMIT 1`
  );

  const upcomingDraw = drawRes.rows.length > 0 ? {
    id: drawRes.rows[0].id,
    title: drawRes.rows[0].name,
    scheduledMonth: drawRes.rows[0].scheduled_month,
    drawDate: new Date(drawRes.rows[0].draw_date).toISOString(),
    status: drawRes.rows[0].status,
  } : null;

  // 3. Pending winner reviews
  const pendingReviewsRes = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM public.winners WHERE verification_status = 'PENDING_REVIEW'`
  );

  // 4. Pending payments
  const pendingPaymentsRes = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM public.winners WHERE verification_status = 'APPROVED' AND payment_status = 'PENDING'`
  );

  // 5. Total prize pool for published/completed draws
  const poolRes = await pool.query(
    `SELECT COALESCE(SUM(COALESCE(prize_amount, three_match_pool + four_match_pool + five_match_pool)), 0) AS total FROM public.draws WHERE status = 'completed'`
  );

  return {
    totalUsers: usersRes.rows[0]?.cnt || 0,
    activeSubscribers: subsRes.rows[0]?.cnt || 0,
    upcomingDraw,
    pendingWinnerReviews: pendingReviewsRes.rows[0]?.cnt || 0,
    pendingPayments: pendingPaymentsRes.rows[0]?.cnt || 0,
    totalPrizePool: parseFloat(String(poolRes.rows[0]?.total || 0)),
  };
}

/**
 * Returns comprehensive aggregate reports for /admin/reports
 */
export async function getAdminReports(): Promise<AdminAggregateReports> {
  // 1. User stats
  const usersRes = await pool.query(`SELECT COUNT(*)::int AS cnt FROM public.users`);
  const subsRes = await pool.query(`SELECT COUNT(*)::int AS cnt FROM public.subscriptions WHERE status = 'active'`);
  const visitorsRes = await pool.query(`SELECT COUNT(*)::int AS cnt FROM public.users WHERE role = 'visitor'`);

  // 2. Prize pool stats (completed draws only)
  const prizeRes = await pool.query(
    `SELECT COALESCE(SUM(COALESCE(prize_amount, three_match_pool + four_match_pool + five_match_pool)), 0) AS total_pool,
            COUNT(*)::int AS completed_count
       FROM public.draws
      WHERE status = 'completed'`
  );
  const winnersAwardedRes = await pool.query(`SELECT COUNT(*)::int AS cnt FROM public.winners`);

  // 3. Charity totals
  const charitiesRes = await pool.query(
    `SELECT c.id, c.name, c.category,
            (SELECT COUNT(*)::int FROM public.subscriptions s WHERE s.charity_id = c.id AND s.status = 'active') AS subs_count,
            (SELECT COALESCE(SUM(d.amount), 0) FROM public.donations d WHERE d.charity_id = c.id AND d.status = 'completed') AS donations_sum,
            (SELECT COUNT(*)::int FROM public.donations d WHERE d.charity_id = c.id AND d.status = 'completed') AS donations_count
       FROM public.charities c
      WHERE c.deleted_at IS NULL
      ORDER BY donations_sum DESC, subs_count DESC`
  );

  const charityItems: CharityReportItem[] = charitiesRes.rows.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    subscriptionContributorsCount: Number(r.subs_count),
    totalDonationsAmount: parseFloat(String(r.donations_sum)),
    donationsCount: Number(r.donations_count),
  }));

  const totalDonations = charityItems.reduce((acc, c) => acc + c.totalDonationsAmount, 0);

  // 4. Draw statistics
  const drawsTotalRes = await pool.query(`SELECT COUNT(*)::int AS cnt FROM public.draws`);
  const drawsCompletedRes = await pool.query(`SELECT COUNT(*)::int AS cnt FROM public.draws WHERE status = 'completed'`);
  const drawsScheduledRes = await pool.query(`SELECT COUNT(*)::int AS cnt FROM public.draws WHERE status IN ('scheduled', 'open')`);
  const entriesTotalRes = await pool.query(`SELECT COUNT(*)::int AS cnt FROM public.draw_entries`);
  const winnersTotalRes = await pool.query(`SELECT COUNT(*)::int AS cnt FROM public.winners`);

  return {
    totalUsers: {
      totalUsers: usersRes.rows[0]?.cnt || 0,
      activeSubscribers: subsRes.rows[0]?.cnt || 0,
      visitorsCount: visitorsRes.rows[0]?.cnt || 0,
    },
    totalPrizePool: {
      totalPrizePoolPublished: parseFloat(String(prizeRes.rows[0]?.total_pool || 0)),
      completedDrawsCount: prizeRes.rows[0]?.completed_count || 0,
      totalWinnersAwarded: winnersAwardedRes.rows[0]?.cnt || 0,
    },
    charityTotals: {
      charities: charityItems,
      totalIndependentDonations: totalDonations,
    },
    drawStatistics: {
      totalDraws: drawsTotalRes.rows[0]?.cnt || 0,
      publishedDraws: drawsCompletedRes.rows[0]?.cnt || 0,
      scheduledOrOpenDraws: drawsScheduledRes.rows[0]?.cnt || 0,
      totalEntries: entriesTotalRes.rows[0]?.cnt || 0,
      totalWinners: winnersTotalRes.rows[0]?.cnt || 0,
    },
  };
}
