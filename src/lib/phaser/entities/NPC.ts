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
  private readonly MAX_CHASE_DURATION = 10000;

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

    const distance = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      playerX,
      playerY,
    );
    const detectionRange = 200 + this.level * 10;

    // If player is invisible or out of range, wander
    if (isPlayerInvisible || distance > detectionRange) {
      this.aiState = NPCState.WANDER;
      this.chaseStartTime = 0;
      this.wander(delta);
      return;
    }

    const levelDiff = playerLevel - this.level;

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
        this.wander(delta);
        return;
      }

      this.chase(playerX, playerY, playerSpeed);
    } else if (levelDiff > 0) {
      // NPC is prey (lower level than player) - flee
      this.aiState = NPCState.FLEE;
      this.chaseStartTime = 0;
      this.flee(playerX, playerY, playerSpeed);
    } else {
      // Same level - wander
      this.aiState = NPCState.WANDER;
      this.chaseStartTime = 0;
      this.wander(delta);
    }
  }

  private chase(targetX: number, targetY: number, playerSpeed: number) {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
    // Predator chases at 100.5% of player speed — threatening but escapable
    const speed = playerSpeed * 1.005;

    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    if (Math.cos(angle) < 0) this.setFlipX(true);
    else this.setFlipX(false);
  }

  private flee(targetX: number, targetY: number, playerSpeed: number) {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
    // Prey flees at 30% of player speed — catchable with ease
    const speed = playerSpeed * 0.3;

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
}
