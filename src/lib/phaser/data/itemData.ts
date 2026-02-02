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

export const allItems: ItemData[] = [...survivalItems, ...buffItems];

export const rarityWeights: Record<string, number> = {
  common: 60,
  uncommon: 25,
  rare: 12,
  epic: 3,
};
