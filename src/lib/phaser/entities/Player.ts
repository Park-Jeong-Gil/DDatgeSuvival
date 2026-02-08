import * as Phaser from "phaser";

export type PlayerState = "idle" | "run" | "eat";

export class Player extends Phaser.Physics.Arcade.Sprite {
  level: number = 1;
  currentSpeed: number = 113;
  private currentState: PlayerState = "idle";
  private eatTimer?: Phaser.Time.TimerEvent;
  private currentCostume: string | null = null; // 현재 착용 중인 코스튬
  private walkBounceOffset: number = 0; // 걷기 애니메이션 Y 오프셋
  private walkBounceSpeed: number = 0; // 걷기 애니메이션 속도
  private isWalking: boolean = false; // 걷는 중인지 여부
  private shadow?: Phaser.GameObjects.Graphics; // 그림자

  // 스프라이트 원본 크기 (370x262)
  public static readonly TEX_W = 370;
  public static readonly TEX_H = 262;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "player_idle");

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);

    const size = 30 + this.level * 3; // 플레이어 사이즈
    this.setScale(size / Player.TEX_H);
    this.setDepth(10);

    // 그림자 생성
    this.createShadow();

    const body = this.body as Phaser.Physics.Arcade.Body;
    // 물리 바디를 원본 텍스처 크기의 80%로 설정
    const bodyWidth = Player.TEX_W * 0.8;
    const bodyHeight = Player.TEX_H * 0.8;
    body.setSize(bodyWidth, bodyHeight);
    // 중앙 정렬
    const offsetX = (Player.TEX_W - bodyWidth) / 2;
    const offsetY = (Player.TEX_H - bodyHeight) / 2;
    body.setOffset(offsetX, offsetY);
  }

  setPlayerState(state: PlayerState) {
    if (this.currentState === state) return;
    this.currentState = state;

    const textureKey = this.getTextureKey(state);
    if (this.scene.textures.exists(textureKey)) {
      this.setTexture(textureKey);
    }
  }

  getPlayerState(): PlayerState {
    return this.currentState;
  }

  // 코스튬 변경
  changeCostume(costumeName: string) {
    this.currentCostume = costumeName;
    const textureKey = this.getTextureKey(this.currentState);
    if (this.scene.textures.exists(textureKey)) {
      this.setTexture(textureKey);
    }
  }
  // 현재 코스튼 가져오기
  getCurrentCostume(): string | null {
    return this.currentCostume;
  }
  // 코스튬 제거 (기본 외형으로)
  removeCostume() {
    this.currentCostume = null;
    const textureKey = this.getTextureKey(this.currentState);
    if (this.scene.textures.exists(textureKey)) {
      this.setTexture(textureKey);
    }
  }

  // 현재 코스튬에 맞는 텍스처 키 반환
  private getTextureKey(state: PlayerState): string {
    if (this.currentCostume) {
      return `costume_${this.currentCostume}_${state}`;
    }
    return `player_${state}`;
  }

  playEatAnimation() {
    this.setPlayerState("eat");
    if (this.eatTimer) this.eatTimer.destroy();
    this.eatTimer = this.scene.time.delayedCall(300, () => {
      if (this.active) {
        this.setPlayerState("idle");
      }
    });
  }

  updateStats(level: number) {
    this.level = level;
    this.currentSpeed = 107 + level * 7;
    const size = 30 + level * 3; // 플레이어 사이즈
    this.setScale(size / Player.TEX_H);

    // 그림자 업데이트
    this.updateShadow();

    if (this.body) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      // 물리 바디를 원본 텍스처 크기의 80%로 설정
      const bodyWidth = Player.TEX_W * 0.8;
      const bodyHeight = Player.TEX_H * 0.8;
      body.setSize(bodyWidth, bodyHeight);
      // 중앙 정렬
      const offsetX = (Player.TEX_W - bodyWidth) / 2;
      const offsetY = (Player.TEX_H - bodyHeight) / 2;
      body.setOffset(offsetX, offsetY);
    }
  }

  // 걷기 애니메이션 시작
  startWalking() {
    if (!this.isWalking) {
      this.isWalking = true;
      this.walkBounceSpeed = 0;
    }
  }

  // 걷기 애니메이션 중지
  stopWalking() {
    this.isWalking = false;
    this.walkBounceSpeed = 0;
    // 원래 위치로 부드럽게 복귀
    if (this.walkBounceOffset !== 0) {
      const returnSpeed = 0.3;
      this.walkBounceOffset += (0 - this.walkBounceOffset) * returnSpeed;
      if (Math.abs(this.walkBounceOffset) < 0.1) {
        this.walkBounceOffset = 0;
      }
    }
  }

  // 걷기 애니메이션 업데이트 (매 프레임 호출)
  updateWalkAnimation(delta: number) {
    if (this.isWalking) {
      // 걷기 애니메이션: 퉁퉁 튕기는 느낌
      const bounceAmplitude = 16; // 튕기는 높이 (픽셀) - 크게 증가
      const bounceFrequency = 0.01; // 튕기는 속도 (높을수록 빠름) - 더 빠르게

      this.walkBounceSpeed += bounceFrequency * delta;
      // abs(sin)을 사용하여 항상 위로 튕기는 느낌 (0 ~ amplitude 사이 값)
      this.walkBounceOffset =
        -Math.abs(Math.sin(this.walkBounceSpeed)) * bounceAmplitude;
    } else {
      // 정지 시 부드럽게 원래 위치로
      if (this.walkBounceOffset !== 0) {
        const returnSpeed = 0.3;
        this.walkBounceOffset += (0 - this.walkBounceOffset) * returnSpeed;
        if (Math.abs(this.walkBounceOffset) < 0.1) {
          this.walkBounceOffset = 0;
        }
      }
    }
  }

  // 걷기 애니메이션 오프셋 가져오기
  getWalkBounceOffset(): number {
    return this.walkBounceOffset;
  }

  // 그림자 생성
  private createShadow() {
    this.shadow = this.scene.add.graphics();
    this.shadow.setDepth(5); // 플레이어(10)보다 아래
    this.updateShadow();
  }

  // 그림자 업데이트
  updateShadow() {
    if (!this.shadow) return;

    this.shadow.clear();

    // 그림자 크기는 캐릭터 크기에 비례
    const shadowWidth = this.displayWidth * 0.8;
    const shadowHeight = this.displayHeight * 0.2;

    // 걷기 애니메이션에 따라 그림자 크기 조절 (캐릭터가 위로 갈수록 그림자 작아짐)
    const bounceOffset = Math.abs(this.walkBounceOffset);
    const shadowScale = 1 - bounceOffset * 0.025; // 최대 25% 축소

    const centerX = this.x;
    const centerY = this.y + this.displayHeight * 0.5;

    // 3단계 타원을 겹쳐서 부드러운 경계 효과 (성능 최적화)
    // 외부 - 가장 투명하고 큰 타원
    this.shadow.fillStyle(0x000000, 0.08);
    this.shadow.fillEllipse(
      centerX,
      centerY,
      shadowWidth * shadowScale * 1.2,
      shadowHeight * shadowScale * 1.2,
    );

    // 중간
    this.shadow.fillStyle(0x000000, 0.15);
    this.shadow.fillEllipse(
      centerX,
      centerY,
      shadowWidth * shadowScale,
      shadowHeight * shadowScale,
    );

    // 내부 - 가장 진하고 작은 타원
    this.shadow.fillStyle(0x000000, 0.2);
    this.shadow.fillEllipse(
      centerX,
      centerY,
      shadowWidth * shadowScale * 0.7,
      shadowHeight * shadowScale * 0.7,
    );
  }

  // 그림자 제거
  destroyShadow() {
    if (this.shadow) {
      this.shadow.destroy();
      this.shadow = undefined;
    }
  }

  destroy(fromScene?: boolean) {
    this.destroyShadow();
    super.destroy(fromScene);
  }
}
