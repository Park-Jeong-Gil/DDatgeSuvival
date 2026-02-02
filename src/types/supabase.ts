export interface ScoreRecord {
  id: string;
  user_id: string;
  nickname: string;
  score: number;
  max_level: number;
  survival_time: number;
  kills_count: number;
  death_reason: string;
  skin_id: string;
  collected_items: Record<string, number> | null;
  created_at: string;
  updated_at: string;
}

export interface ScoreSubmitRequest {
  userId: string;
  nickname: string;
  score: number;
  maxLevel: number;
  survivalTime: number;
  killsCount: number;
  deathReason: "hunger" | "predator" | "boss";
  skinId: string;
}

export interface ScoreSubmitResponse {
  success: boolean;
  updated: boolean;
  rank: number;
}

export interface LeaderboardResponse {
  scores: ScoreRecord[];
  total: number;
  userRank?: {
    rank: number;
    score: ScoreRecord;
  };
}
