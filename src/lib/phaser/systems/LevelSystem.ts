import { useGameStore } from "@/store/gameStore";
import { EventBus } from "../EventBus";
import type { Player } from "../entities/Player";

export class LevelSystem {
  static getRequiredScore(level: number): number {
    return level * 50 + 25;
  }

  static getTotalScoreForLevel(level: number): number {
    let total = 0;
    for (let l = 1; l < level; l++) {
      total += LevelSystem.getRequiredScore(l);
    }
    return total;
  }

  checkLevelUp(player: Player): boolean {
    const store = useGameStore.getState();
    const currentLevel = store.level;
    const currentScore = store.score;
    const totalRequired = LevelSystem.getTotalScoreForLevel(currentLevel + 1);

    if (currentScore >= totalRequired) {
      const newLevel = currentLevel + 1;
      store.setLevel(newLevel);
      player.updateStats(newLevel);

      EventBus.emit("level-up", { level: newLevel });
      return true;
    }

    return false;
  }
}
