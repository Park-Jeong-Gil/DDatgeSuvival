import * as Phaser from "phaser";

export type PlayerState = "idle" | "run" | "eat";

export class Player extends Phaser.Physics.Arcade.Sprite {
  level: number = 1;
  currentSpeed: number = 113;
  private currentState: PlayerState = "idle";
  private eatTimer?: Phaser.Time.TimerEvent;

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
    body.setSize(Player.TEX_W, Player.TEX_H);
  }

  setPlayerState(state: PlayerState) {
    if (this.currentState === state) return;
    this.currentState = state;

    const textureKey = `player_${state}`;
    if (this.scene.textures.exists(textureKey)) {
      this.setTexture(textureKey);
    }
  }

  getPlayerState(): PlayerState {
    return this.currentState;
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
      body.setSize(Player.TEX_W, Player.TEX_H);
    }
  }
}
