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
  // Dynamic map bounds (updated when map expands)
  private mapWidth: number = MAP_WIDTH;
  private mapHeight: number = MAP_HEIGHT;

  constructor(
    scene: Phaser.Scene,
    mapElements?: MapElements,
    isMobile?: boolean,
  ) {
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
    predatorSpeedMultiplier?: number,
    hasAttractPreyBuff?: boolean,
    shouldHighlightPredators?: boolean,
    hasBubblesActive?: boolean,
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
          predatorSpeedMultiplier,
          hasAttractPreyBuff,
          shouldHighlightPredators,
          hasBubblesActive,
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
    const preyLevels = range.filter((level) => level < playerLevel);
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
    const maxLevel = Math.min(29, playerLevel + 3);

    this.npcs = this.npcs.filter((npc) => {
      if (!npc.active) return false;
      // Boss always stays
      if (npc.level === 99) return true;

      // 플레이어 레벨 30 이상일 때는 북극곰(Lv 29)만 유지
      if (playerLevel >= 30) {
        if (npc.level !== 29) {
          this.npcGroup.remove(npc, true, true);
          npc.destroy();
          return false;
        }
        return true;
      }

      if (npc.level < minLevel || npc.level > maxLevel) {
        // Group에서도 완전히 제거 (유령 NPC 방지)
        this.npcGroup.remove(npc, true, true);
        npc.destroy();
        return false;
      }
      return true;
    });

    // Spawn boss - 레벨 29부터 시작, 레벨 33부터는 레벨당 1마리씩 추가
    if (playerLevel >= 29) {
      const targetBossCount = playerLevel >= 33 ? playerLevel - 32 : 1;
      const currentBossCount = this.npcs.filter(
        (n) => n.level === 99 && n.active,
      ).length;

      if (currentBossCount < targetBossCount) {
        const toSpawn = targetBossCount - currentBossCount;
        for (let i = 0; i < toSpawn; i++) {
          this.spawnNPC(99, playerX, playerY);
        }
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
      const x = margin + Math.random() * (this.mapWidth - margin * 2);
      const y = margin + Math.random() * (this.mapHeight - margin * 2);

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
        this.mapWidth - margin,
      ),
      y: Phaser.Math.Clamp(
        playerY + Math.sin(angle) * dist,
        margin,
        this.mapHeight - margin,
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
      if (
        x < 100 ||
        x > this.mapWidth - 100 ||
        y < 100 ||
        y > this.mapHeight - 100
      ) {
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
      x: Math.min(playerX + 200, this.mapWidth - 100),
      y: Math.max(playerY - 200, 100),
    };
  }

  // 맵 크기 업데이트 (GameScene에서 맵 확장 시 호출)
  updateMapBounds(width: number, height: number) {
    this.mapWidth = width;
    this.mapHeight = height;
    console.log(`[NPCManager] Map bounds updated: ${width}x${height}`);
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
    // 플레이어 레벨 30 이상일 때는 북극곰(Lv 29)만 스폰
    if (playerLevel >= 30) {
      return [29]; // 최종 NPC인 북극곰만
    }

    const minLevel = Math.max(0, playerLevel - 3);
    const maxLevel = Math.min(29, playerLevel + 3);
    const levels: number[] = [];
    for (let i = minLevel; i <= maxLevel; i++) {
      levels.push(i);
    }
    return levels;
  }

  private getTargetCount(npcLevel: number, playerLevel: number): number {
    // 플레이어 레벨 30 이상일 때 북극곰(Lv 29) 개체수 고정
    if (playerLevel >= 30 && npcLevel === 29) {
      return 8; // 북극곰 8마리 고정
    }

    const diff = npcLevel - playerLevel;
    const absDiff = Math.abs(diff);
    let count = 0;

    // 개체수 조절 로직
    // Prey (lower level) gets higher counts than predators
    if (diff < 0) {
      // Edible NPCs - spawn more
      if (absDiff === 1)
        count = 30; // 약한 먹이 NPC는 더 많이 스폰
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

      // Update NPC shadow
      npc.updateShadow();

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

      // const barWidth = Math.max(32, npc.displayWidth * 1.6);
      const barWidth = Math.max(32, npc.displayWidth);
      const barHeight = 4;
      const barX = npc.x - barWidth / 2;
      const barY = npc.y + npc.displayHeight / 2 + 6;

      // Background
      this.barGraphics.fillStyle(0x666666, 1);
      this.barGraphics.fillRoundedRect(barX, barY, barWidth, barHeight, 2);

      // Border
      this.barGraphics.lineStyle(1, 0x333333, 1);
      this.barGraphics.strokeRoundedRect(barX, barY, barWidth, barHeight, 2);

      // Fill
      const fillColor = barState.type === "stun" ? 0x22c55e : 0xef4444;
      this.barGraphics.fillStyle(fillColor, 1);
      this.barGraphics.fillRoundedRect(
        barX,
        barY,
        Math.max(2, barWidth * barState.ratio),
        barHeight,
        2,
      );
    }
  }

  onLevelUp(newLevel: number, playerX: number, playerY: number) {
    this.updateSpawns(newLevel, playerX, playerY);
  }

  // ========================================
  // 스킬 효과 메서드
  // ========================================

  /**
   * 리볼버 스킬 - 플레이어 주변 범위 내 먹이 1마리 반환 (리스트에서 즉시 제거)
   * @param range 탐지 범위 (px)
   * @param playerX 플레이어 X 좌표
   * @param playerY 플레이어 Y 좌표
   * @param playerLevel 플레이어 레벨
   * @returns 사냥할 NPC (없으면 null)
   */
  findNearbyPrey(
    range: number,
    playerX: number,
    playerY: number,
    playerLevel: number,
  ): NPC | null {
    const nearbyPrey = this.npcs.filter((npc) => {
      if (!npc.active || npc.destroyed) return false;
      if (npc.level >= playerLevel) return false;
      const dist = Phaser.Math.Distance.Between(npc.x, npc.y, playerX, playerY);
      return dist <= range;
    });

    if (nearbyPrey.length === 0) return null;

    const target = Phaser.Utils.Array.GetRandom(nearbyPrey);
    if (target) {
      // 리스트에서 제거 (실제 destroy는 호출자가 애니메이션 후 처리)
      this.npcs = this.npcs.filter((n) => n !== target);
      return target;
    }

    return null;
  }

  /**
   * 거미줄 스킬 - 플레이어 근처 먹이 이동 속도 반감
   * @param radius 범위 (px)
   * @param duration 감속 지속 시간 (ms)
   * @returns 감속된 NPC 배열 (시각 효과용)
   */
  freezeNearbyPrey(radius: number, duration: number): NPC[] {
    const player = this.scene.children.getByName("player") as any;
    if (!player) return [];

    const slowUntil = Date.now() + duration;
    const slowedNPCs: NPC[] = [];

    // 플레이어의 현재 레벨 가져오기 (checkLevelUp은 boolean을 반환하므로 store에서 직접 가져옴)
    const playerLevel = useGameStore.getState().level;

    console.log(
      `[NPCManager] Cobweb - searching for prey (player level: ${playerLevel}, total NPCs: ${this.npcs.length})`,
    );

    let nearbyCount = 0;
    let preyCount = 0;

    this.npcs.forEach((npc) => {
      if (!npc.active || npc.destroyed) return;

      // 플레이어 근처인지 확인
      const dist = Phaser.Math.Distance.Between(
        player.x,
        player.y,
        npc.x,
        npc.y,
      );

      if (dist <= radius) {
        nearbyCount++;
        if (npc.level < playerLevel) preyCount++;
      }

      // 범위 내 + 플레이어보다 레벨이 낮은 모든 먹이 (이동 속도 반감)
      if (dist <= radius && npc.level < playerLevel) {
        npc.slowUntil = slowUntil;
        npc.slowMultiplier = 0.5; // 50% 속도로 감속
        npc.addWebOverlay();
        slowedNPCs.push(npc);
        console.log(
          `[NPCManager] Cobweb slowed ${npc.npcData.nameKo} (level ${npc.level}, dist: ${Math.round(dist)}px)`,
        );
      }
    });

    console.log(
      `[NPCManager] Cobweb result - Nearby NPCs: ${nearbyCount}, Prey in range: ${preyCount}, Slowed: ${slowedNPCs.length}`,
    );
    return slowedNPCs;
  }

  /**
   * 번개 스킬 - 모든 NPC 정지
   * @param duration 정지 시간 (ms)
   */
  freezeAllNPCs(duration: number) {
    const freezeUntil = Date.now() + duration;

    this.npcs.forEach((npc) => {
      if (npc.active && !npc.destroyed) {
        npc.stunUntil = freezeUntil;
      }
    });

    console.log(`[NPCManager] Lightning frozen all ${this.npcs.length} NPCs`);
  }

  destroy() {
    for (const npc of this.npcs) {
      if (npc.active) npc.destroy();
    }
    this.npcs = [];
    this.barGraphics?.destroy();
  }
}
