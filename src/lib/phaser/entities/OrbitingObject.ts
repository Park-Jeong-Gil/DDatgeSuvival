import * as Phaser from "phaser";
import type { Player } from "./Player";
import type { NPC } from "./NPC";
import { EventBus } from "../EventBus";

/**
 * 플레이어 주변을 회전하는 오브 엔티티
 * - 파이어볼, 아이스볼, 돌멩이 스킬에서 사용
 * - 포식자와 충돌 시 효과 발동 후 소멸 (1회용)
 */
export class OrbitingObject extends Phaser.Physics.Arcade.Sprite {
  private player: Player;
  private orbitAngle: number; // 궤도 각도 (Phaser.Sprite의 angle과 구분)
  private rotationSpeed: number; // 도/초
  public used: boolean = false; // 1회용 플래그
  public skillId: string; // 스킬 ID (fireball, iceball, stone)
  private effectParams: Record<string, any>; // 스킬 효과 파라미터

  constructor(
    scene: Phaser.Scene,
    player: Player,
    skillId: string,
    initialAngle: number = 0,
    effectParams: Record<string, any> = {},
  ) {
    // 오브는 플레이어 위치에서 시작
    super(scene, player.x, player.y, `skill_${skillId}`);

    this.player = player;
    this.skillId = skillId;
    this.orbitAngle = initialAngle;
    this.effectParams = effectParams;
    this.rotationSpeed = 500; // 초당 500도 회전

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // 오브 설정
    this.setDepth(9); // 플레이어(10)보다 아래
    this.setDisplaySize(32, 32);
    // 물리 충돌 비활성화 - 충돌 판정은 SkillManager의 방어 링에서 처리
    (this.body as Phaser.Physics.Arcade.Body).enable = false;

    // 초기 위치 설정
    this.updatePosition(0);
  }

  /**
   * 현재 궤도 각도 반환
   */
  getOrbitAngle(): number {
    return this.orbitAngle;
  }

  /**
   * 매 프레임 위치 업데이트
   */
  update(delta: number) {
    if (this.used || !this.active) return;

    // 각도 업데이트 (delta는 ms 단위)
    this.orbitAngle += (this.rotationSpeed * delta) / 1000;
    if (this.orbitAngle >= 360) {
      this.orbitAngle -= 360;
    }

    this.updatePosition(delta);
  }

  /**
   * 플레이어 크기 기반 동적 궤도 반경
   * - 플레이어 displayHeight + 30px 여백으로 항상 캐릭터 밖에서 회전
   * - 레벨업으로 플레이어가 커질수록 자동으로 궤도도 확장됨
   */
  private getDynamicOrbitRadius(): number {
    return this.player.displayHeight + 30;
  }

  /**
   * 궤도상 위치 계산 및 적용
   */
  private updatePosition(delta: number) {
    const radius = this.getDynamicOrbitRadius();
    const rad = Phaser.Math.DegToRad(this.orbitAngle);
    const x = this.player.x + Math.cos(rad) * radius;
    const y = this.player.y + Math.sin(rad) * radius;

    this.setPosition(x, y);

    // 회전 애니메이션 (자체 회전)
    this.rotation += (Math.PI * delta) / 1000;
  }

  /**
   * 포식자와 충돌 처리
   */
  onHitPredator(npc: NPC) {
    if (this.used) return;

    // 기절 또는 넉백 중인 포식자는 스킵 (오브가 관통)
    // 슬로우는 이동을 멈추지 않으므로 다음 오브가 발동되어야 함
    const now = Date.now();
    const hasStun = now < npc.stunUntil;
    if (hasStun || npc.isKnockedBack) {
      console.log(
        `[OrbitingObject] ${this.skillId} passed through ${npc.npcData.nameKo} (stunned or knocked back)`,
      );
      return; // Don't consume the orb, let it pass through
    }

    this.used = true;

    // 효과 적용
    switch (this.skillId) {
      case "fireball":
        // 기절 (effectParams에서 duration 가져오기)
        const stunDuration = this.effectParams.stunDuration ?? 3000;
        npc.stunUntil = Date.now() + stunDuration;
        console.log(
          `[OrbitingObject] Fireball stunned ${npc.npcData.nameKo} for ${stunDuration / 1000}s`,
        );
        break;

      case "iceball":
        // 감속 (effectParams에서 duration과 multiplier 가져오기)
        const slowDuration = this.effectParams.slowDuration ?? 3000;
        const slowMultiplier = this.effectParams.slowMultiplier ?? 0.5;
        npc.slowUntil = Date.now() + slowDuration;
        npc.slowMultiplier = slowMultiplier;
        console.log(
          `[OrbitingObject] Iceball slowed ${npc.npcData.nameKo} for ${slowDuration / 1000}s`,
        );
        break;

      case "stone": {
        // 넉백 - 날아가는 애니메이션
        const knockbackDistance = this.effectParams.knockbackDistance ?? 100;
        const dx = npc.x - this.player.x;
        const dy = npc.y - this.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          const normalX = dx / dist;
          const normalY = dy / dist;
          const knockbackDuration = 300;
          // 넉백 속도: 목표 거리 / 시간 (px/s)
          const knockbackSpeed = (knockbackDistance / knockbackDuration) * 1000;

          npc.isKnockedBack = true;
          npc.knockbackUntil = Date.now() + knockbackDuration;
          npc.setVelocity(normalX * knockbackSpeed, normalY * knockbackSpeed);

          // 맞는 순간 흰색 플래시
          npc.setTint(0xffffff);
          this.scene.time.delayedCall(80, () => {
            if (npc && npc.active) npc.clearTint();
          });

          // 날아가면서 한 바퀴 회전
          this.scene.tweens.add({
            targets: npc,
            angle: npc.angle + (normalX >= 0 ? 360 : -360),
            duration: knockbackDuration,
            ease: "Linear",
          });

          // 넉백 종료 - 속도 및 상태 리셋
          this.scene.time.delayedCall(knockbackDuration, () => {
            if (npc && npc.active) {
              npc.isKnockedBack = false;
              npc.setVelocity(0, 0);
              npc.setAngle(0);
            }
          });

          console.log(
            `[OrbitingObject] Stone knocked back ${npc.npcData.nameKo} ${knockbackDistance}px`,
          );
        }
        break;
      }
    }

    // 파티클 효과 (옵션)
    this.scene.add
      .particles(this.x, this.y, this.texture.key, {
        speed: { min: 50, max: 100 },
        scale: { start: 0.5, end: 0 },
        lifespan: 300,
        quantity: 8,
      })
      .explode();

    // 오브 소멸
    this.destroy();
  }

  /**
   * 정리
   */
  destroy(fromScene?: boolean) {
    // 오브가 사용되어 소멸되는 경우, 쿨타임 시작 이벤트 발생
    if (this.used) {
      EventBus.emit("orb-destroyed", this.skillId);
      console.log(
        `[OrbitingObject] ${this.skillId} destroyed - cooldown starting`,
      );
    }

    super.destroy(fromScene);
  }
}
