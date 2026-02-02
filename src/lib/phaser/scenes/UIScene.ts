import * as Phaser from "phaser";
import { VirtualJoystick } from "../ui/VirtualJoystick";
import { EventBus } from "../EventBus";
import { MOBILE_BREAKPOINT } from "../constants";

export class UIScene extends Phaser.Scene {
  private joystick!: VirtualJoystick;
  private bottomBg!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: "UIScene" });
  }

  create() {
    // Camera zoom을 1로 고정 - 순수 화면 픽셀 좌표계
    this.cameras.main.setZoom(1);

    // 하단 컨트롤 영역 배경
    this.bottomBg = this.add.graphics();
    this.bottomBg.setScrollFactor(0).setDepth(999);
    this.drawBottomArea();

    // 조이스틱 생성
    this.joystick = new VirtualJoystick(this);

    // 모바일 감지하여 조이스틱 표시
    const isMobile =
      this.sys.game.device.os.android ||
      this.sys.game.device.os.iOS ||
      this.sys.game.device.os.iPad ||
      this.sys.game.device.os.iPhone ||
      "ontouchstart" in window;

    this.joystick.setVisible(isMobile);

    // 화면 리사이즈 이벤트
    this.scale.on("resize", this.onResize, this);
  }

  update() {
    // 조이스틱 방향을 GameScene에 전달
    const direction = this.joystick.getDirection();
    EventBus.emit("joystick-update", direction);
  }

  private drawBottomArea() {
    this.bottomBg.clear();

    const screenW = this.scale.width;
    const screenH = this.scale.height;
    const isMobile = screenW <= MOBILE_BREAKPOINT;

    if (isMobile) {
      const topY = Math.floor(screenH * 0.75);
      // 하단 25% 어두운 배경
      this.bottomBg.fillStyle(0x111827, 1);
      this.bottomBg.fillRect(0, topY, screenW, screenH - topY);
      // 구분선
      this.bottomBg.lineStyle(1, 0x374151, 0.8);
      this.bottomBg.lineBetween(0, topY, screenW, topY);
    }

    this.bottomBg.setVisible(isMobile);
  }

  private onResize() {
    this.drawBottomArea();
    this.joystick.updatePosition();
  }

  shutdown() {
    this.scale.off("resize", this.onResize, this);
  }
}
