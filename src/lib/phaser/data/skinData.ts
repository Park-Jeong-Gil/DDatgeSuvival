import type { SkinData } from "@/types/item";
import type { Rarity } from "@/types/item";

export const skins: SkinData[] = [
  {
    id: "custom_1",
    name: "기본 땃쥐",
    rarity: "common",
    dropRate: 0,
    spriteKey: "mole_basic_side",
  },
  {
    id: "custom_2",
    name: "황금 땃쥐",
    rarity: "uncommon",
    dropRate: 20,
    spriteKey: "mole_golden_side",
  },
  {
    id: "custom_3",
    name: "무지개 땃쥐",
    rarity: "rare",
    dropRate: 10,
    spriteKey: "mole_rainbow_side",
  },
  {
    id: "custom_4",
    name: "유령 땃쥐",
    rarity: "rare",
    dropRate: 10,
    spriteKey: "mole_ghost_side",
  },
  {
    id: "custom_5",
    name: "로봇 땃쥐",
    rarity: "epic",
    dropRate: 5,
    spriteKey: "mole_robot_side",
  },
  {
    id: "custom_6",
    name: "불꽃 땃쥐",
    rarity: "epic",
    dropRate: 5,
    spriteKey: "mole_fire_side",
  },
  {
    id: "custom_7",
    name: "얼음 땃쥐",
    rarity: "legendary",
    dropRate: 2,
    spriteKey: "mole_ice_side",
  },
  {
    id: "custom_8",
    name: "우주 땃쥐",
    rarity: "legendary",
    dropRate: 1,
    spriteKey: "mole_cosmic_side",
  },
];

// 코스튬 데이터 정의
export interface CostumeData {
  id: string;
  name: string;
  rarity: Rarity;
}

export const costumesData: CostumeData[] = [
  { id: "yellow", name: "노랑 땃쥐", rarity: "common" },
  { id: "blue", name: "파랑 땃쥐", rarity: "common" },
  { id: "pink", name: "분홍 땃쥐", rarity: "common" },
  { id: "green", name: "초록 땃쥐", rarity: "common" },
  { id: "fire", name: "불꽃 땃쥐", rarity: "uncommon" },
  { id: "ice", name: "얼음 땃쥐", rarity: "uncommon" },
  { id: "golden", name: "황금 땃쥐", rarity: "uncommon" },
  { id: "rainbow", name: "무지개 땃쥐", rarity: "uncommon" },
  { id: "fighter", name: "격투가 땃쥐", rarity: "rare" },
  { id: "angel", name: "천사 땃쥐", rarity: "rare" },
  { id: "ghost", name: "유령 땃쥐", rarity: "rare" },
  { id: "pierrot", name: "삐에로 땃쥐", rarity: "epic" },
  { id: "robot", name: "로봇 땃쥐", rarity: "epic" },
  { id: "magic", name: "마법 소녀 땃쥐", rarity: "epic" },
  { id: "cosmic", name: "우주 땃쥐", rarity: "legendary" },
];

export function getCostumeById(costumeId: string): CostumeData | undefined {
  return costumesData.find((c) => c.id === costumeId);
}

// 코스튼별 레어리티 매핑
export const costumesByRarity: Record<Rarity, string[]> = {
  common: ["yellow", "blue", "pink", "green"],
  uncommon: ["fire", "ice", "golden", "rainbow"],
  rare: ["fighter", "angel", "ghost"],
  epic: ["pierrot", "robot", "magic"],
  legendary: ["cosmic"],
};

export function getRandomCostumeByRarity(
  rarity: Rarity,
  currentCostume?: string | null,
): string | null {
  let costumes = costumesByRarity[rarity];
  if (!costumes || costumes.length === 0) return null;

  // 현재 코스튬이 있으면 제외
  if (currentCostume) {
    costumes = costumes.filter((c) => c !== currentCostume);
    // 제외 후 남은 코스튬이 없으면 원본 목록 사용
    if (costumes.length === 0) {
      costumes = costumesByRarity[rarity];
    }
  }

  return costumes[Math.floor(Math.random() * costumes.length)];
}

export function rollSkinDrop(): SkinData | null {
  const roll = Math.random() * 100;
  let cumulative = 0;

  for (const skin of skins) {
    if (skin.dropRate === 0) continue;
    cumulative += skin.dropRate;
    if (roll < cumulative) {
      return skin;
    }
  }

  return null;
}

export function getSkinById(id: string): SkinData | undefined {
  return skins.find((s) => s.id === id);
}
