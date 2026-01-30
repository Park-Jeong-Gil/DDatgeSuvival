export type ItemCategory = "survival" | "buff" | "cosmetic";
export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export interface ItemData {
  id: string;
  name: string;
  category: ItemCategory;
  effect: string;
  duration: number;
  rarity: Rarity;
  spriteKey: string;
}

export interface SkinData {
  id: string;
  name: string;
  rarity: Rarity;
  dropRate: number;
  spriteKey: string;
}
