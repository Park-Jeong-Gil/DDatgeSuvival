import * as Phaser from "phaser";
import { EventBus } from "../EventBus";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: "PreloadScene" });
  }

  preload() {
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

    this.createPlaceholderTextures();
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

    EventBus.emit("current-scene-ready", this);
    this.scene.start("GameScene");
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

    // Item placeholders
    const itemConfigs = [
      { key: "item_golden_fruit", color: 0xfbbf24 },
      { key: "item_satiety_potion", color: 0x3b82f6 },
      { key: "item_predator_shield", color: 0xa855f7 },
      { key: "item_wing_feather", color: 0x67e8f9 },
      { key: "item_invisible_cloak", color: 0xe2e8f0 },
      { key: "item_giant_power", color: 0xef4444 },
    ];

    for (const { key, color } of itemConfigs) {
      const g = this.add.graphics();
      g.fillStyle(color, 1);
      g.fillCircle(8, 8, 8);
      g.generateTexture(key, 16, 16);
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
