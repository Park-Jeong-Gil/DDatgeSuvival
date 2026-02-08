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
  public isKnockedBack: boolean = false; // 넉백 중인지 여부
  private nameLabel: Phaser.GameObjects.Text;
  private currentLabelColor: string = "";
  private lastSeenAt: number = -Infinity;
  private lastRenderCheckAt: number = 0;
  private lastRecoverAt: number = 0;
  private renderableNow: boolean = true;
  private lastFlipTime: number = 0; // 마지막 좌우 반전 시간
  private readonly FLIP_COOLDOWN = 200; // 최소 200ms 간격
  private shadow?: Phaser.GameObjects.Graphics; // 그림자
  private outlineFX?: Phaser.FX.Glow | null; // 포식자 아웃라인

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

    // 그림자 생성
    this.createShadow();

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

    // 공룡(level 99)만 물리 바디를 축소 (실제 보이는 공룡 영역만 충돌 감지)
    if (data.level === 99) {
      const bodyWidth = textureFrame.width * 0.4; // 원본 크기의 40%
      const bodyHeight = textureFrame.height * 0.5; // 원본 크기의 50%
      body.setSize(bodyWidth, bodyHeight);

      // 중앙 정렬을 위한 오프셋 계산
      const offsetX = (textureFrame.width - bodyWidth) / 2;
      const offsetY = (textureFrame.height - bodyHeight) / 2;
      body.setOffset(offsetX, offsetY);
    } else {
      // 일반 NPC는 원본 텍스처 크기의 80%
      const bodyWidth = textureFrame.width * 0.8;
      const bodyHeight = textureFrame.height * 0.8;
      body.setSize(bodyWidth, bodyHeight);
      // 중앙 정렬
      const offsetX = (textureFrame.width - bodyWidth) / 2;
      const offsetY = (textureFrame.height - bodyHeight) / 2;
      body.setOffset(offsetX, offsetY);
    }

    // Name label - 모바일에서는 폰트 사이즈 2배
    const isMobile = typeof window !== "undefined" && window.innerWidth <= 960;
    const labelFontSize = isMobile ? "20px" : "12px";
    this.nameLabel = scene.add.text(x, y, `Lv${data.level} ${data.nameKo}`, {
      fontSize: labelFontSize,
      fontFamily: "Mulmaru",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 2,
    });
    this.nameLabel.setOrigin(0.5, 1);
    this.nameLabel.setDepth(15);
    this.nameLabel.setFontFamily("Mulmaru");
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

    // Manual AABB check (avoids getBounds() object allocation)
    const hw = this.displayWidth / 2;
    const hh = this.displayHeight / 2;
    const wv = camera.worldView;
    return (
      this.x + hw > wv.x &&
      this.x - hw < wv.right &&
      this.y + hh > wv.y &&
      this.y - hh < wv.bottom
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
      // 공룡(level 99)은 축소된 크기 유지, 나머지는 원본 크기의 80%
      if (this.level === 99) {
        const bodyWidth = this.width * 0.4;
        const bodyHeight = this.height * 0.5;
        body.setSize(bodyWidth, bodyHeight);
        const offsetX = (this.width - bodyWidth) / 2;
        const offsetY = (this.height - bodyHeight) / 2;
        body.setOffset(offsetX, offsetY);
      } else {
        const bodyWidth = this.width * 0.8;
        const bodyHeight = this.height * 0.8;
        body.setSize(bodyWidth, bodyHeight);
        const offsetX = (this.width - bodyWidth) / 2;
        const offsetY = (this.height - bodyHeight) / 2;
        body.setOffset(offsetX, offsetY);
      }
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
      // 공룡(level 99)은 축소된 크기 유지, 나머지는 원본 크기의 80%
      if (this.level === 99) {
        const bodyWidth = this.width * 0.4;
        const bodyHeight = this.height * 0.5;
        body.setSize(bodyWidth, bodyHeight);
        const offsetX = (this.width - bodyWidth) / 2;
        const offsetY = (this.height - bodyHeight) / 2;
        body.setOffset(offsetX, offsetY);
      } else {
        const bodyWidth = this.width * 0.8;
        const bodyHeight = this.height * 0.8;
        body.setSize(bodyWidth, bodyHeight);
        const offsetX = (this.width - bodyWidth) / 2;
        const offsetY = (this.height - bodyHeight) / 2;
        body.setOffset(offsetX, offsetY);
      }
    }
  }

  updateAI(
    delta: number,
    playerX: number,
    playerY: number,
    playerLevel: number,
    playerSpeed: number,
    isPlayerInvisible: boolean,
    bushData?: { x: number; y: number; r2: number }[],
    isMobile?: boolean,
    predatorSpeedMultiplier?: number,
    hasAttractPreyBuff?: boolean,
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
      // 넉백 중이 아니면 속도를 0으로 설정 (일반 기절)
      if (!this.isKnockedBack) {
        this.setVelocity(0, 0);
      }
      // 기절 중에는 어두운 색상 유지
      if (!this.tintTopLeft || this.tintTopLeft === 0xffffff) {
        this.setTint(0x888888);
      }
      // 정지 중에도 라벨 위치 업데이트
      const offsetY = this.displayHeight / 2 + 5;
      this.nameLabel.setPosition(this.x, this.y - offsetY);
      this.nameLabel.setVisible(true);
      return;
    }

    // 기절이 풀렸으면 원래 색으로 복구
    if (this.tintTopLeft === 0x888888) {
      this.clearTint();
    }

    this.updateLabels(playerLevel);

    const distance = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      playerX,
      playerY,
    );

    const levelDiff = playerLevel - this.level;
    const baseDetection = 185 + this.level * 5; // 감지 거리 기본값 원래 200 * 10

    let detectionRange = baseDetection;
    // 공룡(level 99)은 보스이므로 항상 최대 감지 거리 유지
    if (this.level === 99) {
      detectionRange = baseDetection * 1.5; // 보스는 1.5배 넓은 감지 범위
    } else if (levelDiff < 0) {
      const reductionFactor = Math.pow(0.85, Math.abs(levelDiff));
      detectionRange = baseDetection * reductionFactor;
    }
    // 모바일: 포식자는 0.75배, 그 외는 2/3로 축소
    if (isMobile) {
      if (levelDiff < 0) {
        // 포식자는 감지 범위 0.75배
        detectionRange *= 0.75;
      } else {
        // 먹이는 화면이 좁으므로 감지 범위 2/3로 축소
        detectionRange *= 0.67;
      }
    }

    // If player is invisible or out of range, wander
    if (isPlayerInvisible || distance > detectionRange) {
      if (this.aiState === NPCState.CHASE) {
        // 추격 종료 시 아웃라인 제거
        this.removePredatorOutline();
      }
      this.aiState = NPCState.WANDER;
      this.chaseStartTime = 0;
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
        // 포식자 빨간색 아웃라인 추가
        this.addPredatorOutline();
      }

      // Chase duration limit (공룡은 제한 없음)
      if (
        this.level !== 99 &&
        Date.now() - this.chaseStartTime > this.MAX_CHASE_DURATION
      ) {
        this._stunUntil = Date.now() + 5000;
        this.aiState = NPCState.WANDER;
        this.chaseStartTime = 0;
        this.setDepth(11);
        this.updateTexture("walk");
        this.removePredatorOutline();
        return;
      }
      this.chase(playerX, playerY, playerSpeed, bushData, predatorSpeedMultiplier);
    } else if (levelDiff > 0) {
      // NPC is prey - flee
      if (this.aiState === NPCState.CHASE) {
        this.setDepth(11);
        this.updateTexture("walk");
        this.removePredatorOutline();
      }
      this.aiState = NPCState.FLEE;
      this.chaseStartTime = 0;
      this.flee(playerX, playerY, playerSpeed, hasAttractPreyBuff);
    } else {
      // Same level - wander
      if (this.aiState === NPCState.CHASE) {
        this.setDepth(11);
        this.updateTexture("walk");
        this.removePredatorOutline();
      }
      this.aiState = NPCState.WANDER;
      this.chaseStartTime = 0;
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
      return;
    }

    const offsetY = this.displayHeight / 2 + 5;
    this.nameLabel.setPosition(this.x, this.y - offsetY);
    this.nameLabel.setVisible(true);

    // Only call setColor when color actually changes (avoids Canvas2D re-render per frame)
    const newColor =
      this.level === 99 || this.level > playerLevel
        ? "#ff4444"
        : this.level === playerLevel
          ? "#c3c3c3"
          : "#fff42a";
    if (this.currentLabelColor !== newColor) {
      this.currentLabelColor = newColor;
      this.nameLabel.setColor(newColor);
    }
  }

  private chase(
    targetX: number,
    targetY: number,
    playerSpeed: number,
    bushData?: { x: number; y: number; r2: number }[],
    predatorSpeedMultiplier?: number,
  ) {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
    // let speed = playerSpeed * 1.01;
    // let speed = playerSpeed * 1;
    let speed = playerSpeed * 0.995;
    // let speed = playerSpeed * 1.0001;

    // 추격 중인 포식자가 풀숲에 있으면 속도 감소 (cached data, squared distance)
    if (bushData) {
      const nx = this.x;
      const ny = this.y;
      for (let i = 0; i < bushData.length; i++) {
        const b = bushData[i];
        const dx = nx - b.x;
        const dy = ny - b.y;
        if (dx * dx + dy * dy < b.r2) {
          speed *= 0.5;
          break;
        }
      }
    }

    // slow_predator 효과 적용
    if (predatorSpeedMultiplier !== undefined) {
      speed *= predatorSpeedMultiplier;
    }

    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    this.safeSetFlipX(Math.cos(angle));
  }

  private flee(targetX: number, targetY: number, playerSpeed: number, hasAttractPreyBuff?: boolean) {
    // attract_prey 효과가 있으면 플레이어에게 다가감
    if (hasAttractPreyBuff) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
      const speed = playerSpeed * 0.4;
      this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      this.safeSetFlipX(Math.cos(angle));
      return;
    }

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

  /** Returns bar state for shared rendering (NPCManager draws all bars in one pass) */
  public getBarState(): {
    type: "chase" | "stun";
    ratio: number;
  } | null {
    // 공룡(level 99)은 바 표시하지 않음
    if (this.level === 99) {
      return null;
    }

    const now = Date.now();
    if (now < this._stunUntil) {
      const remaining = this._stunUntil - now;
      return {
        type: "stun",
        ratio: Phaser.Math.Clamp(1 - remaining / 5000, 0, 1),
      };
    }
    if (this.aiState === NPCState.CHASE && this.chaseStartTime > 0) {
      const elapsed = now - this.chaseStartTime;
      return {
        type: "chase",
        ratio: Phaser.Math.Clamp(
          (this.MAX_CHASE_DURATION - elapsed) / this.MAX_CHASE_DURATION,
          0,
          1,
        ),
      };
    }
    return null;
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
    this.destroyShadow();

    super.destroy(fromScene);
  }

  // 그림자 생성
  private createShadow() {
    this.shadow = this.scene.add.graphics();
    this.shadow.setDepth(5); // NPC(11)보다 아래
    this.updateShadow();
  }

  // 그림자 업데이트
  updateShadow() {
    if (!this.shadow || !this.active) return;

    this.shadow.clear();

    // 그림자 크기는 캐릭터 크기에 비례
    const shadowWidth = this.displayWidth * 0.8;
    const shadowHeight = this.displayHeight * 0.2;

    // NPC 데이터에 shadowOffsetY가 있으면 사용, 없으면 기본값 0.45
    const shadowOffsetY = this.npcData.shadowOffsetY ?? 0.45;
    const centerX = this.x;
    const centerY = this.y + this.displayHeight * shadowOffsetY;

    // 3단계 타원을 겹쳐서 부드러운 경계 효과 (성능 최적화)
    // 외부 - 가장 투명하고 큰 타원
    this.shadow.fillStyle(0x000000, 0.08);
    this.shadow.fillEllipse(
      centerX,
      centerY,
      shadowWidth * 1.2,
      shadowHeight * 1.2,
    );

    // 중간
    this.shadow.fillStyle(0x000000, 0.15);
    this.shadow.fillEllipse(centerX, centerY, shadowWidth, shadowHeight);

    // 내부 - 가장 진하고 작은 타원
    this.shadow.fillStyle(0x000000, 0.2);
    this.shadow.fillEllipse(
      centerX,
      centerY,
      shadowWidth * 0.7,
      shadowHeight * 0.7,
    );
  }

  // 그림자 제거
  private destroyShadow() {
    if (this.shadow) {
      this.shadow.destroy();
      this.shadow = undefined;
    }
  }

  // 포식자 빨간색 아웃라인 추가
  private addPredatorOutline() {
    if (!this.outlineFX && this.preFX) {
      this.outlineFX = this.preFX.addGlow(0xff0000, 3, 0, false, 0.3, 10);
    }
  }

  // 포식자 아웃라인 제거
  private removePredatorOutline() {
    if (this.outlineFX) {
      if (this.preFX) {
        this.preFX.remove(this.outlineFX);
      }
      this.outlineFX = null;
    }
  }
}
