import { useGameStore } from "@/store/gameStore";

export class HungerSystem {
  private accumulatedTime: number = 0;
  private readonly UPDATE_INTERVAL = 1000; // Update every 1 second

  update(delta: number, playerLevel: number, hungerMultiplier: number = 1) {
    this.accumulatedTime += delta;

    if (this.accumulatedTime >= this.UPDATE_INTERVAL) {
      this.accumulatedTime -= this.UPDATE_INTERVAL;

      const store = useGameStore.getState();
      const decreaseRate = (1.5 + playerLevel * 0.6) * hungerMultiplier;
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
