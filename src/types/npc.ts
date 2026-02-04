export interface NPCData {
  level: number;
  name: string;
  nameKo: string;
  baseSpeed: number;
  baseSize: number;
  scoreValue: number;
  hungerRestore: number;
  spriteKey: string;
  shadowOffsetY?: number; // 그림자 Y 오프셋 (0~1, 기본값 0.45)
}

export enum NPCState {
  WANDER = "WANDER",
  CHASE = "CHASE",
  FLEE = "FLEE",
  STUNNED = "STUNNED",
}
