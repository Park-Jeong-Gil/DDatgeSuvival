import * as Phaser from "phaser";
import type { ItemData } from "@/types/item";

export class Item extends Phaser.Physics.Arcade.Sprite {
  itemData: ItemData;
  private despawnTimer: number = 0;
  private readonly DESPAWN_TIME = 60000; // 60 seconds
  private shadow?: Phaser.GameObjects.Ellipse;
  private isCollecting: boolean = false; // 수집 중복 방지

  constructor(scene: Phaser.Scene, x: number, y: number, data: ItemData) {
    // 텍스처가 로드되었는지 확인하고 적절한 키 선택
    const textureKey = scene.textures.exists(data.spriteKey)
      ? data.spriteKey
      : "__DEFAULT";

    if (textureKey === "__DEFAULT") {
      console.warn(`Texture not found: ${data.spriteKey}, using default`);
    }

    super(scene, x, y, textureKey);

    this.itemData = data;

    scene.add.existing(this);
    scene.physics.add.existing(this); // Dynamic body로 변경

    // 물리 바디를 움직이지 않게 설정
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setImmovable(true);
      body.setAllowGravity(false);
      // 원본 텍스처 크기 사용
      const textureFrame = this.texture.get();
      body.setSize(textureFrame.width, textureFrame.height);
    }

    this.setDepth(3);

    // 이미지 크기를 32x32로 조정 (기존 placeholder 크기와 동일)
    this.setDisplaySize(32, 32);

    // 그림자 추가
    this.shadow = scene.add.ellipse(x, y + 2, 24, 12, 0x000000, 0.3);
    this.shadow.setDepth(2);

    // Bobbing animation - 씬이 준비된 후 안전하게 시작
    scene.time.delayedCall(10, () => {
      if (!this.active) return;
      scene.tweens.add({
        targets: this,
        y: y - 5,
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });

      // 그림자도 함께 움직이도록
      if (this.shadow && this.shadow.active) {
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
    });
  }

  update(_time: number, delta: number): boolean {
    if (this.isCollecting) return false; // 수집 중이면 더 이상 업데이트 안함
    this.despawnTimer += delta;
    if (this.despawnTimer >= this.DESPAWN_TIME) {
      this.destroy();
      return false;
    }
    return true;
  }

  markAsCollecting() {
    this.isCollecting = true;
  }

  destroy(fromScene?: boolean): void {
    if (this.shadow) {
      this.shadow.destroy();
      this.shadow = undefined;
    }
    super.destroy(fromScene);
  }
}
