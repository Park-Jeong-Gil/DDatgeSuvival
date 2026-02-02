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
  private lastFlipTime: number = 0; // 마지막 좌우 반전 시간
  private readonly FLIP_COOLDOWN = 200; // 최소 200ms 간격

  constructor(scene: Phaser.Scene, x: number, y: number, data: NPCData) {
    // walk 이미지를 기본으로 사용
    const walkKey = `${data.name.replace(/ /g, "_")}_walk`;
    const textureExists = scene.textures.exists(walkKey);

    if (!textureExists) {
      console.warn(
        `[NPC] Texture "${walkKey}" not found for Lv${data.level} ${data.nameKo}, using placeholder`,
      );
    }

    super(scene, x, y, textureExists ? walkKey : data.spriteKey);

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

    // 이미지의 원본 비율을 유지하면서 높이를 baseSize로 설정
    const textureFrame = this.texture.get();
    const aspectRatio = textureFrame.width / textureFrame.height;
    const displayWidth = data.baseSize * aspectRatio;
    const displayHeight = data.baseSize;

    this.setDisplaySize(displayWidth, displayHeight);

    this.setActive(true);
    this.setVisible(true);
    this.setAlpha(1);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setBounce(0.2);
    body.setCollideWorldBounds(true); // 물리 바디에서도 월드 경계 충돌 활성화
    // 물리 바디 크기를 표시 크기와 동일하게 설정
    body.setSize(displayWidth, displayHeight);
    body.setOffset(0, 0);

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

  private updateTexture(state: "walk" | "chase") {
    const baseName = this.npcData.name.replace(/ /g, "_");
    const textureKey = `${baseName}_${state}`;

    if (this.scene.textures.exists(textureKey)) {
      this.setTexture(textureKey);
    }
  }

  // 좌우 반전을 부드럽게 처리
  private safeSetFlipX(directionX: number) {
    const now = Date.now();

    // 방향이 분명하지 않으면 변경하지 않음
    if (Math.abs(directionX) < 0.1) return;

    // 쿨다운 중이면 변경하지 않음
    if (now - this.lastFlipTime < this.FLIP_COOLDOWN) return;

    const shouldFlip = directionX < 0;
    if (this.flipX !== shouldFlip) {
      this.setFlipX(shouldFlip);
      this.lastFlipTime = now;
    }
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
    bushes?: Phaser.Physics.Arcade.StaticGroup,
    isMobile?: boolean,
  ) {
    if (!this.active) return;

    // 월드 경계 체크 및 강제 이동
    const worldBounds = this.scene.physics.world.bounds;
    const margin = 10; // 경계에서 약간 안쪽으로
    let needsRepositioning = false;

    if (this.x < worldBounds.x + margin) {
      this.x = worldBounds.x + margin;
      needsRepositioning = true;
    } else if (this.x > worldBounds.right - margin) {
      this.x = worldBounds.right - margin;
      needsRepositioning = true;
    }

    if (this.y < worldBounds.y + margin) {
      this.y = worldBounds.y + margin;
      needsRepositioning = true;
    } else if (this.y > worldBounds.bottom - margin) {
      this.y = worldBounds.bottom - margin;
      needsRepositioning = true;
    }

    // 경계에 도달하면 안쪽으로 방향 전환
    if (needsRepositioning) {
      const centerX = worldBounds.centerX;
      const centerY = worldBounds.centerY;
      const angleToCenter = Phaser.Math.Angle.Between(
        this.x,
        this.y,
        centerX,
        centerY,
      );
      const speed = this.baseSpeed * 0.5;
      this.setVelocity(
        Math.cos(angleToCenter) * speed,
        Math.sin(angleToCenter) * speed,
      );
      // 배회 방향도 중앙으로 설정
      this.wanderDirection.set(
        Math.cos(angleToCenter),
        Math.sin(angleToCenter),
      );
    }

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
    const baseDetection = 180 + this.level * 5; // 감지 거리 기본값 원래 200 * 10

    let detectionRange = baseDetection;
    if (levelDiff < 0) {
      const reductionFactor = Math.pow(0.85, Math.abs(levelDiff));
      detectionRange = baseDetection * reductionFactor;
    }
    // 모바일: 화면이 좁으므로 감지 범위 2/3로 축소
    if (isMobile) {
      detectionRange *= 0.67;
    }

    // If player is invisible or out of range, wander
    if (isPlayerInvisible || distance > detectionRange) {
      this.aiState = NPCState.WANDER;
      this.chaseStartTime = 0;
      this.chaseLabel.setVisible(false);
      this.clearChaseBar();
      this.updateTexture("walk");
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
        // chase 텍스처로 변경
        this.updateTexture("chase");
      }

      // Chase duration limit
      if (Date.now() - this.chaseStartTime > this.MAX_CHASE_DURATION) {
        this._stunUntil = Date.now() + 5000;
        this.aiState = NPCState.WANDER;
        this.chaseStartTime = 0;
        this.chaseLabel.setVisible(false);
        this.clearChaseBar();
        this.setDepth(11);
        this.updateTexture("walk");
        return;
      }
      this.updateChaseBar(now, true, false);

      this.chase(playerX, playerY, playerSpeed, bushes);
    } else if (levelDiff > 0) {
      // NPC is prey - flee
      if (this.aiState === NPCState.CHASE) {
        this.setDepth(11);
        this.updateTexture("walk");
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
        this.updateTexture("walk");
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

  private chase(
    targetX: number,
    targetY: number,
    playerSpeed: number,
    bushes?: Phaser.Physics.Arcade.StaticGroup,
  ) {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
    let speed = playerSpeed * 1.01;

    // 추격 중인 포식자가 풀숲에 있으면 속도 감소
    if (bushes) {
      const inBush = bushes.children.entries.some((bush) => {
        const bushSprite = bush as Phaser.Physics.Arcade.Sprite;
        const distance = Phaser.Math.Distance.Between(
          this.x,
          this.y,
          bushSprite.x,
          bushSprite.y,
        );
        // 풀숲의 반경 내에 있는지 체크 (scale 9.0 적용)
        const bushRadius = (bushSprite.displayWidth / 2) * 0.9;
        return distance < bushRadius;
      });

      if (inBush) {
        speed *= 0.5;
      }
    }

    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    this.safeSetFlipX(Math.cos(angle));
  }

  private flee(targetX: number, targetY: number, playerSpeed: number) {
    const worldBounds = this.scene.physics.world.bounds;
    const margin = 100; // 경계로부터 여유 거리

    // 기본 도망 방향 계산 (플레이어 반대 방향)
    const angleFromPlayer = Phaser.Math.Angle.Between(
      this.x,
      this.y,
      targetX,
      targetY,
    );
    let fleeAngle = angleFromPlayer + Math.PI; // 반대 방향

    // 경계 근처인지 확인
    const nearLeftEdge = this.x < worldBounds.x + margin;
    const nearRightEdge = this.x > worldBounds.right - margin;
    const nearTopEdge = this.y < worldBounds.y + margin;
    const nearBottomEdge = this.y > worldBounds.bottom - margin;

    // 경계 근처라면 도망 방향을 조정
    if (nearLeftEdge || nearRightEdge || nearTopEdge || nearBottomEdge) {
      // 맵 중앙으로 향하는 각도
      const centerX = worldBounds.centerX;
      const centerY = worldBounds.centerY;
      const angleToCenter = Phaser.Math.Angle.Between(
        this.x,
        this.y,
        centerX,
        centerY,
      );

      // 플레이어로부터 도망가면서도 중앙을 향하도록 각도 혼합
      // 경계에 가까울수록 중앙 방향 비중 증가
      let centerWeight = 0;

      if (nearLeftEdge)
        centerWeight = Math.max(
          centerWeight,
          1 - (this.x - worldBounds.x) / margin,
        );
      if (nearRightEdge)
        centerWeight = Math.max(
          centerWeight,
          1 - (worldBounds.right - this.x) / margin,
        );
      if (nearTopEdge)
        centerWeight = Math.max(
          centerWeight,
          1 - (this.y - worldBounds.y) / margin,
        );
      if (nearBottomEdge)
        centerWeight = Math.max(
          centerWeight,
          1 - (worldBounds.bottom - this.y) / margin,
        );

      // 경계에 매우 가까우면 거의 중앙으로만 이동
      if (centerWeight > 0.7) {
        fleeAngle = angleToCenter;
      } else {
        // 도망 방향과 중앙 방향을 혼합
        const fleeX = Math.cos(fleeAngle);
        const fleeY = Math.sin(fleeAngle);
        const centerX_dir = Math.cos(angleToCenter);
        const centerY_dir = Math.sin(angleToCenter);

        const mixedX = fleeX * (1 - centerWeight) + centerX_dir * centerWeight;
        const mixedY = fleeY * (1 - centerWeight) + centerY_dir * centerWeight;

        fleeAngle = Math.atan2(mixedY, mixedX);
      }
    }

    const speed = playerSpeed * 0.3;
    this.setVelocity(Math.cos(fleeAngle) * speed, Math.sin(fleeAngle) * speed);

    this.safeSetFlipX(Math.cos(fleeAngle));
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

    this.safeSetFlipX(this.wanderDirection.x);
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
