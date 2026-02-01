import * as Phaser from "phaser";
import type { NPCData } from "@/types/npc";
import { NPCState } from "@/types/npc";

export class NPC extends Phaser.Physics.Arcade.Sprite {
  npcData: NPCData;
  level: number;
  baseSpeed: number;
  scoreValue: number;
  hungerRestore: number;
  destroyed: boolean = false;
  aiState: NPCState = NPCState.WANDER;
  private wanderTimer: number = 0;
  private wanderDirection: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
  private readonly WANDER_INTERVAL = 2000 + Math.random() * 2000;
  private chaseStartTime: number = 0;
  private readonly MAX_CHASE_DURATION = 8000;
  private _stunUntil: number = 0;
  private nameLabel: Phaser.GameObjects.Text;
  private chaseLabel: Phaser.GameObjects.Text;
  private chaseBarGraphics?: Phaser.GameObjects.Graphics;
  private lastSeenAt: number = -Infinity;
  private lastRenderCheckAt: number = 0;
  private lastRecoverAt: number = 0;
  private renderableNow: boolean = true;

  constructor(scene: Phaser.Scene, x: number, y: number, data: NPCData) {
    const textureKey = data.spriteKey;
    const textureExists = scene.textures.exists(textureKey);

    if (!textureExists) {
      console.error(
        `[NPC] Texture "${textureKey}" not found for Lv${data.level} ${data.nameKo}`,
      );
    }

    super(scene, x, y, textureExists ? textureKey : "npc_0");

    this.npcData = data;
    this.level = data.level;
    this.baseSpeed = data.baseSpeed;
    this.scoreValue = data.scoreValue;
    this.hungerRestore = data.hungerRestore;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // NPC는 항상 플레이어(depth 10) 위에 렌더링
    this.setDepth(11);

    this.setCollideWorldBounds(true);
    const scale = data.baseSize / (data.level === 99 ? 128 : 32);
    this.setScale(scale);
    this.setActive(true);
    this.setVisible(true);
    this.setAlpha(1);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setBounce(0.2);
    body.setSize(this.displayWidth, this.displayHeight, true);

    // Name label
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

    this.chaseBarGraphics = scene.add.graphics();
    this.chaseBarGraphics.setDepth(15);
  }

  public getNameLabelText(): string {
    return this.nameLabel?.text || `Lv${this.level}`;
  }

  public isNameLabelVisible(): boolean {
    return this.nameLabel?.visible ?? false;
  }

  public isChasing(): boolean {
    return this.aiState === NPCState.CHASE;
  }

  public set stunUntil(time: number) {
    this._stunUntil = time;
  }

  public get stunUntil(): number {
    return this._stunUntil;
  }

  private isTextureReady(): boolean {
    const textureKey = this.texture?.key;
    if (!textureKey || !this.scene.textures.exists(textureKey)) return false;
    const texture = this.scene.textures.get(textureKey);
    const source = texture?.source?.[0];
    return !!source && source.width > 0 && source.height > 0;
  }

  public isRenderableInCamera(camera: Phaser.Cameras.Scene2D.Camera): boolean {
    if (this.destroyed || !this.active) return false;
    if (!this.visible || this.alpha <= 0) return false;
    if (this.displayWidth <= 0 || this.displayHeight <= 0) return false;
    if (!this.isTextureReady()) return false;
    if (!this.scene.sys.displayList.exists(this)) return false;

    const bounds = this.getBounds();
    return Phaser.Geom.Intersects.RectangleToRectangle(
      camera.worldView,
      bounds,
    );
  }

  public wasRecentlyVisible(now: number, windowMs: number = 200): boolean {
    return now - this.lastSeenAt <= windowMs;
  }

  public recoverRenderState() {
    this.ensureRenderable();
  }

  preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);
    const cam = this.scene?.cameras?.main;
    if (!cam) return;
    if (time - this.lastRenderCheckAt >= 150) {
      this.lastRenderCheckAt = time;
      this.renderableNow = this.isRenderableInCamera(cam);
      if (this.renderableNow) {
        this.lastSeenAt = time;
      }
      if (!this.renderableNow && time - this.lastRecoverAt >= 500) {
        this.lastRecoverAt = time;
        this.ensureRenderable();
      }
    }
    this.syncPhysicsWithRenderState(cam, time, this.renderableNow);
  }

  private ensureRenderable() {
    if (this.destroyed || !this.active) return;

    const displayList = this.scene?.sys?.displayList;
    if (displayList && !displayList.exists(this)) {
      displayList.add(this);
    }
    if (!this.visible) this.setVisible(true);
    if (this.alpha <= 0) this.setAlpha(1);

    const textureKey = this.texture?.key;
    if (!textureKey || !this.scene.textures.exists(textureKey)) {
      if (this.scene.textures.exists("npc_0")) {
        this.setTexture("npc_0");
      }
    }

    if (this.body) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      if (!this.isTextureReady()) {
        body.enable = false;
        return;
      }
      body.setSize(this.displayWidth, this.displayHeight, true);
    }
  }

  private syncPhysicsWithRenderState(
    camera: Phaser.Cameras.Scene2D.Camera,
    now: number,
    renderableNow: boolean,
  ) {
    if (this.destroyed || !this.active || !this.body) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (!this.isTextureReady()) {
      if (body.enable) {
        this.setVelocity(0, 0);
        body.enable = false;
      }
      return;
    }
    const shouldHavePhysics = renderableNow || this.wasRecentlyVisible(now);

    if (!shouldHavePhysics) {
      if (body.enable) {
        this.setVelocity(0, 0);
        body.enable = false;
      }
      return;
    }

    if (!body.enable) {
      body.enable = true;
      body.reset(this.x, this.y);
      body.setSize(this.displayWidth, this.displayHeight, true);
    }
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

    const now = Date.now();

    // 정지 상태 체크
    if (now < this._stunUntil) {
      this.setVelocity(0, 0);
      // 정지 중에도 라벨 위치 업데이트
      const offsetY = this.displayHeight / 2 + 5;
      this.nameLabel.setPosition(this.x, this.y - offsetY);
      this.nameLabel.setVisible(true);
      this.updateChaseBar(now, false, true);
      return;
    }

    this.updateLabels(playerLevel);

    const distance = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      playerX,
      playerY,
    );

    const levelDiff = playerLevel - this.level;
    const baseDetection = 200 + this.level * 10;

    let detectionRange = baseDetection;
    if (levelDiff < 0) {
      const reductionFactor = Math.pow(0.85, Math.abs(levelDiff));
      detectionRange = baseDetection * reductionFactor;
    }

    // If player is invisible or out of range, wander
    if (isPlayerInvisible || distance > detectionRange) {
      this.aiState = NPCState.WANDER;
      this.chaseStartTime = 0;
      this.chaseLabel.setVisible(false);
      this.clearChaseBar();
      this.wander(delta);
      return;
    }

    if (levelDiff < 0) {
      // NPC is predator - chase
      if (this.aiState !== NPCState.CHASE) {
        this.aiState = NPCState.CHASE;
        this.chaseStartTime = Date.now();
        // 추격 시 depth를 12로 올려 다른 NPC 위에 표시
        this.setDepth(12);
      }

      // Chase duration limit
      if (Date.now() - this.chaseStartTime > this.MAX_CHASE_DURATION) {
        this._stunUntil = Date.now() + 5000;
        this.aiState = NPCState.WANDER;
        this.chaseStartTime = 0;
        this.chaseLabel.setVisible(false);
        this.clearChaseBar();
        this.setDepth(11);
        return;
      }
      this.updateChaseBar(now, true, false);

      this.chase(playerX, playerY, playerSpeed);
    } else if (levelDiff > 0) {
      // NPC is prey - flee
      if (this.aiState === NPCState.CHASE) {
        this.setDepth(11);
      }
      this.aiState = NPCState.FLEE;
      this.chaseStartTime = 0;
      this.chaseLabel.setVisible(false);
      this.clearChaseBar();
      this.flee(playerX, playerY, playerSpeed);
    } else {
      // Same level - wander
      if (this.aiState === NPCState.CHASE) {
        this.setDepth(11);
      }
      this.aiState = NPCState.WANDER;
      this.chaseStartTime = 0;
      this.chaseLabel.setVisible(false);
      this.clearChaseBar();
      this.wander(delta);
    }
  }

  private updateLabels(playerLevel: number) {
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
      this.clearChaseBar();
      return;
    }

    const offsetY = this.displayHeight / 2 + 5;
    this.nameLabel.setPosition(this.x, this.y - offsetY);
    this.nameLabel.setVisible(true);

    if (this.level === 99 || this.level > playerLevel) {
      this.nameLabel.setColor("#ff4444");
    } else if (this.level === playerLevel) {
      this.nameLabel.setColor("#aaaaaa");
    } else {
      this.nameLabel.setColor("#44ff44");
    }
  }

  private chase(targetX: number, targetY: number, playerSpeed: number) {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
    const speed = playerSpeed * 1.01;

    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    if (Math.cos(angle) < 0) this.setFlipX(true);
    else this.setFlipX(false);
  }

  private flee(targetX: number, targetY: number, playerSpeed: number) {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
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

  private updateChaseBar(now: number, isChasing: boolean, isStunned: boolean) {
    if (!this.chaseBarGraphics) return;

    const barWidth = Math.max(32, this.displayWidth * 1.6);
    const barHeight = 4;
    const barX = this.x - barWidth / 2;
    const barY = this.y + this.displayHeight / 2 + 6;

    let ratio = 0;
    if (isChasing) {
      const elapsed = now - this.chaseStartTime;
      ratio = Phaser.Math.Clamp(
        (this.MAX_CHASE_DURATION - elapsed) / this.MAX_CHASE_DURATION,
        0,
        1,
      );
    } else if (isStunned) {
      const remaining = this._stunUntil - now;
      const total = 5000;
      ratio = Phaser.Math.Clamp(1 - remaining / total, 0, 1);
    }

    this.chaseBarGraphics.clear();
    this.chaseBarGraphics.fillStyle(0x374151, 1);
    this.chaseBarGraphics.fillRoundedRect(barX, barY, barWidth, barHeight, 2);

    const fillColor = isStunned ? 0x22c55e : 0xef4444;
    this.chaseBarGraphics.fillStyle(fillColor, 1);
    this.chaseBarGraphics.fillRoundedRect(
      barX,
      barY,
      Math.max(2, barWidth * ratio),
      barHeight,
      2,
    );
  }

  private clearChaseBar() {
    this.chaseBarGraphics?.clear();
  }

  destroy(fromScene?: boolean) {
    this.active = false;
    this.destroyed = true;
    this.visible = false;

    if (this.body) {
      this.setVelocity(0, 0);
    }

    if (this.body) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.enable = false;

      if (this.scene && this.scene.physics && this.scene.physics.world) {
        this.scene.physics.world.remove(body);
      }
    }

    this.nameLabel?.destroy();
    this.chaseLabel?.destroy();
    this.chaseBarGraphics?.destroy();

    super.destroy(fromScene);
  }
}
