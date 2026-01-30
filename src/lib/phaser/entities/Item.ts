import * as Phaser from "phaser";
import type { ItemData } from "@/types/item";

export class Item extends Phaser.Physics.Arcade.Sprite {
  itemData: ItemData;
  private despawnTimer: number = 0;
  private readonly DESPAWN_TIME = 60000; // 60 seconds

  constructor(scene: Phaser.Scene, x: number, y: number, data: ItemData) {
    super(scene, x, y, data.spriteKey);

    this.itemData = data;

    scene.add.existing(this);
    scene.physics.add.existing(this, true); // Static body

    this.setDepth(3);
    this.setScale(1.5);

    // Bobbing animation
    scene.tweens.add({
      targets: this,
      y: y - 5,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  update(_time: number, delta: number): boolean {
    this.despawnTimer += delta;
    if (this.despawnTimer >= this.DESPAWN_TIME) {
      this.destroy();
      return false;
    }
    return true;
  }
}
