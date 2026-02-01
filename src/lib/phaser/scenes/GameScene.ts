import * as Phaser from "phaser";
import { EventBus } from "../EventBus";
import { Player } from "../entities/Player";
import { NPC } from "../entities/NPC";
import { NPCState } from "@/types/npc";
import { Item } from "../entities/Item";
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  GAME_WIDTH,
  GAME_HEIGHT,
  MOBILE_BREAKPOINT,
  MOBILE_GAME_WIDTH,
  MOBILE_GAME_HEIGHT,
} from "../constants";
import { useGameStore } from "@/store/gameStore";
import { FoodChain } from "../systems/FoodChain";
import { HungerSystem } from "../systems/HungerSystem";
import { LevelSystem } from "../systems/LevelSystem";
import { NPCManager } from "../systems/NPCManager";
import { ItemManager } from "../systems/ItemManager";
import { generateMap, type MapElements } from "../utils/mapGenerator";

export class GameScene extends Phaser.Scene {
  player!: Player;
  cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  private hungerSystem!: HungerSystem;
  private levelSystem!: LevelSystem;
  private npcManager!: NPCManager;
  private itemManager!: ItemManager;
  private mapElements!: MapElements;
  private survivalTimer: number = 0;
  private isGameOver: boolean = false;
  private inBush: boolean = false;
  private invincibleUntil: number = 0;
  private warningGraphics!: Phaser.GameObjects.Graphics;
  private playerLabelText?: Phaser.GameObjects.Text;
  private playerHpGraphics?: Phaser.GameObjects.Graphics;
  private inputReady: boolean = false;
  private isMobile: boolean = false;
  private joystickDirection = { x: 0, y: 0 };
  private onLevelUpHandler = this.onLevelUp.bind(this);
  private onJoystickUpdateHandler = this.onJoystickUpdate.bind(this);

  constructor() {
    super({ key: "GameScene" });
  }

  create() {
    // Reset store
    useGameStore.getState().resetGame();
    this.isGameOver = false;
    this.survivalTimer = 0;

    // Ground
    this.add
      .tileSprite(0, 0, MAP_WIDTH, MAP_HEIGHT, "ground_tile")
      .setOrigin(0, 0)
      .setDepth(0);

    // World bounds
    this.physics.world.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Map obstacles
    this.mapElements = generateMap(this);

    // Player
    this.player = new Player(this, MAP_WIDTH / 2, MAP_HEIGHT / 2);

    this.createPlayerOverlay();

    // Camera (manual centering in update() instead of startFollow
    // to ensure player, overlay, and camera update in the same frame)
    this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    this.cameras.main.centerOn(this.player.x, this.player.y);
    this.updateCameraZoom();

    // Resize handler
    this.scale.on("resize", this.handleResize, this);

    // Start UIScene (조이스틱과 HUD 관리)
    this.scene.launch("UIScene");

    // UIScene의 조이스틱 입력 수신
    EventBus.on("joystick-update", this.onJoystickUpdateHandler, this);

    // Input
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
      this.input.keyboard.addCapture([
        Phaser.Input.Keyboard.KeyCodes.W,
        Phaser.Input.Keyboard.KeyCodes.A,
        Phaser.Input.Keyboard.KeyCodes.S,
        Phaser.Input.Keyboard.KeyCodes.D,
        Phaser.Input.Keyboard.KeyCodes.UP,
        Phaser.Input.Keyboard.KeyCodes.DOWN,
        Phaser.Input.Keyboard.KeyCodes.LEFT,
        Phaser.Input.Keyboard.KeyCodes.RIGHT,
      ]);
    }

    // Ensure canvas has focus for keyboard input
    const canvas = this.game.canvas as HTMLCanvasElement | null;
    if (canvas) {
      canvas.setAttribute("tabindex", "0");
      canvas.focus();
      canvas.addEventListener("pointerdown", () => canvas.focus());
    }

    // Systems
    this.hungerSystem = new HungerSystem();
    this.levelSystem = new LevelSystem();
    this.npcManager = new NPCManager(this);
    this.itemManager = new ItemManager(this, this.mapElements);

    // Initial NPC spawn
    this.npcManager.initialSpawn(1, MAP_WIDTH / 2, MAP_HEIGHT / 2);

    // Collisions
    this.setupCollisions();

    // Listen for level up
    EventBus.on("level-up", this.onLevelUpHandler);

    // Warning indicator (fixed to camera)
    this.warningGraphics = this.add.graphics();
    this.warningGraphics.setScrollFactor(0);
    this.warningGraphics.setDepth(100);

    // Mark playing
    useGameStore.getState().setIsPlaying(true);

    EventBus.emit("current-scene-ready", this);
  }

  private setupCollisions() {
    // Player vs NPC - 물리적 충돌 (동일 레벨일 때만)
    this.physics.add.collider(
      this.player,
      this.npcManager.npcGroup,
      undefined,
      (_playerObj, npcObj) => {
        const npc = npcObj as NPC;
        if (!npc.active || npc.destroyed) return false;

        const playerLevel = this.player.level;
        const npcLevel = npc.level;

        // 동일 레벨인 경우에만 물리적 충돌 발생
        return FoodChain.sameLevel(playerLevel, npcLevel);
      },
    );

    // Player vs NPC - 게임 로직 처리 (먹기/죽기)
    this.physics.add.overlap(
      this.player,
      this.npcManager.npcGroup,
      (_playerObj, npcObj) => {
        if (this.isGameOver) return;
        if (!this.player.active) return;
        const npc = npcObj as NPC;

        // NPC 유효성 체크
        if (!npc.active || npc.destroyed) return;
        if (!npc.body) return;
        const npcBody = npc.body as Phaser.Physics.Arcade.Body;
        if (!npcBody.enable) return;

        // 플레이어가 무적 상태면 무시
        if (
          this.time.now < this.invincibleUntil ||
          this.itemManager.isPlayerInvincible()
        )
          return;
        this.handleNPCCollision(npc);
      },
    );

    // Player vs Items
    this.physics.add.overlap(
      this.player,
      this.itemManager.itemGroup,
      (_playerObj, itemObj) => {
        if (this.isGameOver) return;
        this.itemManager.collectItem(itemObj as Item);
      },
    );

    // Player vs Obstacles
    this.physics.add.collider(this.player, this.mapElements.obstacles);

    // NPC vs Obstacles
    this.physics.add.collider(
      this.npcManager.npcGroup,
      this.mapElements.obstacles,
    );

    // Player vs Bushes (overlap, not collide)
    this.physics.add.overlap(this.player, this.mapElements.bushes, () => {
      this.inBush = true;
    });
  }

  update(time: number, delta: number) {
    if (this.isGameOver || !this.player || !this.player.active) return;

    // Check game over from store
    const store = useGameStore.getState();
    if (store.isGameOver) {
      this.handleGameOver(store.deathReason ?? "hunger");
      return;
    }

    // Reset bush state (re-checked in overlap)
    this.inBush = false;

    // Player movement
    this.ensureInput();
    this.handlePlayerMovement();

    // Systems update
    this.hungerSystem.update(
      delta,
      store.level,
      this.itemManager.getHungerDecreaseMultiplier(),
    );
    this.levelSystem.checkLevelUp(this.player);

    // Re-read level after potential level-up to keep NPC labels in sync
    const currentLevel = useGameStore.getState().level;
    this.npcManager.update(
      delta,
      currentLevel,
      this.player.currentSpeed,
      this.player.x,
      this.player.y,
      this.itemManager.isPlayerInvisible(),
    );
    this.itemManager.update(delta);

    // 플레이어와 겹치는 모든 먹을 수 있는 NPC 동시 처리
    this.checkMultipleNPCEating();

    // Survival time
    this.survivalTimer += delta;
    if (this.survivalTimer >= 1000) {
      this.survivalTimer -= 1000;
      store.setSurvivalTime(store.survivalTime + 1);
    }

    // Manually center camera on player (same frame as overlay positioning)
    this.cameras.main.centerOn(this.player.x, this.player.y);

    // Player label & HP overlay
    this.updatePlayerOverlay();

    // Warning indicators for off-screen predators
    this.updateWarningIndicators();

    // Update store
    store.setPlayerPosition(this.player.x, this.player.y);
    store.setPlayerDisplaySize(
      this.player.displayWidth,
      this.player.displayHeight,
    );
    store.setCameraScroll(
      this.cameras.main.scrollX,
      this.cameras.main.scrollY,
      this.cameras.main.zoom,
    );
  }

  private createPlayerOverlay() {
    this.playerLabelText = this.add.text(this.player.x, this.player.y, "", {
      fontSize: "10px",
      fontFamily: "monospace",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 2,
    });
    this.playerLabelText.setOrigin(0.5, 1);
    this.playerLabelText.setDepth(20);

    this.playerHpGraphics = this.add.graphics();
    this.playerHpGraphics.setDepth(20);
  }

  private updatePlayerOverlay() {
    if (!this.playerLabelText || !this.playerHpGraphics) return;

    const store = useGameStore.getState();
    const nickname = store.nickname || "플레이어";
    const label = `Lv ${store.level} ${nickname}`;

    const labelOffset = this.player.displayHeight / 2 + 8;
    this.playerLabelText.setText(label);
    this.playerLabelText.setPosition(
      this.player.x,
      this.player.y - labelOffset,
    );

    const barWidth = Math.max(32, this.player.displayWidth * 1.6);
    const barHeight = 6;
    const barX = this.player.x - barWidth / 2;
    const barY = this.player.y + this.player.displayHeight / 2 + 6;
    const hungerRatio = Phaser.Math.Clamp(store.hunger / store.maxHunger, 0, 1);

    const getColor = () => {
      if (store.hunger >= 80) return 0x22c55e;
      if (store.hunger >= 40) return 0xfacc15;
      if (store.hunger >= 20) return 0xf97316;
      return 0xef4444;
    };

    this.playerHpGraphics.clear();
    this.playerHpGraphics.fillStyle(0x374151, 1);
    this.playerHpGraphics.fillRoundedRect(barX, barY, barWidth, barHeight, 3);
    this.playerHpGraphics.fillStyle(getColor(), 1);
    this.playerHpGraphics.fillRoundedRect(
      barX,
      barY,
      Math.max(2, barWidth * hungerRatio),
      barHeight,
      3,
    );
    this.playerHpGraphics.lineStyle(1, 0x4b5563, 1);
    this.playerHpGraphics.strokeRoundedRect(barX, barY, barWidth, barHeight, 3);
  }

  private updateWarningIndicators() {
    this.warningGraphics.clear();

    const cam = this.cameras.main;
    const bounds = cam.worldView;
    const margin = 30; // 화면 가장자리에서 표시할 여백
    const screenW = this.scale.width;
    const screenH = this.scale.height;
    const screenCX = screenW / 2;
    const screenCY = screenH / 2;

    this.npcManager.npcGroup.children.iterate((obj) => {
      const npc = obj as NPC;
      if (!npc.active || npc.destroyed) return true;
      if (npc.aiState !== NPCState.CHASE) return true;

      // 화면 안에 이미 보이면 표시 안 함
      if (
        npc.x >= bounds.x &&
        npc.x <= bounds.right &&
        npc.y >= bounds.y &&
        npc.y <= bounds.bottom
      ) {
        return true;
      }

      // 플레이어 → NPC 방향 계산
      const dx = npc.x - this.player.x;
      const dy = npc.y - this.player.y;
      const angle = Math.atan2(dy, dx);

      // 화면 가장자리에 위치 계산 (screen 좌표계)
      const halfW = screenW / 2 - margin;
      const halfH = screenH / 2 - margin;

      let edgeX: number, edgeY: number;
      const absCos = Math.abs(Math.cos(angle));
      const absSin = Math.abs(Math.sin(angle));

      if (absCos * halfH > absSin * halfW) {
        // 좌우 가장자리
        edgeX = screenCX + Math.sign(Math.cos(angle)) * halfW;
        edgeY = screenCY + Math.tan(angle) * Math.sign(Math.cos(angle)) * halfW;
      } else {
        // 상하 가장자리
        edgeX =
          screenCX +
          (Math.cos(angle) / Math.sin(angle)) *
            Math.sign(Math.sin(angle)) *
            halfH;
        edgeY = screenCY + Math.sign(Math.sin(angle)) * halfH;
      }

      // Clamp
      edgeX = Phaser.Math.Clamp(edgeX, margin, screenW - margin);
      edgeY = Phaser.Math.Clamp(edgeY, margin, screenH - margin);

      // 빨간 삼각형 화살표 그리기
      const arrowSize = 12;
      this.warningGraphics.fillStyle(0xff0000, 0.9);
      this.warningGraphics.beginPath();
      this.warningGraphics.moveTo(
        edgeX + Math.cos(angle) * arrowSize,
        edgeY + Math.sin(angle) * arrowSize,
      );
      this.warningGraphics.lineTo(
        edgeX + Math.cos(angle + 2.4) * arrowSize,
        edgeY + Math.sin(angle + 2.4) * arrowSize,
      );
      this.warningGraphics.lineTo(
        edgeX + Math.cos(angle - 2.4) * arrowSize,
        edgeY + Math.sin(angle - 2.4) * arrowSize,
      );
      this.warningGraphics.closePath();
      this.warningGraphics.fillPath();

      // 경고 원 (깜빡임 효과)
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 200);
      this.warningGraphics.fillStyle(0xff0000, pulse * 0.4);
      this.warningGraphics.fillCircle(edgeX, edgeY, arrowSize + 4);

      return true;
    });
  }

  private handlePlayerMovement() {
    let speedMultiplier = this.itemManager.getSpeedMultiplier();
    if (this.inBush) speedMultiplier *= 0.5;

    const speed = this.player.currentSpeed * speedMultiplier;
    let vx = 0;
    let vy = 0;

    // Joystick input (UIScene에서 전달받음)
    vx = this.joystickDirection.x;
    vy = this.joystickDirection.y;

    // Keyboard input (overrides joystick if pressed)
    if (this.cursors) {
      let kx = 0;
      let ky = 0;
      if (this.cursors.left.isDown || this.wasd.A.isDown) kx = -1;
      else if (this.cursors.right.isDown || this.wasd.D.isDown) kx = 1;

      if (this.cursors.up.isDown || this.wasd.W.isDown) ky = -1;
      else if (this.cursors.down.isDown || this.wasd.S.isDown) ky = 1;

      if (kx !== 0 || ky !== 0) {
        vx = kx;
        vy = ky;
        if (vx !== 0 && vy !== 0) {
          const factor = Math.SQRT1_2;
          vx *= factor;
          vy *= factor;
        }
      }
    }

    this.player.setVelocity(vx * speed, vy * speed);

    if (vx < 0) this.player.setFlipX(true);
    else if (vx > 0) this.player.setFlipX(false);
  }

  private ensureInput() {
    if (!this.input.keyboard) return;
    if (!this.input.enabled) this.input.enabled = true;
    if (!this.input.keyboard.enabled) this.input.keyboard.enabled = true;
    if (!this.cursors) {
      this.cursors = this.input.keyboard.createCursorKeys();
    }
    if (!this.wasd) {
      this.wasd = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }

    if (!this.inputReady) {
      this.input.keyboard.addCapture([
        Phaser.Input.Keyboard.KeyCodes.W,
        Phaser.Input.Keyboard.KeyCodes.A,
        Phaser.Input.Keyboard.KeyCodes.S,
        Phaser.Input.Keyboard.KeyCodes.D,
        Phaser.Input.Keyboard.KeyCodes.UP,
        Phaser.Input.Keyboard.KeyCodes.DOWN,
        Phaser.Input.Keyboard.KeyCodes.LEFT,
        Phaser.Input.Keyboard.KeyCodes.RIGHT,
      ]);
      this.input.keyboard.resetKeys();
      this.inputReady = true;
    }
  }

  private handleNPCCollision(npc: NPC) {
    if (!npc.active || npc.destroyed) return;
    if (!npc.body) return;
    const body = npc.body as Phaser.Physics.Arcade.Body;
    if (!body.enable) return;

    const playerLevel = this.player.level;
    const npcLevel = npc.level;

    if (FoodChain.isBoss(npcLevel)) {
      this.handleGameOver("boss");
      return;
    }

    if (
      FoodChain.canEat(playerLevel, npcLevel) ||
      (FoodChain.sameLevel(playerLevel, npcLevel) &&
        this.itemManager.canEatSameLevel())
    ) {
      this.handleEat(npc);
    } else if (FoodChain.sameLevel(playerLevel, npcLevel)) {
      // 같은 레벨은 장애물처럼 단순 충돌만 처리 (넉백 없음)
      return;
    } else if (FoodChain.mustFlee(playerLevel, npcLevel)) {
      // 플레이어가 무적 상태면 포식자 5초 정지
      if (this.itemManager.isPlayerInvincible()) {
        npc.stunUntil = Date.now() + 5000;
        return;
      }
      if (this.time.now < this.invincibleUntil) return;

      // 화면에 렌더링되지 않은 포식자와의 충돌은 무시 (유령 포식자 방지)
      const cam = this.cameras.main;
      if (
        !npc.isRenderableInCamera(cam) ||
        !npc.wasRecentlyVisible(this.time.now) ||
        !npc.isNameLabelVisible()
      ) {
        npc.recoverRenderState();
        this.npcManager.relocateNPC(npc, this.player.x, this.player.y);
        return;
      }

      // 포식자가 CHASE 상태가 아닌 경우 (배회 중 우연히 접촉):
      // 즉사가 아닌 경고 처리 - NPC를 CHASE로 전환 + 플레이어 넉백
      // 이렇게 하면 플레이어는 반드시 "추격!" 표시를 본 후에만 게임오버
      if (!npc.isChasing()) {
        npc.aiState = NPCState.CHASE;
        npc.setDepth(12);
        this.handleKnockback(npc);
        return;
      }

      // CHASE 상태인 포식자만 게임오버 판정
      const predatorName = npc.getNameLabelText();
      this.handleGameOver("predator", predatorName);
    }
  }

  private checkMultipleNPCEating() {
    if (this.isGameOver || !this.player.active) return;

    // 무적 상태 체크
    const isInvincible =
      this.time.now < this.invincibleUntil ||
      this.itemManager.isPlayerInvincible();

    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    if (!playerBody) return;

    const eatableNPCs: NPC[] = [];
    const playerLevel = useGameStore.getState().level;

    // 모든 NPC를 순회하며 먹을 수 있는 것들만 수집
    this.npcManager.npcGroup.children.iterate((npcObj) => {
      const npc = npcObj as NPC;
      if (!npc.active || npc.destroyed || !npc.body) return true;

      const npcBody = npc.body as Phaser.Physics.Arcade.Body;
      if (!npcBody.enable) return true;

      // Phaser의 overlap 함수로 정확한 충돌 검사
      const overlaps = this.physics.overlap(this.player, npc);
      if (!overlaps) return true;

      // 먹을 수 있는지 체크
      const canEat =
        FoodChain.canEat(playerLevel, npc.level) ||
        (FoodChain.sameLevel(playerLevel, npc.level) &&
          this.itemManager.canEatSameLevel());

      if (canEat) {
        eatableNPCs.push(npc);
      }

      return true;
    });

    // 먹을 수 있는 NPC들을 모두 동시에 처리
    if (eatableNPCs.length > 0) {
      eatableNPCs.forEach((npc) => {
        this.handleEat(npc);
      });
    }
  }

  private handleEat(npc: NPC) {
    // NPCManager의 완전한 제거 메서드 사용
    this.npcManager.removeNPC(npc);

    const store = useGameStore.getState();

    // Score
    store.addScore(npc.scoreValue);

    // Hunger restore - 레벨 차이에 따른 회복량 조정
    const playerLevel = this.player.level;
    const levelDiff = playerLevel - npc.level;
    let hungerRestoreAmount = npc.hungerRestore;

    if (levelDiff > 0) {
      // 플레이어가 더 높음 (레벨 낮은 먹이) - 회복량 감소
      hungerRestoreAmount =
        npc.hungerRestore * Math.max(0.3, 1 - levelDiff * 0.15);
    } else if (levelDiff < 0) {
      // 먹이가 더 높음 (레벨 높은 먹이) - 회복량 감소
      hungerRestoreAmount =
        npc.hungerRestore * Math.max(0.4, 1 + levelDiff * 0.1);
    }
    // levelDiff === 0 (같은 레벨) - 기본 회복량 유지

    this.hungerSystem.restore(hungerRestoreAmount);

    // Kill count
    store.incrementKills();

    // Try skin drop
    this.itemManager.tryDropSkin(npc.level, npc.x, npc.y);

    // 무적 시간 증가 (200ms → 500ms)
    this.invincibleUntil = this.time.now + 500;

    // Visual feedback (효과 감소: 100ms → 50ms, 0.005 → 0.002)
    this.cameras.main.shake(50, 0.002);

    EventBus.emit("npc-eaten", {
      npcLevel: npc.level,
      score: npc.scoreValue,
    });
  }

  private handleKnockback(npc: NPC) {
    const angle = Phaser.Math.Angle.Between(
      npc.x,
      npc.y,
      this.player.x,
      this.player.y,
    );
    const knockbackForce = 600; // 2배 증가

    this.player.setVelocity(
      Math.cos(angle) * knockbackForce,
      Math.sin(angle) * knockbackForce,
    );

    npc.setVelocity(
      -Math.cos(angle) * knockbackForce,
      -Math.sin(angle) * knockbackForce,
    );

    // Invincibility during knockback (400ms)
    this.invincibleUntil = this.time.now + 400;

    // Reset velocity after short delay
    this.time.delayedCall(300, () => {
      if (this.player.active) {
        this.player.setVelocity(0, 0);
      }
    });
  }

  private handleGameOver(
    reason: "hunger" | "predator" | "boss",
    predatorName?: string,
  ) {
    if (this.isGameOver) return;
    this.isGameOver = true;

    useGameStore.getState().setGameOver(reason, predatorName);
    EventBus.emit("game-over", { reason, predatorName });

    // Freeze player
    this.player.setVelocity(0, 0);
    this.player.setTint(0xff0000);

    // Freeze all NPCs
    if (this.npcManager && this.npcManager.npcGroup) {
      this.npcManager.npcGroup.children.iterate((npcObj) => {
        if (
          npcObj instanceof NPC &&
          npcObj.body &&
          npcObj.active &&
          typeof npcObj.setVelocity === "function"
        ) {
          npcObj.setVelocity(0, 0);
        }
        return null; // 타입 에러 해결
      });
    }

    // Camera effect (fadeOut 제거)
    this.cameras.main.shake(500, 0.02);
    // this.cameras.main.fadeOut(1000, 0, 0, 0); // 제거
  }

  private onLevelUp(...args: unknown[]) {
    const data = args[0] as { level: number };

    if (!this.hungerSystem) return;
    if (!this.cameras || !this.cameras.main) return;

    // HP 30% 회복
    const maxHunger = 100;
    const currentHunger = useGameStore.getState().hunger;
    const healAmount = maxHunger * 0.3;
    this.hungerSystem.restore(healAmount);

    // Camera shake
    this.cameras.main.shake(200, 0.01);

    // Flash effect
    this.cameras.main.flash(500, 255, 255, 100);

    // Update NPC spawns
    this.npcManager.onLevelUp(data.level, this.player.x, this.player.y);
  }

  private updateCameraZoom() {
    const screenW = this.scale.width;
    const screenH = this.scale.height;
    this.isMobile = screenW <= MOBILE_BREAKPOINT;

    const baseW = this.isMobile ? MOBILE_GAME_WIDTH : GAME_WIDTH;
    const baseH = this.isMobile ? MOBILE_GAME_HEIGHT : GAME_HEIGHT;

    const zoomX = screenW / baseW;
    const zoomY = screenH / baseH;
    this.cameras.main.setZoom(Math.min(zoomX, zoomY));
  }

  private handleResize() {
    this.updateCameraZoom();
  }

  shutdown() {
    this.scale.off("resize", this.handleResize, this);
    EventBus.off("level-up", this.onLevelUpHandler);
    EventBus.off("joystick-update", this.onJoystickUpdateHandler, this);
    this.npcManager.destroy();
    this.itemManager.destroy();
  }

  private onJoystickUpdate(...args: unknown[]) {
    const direction = args[0] as { x: number; y: number };
    this.joystickDirection = direction;
  }
}
