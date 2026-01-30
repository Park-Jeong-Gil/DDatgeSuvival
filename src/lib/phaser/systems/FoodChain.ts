export class FoodChain {
  static canEat(playerLevel: number, npcLevel: number): boolean {
    return npcLevel < playerLevel;
  }

  static sameLevel(playerLevel: number, npcLevel: number): boolean {
    return npcLevel === playerLevel;
  }

  static mustFlee(playerLevel: number, npcLevel: number): boolean {
    return npcLevel > playerLevel;
  }

  static isBoss(npcLevel: number): boolean {
    return npcLevel === 99;
  }
}
