import type { NPCData } from "@/types/npc";

export const npcDatabase: NPCData[] = [
  { level: 0, name: "Ant", nameKo: "개미", baseSpeed: 107, baseSize: 32, scoreValue: 5, hungerRestore: 10, spriteKey: "npc_0" },
  { level: 1, name: "Caterpillar", nameKo: "애벌레", baseSpeed: 113, baseSize: 36, scoreValue: 10, hungerRestore: 15, spriteKey: "npc_1" },
  { level: 2, name: "Beetle", nameKo: "딱정벌레", baseSpeed: 120, baseSize: 40, scoreValue: 15, hungerRestore: 20, spriteKey: "npc_2" },
  { level: 3, name: "Spider", nameKo: "거미", baseSpeed: 127, baseSize: 44, scoreValue: 20, hungerRestore: 25, spriteKey: "npc_3" },
  { level: 4, name: "Grasshopper", nameKo: "메뚜기", baseSpeed: 133, baseSize: 48, scoreValue: 25, hungerRestore: 30, spriteKey: "npc_4" },
  { level: 5, name: "Frog", nameKo: "개구리", baseSpeed: 140, baseSize: 52, scoreValue: 30, hungerRestore: 35, spriteKey: "npc_5" },
  { level: 6, name: "Lizard", nameKo: "도마뱀", baseSpeed: 147, baseSize: 56, scoreValue: 35, hungerRestore: 40, spriteKey: "npc_6" },
  { level: 7, name: "Sparrow", nameKo: "뱁새", baseSpeed: 153, baseSize: 60, scoreValue: 40, hungerRestore: 45, spriteKey: "npc_7" },
  { level: 8, name: "Crow", nameKo: "까마귀", baseSpeed: 160, baseSize: 64, scoreValue: 45, hungerRestore: 50, spriteKey: "npc_8" },
  { level: 9, name: "Snake", nameKo: "뱀", baseSpeed: 167, baseSize: 68, scoreValue: 50, hungerRestore: 55, spriteKey: "npc_9" },
  { level: 10, name: "Cat", nameKo: "고양이", baseSpeed: 173, baseSize: 72, scoreValue: 55, hungerRestore: 60, spriteKey: "npc_10" },
  { level: 11, name: "Weasel", nameKo: "족제비", baseSpeed: 180, baseSize: 76, scoreValue: 60, hungerRestore: 65, spriteKey: "npc_11" },
  { level: 12, name: "Heron", nameKo: "왜가리", baseSpeed: 187, baseSize: 80, scoreValue: 65, hungerRestore: 70, spriteKey: "npc_12" },
  { level: 13, name: "Lynx", nameKo: "스라소니", baseSpeed: 193, baseSize: 84, scoreValue: 70, hungerRestore: 75, spriteKey: "npc_13" },
  { level: 14, name: "Falcon", nameKo: "송골매", baseSpeed: 200, baseSize: 88, scoreValue: 75, hungerRestore: 80, spriteKey: "npc_14" },
  { level: 15, name: "Boar", nameKo: "멧돼지", baseSpeed: 207, baseSize: 92, scoreValue: 80, hungerRestore: 85, spriteKey: "npc_15" },
  { level: 16, name: "Wolf", nameKo: "늑대", baseSpeed: 213, baseSize: 96, scoreValue: 85, hungerRestore: 90, spriteKey: "npc_16" },
  { level: 17, name: "Bear", nameKo: "반달곰", baseSpeed: 220, baseSize: 100, scoreValue: 90, hungerRestore: 95, spriteKey: "npc_17" },
  { level: 18, name: "Tiger", nameKo: "호랑이", baseSpeed: 227, baseSize: 104, scoreValue: 95, hungerRestore: 100, spriteKey: "npc_18" },
  // Boss
  { level: 99, name: "Dinosaur", nameKo: "공룡", baseSpeed: 133, baseSize: 256, scoreValue: 0, hungerRestore: 0, spriteKey: "npc_99" },
];

export function getNPCDataByLevel(level: number): NPCData | undefined {
  return npcDatabase.find((n) => n.level === level);
}
