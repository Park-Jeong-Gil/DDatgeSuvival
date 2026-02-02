export interface NPCData {
  level: number;
  name: string;
  nameKo: string;
  baseSpeed: number;
  baseSize: number;
  scoreValue: number;
  hungerRestore: number;
  spriteKey: string;
}

export enum NPCState {
  WANDER = "WANDER",
  CHASE = "CHASE",
  FLEE = "FLEE",
  STUNNED = "STUNNED",
}
