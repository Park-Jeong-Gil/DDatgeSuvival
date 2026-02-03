import * as Phaser from "phaser";

const DEAD_ZONE_RADIUS = 30; // 화면 중심 근처 데드존 (px)

export class VirtualJoystick {
  private scene: Phaser.Scene;
  private direction = { x: 0, y: 0 };
  private activePointerId: number | null = null;
  private enabled = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    scene.input.on("pointerdown", this.onPointerDown, this);
    scene.input.on("pointermove", this.onPointerMove, this);
    scene.input.on("pointerup", this.onPointerUp, this);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer) {
    if (!this.enabled) return;
    if (this.activePointerId !== null) return;

    this.activePointerId = pointer.id;
    this.updateDirection(pointer.x, pointer.y);
  }

  private onPointerMove(pointer: Phaser.Input.Pointer) {
    if (pointer.id !== this.activePointerId) return;
    if (!pointer.isDown) {
      this.release();
      return;
    }
    this.updateDirection(pointer.x, pointer.y);
  }

  private onPointerUp(pointer: Phaser.Input.Pointer) {
    if (pointer.id !== this.activePointerId) return;
    this.release();
  }

  private release() {
    this.activePointerId = null;
    this.direction = { x: 0, y: 0 };
  }

  private updateDirection(px: number, py: number) {
    const centerX = this.scene.scale.width / 2;
    const centerY = this.scene.scale.height / 2;

    const dx = px - centerX;
    const dy = py - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < DEAD_ZONE_RADIUS) {
      this.direction = { x: 0, y: 0 };
      return;
    }

    this.direction = { x: dx / dist, y: dy / dist };
  }

  getDirection(): { x: number; y: number } {
    return this.direction;
  }

  setVisible(v: boolean) {
    this.enabled = v;
    if (!v) {
      this.release();
    }
  }

  updatePosition() {
    // 리사이즈 시 활성 터치 해제
    if (this.activePointerId !== null) {
      this.release();
    }
  }

  destroy() {
    this.scene.input.off("pointerdown", this.onPointerDown, this);
    this.scene.input.off("pointermove", this.onPointerMove, this);
    this.scene.input.off("pointerup", this.onPointerUp, this);
  }
}
