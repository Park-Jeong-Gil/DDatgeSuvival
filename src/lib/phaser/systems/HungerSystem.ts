import { useGameStore } from "@/store/gameStore";

export class HungerSystem {
  private accumulatedTime: number = 0;
  private readonly UPDATE_INTERVAL = 1000; // Update every 1 second

  // 레벨에 따른 최대 HP 계산 (기본 100 + 레벨당 15)
  static getMaxHunger(level: number): number {
    return 100 + (level - 1) * 15;
  }

  update(delta: number, playerLevel: number, hungerMultiplier: number = 1) {
    this.accumulatedTime += delta;

    if (this.accumulatedTime >= this.UPDATE_INTERVAL) {
      this.accumulatedTime -= this.UPDATE_INTERVAL;

      const store = useGameStore.getState();
      // 공식 완화: 1.6 + playerLevel * 0.35 (기존 0.8에서 감소)
      const decreaseRate = (1.6 + playerLevel * 0.5) * hungerMultiplier;
      const newHunger = store.hunger - decreaseRate;

      store.setHunger(newHunger);

      if (newHunger <= 0 && !store.isGameOver) {
        store.setGameOver("hunger");
      }
    }
  }

  restore(amount: number) {
    const store = useGameStore.getState();
    store.setHunger(store.hunger + amount);
  }

  reset() {
    this.accumulatedTime = 0;
    useGameStore.getState().setHunger(100);
  }
}
