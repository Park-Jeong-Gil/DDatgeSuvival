import * as Phaser from "phaser";
import { applyRestPose, movementAnimationKey } from "../animations/movement";

export type PlayerState = "idle" | "run" | "eat";

export class Player extends Phaser.Physics.Arcade.Sprite {
  level: number = 1;
  currentSpeed: number = 113;
  private currentState: PlayerState = "idle";
  private eatTimer?: Phaser.Time.TimerEvent;
  private currentCostume: string | null = null; // 현재 착용 중인 코스튬
  private animPausedByPhysics: boolean = false; // 물리 일시정지로 멈춘 달리기 애니메이션
  private shadow?: Phaser.GameObjects.Graphics; // 그림자
  private giantPowerFX?: Phaser.FX.Glow | null; // 거인의 힘 아웃라인

  // 스프라이트 원본 크기 (370x262)
  public static readonly TEX_W = 370;
  public static readonly TEX_H = 262;

  get bodyDisplayWidth(): number { return Math.abs(Player.TEX_W * this.scaleX); }
  get bodyDisplayHeight(): number { return Math.abs(Player.TEX_H * this.scaleY); }

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
    const offsetX = (this.width - bodyWidth) / 2;
    const offsetY = (this.height - bodyHeight) / 2;
    body.setOffset(offsetX, offsetY);
  }

  setPlayerState(state: PlayerState) {
    if (this.currentState === state) return;
    this.currentState = state;
    this.refreshTexture();
  }

  getPlayerState(): PlayerState {
    return this.currentState;
  }

  // 코스튬 변경
  changeCostume(costumeName: string) {
    this.currentCostume = costumeName;
    this.refreshTexture();
  }
  // 현재 코스튼 가져오기
  getCurrentCostume(): string | null {
    return this.currentCostume;
  }
  // 코스튬 제거 (기본 외형으로)
  removeCostume() {
    this.currentCostume = null;
    this.refreshTexture();
  }

  private refreshTexture() {
    const textureKey = this.getTextureKey(this.currentState);
    const animationKey = movementAnimationKey(textureKey);
    if (this.currentState === "run" && this.scene.anims.exists(animationKey)) {
      this.play(animationKey, true);
      // 물리 일시정지 중 상태·의상이 바뀌어도 재개 전까지 첫 프레임에 멈춘다
      if (this.scene.physics.world.isPaused) {
        this.anims.pause();
        this.animPausedByPhysics = true;
      }
      this.syncBodyFrame();
      return;
    }

    // stop()은 pause 상태를 지우지 않으므로 먼저 resume해야 재개 시 다시 재생되지 않는다
    if (this.anims.isPaused) this.anims.resume();
    this.animPausedByPhysics = false;
    this.anims.stop();
    if (applyRestPose(this, textureKey)) this.syncBodyFrame();
  }

  private syncBodyFrame() {
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!body) return;
    const width = Player.TEX_W * 0.8, height = Player.TEX_H * 0.8;
    body.setSize(width, height);
    body.setOffset((this.width - width) / 2, (this.height - height) / 2);
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
        const moving = (this.body as Phaser.Physics.Arcade.Body | null)?.velocity.lengthSq();
        this.setPlayerState(moving && moving > 1 ? "run" : "idle");
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
      const offsetX = (this.width - bodyWidth) / 2;
      const offsetY = (this.height - bodyHeight) / 2;
      body.setOffset(offsetX, offsetY);
    }
  }

  preUpdate(time: number, delta: number) {
    // 물리만 일시정지된 경우에도 다리가 움직이지 않도록 애니메이션을 멈춘다 (NPC와 동일)
    if (this.scene.physics.world.isPaused) {
      if (this.anims.isPlaying) {
        this.anims.pause();
        this.animPausedByPhysics = true;
      }
    } else if (this.animPausedByPhysics) {
      this.animPausedByPhysics = false;
      if (this.anims.isPaused) this.anims.resume();
    }
    super.preUpdate(time, delta);
  }

  // 달리기 애니메이션 재생 속도를 실제 이동 속도에 맞춤 (매 프레임 호출)
  updateWalkAnimation() {
    if (this.currentState === "run" && this.anims.isPlaying) {
      const body = this.body as Phaser.Physics.Arcade.Body;
      this.anims.timeScale = Phaser.Math.Clamp(
        body.velocity.length() / this.currentSpeed,
        0.5,
        1.8,
      );
    }
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
    const shadowWidth = this.bodyDisplayWidth * 0.8;
    const shadowHeight = this.bodyDisplayHeight * 0.2;

    const centerX = this.x;
    const centerY = this.y + this.bodyDisplayHeight * 0.5;

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
    this.shadow.fillEllipse(
      centerX,
      centerY,
      shadowWidth,
      shadowHeight,
    );

    // 내부 - 가장 진하고 작은 타원
    this.shadow.fillStyle(0x000000, 0.2);
    this.shadow.fillEllipse(
      centerX,
      centerY,
      shadowWidth * 0.7,
      shadowHeight * 0.7,
    );
  }

  // 거인의 힘 주황색 아웃라인 추가
  addGiantPowerOutline() {
    if (!this.giantPowerFX && this.preFX) {
      this.giantPowerFX = this.preFX.addGlow(0xff8800, 4, 0, false, 0.5, 16);
    }
  }

  // 거인의 힘 아웃라인 제거
  removeGiantPowerOutline() {
    if (this.giantPowerFX) {
      if (this.preFX) {
        this.preFX.remove(this.giantPowerFX);
      }
      this.giantPowerFX = null;
    }
  }

  // 거인의 힘 아웃라인 표시/숨김 (깜빡임용)
  setGiantPowerOutlineVisible(visible: boolean) {
    if (this.giantPowerFX) {
      this.giantPowerFX.active = visible;
    }
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
