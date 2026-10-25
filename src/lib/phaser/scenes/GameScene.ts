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
  DEBUG_MODE,
} from "../constants";
import { useGameStore } from "@/store/gameStore";
import { useAudioStore } from "@/store/audioStore";
import { FoodChain } from "../systems/FoodChain";
import { HungerSystem } from "../systems/HungerSystem";
import { LevelSystem } from "../systems/LevelSystem";
import { NPCManager } from "../systems/NPCManager";
import { ItemManager } from "../systems/ItemManager";
import { SkillManager } from "../systems/SkillManager";
import {
  generateMap,
  expandMapElements,
  type MapElements,
} from "../utils/mapGenerator";
import { getCostumeById } from "../data/skinData";

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
  private skillManager!: SkillManager;
  private mapElements!: MapElements;
  private survivalTimer: number = 0;
  private isGameOver: boolean = false;
  private inBush: boolean = false;
  private invincibleUntil: number = 0;
  private warningGraphics!: Phaser.GameObjects.Graphics;
  private playerLabelText?: Phaser.GameObjects.Text;
  private playerCostumeLabelText?: Phaser.GameObjects.Text;
  private playerHpGraphics?: Phaser.GameObjects.Graphics;
  private playerExpGraphics?: Phaser.GameObjects.Graphics;
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
  private onRestartGameHandler = this.onRestartGame.bind(this);
  private bgm?: Phaser.Sound.BaseSound;
  private biteSound?: Phaser.Sound.BaseSound;
  private deathSound?: Phaser.Sound.BaseSound;
  private levelupSound?: Phaser.Sound.BaseSound;
  private pickupSound?: Phaser.Sound.BaseSound;
  private levelZoomMultiplier: number = 1.0; // 레벨 기반 줌 배율 (1.0 = 기본)
  private currentMapWidth: number = MAP_WIDTH; // 현재 맵 너비 (동적 확장)
  private currentMapHeight: number = MAP_HEIGHT; // 현재 맵 높이 (동적 확장)
  private backgroundTileSprite?: Phaser.GameObjects.TileSprite; // 배경 타일 스프라이트
  private giantPowerOutlineActive: boolean = false;
  private giantPowerBlinkTimer: number = 0;
  private giantPowerBlinkState: boolean = true;

  constructor() {
    super({ key: "GameScene" });
  }

  create() {
    // Reset store
    useGameStore.getState().resetGame();
    this.isGameOver = false;
    this.survivalTimer = 0;

    // 맵/카메라 상태 초기화 (scene 재사용 시 이전 게임 값이 남지 않도록)
    this.levelZoomMultiplier = 1.0;
    this.currentMapWidth = MAP_WIDTH;
    this.currentMapHeight = MAP_HEIGHT;

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
    this.backgroundTileSprite = this.add
      .tileSprite(
        0,
        0,
        this.currentMapWidth,
        this.currentMapHeight,
        "base_background",
      )
      .setOrigin(0, 0)
      .setDepth(0)
      .setTileScale(0.28, 0.28);

    // World bounds
    this.physics.world.setBounds(
      0,
      0,
      this.currentMapWidth,
      this.currentMapHeight,
    );

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
    this.player.setName("player"); // Player에 이름 설정 (NPCManager에서 찾을 수 있도록)

    // 선택한 코스튬 적용 (localStorage에서 직접 읽기)
    const selectedCostume = localStorage.getItem("selected_costume");
    // console.log("🎮 GameScene - localStorage 코스튬:", selectedCostume);

    let currentCostume = selectedCostume;
    if (!currentCostume) {
      // localStorage에 없으면 gameStore에서 읽기
      currentCostume = useGameStore.getState().currentCostume;
      // console.log("🎮 GameScene - gameStore 코스튬:", currentCostume);
    }

    if (currentCostume) {
      // console.log("🎨 코스튬 적용 시도:", currentCostume);
      this.player.changeCostume(currentCostume);
      // console.log("✅ 플레이어 현재 코스튬:", this.player.getCurrentCostume());

      // 적용 후 localStorage 클리어
      localStorage.removeItem("selected_costume");
    } else {
      // console.log("⚠️ currentCostume이 null입니다");
    }

    // Debug: 디버그 레벨에 맞게 Player 크기 업데이트
    if (DEBUG_START_LEVEL > 1) {
      this.player.updateStats(DEBUG_START_LEVEL);
    }

    this.createPlayerOverlay();

    // Camera
    this.cameras.main.setBounds(
      0,
      0,
      this.currentMapWidth,
      this.currentMapHeight,
    );
    this.cameras.main.startFollow(this.player, true, 1, 1);
    this.cameras.main.setRoundPixels(false);

    // Debug: 시작 레벨에 맞게 카메라 줌 초기화 및 맵 확장
    if (DEBUG_START_LEVEL > 1) {
      this.initializeCameraZoomForLevel(DEBUG_START_LEVEL);
      this.initializeMapSizeForLevel(DEBUG_START_LEVEL);
    }

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

    // SkillManager 초기화 (선택한 스킬 로드)
    const selectedSkillsJson = localStorage.getItem("selected_skills");
    const selectedSkills = selectedSkillsJson
      ? (JSON.parse(selectedSkillsJson) as string[])
      : useGameStore.getState().selectedSkills;
    this.skillManager = new SkillManager(this, selectedSkills);

    // store에 반영 (HUD UI 표시용)
    useGameStore.getState().setSelectedSkills(selectedSkills);

    // localStorage 클리어
    if (selectedSkillsJson) {
      localStorage.removeItem("selected_skills");
    }

    // ItemManager에 SkillManager 연결
    this.itemManager.setSkillManager(this.skillManager);

    // NPCManager에 SkillManager 연결
    this.skillManager.setNPCManager(this.npcManager);

    // Player에 SkillManager 연결
    this.skillManager.setPlayer(this.player);

    // 리볼버 스킬 - 먹이 처치 시 실제 handleEat 처리 연결
    this.skillManager.setPreyEatenCallback((npcObj) => {
      const npc = npcObj as NPC;
      if (npc && npc.active && !npc.destroyed) {
        this.handleEat(npc);
      } else {
        npc?.destroy();
      }
    });

    // 곡괭이/도끼 스킬로 장애물 제거
    if (this.skillManager.hasPick()) {
      this.removeObstaclesByType("rock_tile");
    }
    if (this.skillManager.hasAx()) {
      this.removeObstaclesByType("tree_tile");
    }

    // Debug: Spawn all items with 'I' key (DEBUG_MODE가 true일 때만 사용)
    if (DEBUG_MODE && this.input.keyboard) {
      this.input.keyboard.on("keydown-I", () => {
        console.log("[DEBUG] 'I' key pressed - spawning all items");
        this.itemManager.debugSpawnAllItems();
      });
    }

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
    EventBus.on("restart-game", this.onRestartGameHandler);

    // 모든 초기화 완료 후 카메라 fadeIn과 BGM 재생
    // 검은 화면에서 게임으로 자연스럽게 전환
    this.cameras.main.fadeIn(800, 0, 0, 0);
    this.bgm?.play();

    EventBus.emit("current-scene-ready", this);
  }

  private setupCollisions() {
    // Player vs NPC - 물리적 충돌 (동일 레벨일 때만, 넉백 버프 없을 때)
    this.physics.add.collider(
      this.player,
      this.npcManager.npcGroup,
      undefined,
      (_playerObj, npcObj) => {
        const npc = npcObj as NPC;
        if (!npc.active || npc.destroyed) return false;

        const playerLevel =
          this.player.level + this.itemManager.getLevelBoost();
        const npcLevel = npc.level;

        // 동일 레벨이고 넉백 버프가 있으면 물리적 충돌 무시
        if (FoodChain.sameLevel(playerLevel, npcLevel)) {
          if (this.itemManager.hasKnockbackSameLevelBuff()) {
            return false; // 넉백 효과를 위해 충돌 무시
          }
          return true; // 일반 충돌
        }

        return false;
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

        // 오브 방어 발동 시도: physics overlap 콜백 안에서 실행하여
        // handleNPCCollision의 게임오버 판정 전에 기절/감속/넉백을 먼저 적용
        this.skillManager.tryFireOrbProtection(npc);

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

    // Match run animation playback to the actual movement speed
    this.player.updateWalkAnimation();

    // 의상별 투명 여백을 포함한 현재 프레임 중앙을 기준으로 유지한다.
    this.player.setDisplayOrigin(this.player.width * 0.5, this.player.height * 0.5);

    // Update player shadow
    this.player.updateShadow();

    // Systems update
    this.hungerSystem.update(
      delta,
      store.level,
      this.itemManager.getHungerDecreaseMultiplier() *
        this.skillManager.getHungerMultiplier(),
    );
    this.levelSystem.checkLevelUp(this.player);

    // Re-read level after potential level-up to keep NPC labels in sync
    const currentLevel =
      useGameStore.getState().level + this.itemManager.getLevelBoost();
    this.npcManager.update(
      delta,
      currentLevel,
      this.player.currentSpeed,
      this.player.x,
      this.player.y,
      this.itemManager.isPlayerInvisible(),
      this.isMobile,
      undefined, // predatorSpeedMultiplier 제거됨
      this.itemManager.hasAttractPreyBuff(),
      this.skillManager.shouldHighlightPredators(),
      this.skillManager.hasBubblesActive(),
    );
    this.npcManager.drawBars();
    this.itemManager.update(delta);
    this.skillManager.update(delta);

    // 스킬 쿨타임 정보를 Store와 UIScene에 전달
    const skillCooldowns = this.skillManager.getSkillCooldowns().map((cd) => ({
      skillId: cd.skillId,
      remainingCooldown: cd.remainingCooldown,
      maxCooldown: cd.maxCooldown,
      spriteKey: cd.skill.spriteKey,
    }));

    // React 컴포넌트용 (최적화: 초 단위로만 업데이트)
    store.setSkillCooldowns(skillCooldowns);

    // Phaser UIScene용 (하위 호환성)
    EventBus.emit("skill-cooldown-update", skillCooldowns);

    // Update player alpha based on invisible buff
    if (this.itemManager.isPlayerInvisible()) {
      this.player.setAlpha(0.5);
    } else {
      this.player.setAlpha(1.0);
    }

    // 거인의 힘 주황색 아웃라인 효과
    const levelBoostRemaining = this.itemManager.getLevelBoostRemainingTime();
    if (levelBoostRemaining > 0) {
      if (!this.giantPowerOutlineActive) {
        this.player.addGiantPowerOutline();
        this.giantPowerOutlineActive = true;
        this.giantPowerBlinkTimer = 0;
        this.giantPowerBlinkState = true;
      }
      if (levelBoostRemaining <= 3000) {
        // 3초 전부터 깜빡임
        this.giantPowerBlinkTimer += delta;
        if (this.giantPowerBlinkTimer >= 300) {
          this.giantPowerBlinkTimer = 0;
          this.giantPowerBlinkState = !this.giantPowerBlinkState;
          this.player.setGiantPowerOutlineVisible(this.giantPowerBlinkState);
        }
      } else {
        // 일반 상태: 항상 표시
        if (!this.giantPowerBlinkState) {
          this.giantPowerBlinkState = true;
          this.player.setGiantPowerOutlineVisible(true);
        }
        this.giantPowerBlinkTimer = 0;
      }
    } else if (this.giantPowerOutlineActive) {
      this.player.removeGiantPowerOutline();
      this.giantPowerOutlineActive = false;
      this.giantPowerBlinkTimer = 0;
      this.giantPowerBlinkState = true;
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
        this.player.bodyDisplayWidth,
        this.player.bodyDisplayHeight,
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
    this.playerLabelText.setShadow(0, 0, "#000000", 0, true, true);

    // 코스튬 라벨 (더 작은 글씨)
    const costumeLabelFontSize = isMobile ? "12px" : "9px";
    this.playerCostumeLabelText = this.add.text(
      this.player.x,
      this.player.y,
      "",
      {
        fontSize: costumeLabelFontSize,
        fontFamily: "Mulmaru",
        color: "#fbbf24",
        stroke: "#000000",
        strokeThickness: 3,
      },
    );
    this.playerCostumeLabelText.setOrigin(0.5, 1);
    this.playerCostumeLabelText.setDepth(20);
    this.playerCostumeLabelText.setFontFamily("Mulmaru");
    // this.playerCostumeLabelText.setShadow(0, 0, "#000000", 0, true, true);

    this.playerHpGraphics = this.add.graphics();
    this.playerHpGraphics.setDepth(20);

    this.playerExpGraphics = this.add.graphics();
    this.playerExpGraphics.setDepth(20);
  }

  private updatePlayerOverlay(px: number, py: number) {
    if (
      !this.playerLabelText ||
      !this.playerHpGraphics ||
      !this.playerExpGraphics ||
      !this.playerCostumeLabelText
    )
      return;

    const store = useGameStore.getState();
    const nickname = store.nickname || "플레이어";
    const label = `Lv${store.level} ${nickname}`;

    // 닉네임 라벨 위치 (기본)
    const labelOffset = Math.round(this.player.bodyDisplayHeight / 2 + 8);
    this.playerLabelText.setText(label);
    this.playerLabelText.setPosition(px, py - labelOffset);

    // 코스튬 라벨 업데이트 (닉네임 위에 표시)
    const currentCostume = store.currentCostume;
    const isMobile = this.scale.width <= MOBILE_BREAKPOINT;
    if (currentCostume) {
      const costumeData = getCostumeById(currentCostume);
      if (costumeData) {
        // 희귀도별 색상 설정
        const rarityColors: Record<string, string> = {
          common: "#b5bcc9", // gray-400
          uncommon: "#4ade80", // green-400
          rare: "#60a5fa", // blue-400
          epic: "#c084fc", // purple-400
          legendary: "#fbbf24", // amber-400
        };
        const color = rarityColors[costumeData.rarity] || "#fbbf24";
        this.playerCostumeLabelText.setColor(color);
        this.playerCostumeLabelText.setText(costumeData.name);
        // 코스튬 라벨 위치 (닉네임 라벨 위에)
        const costumeLabelOffset = labelOffset + (isMobile ? 24 : 16);
        this.playerCostumeLabelText.setPosition(px, py - costumeLabelOffset);
        this.playerCostumeLabelText.setVisible(true);
      } else {
        this.playerCostumeLabelText.setVisible(false);
      }
    } else {
      this.playerCostumeLabelText.setVisible(false);
    }

    const barWidth = Math.max(32, Math.round(this.player.bodyDisplayWidth));
    // const barWidth = Math.max(32, Math.round(this.player.bodyDisplayWidth * 1.6));
    // const barWidth = 50;
    const barHeight = 6;
    const barX = px - barWidth / 2;
    const barY = py + Math.round(this.player.bodyDisplayHeight / 2 + 6);
    const hungerRatio = Phaser.Math.Clamp(store.hunger / store.maxHunger, 0, 1);

    const getColor = () => {
      if (store.hunger >= 80) return 0x22c55e;
      if (store.hunger >= 40) return 0xfacc15;
      if (store.hunger >= 20) return 0xf97316;
      return 0xef4444;
    };

    // HP 바
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

    // 경험치 바 (HP 바 바로 아래에 얇게)
    const expBarHeight = 3;
    const expBarY = barY + barHeight + 2;

    // 현재 레벨에서의 경험치 진행도 계산
    const currentLevelTotalScore = LevelSystem.getTotalScoreForLevel(
      store.level,
    );
    const nextLevelTotalScore = LevelSystem.getTotalScoreForLevel(
      store.level + 1,
    );
    const requiredScoreForThisLevel =
      nextLevelTotalScore - currentLevelTotalScore;
    const currentScoreInLevel = store.score - currentLevelTotalScore;
    const expRatio = Phaser.Math.Clamp(
      currentScoreInLevel / requiredScoreForThisLevel,
      0,
      1,
    );

    this.playerExpGraphics.clear();
    // 배경 (어두운 회색)
    this.playerExpGraphics.fillStyle(0x1f2937, 1);
    this.playerExpGraphics.fillRoundedRect(
      barX,
      expBarY,
      barWidth,
      expBarHeight,
      1.5,
    );
    // 경험치 바 (파란색)
    this.playerExpGraphics.fillStyle(0x3b82f6, 1);
    this.playerExpGraphics.fillRoundedRect(
      barX,
      expBarY,
      Math.max(1, barWidth * expRatio),
      expBarHeight,
      1.5,
    );
    // 테두리
    this.playerExpGraphics.lineStyle(0.5, 0x1e40af, 1);
    this.playerExpGraphics.strokeRoundedRect(
      barX,
      expBarY,
      barWidth,
      expBarHeight,
      1.5,
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
    let speedMultiplier =
      this.itemManager.getSpeedMultiplier() *
      this.skillManager.getSpeedMultiplier();
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

    const playerLevel = this.player.level + this.itemManager.getLevelBoost();
    const npcLevel = npc.level;

    if (FoodChain.isBoss(npcLevel)) {
      this.handleGameOver("boss");
      return;
    }

    // 먹을 수 있는 대상인지 확인
    const canEatNPC = FoodChain.canEat(playerLevel, npcLevel);

    if (canEatNPC) {
      this.handleEat(npc);
    } else if (FoodChain.sameLevel(playerLevel, npcLevel)) {
      // knockback_same_level 버프가 있으면 NPC를 멀리 밀어냄
      if (this.itemManager.hasKnockbackSameLevelBuff()) {
        this.handleSameLevelKnockback(npc);
      }
      // 같은 레벨은 장애물처럼 단순 충돌만 처리
      return;
    } else if (FoodChain.mustFlee(playerLevel, npcLevel)) {
      // stun_on_collision 버프가 있으면 부딪힌 포식자 즉시 제거 (독약 효과)
      if (this.itemManager.hasStunOnCollisionBuff()) {
        console.log(
          `[DEBUG] Poison effect - removing predator level ${npcLevel}`,
        );
        // 맹독 물약 효과: 빨간색 오버레이와 함께 뒤집어지며 사라짐
        npc.playPoisonDeathAnimation(() => {
          this.npcManager.removeNPC(npc);
        });
        return;
      }

      // stun_predator 버프가 있으면 포식자 즉시 기절
      if (this.itemManager.hasStunPredatorBuff()) {
        npc.stunUntil = Date.now() + 5000;
        npc.aiState = NPCState.STUNNED;
        npc.setTint(0x888888);
        return;
      }
      if (this.time.now < this.invincibleUntil) return;

      // 오브 스킬로 기절/넉백 중인 포식자는 게임오버 처리 안 함
      if (Date.now() < npc.stunUntil || npc.isKnockedBack) return;

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

    // Hunger restore - 플레이어 레벨에 따라 회복량 점진적 감소
    const playerLevel = this.player.level;

    // 레벨이 높을수록 회복량 감소 (레벨 1: 100% → 레벨 20: 30%)
    // 공식: Math.max(0.3, 1 - (playerLevel - 1) * 0.035)
    // 레벨 1: 100%, 레벨 5: 86%, 레벨 10: 68.5%, 레벨 20: 33.5%
    const levelPenalty = Math.max(0.3, 1 - (playerLevel - 1) * 0.035);

    // 레벨 차이에 따른 추가 조정 (낮은 레벨 먹이는 더 적게 회복)
    const levelDiff = playerLevel - npc.level;
    let levelDiffMultiplier = 1.0;

    if (levelDiff > 0) {
      // 플레이어가 더 높음 (레벨 낮은 먹이) - 추가 감소
      levelDiffMultiplier = Math.max(0.5, 1 - levelDiff * 0.1);
    } else if (levelDiff < 0) {
      // 먹이가 더 높음 (레벨 높은 먹이) - 약간 보너스
      levelDiffMultiplier = Math.min(1.2, 1 - levelDiff * 0.05);
    }

    const hungerRestoreAmount =
      npc.hungerRestore * levelPenalty * levelDiffMultiplier;
    this.hungerSystem.restore(hungerRestoreAmount);

    // Kill count
    store.incrementKills();

    // Try skin drop
    this.itemManager.tryDropSkin(npc.level, npc.x, npc.y);

    // 무적 시간 증가 (200ms → 500ms)
    this.invincibleUntil = this.time.now + 500;

    // Visual feedback - 모바일에서는 화면이 작아서 더 강하게 설정
    const shakeDuration = this.isMobile ? 100 : 50;
    const shakeIntensity = this.isMobile ? 0.01 : 0.002;
    this.cameras.main.shake(shakeDuration, shakeIntensity);

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

  private handleSameLevelKnockback(npc: NPC) {
    // 이미 넉백 중이면 무시 (중복 넉백 방지)
    if (npc.stunUntil > Date.now()) return;

    // 플레이어 → NPC 방향으로 강하게 밀어냄
    const angle = Phaser.Math.Angle.Between(
      this.player.x,
      this.player.y,
      npc.x,
      npc.y,
    );
    const knockbackForce = 2000; // 매우 강한 넉백 (800 → 2000)

    // NPC를 넉백 상태로 설정
    npc.isKnockedBack = true;
    npc.stunUntil = Date.now() + 1500; // 1.5초 기절 (1초 → 1.5초)
    npc.aiState = NPCState.STUNNED;
    npc.setTint(0xaaaaaa);

    // NPC만 밀어냄 (플레이어는 그대로)
    npc.setVelocity(
      Math.cos(angle) * knockbackForce,
      Math.sin(angle) * knockbackForce,
    );

    console.log(
      `[DEBUG] Knockback applied to NPC level ${npc.level} with force ${knockbackForce}`,
    );

    // 1.5초 후 NPC 속도 리셋 및 기절/넉백 해제
    this.time.delayedCall(1500, () => {
      if (npc.active) {
        npc.isKnockedBack = false;
        npc.setVelocity(0, 0);
        npc.clearTint();
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
    this.player.anims.stop();
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
          npcObj.anims.stop();
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
    this.cameras.main.flash(500, 255, 255, 60);

    // 레벨 5마다 카메라 줌 아웃 및 맵 확장 (시야 확장)
    if (data.level % 5 === 0) {
      this.applyCameraZoomOut(data.level);
      this.expandMap(data.level);
    }

    // 거인의 힘 버프 활성화 중에는 NPC 리스폰 하지 않음
    if (!this.itemManager.hasActiveBuff("level_boost")) {
      this.npcManager.onLevelUp(data.level, this.player.x, this.player.y);
    }

    // 레벨 20 이상: 모든 장애물 제거
    if (data.level >= 25) {
      this.removeAllObstacles();
    }
    // 레벨이 2의 배수일 때 가까운 장애물 제거
    else if (data.level % 2 === 0) {
      this.removeCloseObstacles(data.level);
    }
  }

  // 디버그 모드: 시작 레벨에 맞게 카메라 줌 초기화
  private initializeCameraZoomForLevel(level: number) {
    // 레벨 5마다 줌 아웃 횟수 계산
    const zoomOutCount = Math.floor(level / 5);

    if (zoomOutCount > 0) {
      // 0.9배씩 곱한 누적 배율 계산
      this.levelZoomMultiplier = Math.pow(0.9, zoomOutCount);

      // 최소 줌 배율 제한 (최대 80% 줌 아웃까지만)
      this.levelZoomMultiplier = Math.max(this.levelZoomMultiplier, 0.2);

      console.log(
        `[DEBUG] Camera zoom initialized for level ${level}: ${this.levelZoomMultiplier.toFixed(3)}x (${zoomOutCount} zoom-outs)`,
      );
    }
  }

  // 디버그 모드: 시작 레벨에 맞게 맵 크기 초기화
  private initializeMapSizeForLevel(level: number) {
    // 레벨 5마다 맵 확장 횟수 계산
    const expandCount = Math.floor(level / 5);

    if (expandCount > 0) {
      // 줌이 0.9배 = 보이는 영역이 1/0.9 = 1.111배
      // 맵도 같은 비율로 확장
      const expansionRatio = Math.pow(1 / 0.9, expandCount);
      this.currentMapWidth = Math.floor(MAP_WIDTH * expansionRatio);
      this.currentMapHeight = Math.floor(MAP_HEIGHT * expansionRatio);

      // NPCManager에 새로운 맵 크기 전달
      if (this.npcManager) {
        this.npcManager.updateMapBounds(
          this.currentMapWidth,
          this.currentMapHeight,
        );
      }

      // 맵 크기 즉시 적용
      this.updateMapSize();

      console.log(
        `[DEBUG] Map size initialized for level ${level}: ${this.currentMapWidth}x${this.currentMapHeight} (${expandCount} expansions)`,
      );
    }
  }

  // 맵 크기 업데이트 (배경, 물리 바운드, 카메라 바운드)
  private updateMapSize() {
    // 배경 TileSprite 크기 업데이트
    if (this.backgroundTileSprite) {
      this.backgroundTileSprite.setSize(
        this.currentMapWidth,
        this.currentMapHeight,
      );
    }

    // Physics world bounds 업데이트
    this.physics.world.setBounds(
      0,
      0,
      this.currentMapWidth,
      this.currentMapHeight,
    );

    // Camera bounds 업데이트
    this.cameras.main.setBounds(
      0,
      0,
      this.currentMapWidth,
      this.currentMapHeight,
    );
  }

  // 레벨 5마다 맵 확장 (레벨업 시)
  private expandMap(_level: number) {
    // 줌이 0.9배 = 보이는 영역이 1/0.9 = 1.111배
    const expansionRatio = 1 / 0.9;

    // 확장 전 크기 저장 (새 경계 영역 계산에 사용)
    const oldWidth = this.currentMapWidth;
    const oldHeight = this.currentMapHeight;

    // 새로운 맵 크기 계산
    const newWidth = Math.floor(this.currentMapWidth * expansionRatio);
    const newHeight = Math.floor(this.currentMapHeight * expansionRatio);

    // 맵 크기 업데이트
    this.currentMapWidth = newWidth;
    this.currentMapHeight = newHeight;

    // NPCManager에 새로운 맵 크기 전달
    if (this.npcManager) {
      this.npcManager.updateMapBounds(newWidth, newHeight);
    }

    // 물리/카메라 바운드를 즉시 업데이트 (줌 트윈 버벅임 방지)
    this.physics.world.setBounds(0, 0, newWidth, newHeight);
    this.cameras.main.setBounds(0, 0, newWidth, newHeight);

    // 검은 경계 방지용 사전 배치 레이어:
    // 메인 배경 TileSprite가 트윈으로 커지는 동안, 카메라 줌 아웃이 먼저 새 영역을
    // 노출하더라도 아래에 타일이 채워져 있어서 검은 화면이 보이지 않음
    const preFill = this.backgroundTileSprite
      ? this.add
          .tileSprite(0, 0, newWidth, newHeight, "base_background")
          .setOrigin(0, 0)
          .setDepth(-1)
          .setTileScale(
            this.backgroundTileSprite.tileScaleX,
            this.backgroundTileSprite.tileScaleY,
          )
      : null;

    // 메인 배경 TileSprite를 부드럽게 확장 (맵 확장 애니메이션 복원)
    if (this.backgroundTileSprite) {
      this.tweens.add({
        targets: this.backgroundTileSprite,
        width: newWidth,
        height: newHeight,
        duration: 1000,
        ease: "Cubic.easeInOut",
        onComplete: () => {
          // 메인 배경이 새 영역을 완전히 덮었으므로 사전 배치 레이어 제거
          preFill?.destroy();
        },
      });
    } else {
      preFill?.destroy();
    }

    // 새 경계 영역에 나무/바위/풀숲 자연스럽게 추가
    expandMapElements(
      this,
      this.mapElements,
      oldWidth,
      oldHeight,
      newWidth,
      newHeight,
    );

    console.log(
      `[Map Expansion] New size: ${newWidth}x${newHeight} (${expansionRatio.toFixed(3)}x expansion)`,
    );
  }

  // 레벨 5마다 카메라 줌 아웃 효과 (레벨업 시)
  private applyCameraZoomOut(_level: number) {
    // 레벨 5마다 10% 줌 아웃 (0.9배)
    const targetMultiplier = this.levelZoomMultiplier * 0.9;

    // 최소 줌 배율 제한 (최대 80% 줌 아웃까지만)
    const minZoom = 0.2;
    const newMultiplier = Math.max(targetMultiplier, minZoom);

    // 부드러운 줌 아웃 트윈 애니메이션
    this.tweens.add({
      targets: this,
      levelZoomMultiplier: newMultiplier,
      duration: 1000, // 1초
      ease: "Cubic.easeInOut",
      onUpdate: () => {
        this.updateCameraZoom();
      },
    });
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
  // 특정 타입의 모든 장애물 제거 (곡괭이/도끼 스킬용)
  private removeObstaclesByType(textureKey: string) {
    if (!this.mapElements || !this.mapElements.obstacles) return;

    const obstacles =
      this.mapElements.obstacles.getChildren() as Phaser.Physics.Arcade.Sprite[];
    if (obstacles.length === 0) return;

    const toRemove = obstacles.filter(
      (obstacle) => obstacle.active && obstacle.texture.key === textureKey,
    );

    toRemove.forEach((obstacle) => {
      this.mapElements.obstacles.remove(obstacle, true, true);
    });

    // StaticGroup 물리 바디 갱신
    this.mapElements.obstacles.refresh();

    console.log(
      `[SkillManager] Removed ${toRemove.length} ${textureKey} obstacles`,
    );
  }

  private removeCloseObstacles(playerLevel: number) {
    if (!this.mapElements || !this.mapElements.obstacles) return;

    const obstacles =
      this.mapElements.obstacles.getChildren() as Phaser.Physics.Arcade.Sprite[];
    if (obstacles.length === 0) return;

    // 플레이어 크기 계산 (레벨에 따라 증가)
    const playerSize = 32 + playerLevel * 4;
    // 플레이어가 통과하기 위한 최소 간격 (플레이어 크기의 1.8배)
    const minDistance = playerSize * 1.8;

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
    const baseZoom = Math.min(zoomX, zoomY);

    // 레벨 기반 줌 배율 적용 (레벨이 높을수록 시야 확장)
    this.cameras.main.setZoom(baseZoom * this.levelZoomMultiplier);
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
    EventBus.off("restart-game", this.onRestartGameHandler);
    EventBus.off("play-sound", this.onPlaySoundHandler);
    EventBus.off("audio-settings-changed", this.onAudioSettingsChangedHandler);
    this.stopBGM();
    this.skillManager?.cleanup();
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

    // Initialize background music (재생은 fadeIn과 함께)
    this.bgm = this.sound.add("bgm", {
      volume: bgmVol,
      loop: true,
    });

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
    if (!this.cache || !this.cache.audio) {
      console.warn("Audio cache not available");
      return;
    }

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

  private onRestartGame() {
    // Stop all scenes and restart from PreloadScene
    // This maintains user interaction context for audio autoplay
    try {
      // Scene manager가 유효한지 확인
      if (!this.scene || !this.scene.manager) {
        console.warn("Scene manager not available for restart");
        return;
      }

      // 각 scene이 존재하는지 확인하고 stop
      const uiScene = this.scene.get("UIScene");
      if (uiScene && uiScene.scene.isActive("UIScene")) {
        this.scene.stop("UIScene");
      }

      const gameScene = this.scene.get("GameScene");
      if (gameScene && gameScene.scene.isActive("GameScene")) {
        this.scene.stop("GameScene");
      }

      this.scene.start("PreloadScene");
    } catch (error) {
      console.error("Error restarting game:", error);
    }
  }
}
