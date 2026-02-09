import * as Phaser from "phaser";
import { VirtualJoystick } from "../ui/VirtualJoystick";
import { EventBus } from "../EventBus";


interface SkillCooldownInfo {
  skillId: string;
  remainingCooldown: number;
  maxCooldown: number;
  spriteKey: string;
}

export class UIScene extends Phaser.Scene {
  private joystick!: VirtualJoystick;
  private bottomBg!: Phaser.GameObjects.Graphics;
  private skillCooldownContainer!: Phaser.GameObjects.Container;
  private skillCooldownData: SkillCooldownInfo[] = [];
  private skillCooldownCallback!: (data: unknown) => void;

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

    // 스킬 쿨타임 UI 초기화
    this.skillCooldownContainer = this.add.container(0, 0);
    this.skillCooldownContainer.setScrollFactor(0).setDepth(1000);

    // 스킬 쿨타임 정보 수신 (화살표 함수로 this 바인딩)
    this.skillCooldownCallback = (data: unknown) => {
      this.onSkillCooldownUpdate(data);
    };
    EventBus.on("skill-cooldown-update", this.skillCooldownCallback, this);

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
    this.bottomBg.setVisible(false);
  }

  private onResize() {
    this.drawBottomArea();
    this.joystick.updatePosition();
    this.updateSkillCooldownUI();
  }

  private onSkillCooldownUpdate(data: unknown) {
    this.skillCooldownData = data as Array<{
      skillId: string;
      remainingCooldown: number;
      maxCooldown: number;
      spriteKey: string;
    }>;
    this.updateSkillCooldownUI();
  }

  private updateSkillCooldownUI() {
    // Scene이 활성화되어 있지 않으면 무시
    if (!this.sys.isActive() || !this.add) return;

    // 기존 UI 제거
    this.skillCooldownContainer.removeAll(true);

    if (this.skillCooldownData.length === 0) return;

    const iconSize = 40;
    const gap = 8;
    const totalWidth =
      this.skillCooldownData.length * iconSize +
      (this.skillCooldownData.length - 1) * gap;
    const startX = this.scale.width / 2 - totalWidth / 2;
    const startY = 80; // 스코어와 시간 아래

    this.skillCooldownData.forEach((skill, index) => {
      const x = startX + index * (iconSize + gap);
      const y = startY;

      // 스킬 아이콘 배경
      const bg = this.add.rectangle(x, y, iconSize, iconSize, 0x000000, 0.7);
      bg.setOrigin(0, 0);

      // 스킬 아이콘 (spriteKey가 skills_xxx 형태이면 skill_xxx로 변환)
      const textureKey = skill.spriteKey.replace("skills_", "skill_");
      const icon = this.add.image(
        x + iconSize / 2,
        y + iconSize / 2,
        textureKey,
      );
      icon.setDisplaySize(iconSize - 4, iconSize - 4);

      // 먼저 배경과 아이콘을 컨테이너에 추가
      this.skillCooldownContainer.add([bg, icon]);

      // 쿨타임 오버레이 (남은 시간 비율만큼 어둡게)
      const cooldownRatio = skill.remainingCooldown / skill.maxCooldown;
      if (cooldownRatio > 0) {
        const overlayHeight = iconSize * cooldownRatio;
        const overlay = this.add.rectangle(
          x + iconSize / 2,
          y + overlayHeight / 2,
          iconSize,
          overlayHeight,
          0x000000,
          0.7,
        );
        this.skillCooldownContainer.add(overlay);
      }

      // 남은 쿨타임 텍스트 (초 단위)
      const remainingSeconds = Math.ceil(skill.remainingCooldown / 1000);
      if (remainingSeconds > 0) {
        const text = this.add.text(
          x + iconSize / 2,
          y + iconSize / 2,
          remainingSeconds.toString(),
          {
            fontSize: "20px",
            fontFamily: "Arial",
            color: "#ffffff",
            stroke: "#000000",
            strokeThickness: 3,
          },
        );
        text.setOrigin(0.5, 0.5);
        this.skillCooldownContainer.add(text);
      }
    });
  }

  shutdown() {
    this.scale.off("resize", this.onResize, this);
    EventBus.off("skill-cooldown-update", this.skillCooldownCallback, this);
  }
}
