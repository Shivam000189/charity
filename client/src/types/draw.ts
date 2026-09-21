export type DrawStatus = 'draft' | 'scheduled' | 'open' | 'closed' | 'simulated' | 'completed' | 'cancelled';
export type DrawType = 'RANDOM' | 'SCORE_WEIGHTED';

export interface DrawWinner {
  userId: string;
  matchCount: 3 | 4 | 5;
  prizeAmount: number; // in rupees
  rank: number;
}

export interface SimulationResult {
  candidateNumbers: number[];
  match5Winners: DrawWinner[];
  match4Winners: DrawWinner[];
  match3Winners: DrawWinner[];
  match5Pool: number;
  match4Pool: number;
  match3Pool: number;
  jackpotRollover: number;
  totalSubscribers: number;
  totalEntries: number;
}

export interface DrawRecord {
  id: string;
  title: string;
  draw_date: string;
  scheduled_month: string;
  draw_type: DrawType;
  status: DrawStatus;
  three_match_percentage: number;
  four_match_percentage: number;
  five_match_percentage: number;
  jackpot_rollover_amount: number;
  total_pool?: number;
  three_match_pool?: number;
  four_match_pool?: number;
  five_match_pool?: number;
  drawn_numbers?: number[];
  rolled_over_to_next?: number;
  simulation_data?: SimulationResult;
  charity_id?: string;
  created_at: string;
  updated_at: string;
  entries_count?: number;
}

export interface DrawEntry {
  id: string;
  draw_id: string;
  user_id: string;
  numbers: number[];
  created_at: string;
}

export interface CreateDrawInput {
  title: string;
  draw_date: string;
  scheduled_month: string;
  draw_type?: DrawType;
  three_match_percentage?: number;
  four_match_percentage?: number;
  five_match_percentage?: number;
  jackpot_rollover_amount?: number;
}
