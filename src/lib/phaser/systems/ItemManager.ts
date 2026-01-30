import * as Phaser from "phaser";
import { Item } from "../entities/Item";
import { allItems, rarityWeights } from "../data/itemData";
import { rollSkinDrop } from "../data/skinData";
import { MAP_WIDTH, MAP_HEIGHT } from "../constants";
import { useGameStore } from "@/store/gameStore";
import { EventBus } from "../EventBus";
import type { ItemData } from "@/types/item";
import type { ActiveBuff } from "@/types/game";

export class ItemManager {
  private scene: Phaser.Scene;
  itemGroup: Phaser.Physics.Arcade.StaticGroup;
  private items: Item[] = [];
  private spawnTimer: number = 0;
  private readonly SPAWN_INTERVAL = 10000;
  private readonly MAX_ITEMS = 15;

  // Active buff tracking
  private activeBuffs: Map<
    string,
    { effect: string; remainingTime: number; duration: number }
  > = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.itemGroup = scene.physics.add.staticGroup();
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

  // NPC kill skin drop
  tryDropSkin(npcLevel: number, x: number, y: number) {
    const dropChance = npcLevel * 5 + 10;
    if (Math.random() * 100 < dropChance) {
      const skin = rollSkinDrop();
      if (skin) {
        // Apply skin immediately
        useGameStore.getState().setCurrentSkin(skin.id);
        EventBus.emit("skin-acquired", { skin });
      }
    }
  }

  private spawnRandomItem() {
    const data = this.rollItem();
    if (!data) return;

    const margin = 200;
    const x = margin + Math.random() * (MAP_WIDTH - margin * 2);
    const y = margin + Math.random() * (MAP_HEIGHT - margin * 2);

    const item = new Item(this.scene, x, y, data);
    this.itemGroup.add(item);
    this.items.push(item);
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
