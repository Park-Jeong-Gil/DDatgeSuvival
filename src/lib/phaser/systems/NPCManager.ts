import * as Phaser from "phaser";
import { NPC } from "../entities/NPC";
import { getNPCDataByLevel } from "../data/npcData";
import { MAP_WIDTH, MAP_HEIGHT, GAME_WIDTH, GAME_HEIGHT } from "../constants";
import { useGameStore } from "@/store/gameStore";
import type { NPCPosition } from "@/types/game";
import type { MapElements } from "../utils/mapGenerator";

export class NPCManager {
  private scene: Phaser.Scene;
  npcGroup: Phaser.Physics.Arcade.Group;
  private npcs: NPC[] = [];
  private spawnTimer: number = 0;
  private readonly SPAWN_INTERVAL = 3000;
  private positionUpdateTimer: number = 0;
  private readonly POSITION_UPDATE_INTERVAL = 100; // 10fps for minimap
  private isMobile: boolean = false;
  // Cached bush positions + squared radii (avoids iterating StaticGroup every frame)
  private bushData: { x: number; y: number; r2: number }[] = [];
  // Single shared Graphics for all NPC chase/stun bars (saves 1 Graphics per NPC)
  private barGraphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, mapElements?: MapElements, isMobile?: boolean) {
    this.scene = scene;
    this.isMobile = isMobile ?? false;
    this.npcGroup = scene.physics.add.group({
      classType: NPC,
      runChildUpdate: false,
    });

    // Cache bush positions and squared radii at init (bushes are static, never move)
    if (mapElements?.bushes) {
      mapElements.bushes.children.iterate((obj) => {
        const bush = obj as Phaser.Physics.Arcade.Sprite;
        const radius = (bush.displayWidth / 2) * 0.9;
        this.bushData.push({ x: bush.x, y: bush.y, r2: radius * radius });
        return true;
      });
    }

    this.barGraphics = scene.add.graphics();
    this.barGraphics.setDepth(15);
  }

  update(
    delta: number,
    playerLevel: number,
    playerSpeed: number,
    playerX: number,
    playerY: number,
    isPlayerInvisible: boolean,
    isMobile?: boolean,
  ) {
    // Spawn check
    this.spawnTimer += delta;
    if (this.spawnTimer >= this.SPAWN_INTERVAL) {
      this.spawnTimer = 0;
      this.updateSpawns(playerLevel, playerX, playerY);
    }

    // Update NPC AI (pass cached bushData instead of StaticGroup)
    const bushData = this.bushData;
    for (const npc of this.npcs) {
      if (npc.active) {
        npc.updateAI(
          delta,
          playerX,
          playerY,
          playerLevel,
          playerSpeed,
          isPlayerInvisible,
          bushData,
          isMobile,
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
    
    // 먼저 화면 밖에 일반 NPC 생성
    for (const level of range) {
      const target = this.getTargetCount(level, playerLevel);
      for (let i = 0; i < target; i++) {
        this.spawnNPC(level, playerX, playerY);
      }
    }

    // 화면 안에 먹이(플레이어보다 낮은 레벨) 3-5마리 추가 생성
    const preyLevels = range.filter(level => level < playerLevel);
    if (preyLevels.length > 0) {
      const numPreyOnScreen = 3 + Math.floor(Math.random() * 3); // 3-5마리
      for (let i = 0; i < numPreyOnScreen; i++) {
        const level = preyLevels[Math.floor(Math.random() * preyLevels.length)];
        this.spawnNPCOnScreen(level, playerX, playerY);
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
        // Group에서도 완전히 제거 (유령 NPC 방지)
        this.npcGroup.remove(npc, true, true);
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
      if (Math.abs(x - playerX) < halfW && Math.abs(y - playerY) < halfH) {
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

  // 화면 안에 NPC 생성 (먹이 전용)
  private spawnNPCOnScreen(level: number, playerX: number, playerY: number) {
    const data = getNPCDataByLevel(level);
    if (!data) return;

    const pos = this.getOnScreenPosition(playerX, playerY);
    const npc = new NPC(this.scene, pos.x, pos.y, data);
    this.npcGroup.add(npc);
    this.npcs.push(npc);
  }

  // 화면 안의 랜덤 위치 반환 (플레이어와 최소 거리 유지)
  private getOnScreenPosition(
    playerX: number,
    playerY: number,
  ): { x: number; y: number } {
    const minDistFromPlayer = 150; // 플레이어로부터 최소 거리
    const halfW = GAME_WIDTH / 2 - 50; // 화면 가장자리 여유 공간
    const halfH = GAME_HEIGHT / 2 - 50;

    for (let attempt = 0; attempt < 20; attempt++) {
      const offsetX = (Math.random() - 0.5) * halfW * 2;
      const offsetY = (Math.random() - 0.5) * halfH * 2;
      const x = playerX + offsetX;
      const y = playerY + offsetY;

      // 맵 경계 체크
      if (x < 100 || x > MAP_WIDTH - 100 || y < 100 || y > MAP_HEIGHT - 100) {
        continue;
      }

      // 플레이어와 최소 거리 체크
      const distSq = offsetX * offsetX + offsetY * offsetY;
      if (distSq > minDistFromPlayer * minDistFromPlayer) {
        return { x, y };
      }
    }

    // Fallback: 플레이어 오른쪽 위
    return {
      x: Math.min(playerX + 200, MAP_WIDTH - 100),
      y: Math.max(playerY - 200, 100),
    };
  }

  relocateNPC(npc: NPC, playerX: number, playerY: number) {
    if (!npc || !npc.active) return;
    const pos = this.getSpawnPosition(playerX, playerY);
    npc.setPosition(pos.x, pos.y);
    const body = npc.body as Phaser.Physics.Arcade.Body | undefined;
    if (body) {
      body.reset(pos.x, pos.y);
      body.enable = true;
    }
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
    let count = 0;

    // 개체수 조절 로직
    // Prey (lower level) gets higher counts than predators
    if (diff < 0) {
      // Edible NPCs - spawn more
      if (absDiff === 1)
        count = 20; // 약한 먹이 NPC는 더 많이 스폰
      else if (absDiff === 2)
        count = 20; // 중간 먹이 NPC는 적당히 스폰
      else if (absDiff === 3) count = 10; // 강한 먹이 NPC는 덜 스폰

      // 플레이어 레벨 1일 때만 2배 (초반 생존율 향상)
      if (playerLevel === 1) {
        count = Math.round(count * 2);
      } else if (playerLevel >= 3) {
        // 플레이어 레벨 3 이상일 때 15% 감소 (후반 난이도 조정)
        count = Math.round(count * 0.85);
      }
    } else if (diff === 0) {
      // Same level
      count = 20;
    } else {
      // Predators - spawn fewer
      if (absDiff === 1) count = 5;
      else if (absDiff === 2) count = 4;
      else if (absDiff === 3) count = 1;
    }

    return count;
  }

  private countByLevel(level: number): number {
    return this.npcs.filter((n) => n.active && n.level === level).length;
  }

  removeNPC(npc: NPC) {
    // 먼저 모든 상태 비활성화
    npc.active = false;
    npc.destroyed = true;
    npc.visible = false;

    // Physics body 비활성화 (충돌 완전 제거)
    if (npc.body) {
      const body = npc.body as Phaser.Physics.Arcade.Body;
      body.enable = false;

      // Physics world에서 제거
      if (this.scene.physics && this.scene.physics.world) {
        this.scene.physics.world.remove(body);
      }
    }

    // Group에서 완전 제거
    this.npcGroup.remove(npc, true, true);

    // 내부 배열에서도 제거
    this.npcs = this.npcs.filter((n) => n !== npc);

    // 완전히 destroy
    npc.destroy();
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

  /** Draw all NPC chase/stun bars in a single Graphics pass (1 draw call total) */
  drawBars() {
    this.barGraphics.clear();
    const cam = this.scene.cameras.main;
    if (!cam) return;
    const wv = cam.worldView;

    for (const npc of this.npcs) {
      if (!npc.active) continue;
      // Skip off-screen NPCs
      const hw = npc.displayWidth / 2;
      const hh = npc.displayHeight / 2;
      if (
        npc.x + hw < wv.x ||
        npc.x - hw > wv.right ||
        npc.y + hh < wv.y ||
        npc.y - hh > wv.bottom
      )
        continue;

      const barState = npc.getBarState();
      if (!barState) continue;

      const barWidth = Math.max(32, npc.displayWidth * 1.6);
      const barHeight = 4;
      const barX = npc.x - barWidth / 2;
      const barY = npc.y + npc.displayHeight / 2 + 6;

      // Background
      this.barGraphics.fillStyle(0x374151, 1);
      this.barGraphics.fillRect(barX, barY, barWidth, barHeight);

      // Fill (use fillRect instead of fillRoundedRect to reduce vertex count)
      const fillColor = barState.type === "stun" ? 0x22c55e : 0xef4444;
      this.barGraphics.fillStyle(fillColor, 1);
      this.barGraphics.fillRect(
        barX,
        barY,
        Math.max(2, barWidth * barState.ratio),
        barHeight,
      );
    }
  }

  onLevelUp(newLevel: number, playerX: number, playerY: number) {
    this.updateSpawns(newLevel, playerX, playerY);
  }

  destroy() {
    for (const npc of this.npcs) {
      if (npc.active) npc.destroy();
    }
    this.npcs = [];
    this.barGraphics?.destroy();
  }
}
