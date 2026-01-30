import * as Phaser from "phaser";
import { EventBus } from "../EventBus";
import { Player } from "../entities/Player";
import { NPC } from "../entities/NPC";
import { Item } from "../entities/Item";
import { MAP_WIDTH, MAP_HEIGHT } from "../constants";
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

    // Camera
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Input
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }

    // Systems
    this.hungerSystem = new HungerSystem();
    this.levelSystem = new LevelSystem();
    this.npcManager = new NPCManager(this);
    this.itemManager = new ItemManager(this);

    // Initial NPC spawn
    this.npcManager.initialSpawn(1, MAP_WIDTH / 2, MAP_HEIGHT / 2);

    // Collisions
    this.setupCollisions();

    // Listen for level up
    EventBus.on("level-up", this.onLevelUp.bind(this));

    // Mark playing
    useGameStore.getState().setIsPlaying(true);

    EventBus.emit("current-scene-ready", this);
  }

  private setupCollisions() {
    // Player vs NPC
    this.physics.add.overlap(
      this.player,
      this.npcManager.npcGroup,
      (_playerObj, npcObj) => {
        if (this.isGameOver) return;
        this.handleNPCCollision(npcObj as NPC);
      }
    );

    // Player vs Items
    this.physics.add.overlap(
      this.player,
      this.itemManager.itemGroup,
      (_playerObj, itemObj) => {
        if (this.isGameOver) return;
        this.itemManager.collectItem(itemObj as Item);
      }
    );

    // Player vs Obstacles
    this.physics.add.collider(this.player, this.mapElements.obstacles);

    // NPC vs Obstacles
    this.physics.add.collider(
      this.npcManager.npcGroup,
      this.mapElements.obstacles
    );

    // Player vs Bushes (overlap, not collide)
    this.physics.add.overlap(
      this.player,
      this.mapElements.bushes,
      () => {
        this.inBush = true;
      }
    );
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
    this.handlePlayerMovement();

    // Systems update
    this.hungerSystem.update(delta, store.level);
    this.levelSystem.checkLevelUp(this.player);
    this.npcManager.update(
      delta,
      store.level,
      this.player.currentSpeed,
      this.player.x,
      this.player.y,
      this.itemManager.isPlayerInvisible()
    );
    this.itemManager.update(delta);

    // Survival time
    this.survivalTimer += delta;
    if (this.survivalTimer >= 1000) {
      this.survivalTimer -= 1000;
      store.setSurvivalTime(store.survivalTime + 1);
    }

    // Update player position
    store.setPlayerPosition(this.player.x, this.player.y);
  }

  private handlePlayerMovement() {
    let speedMultiplier = this.itemManager.getSpeedMultiplier();
    if (this.inBush) speedMultiplier *= 0.5;

    const speed = this.player.currentSpeed * speedMultiplier;
    let vx = 0;
    let vy = 0;

    if (!this.cursors) return;

    if (this.cursors.left.isDown || this.wasd.A.isDown) vx = -1;
    else if (this.cursors.right.isDown || this.wasd.D.isDown) vx = 1;

    if (this.cursors.up.isDown || this.wasd.W.isDown) vy = -1;
    else if (this.cursors.down.isDown || this.wasd.S.isDown) vy = 1;

    if (vx !== 0 && vy !== 0) {
      const factor = Math.SQRT1_2;
      vx *= factor;
      vy *= factor;
    }

    this.player.setVelocity(vx * speed, vy * speed);

    if (vx < 0) this.player.setFlipX(true);
    else if (vx > 0) this.player.setFlipX(false);
  }

  private handleNPCCollision(npc: NPC) {
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
      this.handleKnockback(npc);
    } else if (FoodChain.mustFlee(playerLevel, npcLevel)) {
      if (this.itemManager.isPlayerInvincible()) return;
      this.handleGameOver("predator");
    }
  }

  private handleEat(npc: NPC) {
    const store = useGameStore.getState();

    // Score
    store.addScore(npc.scoreValue);

    // Hunger restore
    this.hungerSystem.restore(npc.hungerRestore);

    // Kill count
    store.incrementKills();

    // Try skin drop
    this.itemManager.tryDropSkin(npc.level, npc.x, npc.y);

    // Remove NPC
    this.npcManager.removeNPC(npc);

    // Visual feedback
    this.cameras.main.shake(100, 0.005);

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
      this.player.y
    );
    const knockbackForce = 300;

    this.player.setVelocity(
      Math.cos(angle) * knockbackForce,
      Math.sin(angle) * knockbackForce
    );

    npc.setVelocity(
      -Math.cos(angle) * knockbackForce,
      -Math.sin(angle) * knockbackForce
    );

    // Reset velocity after short delay
    this.time.delayedCall(300, () => {
      if (this.player.active) {
        this.player.setVelocity(0, 0);
      }
    });
  }

  private handleGameOver(reason: "hunger" | "predator" | "boss") {
    if (this.isGameOver) return;
    this.isGameOver = true;

    useGameStore.getState().setGameOver(reason);
    EventBus.emit("game-over", { reason });

    // Freeze player
    this.player.setVelocity(0, 0);
    this.player.setTint(0xff0000);

    // Camera effect
    this.cameras.main.shake(500, 0.02);
    this.cameras.main.fadeOut(1000, 0, 0, 0);
  }

  private onLevelUp(...args: unknown[]) {
    const data = args[0] as { level: number };
    // Camera shake
    this.cameras.main.shake(200, 0.01);

    // Flash effect
    this.cameras.main.flash(500, 255, 255, 100);

    // Update NPC spawns
    this.npcManager.onLevelUp(
      data.level,
      this.player.x,
      this.player.y
    );
  }

  shutdown() {
    EventBus.off("level-up", this.onLevelUp);
    this.npcManager.destroy();
    this.itemManager.destroy();
  }
}
