import * as Phaser from "phaser";

const BASE_RADIUS = 60;
const KNOB_RADIUS = 25;
const DEAD_ZONE = 0.15;
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
  private enabled = false;
  private lastDrawTime: number = 0;
  private readonly DRAW_THROTTLE = 33; // ~30fps max for joystick redraw

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Create graphics with setScrollFactor(0) to fix to screen
    this.baseGraphics = scene.add.graphics();
    this.arrowGraphics = scene.add.graphics();
    this.knobGraphics = scene.add.graphics();

    this.baseGraphics.setScrollFactor(0).setDepth(1000);
    this.arrowGraphics.setScrollFactor(0).setDepth(1001);
    this.knobGraphics.setScrollFactor(0).setDepth(1002);

    // 초기 상태: 그래픽 숨김 (터치 시에만 표시)
    this.showGraphics(false);

    // Pointer events
    scene.input.on("pointerdown", this.onPointerDown, this);
    scene.input.on("pointermove", this.onPointerMove, this);
    scene.input.on("pointerup", this.onPointerUp, this);
  }

  private showGraphics(show: boolean) {
    this.baseGraphics.setVisible(show);
    this.arrowGraphics.setVisible(show);
    this.knobGraphics.setVisible(show);
  }

  private draw() {
    this.drawBase();
    this.drawArrows();
    this.drawKnob();
  }

  private drawBase() {
    const g = this.baseGraphics;

    g.clear();

    // Outer ring
    g.lineStyle(2, 0xaaff66, ALPHA_ACTIVE * 0.8);
    g.strokeCircle(this.baseX, this.baseY, BASE_RADIUS);

    // Inner dark fill
    g.fillStyle(0x111820, ALPHA_ACTIVE * 0.5);
    g.fillCircle(this.baseX, this.baseY, BASE_RADIUS);

    // Subtle inner ring
    g.lineStyle(1, 0xbbff66, ALPHA_ACTIVE * 0.5);
    g.strokeCircle(this.baseX, this.baseY, BASE_RADIUS * 0.6);
  }

  private drawArrows() {
    const g = this.arrowGraphics;

    g.clear();

    const dist = BASE_RADIUS * 0.72;
    const size = 8;

    const arrows = [
      { dx: 0, dy: -dist, angle: -Math.PI / 2 }, // Up
      { dx: 0, dy: dist, angle: Math.PI / 2 }, // Down
      { dx: -dist, dy: 0, angle: -Math.PI }, // Left
      { dx: dist, dy: 0, angle: 0 }, // Right
    ];

    for (const arrow of arrows) {
      const cx = this.baseX + arrow.dx;
      const cy = this.baseY + arrow.dy;
      const a = arrow.angle;

      // Highlight active direction
      const dirActive = this.isArrowActive(arrow.dx, arrow.dy);
      const arrowAlpha = dirActive ? ALPHA_ACTIVE * 1.2 : ALPHA_ACTIVE * 0.6;
      const color = dirActive ? 0xaaee66 : 0x88bbcc;

      g.fillStyle(color, Math.min(arrowAlpha, 1));
      g.fillTriangle(
        cx + Math.sin(a) * size,
        cy - Math.cos(a) * size,
        cx - Math.sin(a) * size,
        cy + Math.cos(a) * size,
        cx + Math.cos(a) * size * 1.3,
        cy + Math.sin(a) * size * 1.3,
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

    g.clear();

    // Knob outer glow
    g.fillStyle(0xaaee66, ALPHA_ACTIVE * 0.3);
    g.fillCircle(this.knobX, this.knobY, KNOB_RADIUS + 3);

    // Knob body
    g.fillStyle(0x334422, ALPHA_ACTIVE * 0.9);
    g.fillCircle(this.knobX, this.knobY, KNOB_RADIUS);

    // Knob highlight ring
    g.lineStyle(2, 0xaaff66, ALPHA_ACTIVE * 0.8);
    g.strokeCircle(this.knobX, this.knobY, KNOB_RADIUS);

    // Center dot
    g.fillStyle(0xbbff66, ALPHA_ACTIVE * 0.6);
    g.fillCircle(this.knobX, this.knobY, 4);
  }

  private onPointerDown(pointer: Phaser.Input.Pointer) {
    if (!this.enabled) return;
    if (this.activePointerId !== null) return;

    // 터치 위치를 조이스틱 base 위치로 설정
    this.baseX = pointer.x;
    this.baseY = pointer.y;
    this.knobX = pointer.x;
    this.knobY = pointer.y;

    this.activePointerId = pointer.id;
    this.isActive = true;
    this.showGraphics(true);
    this.draw();
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
    this.direction = { x: 0, y: 0 };
    this.showGraphics(false);
  }

  private updateKnob(px: number, py: number) {
    let dx = px - this.baseX;
    let dy = py - this.baseY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Clamp to base radius (FIXED screen pixels)
    if (dist > BASE_RADIUS) {
      dx = (dx / dist) * BASE_RADIUS;
      dy = (dy / dist) * BASE_RADIUS;
    }

    this.knobX = this.baseX + dx;
    this.knobY = this.baseY + dy;

    // 데드존 이후 방향만 추출, 항상 최대 속도 (키보드와 동일)
    const normDist = Math.min(dist, BASE_RADIUS) / BASE_RADIUS;
    if (normDist < DEAD_ZONE) {
      this.direction = { x: 0, y: 0 };
    } else {
      const mag = Math.sqrt(dx * dx + dy * dy);
      this.direction = {
        x: dx / mag,
        y: dy / mag,
      };
    }

    // Throttle draw to ~30fps (touch events can fire at 120Hz on iOS)
    const now = performance.now();
    if (now - this.lastDrawTime >= this.DRAW_THROTTLE) {
      this.lastDrawTime = now;
      this.draw();
    }
  }

  getDirection(): { x: number; y: number } {
    return this.direction;
  }

  setVisible(v: boolean) {
    this.enabled = v;
    if (!v) {
      this.release();
      this.showGraphics(false);
    }
  }

  // 리사이즈 시 활성 조이스틱 해제
  updatePosition() {
    if (this.isActive) {
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
