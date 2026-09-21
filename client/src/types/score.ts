export interface ScoreRecord {
  id: string;
  userId: string;
  score: number;
  date: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

export interface CreateScoreInput {
  score: number;
  date: string; // YYYY-MM-DD
}

export interface UpdateScoreInput {
  score?: number;
  date?: string; // YYYY-MM-DD
}

export interface ScoreApiResponse {
  success: boolean;
  message?: string;
  code?: string;
  data?: ScoreRecord | ScoreRecord[];
  scores?: ScoreRecord[];
  existingScoreId?: string;
}
