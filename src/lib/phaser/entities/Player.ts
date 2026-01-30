import * as Phaser from "phaser";

export class Player extends Phaser.Physics.Arcade.Sprite {
  level: number = 1;
  currentSpeed: number = 85;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "player_default");

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);

    const size = 16 + this.level * 2; // Lv1 = 18px
    this.setScale(size / 32);
    this.setDepth(10);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(28, 28);
  }

  updateStats(level: number) {
    this.level = level;
    this.currentSpeed = 80 + level * 5;
    const size = 16 + level * 2;
    this.setScale(size / 32);
  }
}
