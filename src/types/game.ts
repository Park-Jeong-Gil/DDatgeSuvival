export interface GameState {
  score: number;
  level: number;
  hunger: number;
  maxHunger: number;
  survivalTime: number;
  killsCount: number;
  isPlaying: boolean;
  isGameOver: boolean;
  deathReason: "hunger" | "predator" | "boss" | null;
  currentSkinId: string;
  activeBuffs: ActiveBuff[];
  nickname: string;
  npcPositions: NPCPosition[];
  playerPosition: { x: number; y: number };
}

export interface ActiveBuff {
  id: string;
  name: string;
  remainingTime: number;
  duration: number;
}

export interface PlayerStats {
  level: number;
  baseSpeed: number;
  baseSize: number;
}

export interface NPCPosition {
  x: number;
  y: number;
  level: number;
}
