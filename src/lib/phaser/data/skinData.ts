import type { SkinData } from "@/types/item";

export const skins: SkinData[] = [
  { id: "custom_1", name: "기본 땃쥐", rarity: "common", dropRate: 0, spriteKey: "mole_basic_side" },
  { id: "custom_2", name: "황금 땃쥐", rarity: "uncommon", dropRate: 20, spriteKey: "mole_golden_side" },
  { id: "custom_3", name: "무지개 땃쥐", rarity: "rare", dropRate: 10, spriteKey: "mole_rainbow_side" },
  { id: "custom_4", name: "유령 땃쥐", rarity: "rare", dropRate: 10, spriteKey: "mole_ghost_side" },
  { id: "custom_5", name: "로봇 땃쥐", rarity: "epic", dropRate: 5, spriteKey: "mole_robot_side" },
  { id: "custom_6", name: "불꽃 땃쥐", rarity: "epic", dropRate: 5, spriteKey: "mole_fire_side" },
  { id: "custom_7", name: "얼음 땃쥐", rarity: "legendary", dropRate: 2, spriteKey: "mole_ice_side" },
  { id: "custom_8", name: "우주 땃쥐", rarity: "legendary", dropRate: 1, spriteKey: "mole_cosmic_side" },
];

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
