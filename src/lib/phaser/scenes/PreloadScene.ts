import * as Phaser from "phaser";
import { EventBus } from "../EventBus";

export class PreloadScene extends Phaser.Scene {
  private loadingBar!: Phaser.GameObjects.Graphics;
  private loadingBox!: Phaser.GameObjects.Graphics;
  private loadingText!: Phaser.GameObjects.Text;
  private loadingBg!: Phaser.GameObjects.Rectangle;
  private loadingContainer!: Phaser.GameObjects.Container;
  private loadStartTime: number = 0;
  private fontLoaded: boolean = false;
  private isRestart: boolean = false;

  constructor() {
    super({ key: "PreloadScene" });
  }

  preload() {
    this.loadStartTime = Date.now();

    // Check if assets are already cached (restart scenario)
    this.isRestart = this.cache.audio.exists("bgm");

    this.createLoadingScreen();

    // Mulmaru 폰트 로딩 확인 및 대기
    this.waitForFont();

    // Player sprites
    this.load.image("player_idle", "assets/sprites/player/idle.png");
    this.load.image("player_run", "assets/sprites/player/run.png");
    this.load.image("player_eat", "assets/sprites/player/eat.png");

    // Background tiles
    this.load.image("base_background", "assets/tiles/base_background.png");
    this.load.image("grass_tile", "assets/tiles/grass.png");

    // Obstacle tiles
    this.load.image("tree_tile", "assets/tiles/tree.png");
    this.load.image("rock_tile", "assets/tiles/rock.png");

    // NPC sprites (walk and chase)
    const npcNames = [
      "Ant",
      "Horned_Caterpillar",
      "Mantis",
      "Spider",
      "Lizard",
      "Sparrow",
      "Poison_Toad",
      "Snake",
      "Crow",
      "Cat",
      "Weasel",
      "Owl",
      "Fox",
      "King_Komodo",
      "Eagle",
      "Boar",
      "Wolf",
      "Moon_Bear",
      "Tiger",
      "Dinosaur",
    ];

    npcNames.forEach((name) => {
      this.load.image(`${name}_walk`, `assets/sprites/npcs/${name}_1.png`);
      this.load.image(`${name}_chase`, `assets/sprites/npcs/${name}_2.png`);
    });

    // Item sprites
    this.load.image("item_grape", "assets/sprites/items/item_grape.png");
    this.load.image(
      "item_satiety_potion",
      "assets/sprites/items/item_satiety_potion.png",
    );
    this.load.image(
      "item_golden_fruit",
      "assets/sprites/items/item_golden_fruit.png",
    );
    this.load.image(
      "item_honey_pot",
      "assets/sprites/items/item_honey_pot.png",
    );
    this.load.image(
      "item_poison_potion",
      "assets/sprites/items/item_poison_potion.png",
    );
    this.load.image(
      "item_wing_feather",
      "assets/sprites/items/item_wing_feather.png",
    );
    this.load.image(
      "item_predator_shield",
      "assets/sprites/items/item_predator_shield.png",
    );
    this.load.image(
      "item_invisible_cloak",
      "assets/sprites/items/item_invisible_cloak.png",
    );
    this.load.image(
      "item_giant_power",
      "assets/sprites/items/item_giant_power.png",
    );
    this.load.image("item_crystal", "assets/sprites/items/item_crystal.png");
    this.load.image("item_costume", "assets/sprites/items/item_costume.png");

    // Costume sprites
    const costumeNames = [
      "angel",
      "blue",
      "cosmic",
      "fighter",
      "fire",
      "ghost",
      "golden",
      "green",
      "ice",
      "magic",
      "pierrot",
      "pink",
      "rainbow",
      "robot",
      "yellow",
    ];

    costumeNames.forEach((costume) => {
      this.load.image(
        `costume_${costume}_idle`,
        `assets/sprites/player/costume/${costume}_idle.png`,
      );
      this.load.image(
        `costume_${costume}_run`,
        `assets/sprites/player/costume/${costume}_run.png`,
      );
      this.load.image(
        `costume_${costume}_eat`,
        `assets/sprites/player/costume/${costume}_eat.png`,
      );
    });

    // Sound effects
    this.load.audio("bite", "assets/sounds/player/bite.wav");
    this.load.audio("death", "assets/sounds/player/death.wav");
    this.load.audio("levelup", "assets/sounds/player/levelup.wav");
    this.load.audio("pickup", "assets/sounds/player/pickup.wav");

    // Background music
    this.load.audio("bgm", "assets/sounds/music/background_music.mp3");

    this.createPlaceholderTextures();
  }

  private createLoadingScreen() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 컨테이너 생성
    this.loadingContainer = this.add.container(0, 0);
    this.loadingContainer.setScrollFactor(0);

    // 검은 배경 (여유있게 크게)
    this.loadingBg = this.add.rectangle(
      -10,
      -10,
      width + 20,
      height + 20,
      0x000000,
    );
    this.loadingBg.setOrigin(0, 0);
    this.loadingContainer.add(this.loadingBg);

    // 명언 텍스트 (로딩 바 위에) - 모바일에서는 2줄로 표시
    const isMobile = width <= 960;
    const quoteText = isMobile
      ? "A Shrewmouse's life is simply\nto run and eat."
      : "A Shrewmouse's life is simply to run and eat.";

    this.loadingText = this.add.text(width / 2, height / 2 - 70, quoteText, {
      fontSize: "20px",
      color: "#cccccc",
      // fontFamily: "Mulmaru",
      fontStyle: "italic",
      align: "center",
    });
    this.loadingText.setOrigin(0.5);
    this.loadingContainer.add(this.loadingText);

    // Only show loading bar on first load, not on restart
    if (!this.isRestart) {
      // 로딩 바 배경 (어두운 회색 테두리)
      this.loadingBox = this.add.graphics();
      this.loadingBox.fillStyle(0x222222, 1);
      this.loadingBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);
      this.loadingContainer.add(this.loadingBox);

      // 로딩 바 (밝은 회색)
      this.loadingBar = this.add.graphics();
      this.loadingContainer.add(this.loadingBar);

      // 로딩 진행률 이벤트
      this.load.on("progress", (value: number) => {
        this.loadingBar.clear();
        this.loadingBar.fillStyle(0xcccccc, 1);
        this.loadingBar.fillRect(
          width / 2 - 150,
          height / 2 - 15,
          300 * value,
          30,
        );
      });
    }
  }

  create() {
    // 플레이어 스프라이트는 고해상도(370x262)를 축소 렌더링하므로
    // NEAREST 대신 LINEAR 필터를 적용하여 이동 시 떨림 방지
    ["player_idle", "player_run", "player_eat"].forEach((key) => {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    });

    // NPC 스프라이트도 LINEAR 필터 적용
    const npcNames = [
      "Ant",
      "Horned_Caterpillar",
      "Mantis",
      "Spider",
      "Lizard",
      "Sparrow",
      "Poison_Toad",
      "Snake",
      "Crow",
      "Cat",
      "Weasel",
      "Owl",
      "Fox",
      "King_Komodo",
      "Eagle",
      "Boar",
      "Wolf",
      "Moon_Bear",
      "Tiger",
      "Dinosaur",
    ];

    npcNames.forEach((name) => {
      if (this.textures.exists(`${name}_walk`)) {
        this.textures
          .get(`${name}_walk`)
          .setFilter(Phaser.Textures.FilterMode.LINEAR);
      }
      if (this.textures.exists(`${name}_chase`)) {
        this.textures
          .get(`${name}_chase`)
          .setFilter(Phaser.Textures.FilterMode.LINEAR);
      }
    });

    // Item sprites - LINEAR 필터 적용
    const itemKeys = [
      "item_grape",
      "item_satiety_potion",
      "item_golden_fruit",
      "item_honey_pot",
      "item_poison_potion",
      "item_wing_feather",
      "item_predator_shield",
      "item_invisible_cloak",
      "item_giant_power",
      "item_crystal",
      "item_costume",
    ];

    itemKeys.forEach((key) => {
      if (this.textures.exists(key)) {
        this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
      }
    });

    // Costume sprites - LINEAR 필터 적용
    const costumeNames = [
      "angel",
      "blue",
      "cosmic",
      "fighter",
      "fire",
      "ghost",
      "golden",
      "green",
      "ice",
      "magic",
      "pierrot",
      "pink",
      "rainbow",
      "robot",
      "yellow",
    ];

    costumeNames.forEach((costume) => {
      ["idle", "run", "eat"].forEach((state) => {
        const key = `costume_${costume}_${state}`;
        if (this.textures.exists(key)) {
          this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
        }
      });
    });

    EventBus.emit("current-scene-ready", this);

    // 폰트 로딩 완료 대기
    this.waitForFontAndProceed();
  }

  private waitForFont() {
    // 브라우저의 Font Loading API 사용
    if (typeof document !== "undefined" && document.fonts) {
      document.fonts
        .load("12px Mulmaru")
        .then(() => {
          console.log("[PreloadScene] Mulmaru font loaded");
          this.fontLoaded = true;
        })
        .catch((error) => {
          console.warn("[PreloadScene] Font loading error:", error);
          this.fontLoaded = true; // 오류 발생 시에도 진행
        });
    } else {
      // Font Loading API를 지원하지 않는 브라우저
      this.fontLoaded = true;
    }
  }

  private waitForFontAndProceed() {
    const checkFont = () => {
      if (this.fontLoaded) {
        this.proceedToGame();
      } else {
        // 100ms마다 폰트 로딩 확인
        this.time.delayedCall(100, checkFont);
      }
    };

    // 최대 3초 대기 후 강제로 진행
    this.time.delayedCall(3000, () => {
      if (!this.fontLoaded) {
        console.warn("[PreloadScene] Font loading timeout, proceeding anyway");
        this.fontLoaded = true;
        this.proceedToGame();
      }
    });

    checkFont();
  }

  private proceedToGame() {
    // 로딩 완료 후 최소 1초 대기
    const elapsed = Date.now() - this.loadStartTime;
    const remaining = Math.max(0, 1000 - elapsed);

    this.time.delayedCall(remaining, () => {
      // GameScene을 먼저 시작 (GameScene에서 카메라 fadeIn 처리)
      // loadingContainer는 유지하여 검은 화면 방지
      this.scene.start("GameScene");

      // GameScene 시작 후 loadingContainer 정리
      this.time.delayedCall(100, () => {
        this.loadingContainer.destroy();
      });
    });
  }

  private createPlaceholderTextures() {
    // Player placeholder (green)
    const pg = this.add.graphics();
    pg.fillStyle(0x22c55e, 1);
    pg.fillRect(0, 0, 32, 32);
    pg.generateTexture("player_default", 32, 32);
    pg.destroy();

    // NPC level colors (red gradient for predators, blue for prey)
    const npcColors: Record<number, number> = {
      0: 0x94a3b8, // ant - gray
      1: 0xa3e635, // caterpillar - lime
      2: 0x78716c, // beetle - stone
      3: 0x6b7280, // spider - gray
      4: 0x84cc16, // grasshopper - green
      5: 0x10b981, // frog - emerald
      6: 0x14b8a6, // lizard - teal
      7: 0xf59e0b, // sparrow - amber
      8: 0x1f2937, // crow - dark
      9: 0x7c3aed, // snake - violet
      10: 0xfb923c, // cat - orange
      11: 0xa16207, // weasel - yellow
      12: 0x0ea5e9, // heron - sky
      13: 0xdc2626, // lynx - red
      14: 0x64748b, // falcon - slate
      15: 0x92400e, // boar - brown
      16: 0x4b5563, // wolf - gray
      17: 0x7f1d1d, // bear - dark red
      18: 0xea580c, // tiger - deep orange
      99: 0x9333ea, // dinosaur boss - purple
    };

    for (const [level, color] of Object.entries(npcColors)) {
      const g = this.add.graphics();
      g.fillStyle(color, 1);
      const actualSize = level === "99" ? 128 : 32;
      g.fillRect(0, 0, actualSize, actualSize);
      g.generateTexture(`npc_${level}`, actualSize, actualSize);
      g.destroy();
    }

    // Skin placeholder (cosmetic drop item)
    const sg = this.add.graphics();
    sg.fillStyle(0xf472b6, 1);
    sg.fillTriangle(8, 0, 16, 16, 0, 16);
    sg.generateTexture("item_skin_drop", 16, 16);
    sg.destroy();

    // Obstacle placeholders
    const treeG = this.add.graphics();
    treeG.fillStyle(0x166534, 1);
    treeG.fillCircle(16, 16, 16);
    treeG.generateTexture("obstacle_tree", 32, 32);
    treeG.destroy();

    const rockG = this.add.graphics();
    rockG.fillStyle(0x78716c, 1);
    rockG.fillRect(0, 4, 28, 20);
    rockG.generateTexture("obstacle_rock", 28, 24);
    rockG.destroy();

    const bushG = this.add.graphics();
    bushG.fillStyle(0x4ade80, 0.6);
    bushG.fillCircle(16, 16, 16);
    bushG.generateTexture("obstacle_bush", 32, 32);
    bushG.destroy();

    // Ground tile (fallback - 실제로는 base_background 이미지 사용)
    const groundG = this.add.graphics();
    groundG.fillStyle(0x65a30d, 1);
    groundG.fillRect(0, 0, 64, 64);
    groundG.lineStyle(1, 0x4d7c0f, 0.3);
    groundG.strokeRect(0, 0, 64, 64);
    groundG.generateTexture("ground_tile", 64, 64);
    groundG.destroy();
  }
}
