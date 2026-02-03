import * as Phaser from "phaser";
import { Item } from "../entities/Item";
import { allItems, rarityWeights } from "../data/itemData";
import { rollSkinDrop, getRandomCostumeByRarity } from "../data/skinData";
import { MAP_WIDTH, MAP_HEIGHT } from "../constants";
import { useGameStore } from "@/store/gameStore";
import { EventBus } from "../EventBus";
import type { ItemData } from "@/types/item";
import type { ActiveBuff } from "@/types/game";
import type { MapElements } from "../utils/mapGenerator";
import type { Rarity } from "@/types/item";
import type { Player } from "../entities/Player";

export class ItemManager {
  private scene: Phaser.Scene;
  itemGroup: Phaser.Physics.Arcade.Group;
  private items: Item[] = [];
  private spawnTimer: number = 0;
  private readonly SPAWN_INTERVAL = 10000;
  private readonly MAX_ITEMS = 15;
  private mapElements: MapElements;
  private player: Player | null = null;

  // Active buff tracking
  private activeBuffs: Map<
    string,
    { effect: string; remainingTime: number; duration: number }
  > = new Map();

  constructor(scene: Phaser.Scene, mapElements: MapElements) {
    this.scene = scene;
    this.itemGroup = scene.physics.add.group();
    this.mapElements = mapElements;
  }

  setPlayer(player: Player) {
    this.player = player;
  }

  private applyCostumeChange(rarity: Rarity) {
    if (!this.player) return;

    const costumeName = getRandomCostumeByRarity(rarity);
    if (costumeName) {
      this.player.changeCostume(costumeName);
      useGameStore.getState().setCurrentCostume(costumeName);
      EventBus.emit("costume-changed", { costume: costumeName, rarity });
    }
  }

  update(delta: number) {
    // Spawn items
    this.spawnTimer += delta;
    if (this.spawnTimer >= this.SPAWN_INTERVAL) {
      this.spawnTimer = 0;
      if (this.items.length < this.MAX_ITEMS) {
        this.spawnRandomItem();
      }
    }

    // Update existing items (despawn check)
    this.items = this.items.filter((item) => {
      if (!item.active) return false;
      return item.update(0, delta);
    });

    // Update active buffs
    this.updateBuffs(delta);
  }

  collectItem(item: Item) {
    const data = item.itemData;
    this.applyEffect(data);
    EventBus.emit("item-collected", { item: data });

    // Play pickup sound
    EventBus.emit("play-sound", "pickup");

    // 아이템 수집 기록
    useGameStore.getState().addCollectedItem(data);

    item.destroy();
    this.items = this.items.filter((i) => i !== item);
  }

  private applyEffect(data: ItemData) {
    const store = useGameStore.getState();

    switch (data.effect) {
      case "hunger_full":
        store.setHunger(100);
        break;
      case "hunger_slow":
        this.addBuff(data.id, data.effect, data.duration * 1000);
        break;
      case "invincible":
        this.addBuff(data.id, data.effect, data.duration * 1000);
        break;
      case "speed_boost":
        this.addBuff(data.id, data.effect, data.duration * 1000);
        break;
      case "invisible":
        this.addBuff(data.id, data.effect, data.duration * 1000);
        break;
      case "eat_same_level":
        this.addBuff(data.id, data.effect, data.duration * 1000);
        break;
      case "costume_change":
        this.applyCostumeChange(data.rarity);
        break;
    }
  }

  private addBuff(id: string, effect: string, duration: number) {
    this.activeBuffs.set(id, {
      effect,
      remainingTime: duration,
      duration,
    });
    this.syncBuffsToStore();
  }

  private updateBuffs(delta: number) {
    let changed = false;
    for (const [id, buff] of this.activeBuffs) {
      buff.remainingTime -= delta;
      if (buff.remainingTime <= 0) {
        this.activeBuffs.delete(id);
        changed = true;
      } else {
        changed = true;
      }
    }
    if (changed) {
      this.syncBuffsToStore();
    }
  }

  private syncBuffsToStore() {
    const buffs: ActiveBuff[] = [];
    for (const [id, buff] of this.activeBuffs) {
      buffs.push({
        id,
        name: allItems.find((i) => i.id === id)?.name ?? id,
        remainingTime: buff.remainingTime,
        duration: buff.duration,
      });
    }
    useGameStore.getState().setActiveBuffs(buffs);
  }

  hasActiveBuff(effect: string): boolean {
    for (const buff of this.activeBuffs.values()) {
      if (buff.effect === effect && buff.remainingTime > 0) return true;
    }
    return false;
  }

  getSpeedMultiplier(): number {
    return this.hasActiveBuff("speed_boost") ? 1.5 : 1.0;
  }

  isPlayerInvincible(): boolean {
    return this.hasActiveBuff("invincible");
  }

  isPlayerInvisible(): boolean {
    return this.hasActiveBuff("invisible");
  }

  canEatSameLevel(): boolean {
    return this.hasActiveBuff("eat_same_level");
  }

  getHungerDecreaseMultiplier(): number {
    return this.hasActiveBuff("hunger_slow") ? 0.5 : 1.0;
  }

  // NPC kill skin drop (disabled until customization feature is implemented)
  tryDropSkin(_npcLevel: number, _x: number, _y: number) {
    // TODO: Enable when skin customization feature is added
  }

  private spawnRandomItem() {
    const data = this.rollItem();
    if (!data) return;

    const position = this.findValidItemPosition();
    if (!position) return; // 유효한 위치를 찾지 못하면 스킵

    const item = new Item(this.scene, position.x, position.y, data);
    this.itemGroup.add(item);
    this.items.push(item);
  }

  private findValidItemPosition(): { x: number; y: number } | null {
    const margin = 200;
    const minDistanceFromObstacle = 60; // 장애물과 최소 거리

    for (let attempt = 0; attempt < 50; attempt++) {
      const x = margin + Math.random() * (MAP_WIDTH - margin * 2);
      const y = margin + Math.random() * (MAP_HEIGHT - margin * 2);

      // 모든 장애물과의 거리 체크
      let tooClose = false;

      this.mapElements.obstacles.children.iterate((obstacle) => {
        if (obstacle && obstacle instanceof Phaser.GameObjects.Sprite) {
          const distance = Phaser.Math.Distance.Between(
            x,
            y,
            obstacle.x,
            obstacle.y,
          );
          if (distance < minDistanceFromObstacle) {
            tooClose = true;
            return false; // 순회 중단
          }
        }
        return true;
      });

      if (tooClose) continue;

      // 덤불과의 거리 체크 (덤불은 통과 가능하지만 너무 가까우면 안 보임)
      this.mapElements.bushes.children.iterate((bush) => {
        if (bush && bush instanceof Phaser.GameObjects.Sprite) {
          const distance = Phaser.Math.Distance.Between(x, y, bush.x, bush.y);
          if (distance < 40) {
            tooClose = true;
            return false;
          }
        }
        return true;
      });

      if (!tooClose) {
        return { x, y };
      }
    }

    return null; // 50번 시도해도 찾지 못함
  }

  private rollItem(): ItemData | null {
    const totalWeight = Object.values(rarityWeights).reduce((a, b) => a + b, 0);
    let roll = Math.random() * totalWeight;

    for (const [rarity, weight] of Object.entries(rarityWeights)) {
      roll -= weight;
      if (roll <= 0) {
        const candidates = allItems.filter((i) => i.rarity === rarity);
        if (candidates.length === 0) return null;
        return candidates[Math.floor(Math.random() * candidates.length)];
      }
    }

    return null;
  }

  destroy() {
    for (const item of this.items) {
      if (item.active) item.destroy();
    }
    this.items = [];
    this.activeBuffs.clear();
  }
}
