import * as Phaser from "phaser";

const BASE_RADIUS = 60;
const KNOB_RADIUS = 25;
const DEAD_ZONE = 0.15;
const ALPHA_IDLE = 0.45;
const ALPHA_ACTIVE = 0.7;

export class VirtualJoystick {
  private scene: Phaser.Scene;
  private baseGraphics: Phaser.GameObjects.Graphics;
  private knobGraphics: Phaser.GameObjects.Graphics;
  private arrowGraphics: Phaser.GameObjects.Graphics;

  private baseX = 0;
  private baseY = 0;
  private knobX = 0;
  private knobY = 0;

  private direction = { x: 0, y: 0 };
  private activePointerId: number | null = null;
  private isActive = false;
  private visible = true;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    this.baseGraphics = scene.add.graphics();
    this.arrowGraphics = scene.add.graphics();
    this.knobGraphics = scene.add.graphics();

    // Fixed to screen (ignore camera scroll)
    this.baseGraphics.setScrollFactor(0).setDepth(1000);
    this.arrowGraphics.setScrollFactor(0).setDepth(1001);
    this.knobGraphics.setScrollFactor(0).setDepth(1002);

    this.updatePosition();
    this.draw();

    // Pointer events
    scene.input.on("pointerdown", this.onPointerDown, this);
    scene.input.on("pointermove", this.onPointerMove, this);
    scene.input.on("pointerup", this.onPointerUp, this);
  }

  updatePosition() {
    const screenW = this.scene.scale.width;
    const screenH = this.scene.scale.height;

    this.baseX = BASE_RADIUS + 30;
    this.baseY = screenH - BASE_RADIUS - 30;
    this.knobX = this.baseX;
    this.knobY = this.baseY;
  }

  private draw() {
    this.drawBase();
    this.drawArrows();
    this.drawKnob();
  }

  private drawBase() {
    const g = this.baseGraphics;
    const alpha = this.isActive ? ALPHA_ACTIVE : ALPHA_IDLE;
    g.clear();

    // Outer ring
    g.lineStyle(2, 0x88ccee, alpha * 0.8);
    g.strokeCircle(this.baseX, this.baseY, BASE_RADIUS);

    // Inner dark fill
    g.fillStyle(0x111820, alpha * 0.7);
    g.fillCircle(this.baseX, this.baseY, BASE_RADIUS);

    // Subtle inner ring
    g.lineStyle(1, 0x446688, alpha * 0.5);
    g.strokeCircle(this.baseX, this.baseY, BASE_RADIUS * 0.6);
  }

  private drawArrows() {
    const g = this.arrowGraphics;
    const alpha = this.isActive ? ALPHA_ACTIVE : ALPHA_IDLE;
    g.clear();

    const dist = BASE_RADIUS * 0.72;
    const size = 8;

    const arrows = [
      { dx: 0, dy: -dist, angle: 0 }, // Up
      { dx: 0, dy: dist, angle: Math.PI }, // Down
      { dx: -dist, dy: 0, angle: -Math.PI / 2 }, // Left
      { dx: dist, dy: 0, angle: Math.PI / 2 }, // Right
    ];

    for (const arrow of arrows) {
      const cx = this.baseX + arrow.dx;
      const cy = this.baseY + arrow.dy;
      const a = arrow.angle;

      // Highlight active direction
      const dirActive = this.isArrowActive(arrow.dx, arrow.dy);
      const arrowAlpha = dirActive ? alpha * 1.2 : alpha * 0.6;
      const color = dirActive ? 0x66ddff : 0x88bbcc;

      g.fillStyle(color, Math.min(arrowAlpha, 1));
      g.fillTriangle(
        cx + Math.sin(a) * size,
        cy - Math.cos(a) * size,
        cx - Math.sin(a) * size,
        cy + Math.cos(a) * size,
        cx + Math.cos(a) * size * 1.3,
        cy + Math.sin(a) * size * 1.3
      );
    }
  }

  private isArrowActive(dx: number, dy: number): boolean {
    if (!this.isActive) return false;
    const threshold = 0.3;
    if (dx === 0 && dy < 0) return this.direction.y < -threshold;
    if (dx === 0 && dy > 0) return this.direction.y > threshold;
    if (dx < 0 && dy === 0) return this.direction.x < -threshold;
    if (dx > 0 && dy === 0) return this.direction.x > threshold;
    return false;
  }

  private drawKnob() {
    const g = this.knobGraphics;
    const alpha = this.isActive ? ALPHA_ACTIVE : ALPHA_IDLE;
    g.clear();

    // Knob outer glow
    g.fillStyle(0x66ccee, alpha * 0.3);
    g.fillCircle(this.knobX, this.knobY, KNOB_RADIUS + 3);

    // Knob body
    g.fillStyle(0x223344, alpha * 0.9);
    g.fillCircle(this.knobX, this.knobY, KNOB_RADIUS);

    // Knob highlight ring
    g.lineStyle(2, 0x88ddff, alpha * 0.8);
    g.strokeCircle(this.knobX, this.knobY, KNOB_RADIUS);

    // Center dot
    g.fillStyle(0x99eeff, alpha * 0.6);
    g.fillCircle(this.knobX, this.knobY, 4);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer) {
    if (!this.visible) return;
    if (this.activePointerId !== null) return;

    const dx = pointer.x - this.baseX;
    const dy = pointer.y - this.baseY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Allow touch within base radius + some padding
    if (dist <= BASE_RADIUS * 1.5) {
      this.activePointerId = pointer.id;
      this.isActive = true;
      this.updateKnob(pointer.x, pointer.y);
    }
  }

  private onPointerMove(pointer: Phaser.Input.Pointer) {
    if (pointer.id !== this.activePointerId) return;
    if (!pointer.isDown) {
      this.release();
      return;
    }
    this.updateKnob(pointer.x, pointer.y);
  }

  private onPointerUp(pointer: Phaser.Input.Pointer) {
    if (pointer.id !== this.activePointerId) return;
    this.release();
  }

  private release() {
    this.activePointerId = null;
    this.isActive = false;
    this.knobX = this.baseX;
    this.knobY = this.baseY;
    this.direction = { x: 0, y: 0 };
    this.draw();
  }

  private updateKnob(px: number, py: number) {
    let dx = px - this.baseX;
    let dy = py - this.baseY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Clamp to base radius
    if (dist > BASE_RADIUS) {
      dx = (dx / dist) * BASE_RADIUS;
      dy = (dy / dist) * BASE_RADIUS;
    }

    this.knobX = this.baseX + dx;
    this.knobY = this.baseY + dy;

    // Normalized direction (-1 to 1)
    const normDist = Math.min(dist, BASE_RADIUS) / BASE_RADIUS;
    if (normDist < DEAD_ZONE) {
      this.direction = { x: 0, y: 0 };
    } else {
      const scale = (normDist - DEAD_ZONE) / (1 - DEAD_ZONE);
      this.direction = {
        x: (dx / BASE_RADIUS) * scale,
        y: (dy / BASE_RADIUS) * scale,
      };

      // Clamp
      const mag = Math.sqrt(
        this.direction.x * this.direction.x +
          this.direction.y * this.direction.y
      );
      if (mag > 1) {
        this.direction.x /= mag;
        this.direction.y /= mag;
      }
    }

    this.draw();
  }

  getDirection(): { x: number; y: number } {
    return this.direction;
  }

  setVisible(v: boolean) {
    this.visible = v;
    this.baseGraphics.setVisible(v);
    this.arrowGraphics.setVisible(v);
    this.knobGraphics.setVisible(v);
    if (!v) {
      this.release();
    }
  }

  destroy() {
    this.scene.input.off("pointerdown", this.onPointerDown, this);
    this.scene.input.off("pointermove", this.onPointerMove, this);
    this.scene.input.off("pointerup", this.onPointerUp, this);
    this.baseGraphics.destroy();
    this.arrowGraphics.destroy();
    this.knobGraphics.destroy();
  }
}
