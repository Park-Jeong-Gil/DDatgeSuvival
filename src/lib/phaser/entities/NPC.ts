import * as Phaser from "phaser";
import type { NPCData } from "@/types/npc";
import { NPCState } from "@/types/npc";

export class NPC extends Phaser.Physics.Arcade.Sprite {
  npcData: NPCData;
  level: number;
  baseSpeed: number;
  scoreValue: number;
  hungerRestore: number;

  // AI state
  aiState: NPCState = NPCState.WANDER;
  private wanderTimer: number = 0;
  private wanderDirection: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
  private readonly WANDER_INTERVAL = 2000 + Math.random() * 2000;
  private chaseStartTime: number = 0;
  private readonly MAX_CHASE_DURATION = 8000;

  // Labels
  private nameLabel: Phaser.GameObjects.Text;
  private chaseLabel: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, data: NPCData) {
    super(scene, x, y, data.spriteKey);

    this.npcData = data;
    this.level = data.level;
    this.baseSpeed = data.baseSpeed;
    this.scoreValue = data.scoreValue;
    this.hungerRestore = data.hungerRestore;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    const scale = data.baseSize / (data.level === 99 ? 128 : 32);
    this.setScale(scale);
    this.setDepth(5);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setBounce(0.2);

    // Name label (Lv# name)
    this.nameLabel = scene.add.text(x, y, `Lv${data.level} ${data.nameKo}`, {
      fontSize: "10px",
      fontFamily: "monospace",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 2,
    });
    this.nameLabel.setOrigin(0.5, 1);
    this.nameLabel.setDepth(15);

    // Chase indicator (hidden by default)
    this.chaseLabel = scene.add.text(x, y, "", {
      fontSize: "10px",
      fontFamily: "monospace",
      color: "#ff4444",
      stroke: "#000000",
      strokeThickness: 2,
    });
    this.chaseLabel.setOrigin(0.5, 1);
    this.chaseLabel.setDepth(15);
    this.chaseLabel.setVisible(false);
  }

  updateAI(
    delta: number,
    playerX: number,
    playerY: number,
    playerLevel: number,
    playerSpeed: number,
    isPlayerInvisible: boolean,
  ) {
    if (!this.active) return;

    // Update label positions and colors
    this.updateLabels(playerLevel);

    const distance = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      playerX,
      playerY,
    );

    const levelDiff = playerLevel - this.level;
    const baseDetection = 200 + this.level * 10;
    // Predators have reduced detection range (2/3)
    const detectionRange = baseDetection;

    // If player is invisible or out of range, wander
    if (isPlayerInvisible || distance > detectionRange) {
      this.aiState = NPCState.WANDER;
      this.chaseStartTime = 0;
      this.chaseLabel.setVisible(false);
      this.wander(delta);
      return;
    }

    if (levelDiff < 0) {
      // NPC is predator (higher level than player) - chase
      if (this.aiState !== NPCState.CHASE) {
        this.aiState = NPCState.CHASE;
        this.chaseStartTime = Date.now();
      }

      // Check chase duration limit
      if (Date.now() - this.chaseStartTime > this.MAX_CHASE_DURATION) {
        this.aiState = NPCState.WANDER;
        this.chaseStartTime = 0;
        this.chaseLabel.setVisible(false);
        this.wander(delta);
        return;
      }

      // Show chase countdown
      const remaining = Math.ceil(
        (this.MAX_CHASE_DURATION - (Date.now() - this.chaseStartTime)) / 1000,
      );
      this.chaseLabel.setText(`추격!(${remaining})`);
      this.chaseLabel.setVisible(true);

      this.chase(playerX, playerY, playerSpeed);
    } else if (levelDiff > 0) {
      // NPC is prey (lower level than player) - flee
      this.aiState = NPCState.FLEE;
      this.chaseStartTime = 0;
      this.chaseLabel.setVisible(false);
      this.flee(playerX, playerY, playerSpeed);
    } else {
      // Same level - wander
      this.aiState = NPCState.WANDER;
      this.chaseStartTime = 0;
      this.chaseLabel.setVisible(false);
      this.wander(delta);
    }
  }

  private updateLabels(playerLevel: number) {
    // Simple culling - only show labels for NPCs near the camera
    const cam = this.scene.cameras.main;
    const bounds = cam.worldView;
    const inView =
      this.x >= bounds.x - 50 &&
      this.x <= bounds.right + 50 &&
      this.y >= bounds.y - 50 &&
      this.y <= bounds.bottom + 50;

    if (!inView) {
      this.nameLabel.setVisible(false);
      this.chaseLabel.setVisible(false);
      return;
    }

    // Position labels above the NPC
    const offsetY = this.displayHeight / 2 + 5;
    this.nameLabel.setPosition(this.x, this.y - offsetY);
    this.chaseLabel.setPosition(this.x, this.y - offsetY - 14);
    this.nameLabel.setVisible(true);

    // Color based on level comparison
    if (this.level === 99 || this.level > playerLevel) {
      this.nameLabel.setColor("#ff4444"); // Red - predator / boss
    } else if (this.level === playerLevel) {
      this.nameLabel.setColor("#aaaaaa"); // Gray - same level
    } else {
      this.nameLabel.setColor("#44ff44"); // Green - prey
    }
  }

  private chase(targetX: number, targetY: number, playerSpeed: number) {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
    const speed = playerSpeed * 1.03; // 포식자 속도는 플레이어보다 약간 빠르게

    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    if (Math.cos(angle) < 0) this.setFlipX(true);
    else this.setFlipX(false);
  }

  private flee(targetX: number, targetY: number, playerSpeed: number) {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
    const speed = playerSpeed * 0.3; // 먹이 도망치는 속도는 플레이어보다 느리게

    this.setVelocity(-Math.cos(angle) * speed, -Math.sin(angle) * speed);

    if (-Math.cos(angle) < 0) this.setFlipX(true);
    else this.setFlipX(false);
  }

  private wander(delta: number) {
    this.wanderTimer += delta;

    if (this.wanderTimer >= this.WANDER_INTERVAL) {
      this.wanderTimer = 0;
      const angle = Math.random() * Math.PI * 2;
      this.wanderDirection.set(Math.cos(angle), Math.sin(angle));
    }

    const speed = this.baseSpeed * 0.5;
    this.setVelocity(
      this.wanderDirection.x * speed,
      this.wanderDirection.y * speed,
    );

    if (this.wanderDirection.x < 0) this.setFlipX(true);
    else if (this.wanderDirection.x > 0) this.setFlipX(false);
  }

  destroy(fromScene?: boolean) {
    this.nameLabel?.destroy();
    this.chaseLabel?.destroy();
    super.destroy(fromScene);
  }
}
