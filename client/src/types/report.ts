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

export interface OverviewApiResponse {
  success: boolean;
  metrics?: AdminOverviewMetrics;
  message?: string;
}

export interface ReportsApiResponse {
  success: boolean;
  reports?: AdminAggregateReports;
  message?: string;
}

export interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  role: string;
  subscriptionPlan: string | null;
  subscriptionStatus: string | null;
  scoresCount: number;
  winningsCount: number;
  createdAt: string;
}

export interface AdminUserDetail {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  subscription: {
    id: string;
    plan: string;
    status: string;
    startsAt: string;
    expiresAt: string;
    charityName: string | null;
    contributionPercentage: number;
  } | null;
  recentScores: {
    id: string;
    score: number;
    scoreDate: string;
    createdAt: string;
  }[];
  winnings: {
    id: string;
    drawTitle: string;
    rank: number;
    matchCount: number;
    prizeAmount: number;
    verificationStatus: string;
    paymentStatus: string;
  }[];
}
