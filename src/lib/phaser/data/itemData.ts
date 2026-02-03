import type { ItemData } from "@/types/item";

export const survivalItems: ItemData[] = [
  {
    id: "golden_fruit",
    name: "황금 열매",
    category: "survival",
    effect: "hunger_full",
    duration: 0,
    rarity: "rare",
    spriteKey: "item_golden_fruit",
  },
  {
    id: "satiety_potion",
    name: "포만감 물약",
    category: "survival",
    effect: "hunger_slow",
    duration: 30,
    rarity: "uncommon",
    spriteKey: "item_satiety_potion",
  },
  {
    id: "predator_shield",
    name: "천적 방어막",
    category: "survival",
    effect: "invincible",
    duration: 10,
    rarity: "epic",
    spriteKey: "item_predator_shield",
  },
];

export const buffItems: ItemData[] = [
  {
    id: "wing_feather",
    name: "날개 깃털",
    category: "buff",
    effect: "speed_boost",
    duration: 20,
    rarity: "common",
    spriteKey: "item_wing_feather",
  },
  {
    id: "invisible_cloak",
    name: "투명 망토",
    category: "buff",
    effect: "invisible",
    duration: 15,
    rarity: "rare",
    spriteKey: "item_invisible_cloak",
  },
  {
    id: "giant_power",
    name: "거인의 힘",
    category: "buff",
    effect: "eat_same_level",
    duration: 20,
    rarity: "epic",
    spriteKey: "item_giant_power",
  },
];

export const cosmeticItems: ItemData[] = [
  {
    id: "costume_common",
    name: "코스튬 (일반)",
    category: "cosmetic",
    effect: "costume_change",
    duration: 0,
    rarity: "common",
    spriteKey: "item_costume",
  },
  {
    id: "costume_uncommon",
    name: "코스튬 (고급)",
    category: "cosmetic",
    effect: "costume_change",
    duration: 0,
    rarity: "uncommon",
    spriteKey: "item_costume",
  },
  {
    id: "costume_rare",
    name: "코스튬 (희귀)",
    category: "cosmetic",
    effect: "costume_change",
    duration: 0,
    rarity: "rare",
    spriteKey: "item_costume",
  },
  {
    id: "costume_epic",
    name: "코스튬 (영웅)",
    category: "cosmetic",
    effect: "costume_change",
    duration: 0,
    rarity: "epic",
    spriteKey: "item_costume",
  },
  {
    id: "costume_legendary",
    name: "코스튬 (전설)",
    category: "cosmetic",
    effect: "costume_change",
    duration: 0,
    rarity: "legendary",
    spriteKey: "item_costume",
  },
];

export const allItems: ItemData[] = [
  ...survivalItems,
  ...buffItems,
  ...cosmeticItems,
];

export const rarityWeights: Record<string, number> = {
  common: 60,
  uncommon: 25,
  rare: 12,
  epic: 3,
  legendary: 1,
};

export function getItemById(id: string): ItemData | undefined {
  return allItems.find((item) => item.id === id);
}
