import * as Phaser from "phaser";
import type { ItemData } from "@/types/item";

export class Item extends Phaser.Physics.Arcade.Sprite {
  itemData: ItemData;
  private despawnTimer: number = 0;
  private readonly DESPAWN_TIME = 60000; // 60 seconds
  private shadow?: Phaser.GameObjects.Ellipse;

  constructor(scene: Phaser.Scene, x: number, y: number, data: ItemData) {
    super(scene, x, y, data.spriteKey);

    this.itemData = data;

    scene.add.existing(this);
    scene.physics.add.existing(this); // Dynamic body로 변경

    // 물리 바디를 움직이지 않게 설정
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setImmovable(true);
      body.setAllowGravity(false);
      body.setSize(32, 32);
    }

    this.setDepth(3);
    
    // 이미지 크기를 32x32로 조정 (기존 placeholder 크기와 동일)
    this.setDisplaySize(32, 32);

    // 그림자 추가
    this.shadow = scene.add.ellipse(x, y + 2, 24, 12, 0x000000, 0.3);
    this.shadow.setDepth(2);

    // Bobbing animation
    scene.tweens.add({
      targets: this,
      y: y - 5,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // 그림자도 함께 움직이도록
    scene.tweens.add({
      targets: this.shadow,
      y: y - 3,
      scaleX: 0.8,
      scaleY: 0.8,
      alpha: 0.2,
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

  destroy(fromScene?: boolean): void {
    if (this.shadow) {
      this.shadow.destroy();
      this.shadow = undefined;
    }
    super.destroy(fromScene);
  }
}
