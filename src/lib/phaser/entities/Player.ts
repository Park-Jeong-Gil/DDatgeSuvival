import * as Phaser from "phaser";

export type PlayerState = "idle" | "run" | "eat";

export class Player extends Phaser.Physics.Arcade.Sprite {
  level: number = 1;
  currentSpeed: number = 113;
  private currentState: PlayerState = "idle";
  private eatTimer?: Phaser.Time.TimerEvent;
  private currentCostume: string | null = null; // 현재 착용 중인 코스튬

  // 스프라이트 원본 크기 (370x262)
  private static readonly TEX_W = 370;
  private static readonly TEX_H = 262;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "player_idle");

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);

    const size = 32 + this.level * 4; // Lv1 = 36px (2x)
    this.setScale(size / Player.TEX_H);
    this.setDepth(10);

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
    const size = 32 + level * 4;
    this.setScale(size / Player.TEX_H);

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
}
