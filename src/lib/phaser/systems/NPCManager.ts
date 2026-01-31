import * as Phaser from "phaser";
import { NPC } from "../entities/NPC";
import { npcDatabase, getNPCDataByLevel } from "../data/npcData";
import { MAP_WIDTH, MAP_HEIGHT, GAME_WIDTH, GAME_HEIGHT } from "../constants";
import { useGameStore } from "@/store/gameStore";
import type { NPCPosition } from "@/types/game";

export class NPCManager {
  private scene: Phaser.Scene;
  npcGroup: Phaser.Physics.Arcade.Group;
  private npcs: NPC[] = [];
  private spawnTimer: number = 0;
  private readonly SPAWN_INTERVAL = 3000;
  private positionUpdateTimer: number = 0;
  private readonly POSITION_UPDATE_INTERVAL = 100; // 10fps for minimap

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.npcGroup = scene.physics.add.group({
      classType: NPC,
      runChildUpdate: false,
    });
  }

  update(
    delta: number,
    playerLevel: number,
    playerSpeed: number,
    playerX: number,
    playerY: number,
    isPlayerInvisible: boolean,
  ) {
    // Spawn check
    this.spawnTimer += delta;
    if (this.spawnTimer >= this.SPAWN_INTERVAL) {
      this.spawnTimer = 0;
      this.updateSpawns(playerLevel, playerX, playerY);
    }

    // Update NPC AI
    for (const npc of this.npcs) {
      if (npc.active) {
        npc.updateAI(
          delta,
          playerX,
          playerY,
          playerLevel,
          playerSpeed,
          isPlayerInvisible,
        );
      }
    }

    // Periodically update positions for minimap
    this.positionUpdateTimer += delta;
    if (this.positionUpdateTimer >= this.POSITION_UPDATE_INTERVAL) {
      this.positionUpdateTimer = 0;
      this.updatePositionsInStore();
    }
  }

  initialSpawn(playerLevel: number, playerX: number, playerY: number) {
    const range = this.getSpawnableRange(playerLevel);
    for (const level of range) {
      const target = this.getTargetCount(level, playerLevel);
      for (let i = 0; i < target; i++) {
        this.spawnNPC(level, playerX, playerY);
      }
    }
  }

  private updateSpawns(playerLevel: number, playerX: number, playerY: number) {
    const range = this.getSpawnableRange(playerLevel);

    // Spawn missing NPCs
    for (const level of range) {
      const current = this.countByLevel(level);
      const target = this.getTargetCount(level, playerLevel);
      if (current < target) {
        const toSpawn = Math.min(target - current, 8); // Max 8 per tick
        for (let i = 0; i < toSpawn; i++) {
          this.spawnNPC(level, playerX, playerY);
        }
      }
    }

    // Despawn out-of-range NPCs
    const minLevel = Math.max(0, playerLevel - 3);
    const maxLevel = Math.min(18, playerLevel + 3);

    this.npcs = this.npcs.filter((npc) => {
      if (!npc.active) return false;
      // Boss always stays
      if (npc.level === 99) return true;
      if (npc.level < minLevel || npc.level > maxLevel) {
        npc.destroy();
        return false;
      }
      return true;
    });

    // Spawn boss if player is level 18
    if (playerLevel >= 18) {
      const hasBoss = this.npcs.some((n) => n.level === 99);
      if (!hasBoss) {
        this.spawnNPC(99, playerX, playerY);
      }
    }
  }

  private spawnNPC(level: number, playerX: number, playerY: number) {
    const data = getNPCDataByLevel(level);
    if (!data) return;

    const pos = this.getSpawnPosition(playerX, playerY);
    const npc = new NPC(this.scene, pos.x, pos.y, data);
    this.npcGroup.add(npc);
    this.npcs.push(npc);
  }

  private getSpawnPosition(
    playerX: number,
    playerY: number,
  ): { x: number; y: number } {
    const margin = 100;
    // Rectangular check matching camera bounds + 100px buffer
    const halfW = GAME_WIDTH / 2 + 100;
    const halfH = GAME_HEIGHT / 2 + 100;

    for (let attempt = 0; attempt < 30; attempt++) {
      const x = margin + Math.random() * (MAP_WIDTH - margin * 2);
      const y = margin + Math.random() * (MAP_HEIGHT - margin * 2);

      // Reject if within camera view + 100px buffer
      if (
        Math.abs(x - playerX) < halfW &&
        Math.abs(y - playerY) < halfH
      ) {
        continue;
      }

      return { x, y };
    }

    // Fallback: guaranteed off-screen spawn
    const angle = Math.random() * Math.PI * 2;
    const dist = 800;
    return {
      x: Phaser.Math.Clamp(
        playerX + Math.cos(angle) * dist,
        margin,
        MAP_WIDTH - margin,
      ),
      y: Phaser.Math.Clamp(
        playerY + Math.sin(angle) * dist,
        margin,
        MAP_HEIGHT - margin,
      ),
    };
  }

  private getSpawnableRange(playerLevel: number): number[] {
    const minLevel = Math.max(0, playerLevel - 3);
    const maxLevel = Math.min(18, playerLevel + 3);
    const levels: number[] = [];
    for (let i = minLevel; i <= maxLevel; i++) {
      levels.push(i);
    }
    return levels;
  }

  private getTargetCount(npcLevel: number, playerLevel: number): number {
    const diff = npcLevel - playerLevel;
    const absDiff = Math.abs(diff);
    // 개체수 조절 로직
    // Prey (lower level) gets higher counts than predators
    if (diff < 0) {
      // Edible NPCs - spawn more
      if (absDiff === 1) return 80;
      if (absDiff === 2) return 50;
      if (absDiff === 3) return 36;
    } else if (diff === 0) {
      // Same level
      return 20;
    } else {
      // Predators - spawn fewer
      if (absDiff === 1) return 6;
      if (absDiff === 2) return 4;
      if (absDiff === 3) return 2;
    }
    return 0;
  }

  private countByLevel(level: number): number {
    return this.npcs.filter((n) => n.active && n.level === level).length;
  }

  removeNPC(npc: NPC) {
    npc.destroy();
    this.npcs = this.npcs.filter((n) => n !== npc);
  }

  private updatePositionsInStore() {
    const positions: NPCPosition[] = [];
    for (const npc of this.npcs) {
      if (npc.active) {
        positions.push({ x: npc.x, y: npc.y, level: npc.level });
      }
    }
    useGameStore.getState().setNpcPositions(positions);
  }

  onLevelUp(newLevel: number, playerX: number, playerY: number) {
    this.updateSpawns(newLevel, playerX, playerY);
  }

  destroy() {
    for (const npc of this.npcs) {
      if (npc.active) npc.destroy();
    }
    this.npcs = [];
  }
}
