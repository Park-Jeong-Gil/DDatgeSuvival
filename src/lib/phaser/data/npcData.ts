import type { NPCData } from "@/types/npc";

export const npcDatabase: NPCData[] = [
  {
    level: 0,
    name: "Ant",
    nameKo: "개미",
    baseSpeed: 107,
    baseSize: 20, // 플레이어 Lv1(36px)보다 작은 먹이
    scoreValue: 5,
    hungerRestore: 10,
    spriteKey: "npc_0",
  },
  {
    level: 1,
    name: "Horned Caterpillar",
    nameKo: "뿔 송충이",
    baseSpeed: 113,
    baseSize: 28, // 플레이어 Lv0 크기
    scoreValue: 10,
    hungerRestore: 15,
    spriteKey: "npc_1",
    shadowOffsetY: 0.5,
  },
  {
    level: 2,
    name: "Mantis",
    nameKo: "사마귀",
    baseSpeed: 120,
    baseSize: 50, // 플레이어 Lv1 크기
    scoreValue: 15,
    hungerRestore: 20,
    spriteKey: "npc_2",
    shadowOffsetY: 0.5,
  },
  {
    level: 3,
    name: "Spider",
    nameKo: "거미",
    baseSpeed: 127,
    baseSize: 50, // 플레이어 Lv2 크기
    scoreValue: 20,
    hungerRestore: 25,
    spriteKey: "npc_3",
    shadowOffsetY: 0.4,
  },
  {
    level: 4,
    name: "Lizard",
    nameKo: "도마뱀",
    baseSpeed: 133,
    baseSize: 38, // 플레이어 Lv3 크기
    scoreValue: 25,
    // shadowOffsetY: 0.5, // 뱀은 이미지 하단에 투명 여백이 있어서 그림자를 더 아래로
    hungerRestore: 30,
    spriteKey: "npc_4",
  },
  {
    level: 5,
    name: "Sparrow",
    nameKo: "참새",
    baseSpeed: 140,
    baseSize: 45, // 플레이어 Lv4 크기
    scoreValue: 30,
    hungerRestore: 35,
    spriteKey: "npc_5",
    shadowOffsetY: 0.5,
  },
  {
    level: 6,
    name: "Poison Toad",
    nameKo: "독 두꺼비",
    baseSpeed: 147,
    baseSize: 52, // 플레이어 Lv5 크기
    scoreValue: 35,
    hungerRestore: 40,
    spriteKey: "npc_6",
    // shadowOffsetY: 0.55,
  },
  {
    level: 7,
    name: "Snake",
    nameKo: "뱀",
    baseSpeed: 153,
    baseSize: 82, // 플레이어 Lv6 크기
    scoreValue: 40,
    hungerRestore: 45,
    spriteKey: "npc_7",
    shadowOffsetY: 0.26, // 뱀은 긴 몸이라 투명 여백 고려
  },
  {
    level: 8,
    name: "Crow",
    nameKo: "까마귀",
    baseSpeed: 160,
    baseSize: 60, // 플레이어 Lv7 크기
    scoreValue: 45,
    hungerRestore: 50,
    spriteKey: "npc_8",
    shadowOffsetY: 0.5,
  },
  {
    level: 9,
    name: "Cat",
    nameKo: "고양이",
    baseSpeed: 167,
    baseSize: 64, // 플레이어 Lv8 크기
    scoreValue: 50,
    hungerRestore: 55,
    spriteKey: "npc_9",
    shadowOffsetY: 0.5,
  },
  {
    level: 10,
    name: "Weasel",
    nameKo: "족제비",
    baseSpeed: 173,
    baseSize: 58, // 플레이어 Lv9 크기
    scoreValue: 55,
    hungerRestore: 60,
    spriteKey: "npc_10",
    shadowOffsetY: 0.5,
  },
  {
    level: 11,
    name: "Owl",
    nameKo: "부엉이",
    baseSpeed: 180,
    baseSize: 78, // 플레이어 Lv10 크기
    scoreValue: 60,
    hungerRestore: 65,
    spriteKey: "npc_11",
    shadowOffsetY: 0.5,
  },
  {
    level: 12,
    name: "Fox",
    nameKo: "여우",
    baseSpeed: 187,
    baseSize: 60, // 플레이어 Lv11 크기
    scoreValue: 65,
    hungerRestore: 70,
    spriteKey: "npc_12",
  },
  {
    level: 13,
    name: "King Komodo",
    nameKo: "킹 코모도",
    baseSpeed: 193,
    baseSize: 76, // 플레이어 Lv12 크기
    scoreValue: 70,
    hungerRestore: 75,
    spriteKey: "npc_13",
  },
  {
    level: 14,
    name: "Eagle",
    nameKo: "독수리",
    baseSpeed: 200,
    baseSize: 94, // 플레이어 Lv13 크기
    scoreValue: 75,
    hungerRestore: 80,
    spriteKey: "npc_14",
  },
  {
    level: 15,
    name: "Boar",
    nameKo: "멧돼지",
    baseSpeed: 207,
    baseSize: 90, // 플레이어 Lv14 크기
    scoreValue: 80,
    hungerRestore: 85,
    spriteKey: "npc_15",
    shadowOffsetY: 0.5,
  },
  {
    level: 16,
    name: "Wolf",
    nameKo: "늑대",
    baseSpeed: 213,
    baseSize: 95, // 플레이어 Lv15 크기
    scoreValue: 85,
    hungerRestore: 90,
    spriteKey: "npc_16",
    shadowOffsetY: 0.5,
  },
  {
    level: 17,
    name: "Moon Bear",
    nameKo: "반달곰",
    baseSpeed: 220,
    baseSize: 96, // 플레이어 Lv16 크기
    scoreValue: 90,
    hungerRestore: 95,
    spriteKey: "npc_17",
    shadowOffsetY: 0.5,
  },
  {
    level: 18,
    name: "Tiger",
    nameKo: "호랑이",
    baseSpeed: 227,
    baseSize: 100, // 플레이어 Lv17 크기
    scoreValue: 95,
    hungerRestore: 100,
    spriteKey: "npc_18",
    shadowOffsetY: 0.5,
  },
  // Boss
  {
    level: 99,
    name: "Dinosaur",
    nameKo: "공룡",
    baseSpeed: 133,
    baseSize: 180, // 보스, 매우 큼
    scoreValue: 0,
    hungerRestore: 0,
    spriteKey: "npc_99",
    shadowOffsetY: 0.52,
  },
];

export function getNPCDataByLevel(level: number): NPCData | undefined {
  return npcDatabase.find((n) => n.level === level);
}
