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
  costume: string | null;
  collected_items: Record<string, number> | null;
  total_accumulated_score: number; // 누적 스코어
  currency: number; // 게임 화폐
  unlocked_skills: string[]; // 언락된 스킬 ID 배열
  purchased_skills: string[]; // 구매한 스킬 ID 배열
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
  costume: string | null;
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
  userUnlockedSkills?: string[]; // 사용자가 언락한 스킬 목록
  userPurchasedSkills?: string[]; // 사용자가 구매한 스킬 목록
  userCurrency?: number; // 사용자의 게임 화폐
}
