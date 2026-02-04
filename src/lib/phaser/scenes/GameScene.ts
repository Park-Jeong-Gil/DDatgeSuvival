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
  DEBUG_START_LEVEL,
} from "../constants";
import { useGameStore } from "@/store/gameStore";
import { useAudioStore } from "@/store/audioStore";
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
  private warningUpdateTimer: number = 0;
  private storeUpdateTimer: number = 0;
  private onLevelUpHandler = this.onLevelUp.bind(this);
  private onJoystickUpdateHandler = this.onJoystickUpdate.bind(this);
  private onPostUpdateHandler = this.onPostUpdate.bind(this);
  private onPauseGameHandler = this.onPauseGame.bind(this);
  private onResumeGameHandler = this.onResumeGame.bind(this);
  private onAudioSettingsChangedHandler = (...args: unknown[]) => {
    const settings = args[0] as {
      bgmVolume: number;
      sfxVolume: number;
      bgmMuted: boolean;
      sfxMuted: boolean;
    };
    this.applyAudioSettings(settings);
  };
  private bgm?: Phaser.Sound.BaseSound;
  private biteSound?: Phaser.Sound.BaseSound;
  private deathSound?: Phaser.Sound.BaseSound;
  private levelupSound?: Phaser.Sound.BaseSound;
  private pickupSound?: Phaser.Sound.BaseSound;

  constructor() {
    super({ key: "GameScene" });
  }

  create() {
    // Reset store
    useGameStore.getState().resetGame();
    this.isGameOver = false;
    this.survivalTimer = 0;

    // Debug: 시작 레벨 설정
    if (DEBUG_START_LEVEL > 1) {
      const store = useGameStore.getState();
      store.setLevel(DEBUG_START_LEVEL);
      // 해당 레벨에 필요한 총 점수를 설정
      const requiredScore =
        LevelSystem.getTotalScoreForLevel(DEBUG_START_LEVEL);
      store.setScore(requiredScore);
      console.log(
        `[DEBUG] Starting at level ${DEBUG_START_LEVEL} with score ${requiredScore}`,
      );
    }

    // Background - 기본 배경 타일 (4배 작게 보이도록 스케일 조정)
    this.add
      .tileSprite(0, 0, MAP_WIDTH, MAP_HEIGHT, "base_background")
      .setOrigin(0, 0)
      .setDepth(0)
      .setTileScale(0.28, 0.28);

    // World bounds
    this.physics.world.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Map obstacles
    this.mapElements = generateMap(this);

    // Debug: 디버그 모드에서 시작 레벨에 맞게 장애물 제거
    if (DEBUG_START_LEVEL >= 2) {
      // 레벨 2, 4, 6, 8... 마다 장애물이 제거되므로, 해당 횟수만큼 제거
      const removalCount = Math.floor(DEBUG_START_LEVEL / 2);
      console.log(
        `[DEBUG] Removing obstacles for level ${DEBUG_START_LEVEL} (${removalCount} times)`,
      );

      // 장애물 제거는 시간차를 두고 실행 (물리 엔진 초기화 후)
      this.time.delayedCall(100, () => {
        for (let i = 1; i <= removalCount; i++) {
          this.removeCloseObstacles(i * 2);
        }
      });
    }

    // Player
    this.player = new Player(this, MAP_WIDTH / 2, MAP_HEIGHT / 2);

    // Debug: 디버그 레벨에 맞게 Player 크기 업데이트
    if (DEBUG_START_LEVEL > 1) {
      this.player.updateStats(DEBUG_START_LEVEL);
    }

    this.createPlayerOverlay();

    // Camera
    this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 1, 1);
    this.cameras.main.setRoundPixels(false);
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
    this.npcManager = new NPCManager(this, this.mapElements, this.isMobile);
    this.itemManager = new ItemManager(this, this.mapElements);
    this.itemManager.setPlayer(this.player);

    // Initial NPC spawn - 디버그 레벨에 맞게 스폰
    const startLevel = DEBUG_START_LEVEL;
    this.npcManager.initialSpawn(startLevel, MAP_WIDTH / 2, MAP_HEIGHT / 2);

    // Collisions
    this.setupCollisions();

    // 물리 스텝 이후 오버레이 위치 갱신 (카메라 startFollow와 동기화)
    this.events.on("postupdate", this.onPostUpdateHandler);

    // Listen for level up
    EventBus.on("level-up", this.onLevelUpHandler);

    // Warning indicator (fixed to camera)
    this.warningGraphics = this.add.graphics();
    this.warningGraphics.setScrollFactor(0);
    this.warningGraphics.setDepth(100);

    // Initialize sounds
    this.initializeSounds();

    // Mark playing after first frame renders
    this.time.delayedCall(100, () => {
      useGameStore.getState().setIsPlaying(true);
    });

    EventBus.on("pause-game", this.onPauseGameHandler);
    EventBus.on("resume-game", this.onResumeGameHandler);

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

        this.handleNPCCollision(npc);
      },
    );

    // Player vs Items - overlap으로 감지
    this.physics.add.overlap(
      this.player,
      this.itemManager.itemGroup,
      (_playerObj, itemObj) => {
        if (this.isGameOver) return;
        const item = itemObj as Item;

        // 유효성 검사 강화
        if (!item || !item.active) return;
        if (!item.body || !(item.body as Phaser.Physics.Arcade.Body).enable)
          return;
        // 이미 수집 중인지 확인
        if ((item as any).isCollecting) return;

        this.itemManager.collectItem(item);
      },
    );

    // Player vs Obstacles
    this.physics.add.collider(this.player, this.mapElements.obstacles);

    // NPC vs Obstacles
    this.physics.add.collider(
      this.npcManager.npcGroup,
      this.mapElements.obstacles,
    );

    // Player vs Bushes - 플레이어는 속도 감소 없음 (NPC 추격 감속에만 사용)
  }

  update(time: number, delta: number) {
    if (this.isGameOver || !this.player || !this.player.active) return;

    // Check game over from store
    const store = useGameStore.getState();
    if (store.isGameOver) {
      this.handleGameOver(store.deathReason ?? "hunger");
      return;
    }

    // Reset bush state (no longer used for player)

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
      this.isMobile,
    );
    this.npcManager.drawBars();
    this.itemManager.update(delta);

    // Update player alpha based on invisible buff
    if (this.itemManager.isPlayerInvisible()) {
      this.player.setAlpha(0.5);
    } else {
      this.player.setAlpha(1.0);
    }

    // Survival time
    this.survivalTimer += delta;
    if (this.survivalTimer >= 1000) {
      this.survivalTimer -= 1000;
      store.setSurvivalTime(store.survivalTime + 1);
    }

    // Warning indicators - throttle to ~10fps (every 100ms)
    this.warningUpdateTimer += delta;
    if (this.warningUpdateTimer >= 100) {
      this.warningUpdateTimer = 0;
      this.updateWarningIndicators();
    }

    // Store updates - throttle to ~10fps (every 100ms, avoids React re-render per frame)
    this.storeUpdateTimer += delta;
    if (this.storeUpdateTimer >= 100) {
      this.storeUpdateTimer = 0;
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
  }

  private createPlayerOverlay() {
    // Check mobile status directly based on screen width
    const isMobile = this.scale.width <= MOBILE_BREAKPOINT;
    const labelFontSize = isMobile ? "20px" : "12px";
    this.playerLabelText = this.add.text(this.player.x, this.player.y, "", {
      fontSize: labelFontSize,
      fontFamily: "Mulmaru",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 2,
    });
    this.playerLabelText.setOrigin(0.5, 1);
    this.playerLabelText.setDepth(20);

    this.playerHpGraphics = this.add.graphics();
    this.playerHpGraphics.setDepth(20);
  }

  private updatePlayerOverlay(px: number, py: number) {
    if (!this.playerLabelText || !this.playerHpGraphics) return;

    const store = useGameStore.getState();
    const nickname = store.nickname || "플레이어";
    const label = `Lv${store.level} ${nickname}`;

    const labelOffset = Math.round(this.player.displayHeight / 2 + 8);
    this.playerLabelText.setText(label);
    this.playerLabelText.setPosition(px, py - labelOffset);

    const barWidth = Math.max(32, Math.round(this.player.displayWidth * 1.6));
    const barHeight = 6;
    const barX = px - barWidth / 2;
    const barY = py + Math.round(this.player.displayHeight / 2 + 6);
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
    // 뷰포트 크기 사용 (모바일에서 상단 75%만 게임 영역)
    const screenW = cam.width;
    const screenH = cam.height;
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
    // 플레이어는 풀숲에서 속도 감소 없음

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

    // 기본 스프라이트가 왼쪽(←)을 바라봄 → 오른쪽 이동 시 반전
    if (vx > 0) this.player.setFlipX(true);
    else if (vx < 0) this.player.setFlipX(false);

    // 이동 상태에 따라 스프라이트 전환 (eat 상태가 아닐 때만)
    if (this.player.getPlayerState() !== "eat") {
      if (vx !== 0 || vy !== 0) {
        this.player.setPlayerState("run");
      } else {
        this.player.setPlayerState("idle");
      }
    }
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

  private getOverlapRatio(npc: NPC): number {
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    const npcBody = npc.body as Phaser.Physics.Arcade.Body;
    if (!playerBody || !npcBody) return 0;

    const overlapX = Math.max(
      0,
      Math.min(playerBody.right, npcBody.right) -
        Math.max(playerBody.left, npcBody.left),
    );
    const overlapY = Math.max(
      0,
      Math.min(playerBody.bottom, npcBody.bottom) -
        Math.max(playerBody.top, npcBody.top),
    );
    const playerArea = playerBody.width * playerBody.height;
    if (playerArea <= 0) return 0;

    return (overlapX * overlapY) / playerArea;
  }

  private getItemOverlapRatio(item: Item): number {
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    const itemBody = item.body as Phaser.Physics.Arcade.Body;
    if (!playerBody || !itemBody) return 0;

    const overlapX = Math.max(
      0,
      Math.min(playerBody.right, itemBody.right) -
        Math.max(playerBody.left, itemBody.left),
    );
    const overlapY = Math.max(
      0,
      Math.min(playerBody.bottom, itemBody.bottom) -
        Math.max(playerBody.top, itemBody.top),
    );
    const playerArea = playerBody.width * playerBody.height;
    if (playerArea <= 0) return 0;

    return (overlapX * overlapY) / playerArea;
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

    // 먹을 수 있는 대상인지 확인
    const canEatNPC =
      FoodChain.canEat(playerLevel, npcLevel) ||
      (FoodChain.sameLevel(playerLevel, npcLevel) &&
        this.itemManager.canEatSameLevel());

    if (canEatNPC) {
      this.handleEat(npc);
    } else if (FoodChain.sameLevel(playerLevel, npcLevel)) {
      // 같은 레벨은 장애물처럼 단순 충돌만 처리 (넉백 없음)
      return;
    } else if (FoodChain.mustFlee(playerLevel, npcLevel)) {
      // 플레이어가 무적 상태면 포식자 즉시 기절
      if (this.itemManager.isPlayerInvincible()) {
        npc.stunUntil = Date.now() + 10000;
        npc.aiState = NPCState.STUNNED;
        npc.setTint(0x888888);
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
      if (!npc.isChasing()) {
        npc.aiState = NPCState.CHASE;
        npc.setDepth(12);
        this.handleKnockback(npc);
        return;
      }

      // CHASE 상태인 포식자는 즉시 게임오버
      const predatorName = npc.getNameLabelText();
      this.handleGameOver("predator", predatorName);
    }
  }

  private handleEat(npc: NPC) {
    // 먹기 애니메이션
    this.player.playEatAnimation();

    // Play bite sound
    this.playSound("bite");

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

    // Stop BGM and play death sound
    this.stopBGM();
    this.playSound("death");

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

    // Play levelup sound
    this.playSound("levelup");

    if (!this.hungerSystem) return;
    if (!this.cameras || !this.cameras.main) return;

    // HP 30% 회복 (레벨에 따른 최대 HP 기준)
    const store = useGameStore.getState();
    const maxHunger = store.maxHunger;
    const healAmount = maxHunger * 0.3;
    this.hungerSystem.restore(healAmount);

    // Camera shake
    this.cameras.main.shake(200, 0.01);

    // Flash effect
    this.cameras.main.flash(500, 255, 255, 100);

    // Update NPC spawns
    this.npcManager.onLevelUp(data.level, this.player.x, this.player.y);

    // 레벨 20 이상: 모든 장애물 제거
    if (data.level >= 20) {
      this.removeAllObstacles();
    }
    // 레벨이 2의 배수일 때 가까운 장애물 제거
    else if (data.level % 2 === 0) {
      this.removeCloseObstacles(data.level);
    }
  }

  // 모든 장애물 제거 (레벨 20 이상)
  private removeAllObstacles() {
    if (!this.mapElements || !this.mapElements.obstacles) return;

    const obstacles =
      this.mapElements.obstacles.getChildren() as Phaser.Physics.Arcade.Sprite[];
    if (obstacles.length === 0) return;

    console.log(`[Level 20+] Removing all ${obstacles.length} obstacles`);

    obstacles.forEach((obstacle) => {
      if (obstacle.active) {
        this.tweens.add({
          targets: obstacle,
          alpha: 0,
          scale: 0.5,
          duration: 500,
          ease: "Power2",
          onComplete: () => {
            this.mapElements.obstacles.remove(obstacle, true, true);
          },
        });
      }
    });
  }

  // 서로 가까운 장애물들을 찾아서 제거
  private removeCloseObstacles(playerLevel: number) {
    if (!this.mapElements || !this.mapElements.obstacles) return;

    const obstacles =
      this.mapElements.obstacles.getChildren() as Phaser.Physics.Arcade.Sprite[];
    if (obstacles.length === 0) return;

    // 플레이어 크기 계산 (레벨에 따라 증가)
    const playerSize = 32 + playerLevel * 4;
    // 플레이어가 통과하기 위한 최소 간격 (플레이어 크기의 1.5배)
    const minDistance = playerSize * 1.5;

    const toRemove: Phaser.Physics.Arcade.Sprite[] = [];

    // 모든 장애물 쌍을 확인
    for (let i = 0; i < obstacles.length; i++) {
      if (!obstacles[i].active) continue;

      for (let j = i + 1; j < obstacles.length; j++) {
        if (!obstacles[j].active) continue;

        const dist = Phaser.Math.Distance.Between(
          obstacles[i].x,
          obstacles[i].y,
          obstacles[j].x,
          obstacles[j].y,
        );

        // 너무 가까운 경우 하나를 제거 대상으로 표시
        if (dist < minDistance) {
          // 둘 중 하나만 제거 (랜덤 선택)
          const victim = Math.random() < 0.5 ? obstacles[i] : obstacles[j];
          if (!toRemove.includes(victim)) {
            toRemove.push(victim);
          }
        }
      }
    }

    // 장애물 제거 (부드러운 페이드 아웃 효과)
    toRemove.forEach((obstacle) => {
      this.tweens.add({
        targets: obstacle,
        alpha: 0,
        scale: 0.5,
        duration: 500,
        ease: "Power2",
        onComplete: () => {
          this.mapElements.obstacles.remove(obstacle, true, true);
        },
      });
    });

    if (toRemove.length > 0) {
      console.log(
        `[Level ${playerLevel}] Removed ${toRemove.length} close obstacles`,
      );
    }
  }

  private updateCameraZoom() {
    const screenW = this.scale.width;
    const screenH = this.scale.height;
    this.isMobile = screenW <= MOBILE_BREAKPOINT;

    // 모바일/데스크탑 모두 전체 화면 사용
    const viewportH = screenH;
    this.cameras.main.setViewport(0, 0, screenW, viewportH);

    const baseW = this.isMobile ? MOBILE_GAME_WIDTH : GAME_WIDTH;
    const baseH = this.isMobile ? MOBILE_GAME_HEIGHT : GAME_HEIGHT;

    const zoomX = screenW / baseW;
    const zoomY = viewportH / baseH;
    this.cameras.main.setZoom(Math.min(zoomX, zoomY));
  }

  private handleResize() {
    this.updateCameraZoom();
  }

  shutdown() {
    this.scale.off("resize", this.handleResize, this);
    this.events.off("postupdate", this.onPostUpdateHandler);
    EventBus.off("level-up", this.onLevelUpHandler);
    EventBus.off("joystick-update", this.onJoystickUpdateHandler, this);
    EventBus.off("pause-game", this.onPauseGameHandler);
    EventBus.off("resume-game", this.onResumeGameHandler);
    EventBus.off("play-sound", this.onPlaySoundHandler);
    EventBus.off("audio-settings-changed", this.onAudioSettingsChangedHandler);
    this.stopBGM();
    this.npcManager.destroy();
    this.itemManager.destroy();
  }

  private onPostUpdate() {
    if (this.isGameOver || !this.player || !this.player.active) return;
    this.updatePlayerOverlay(this.player.x, this.player.y);
  }

  private onJoystickUpdate(...args: unknown[]) {
    const direction = args[0] as { x: number; y: number };
    this.joystickDirection = direction;
  }

  private onPauseGame() {
    if (!this.scene?.manager) return;
    this.player?.setVelocity(0, 0);
    this.pauseBGM();
    this.scene.pause();
  }

  private onResumeGame() {
    if (!this.scene?.manager) return;
    this.resumeBGM();
    this.scene.resume();
  }

  // Sound system methods
  private initializeSounds() {
    const { bgmVolume, sfxVolume, bgmMuted, sfxMuted } =
      useAudioStore.getState();
    const bgmVol = bgmMuted ? 0 : bgmVolume;
    const sfxVol = sfxMuted ? 0 : sfxVolume;

    // Initialize sound effects
    this.biteSound = this.sound.add("bite", { volume: sfxVol });
    this.deathSound = this.sound.add("death", { volume: sfxVol });
    this.levelupSound = this.sound.add("levelup", { volume: sfxVol });
    this.pickupSound = this.sound.add("pickup", { volume: sfxVol });

    // Initialize and play background music
    this.bgm = this.sound.add("bgm", {
      volume: bgmVol,
      loop: true,
    });
    this.bgm.play();

    // Listen for sound play events and audio settings changes
    EventBus.on("play-sound", this.onPlaySoundHandler, this);
    EventBus.on(
      "audio-settings-changed",
      this.onAudioSettingsChangedHandler,
      this,
    );
  }

  private applyAudioSettings(settings: {
    bgmVolume: number;
    sfxVolume: number;
    bgmMuted: boolean;
    sfxMuted: boolean;
  }) {
    const bgmVol = settings.bgmMuted ? 0 : settings.bgmVolume;
    const sfxVol = settings.sfxMuted ? 0 : settings.sfxVolume;

    this.setSoundVolume(this.bgm, bgmVol);
    this.setSoundVolume(this.biteSound, sfxVol);
    this.setSoundVolume(this.deathSound, sfxVol);
    this.setSoundVolume(this.levelupSound, sfxVol);
    this.setSoundVolume(this.pickupSound, sfxVol);
  }

  private setSoundVolume(
    sound: Phaser.Sound.BaseSound | undefined,
    volume: number,
  ) {
    if (sound && "setVolume" in sound) {
      (sound as Phaser.Sound.WebAudioSound).setVolume(volume);
    }
  }

  private onPlaySoundHandler = (...args: unknown[]) => {
    const soundKey = args[0] as string;
    this.playSound(soundKey);
  };

  private playSound(soundKey: string) {
    // 사운드가 존재하고 로드되었는지 확인
    const soundExists = this.cache.audio.exists(soundKey);
    if (!soundExists) {
      console.warn(`Sound '${soundKey}' not found in cache`);
      return;
    }

    switch (soundKey) {
      case "bite":
        if (this.biteSound) {
          try {
            this.biteSound.play();
          } catch (e) {
            console.error("Error playing bite sound:", e);
          }
        }
        break;
      case "death":
        if (this.deathSound) {
          try {
            this.deathSound.play();
          } catch (e) {
            console.error("Error playing death sound:", e);
          }
        }
        break;
      case "levelup":
        if (this.levelupSound) {
          try {
            this.levelupSound.play();
          } catch (e) {
            console.error("Error playing levelup sound:", e);
          }
        }
        break;
      case "pickup":
        if (this.pickupSound) {
          try {
            this.pickupSound.play();
          } catch (e) {
            console.error("Error playing pickup sound:", e);
          }
        }
        break;
    }
  }

  private stopBGM() {
    if (this.bgm && this.bgm.isPlaying) {
      this.bgm.stop();
    }
  }

  private pauseBGM() {
    if (this.bgm && this.bgm.isPlaying) {
      this.bgm.pause();
    }
  }

  private resumeBGM() {
    if (this.bgm && this.bgm.isPaused) {
      this.bgm.resume();
    }
  }
}
