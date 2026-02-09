import * as Phaser from "phaser";
import type { SkillData } from "@/types/skill";
import { getSkillById } from "@/lib/phaser/data/skillData";
import type { NPCManager } from "./NPCManager";
import type { Player } from "../entities/Player";
import { OrbitingObject } from "../entities/OrbitingObject";
import { EventBus } from "../EventBus";

/**
 * 스킬 관리 시스템
 * - 패시브 스킬: 게임 시작 시 자동 적용
 * - 액티브 스킬: 쿨타임 기반 자동 발동
 */
export class SkillManager {
  private scene: Phaser.Scene;
  private selectedSkills: SkillData[];
  private npcManager: NPCManager | null = null;
  private player: Player | null = null;

  // 쿨타임 관리 (ms 단위)
  private cooldowns: Map<string, number> = new Map();

  // 충전 관리 (거미줄용)
  private charges: Map<string, number> = new Map();
  private chargeTimers: Map<string, number> = new Map();

  // 액티브 버프 (비눗방울용)
  private activeBuffs: Map<
    string,
    { effect: string; remainingTime: number }
  > = new Map();

  // 오브 관리 (파이어볼, 아이스볼, 돌멩이)
  private activeOrbs: OrbitingObject[] = [];

  // 오브 소멸 이벤트 핸들러 (화살표 함수로 this 바인딩)
  private orbDestroyedHandler = (skillId: unknown) => {
    this.onOrbDestroyed(skillId as string);
  };

  constructor(scene: Phaser.Scene, skillIds: string[]) {
    this.scene = scene;

    // 선택한 스킬 데이터 로드
    this.selectedSkills = skillIds
      .map((id) => getSkillById(id))
      .filter((skill): skill is SkillData => skill !== undefined);

    console.log(
      `[SkillManager] Loaded ${this.selectedSkills.length} skills:`,
      this.selectedSkills.map((s) => s.name),
    );

    // 오브 소멸 이벤트 리스너 등록
    EventBus.on("orb-destroyed", this.orbDestroyedHandler);

    // 초기화
    this.initializeSkills();
  }

  /**
   * NPCManager 연결 (액티브 스킬에서 사용)
   */
  setNPCManager(npcManager: NPCManager) {
    this.npcManager = npcManager;
  }

  /**
   * Player 연결 (오브 스킬에서 사용)
   */
  setPlayer(player: Player) {
    this.player = player;
  }

  /**
   * 스킬 초기화
   * - 패시브 스킬 적용
   * - 시작 시 스킬 실행
   * - 액티브 스킬 쿨타임 초기화
   */
  private initializeSkills() {
    // 패시브 스킬은 자동으로 적용됨 (getter 메서드를 통해)
    const passiveSkills = this.selectedSkills.filter(
      (s) => s.type === "passive",
    );
    console.log(
      `[SkillManager] ${passiveSkills.length} passive skills active:`,
      passiveSkills.map((s) => s.name),
    );

    // 시작 시 스킬 실행
    const startSkills = this.selectedSkills.filter((s) => s.type === "onstart");
    startSkills.forEach((skill) => {
      this.applyStartSkill(skill);
    });

    if (startSkills.length > 0) {
      console.log(
        `[SkillManager] ${startSkills.length} start skills applied:`,
        startSkills.map((s) => s.name),
      );
    }

    // 액티브 스킬 쿨타임 초기화
    const activeSkills = this.selectedSkills.filter(
      (s) => s.type === "active" && s.cooldown,
    );

    // 오브 스킬 목록
    const orbSkillIds = ["fireball", "iceball", "stone"];

    activeSkills.forEach((skill) => {
      // 오브 스킬은 즉시 발동 (모두 동시에 생성), 나머지는 5초 후 첫 발동
      if (orbSkillIds.includes(skill.id)) {
        this.cooldowns.set(skill.id, 0); // 즉시 발동
      } else {
        this.cooldowns.set(skill.id, 5000); // 5초 후 첫 발동
      }
    });

    // 거미줄 충전 초기화 (3회)
    const cobweb = this.selectedSkills.find((s) => s.id === "cobweb");
    if (cobweb) {
      this.charges.set("cobweb", 3);
      this.chargeTimers.set("cobweb", 0);
    }

    if (activeSkills.length > 0) {
      console.log(
        `[SkillManager] ${activeSkills.length} active skills initialized:`,
        activeSkills.map((s) => s.name),
      );
    }
  }

  /**
   * 시작 시 스킬 적용
   */
  private applyStartSkill(skill: SkillData) {
    switch (skill.effect) {
      case "remove_rocks":
        console.log("[SkillManager] Removing rocks...");
        // GameScene에서 장애물 제거 메서드 호출 필요
        break;

      case "remove_trees":
        console.log("[SkillManager] Removing trees...");
        // GameScene에서 장애물 제거 메서드 호출 필요
        break;
    }
  }

  /**
   * 업데이트 (매 프레임 호출)
   * - 쿨타임 감소 및 자동 발동
   * - 액티브 버프 시간 감소
   * - 충전 시스템 업데이트
   * - 오브 업데이트
   */
  update(delta: number) {
    // 쿨타임 감소 및 자동 발동
    const toActivate: string[] = [];
    for (const [skillId, remaining] of this.cooldowns) {
      const newRemaining = Math.max(0, remaining - delta);
      if (newRemaining === 0) {
        toActivate.push(skillId);
      } else {
        this.cooldowns.set(skillId, newRemaining);
      }
    }

    // 스킬 자동 발동
    toActivate.forEach((skillId) => {
      this.activateSkill(skillId);
    });

    // 액티브 버프 시간 감소
    for (const [buffId, buff] of this.activeBuffs) {
      buff.remainingTime -= delta;
      if (buff.remainingTime <= 0) {
        this.activeBuffs.delete(buffId);
        console.log(`[SkillManager] Buff expired: ${buffId}`);
      }
    }

    // 거미줄 충전 업데이트
    const cobwebCharges = this.charges.get("cobweb");
    if (cobwebCharges !== undefined && cobwebCharges < 3) {
      const chargeTimer = this.chargeTimers.get("cobweb") ?? 0;
      const newChargeTimer = chargeTimer + delta;
      this.chargeTimers.set("cobweb", newChargeTimer);

      // 10초마다 1회 충전
      if (newChargeTimer >= 10000) {
        this.charges.set("cobweb", Math.min(3, cobwebCharges + 1));
        this.chargeTimers.set("cobweb", 0);
        console.log(
          `[SkillManager] Cobweb recharged: ${this.charges.get("cobweb")}/3`,
        );
      }
    }

    // 오브 업데이트
    this.activeOrbs = this.activeOrbs.filter((orb) => {
      if (!orb.active || orb.used) {
        return false;
      }
      orb.update(delta);
      return true;
    });
  }

  /**
   * 스킬 자동 발동
   */
  private activateSkill(skillId: string) {
    const skill = this.selectedSkills.find((s) => s.id === skillId);
    if (!skill) return;

    console.log(`[SkillManager] Activating skill: ${skill.name}`);

    // 오브 스킬 목록 (쿨타임이 소멸 시점에 시작됨)
    const orbSkillIds = ["fireball", "iceball", "stone"];
    const isOrbSkill = orbSkillIds.includes(skillId);

    switch (skillId) {
      case "bubbles":
        this.activateBubbles(skill);
        break;
      case "revolver":
        this.activateRevolver(skill);
        break;
      case "cobweb":
        this.activateCobweb(skill);
        break;
      case "lightning":
        this.activateLightning(skill);
        break;
      case "fireball":
        this.activateFireball(skill);
        break;
      case "iceball":
        this.activateIceball(skill);
        break;
      case "stone":
        this.activateStone(skill);
        break;
    }

    // 쿨타임 재시작 (오브 스킬 제외 - 오브는 소멸 시 쿨타임 시작)
    if (skill.cooldown && !isOrbSkill) {
      this.cooldowns.set(skillId, skill.cooldown * 1000);
    }
  }

  /**
   * 비눗방울 - 포식자 감지 거리 반감 (15초)
   */
  private activateBubbles(skill: SkillData) {
    const duration = 15000; // 15초
    this.activeBuffs.set("bubbles", {
      effect: "reduce_predator_detection",
      remainingTime: duration,
    });
    console.log("[SkillManager] Bubbles activated - detection range halved");
  }

  /**
   * 리볼버 - 화면 내 무작위 먹이 1마리 제거
   */
  private activateRevolver(skill: SkillData) {
    if (!this.npcManager) return;

    const killed = this.npcManager.killRandomPrey();
    if (killed) {
      console.log("[SkillManager] Revolver killed a prey");
    }
  }

  /**
   * 거미줄 - 플레이어 근처 도망가는 먹이 2초 정지
   */
  private activateCobweb(skill: SkillData) {
    const charges = this.charges.get("cobweb") ?? 0;
    if (charges <= 0) {
      console.log("[SkillManager] Cobweb - no charges available");
      return;
    }

    if (!this.npcManager) return;

    // 충전 소모
    this.charges.set("cobweb", charges - 1);
    console.log(`[SkillManager] Cobweb used - ${charges - 1} charges left`);

    // 근처 먹이 정지
    this.npcManager.freezeNearbyPrey(200, 2000); // 200px 범위, 2초
  }

  /**
   * 번개 - 모든 NPC 5초 정지
   */
  private activateLightning(skill: SkillData) {
    if (!this.npcManager) return;

    this.npcManager.freezeAllNPCs(5000); // 5초
    console.log("[SkillManager] Lightning - all NPCs frozen");
  }

  /**
   * 오브 소멸 시 쿨타임 시작
   */
  private onOrbDestroyed(skillId: string) {
    const skill = this.selectedSkills.find((s) => s.id === skillId);
    if (!skill || !skill.cooldown) return;

    // 쿨타임 시작 (소멸 시점부터)
    this.cooldowns.set(skillId, skill.cooldown * 1000);
    console.log(
      `[SkillManager] ${skill.name} cooldown started (${skill.cooldown}s)`,
    );
  }

  /**
   * 오브 스킬의 각도 계산 (선택된 오브 개수에 따라 동적 배치)
   * 주의: 이 함수는 항상 동일한 결과를 반환해야 함 (생성 시점에 관계없이)
   */
  private getOrbAngle(skillId: string): number {
    // 선택된 오브 스킬을 고정된 순서로 정렬
    const orbSkills = ["fireball", "iceball", "stone"];
    const selectedOrbSkills = this.selectedSkills
      .filter((s) => orbSkills.includes(s.id))
      .map((s) => s.id)
      .sort((a, b) => orbSkills.indexOf(a) - orbSkills.indexOf(b)); // 고정 순서

    const index = selectedOrbSkills.indexOf(skillId);
    const count = selectedOrbSkills.length;

    if (index === -1 || count === 0) return 0;

    // 오브 개수에 따라 균등하게 배치
    // 1개: 0°
    // 2개: 0°, 180°
    // 3개: 0°, 120°, 240°
    return (360 / count) * index;
  }

  /**
   * 오브의 실제 생성 각도 계산 (기존 오브와 동기화)
   */
  private getActualOrbAngle(skillId: string): number {
    const baseAngle = this.getOrbAngle(skillId);

    // 이미 활성화된 다른 오브가 있으면 그 오브의 현재 각도를 기준으로 계산
    const existingOrb = this.activeOrbs.find((orb) => orb.active && !orb.used);
    if (existingOrb) {
      // 기존 오브의 현재 각도를 가져와서 기준점으로 사용
      const existingBaseAngle = this.getOrbAngle(existingOrb.skillId);
      const currentRotation = existingOrb.getOrbitAngle();
      const rotationOffset = currentRotation - existingBaseAngle;

      return baseAngle + rotationOffset;
    }

    return baseAngle;
  }

  /**
   * 파이어볼 - 플레이어 주변 회전 오브 생성
   */
  private activateFireball(skill: SkillData) {
    if (!this.player) return;

    const angle = this.getActualOrbAngle("fireball");
    const orb = new OrbitingObject(this.scene, this.player, "fireball", angle);
    this.activeOrbs.push(orb);
    this.setupOrbCollision(orb);

    // 쿨타임 맵에서 제거 (소멸 시 다시 추가됨)
    this.cooldowns.delete("fireball");

    console.log(`[SkillManager] Fireball orb spawned at ${angle}°`);
  }

  /**
   * 아이스볼 - 플레이어 주변 회전 오브 생성
   */
  private activateIceball(skill: SkillData) {
    if (!this.player) return;

    const angle = this.getActualOrbAngle("iceball");
    const orb = new OrbitingObject(this.scene, this.player, "iceball", angle);
    this.activeOrbs.push(orb);
    this.setupOrbCollision(orb);

    // 쿨타임 맵에서 제거 (소멸 시 다시 추가됨)
    this.cooldowns.delete("iceball");

    console.log(`[SkillManager] Iceball orb spawned at ${angle}°`);
  }

  /**
   * 돌멩이 - 플레이어 주변 회전 오브 생성
   */
  private activateStone(skill: SkillData) {
    if (!this.player) return;

    const angle = this.getActualOrbAngle("stone");
    const orb = new OrbitingObject(this.scene, this.player, "stone", angle);
    this.activeOrbs.push(orb);
    this.setupOrbCollision(orb);

    // 쿨타임 맵에서 제거 (소멸 시 다시 추가됨)
    this.cooldowns.delete("stone");

    console.log(`[SkillManager] Stone orb spawned at ${angle}°`);
  }

  /**
   * 오브 충돌 감지 설정
   */
  private setupOrbCollision(orb: OrbitingObject) {
    if (!this.npcManager) return;

    // NPC 그룹과 충돌 감지
    this.scene.physics.add.overlap(
      orb,
      this.npcManager.npcGroup,
      (orbObj, npcObj) => {
        const orb = orbObj as OrbitingObject;
        const npc = npcObj as any; // NPC type

        // 이미 사용됨 또는 먹이인 경우 무시
        if (orb.used) return;
        if (!this.player) return;

        // 포식자만 충돌 처리 (플레이어 레벨보다 높은 NPC)
        const playerLevel =
          (this.scene as any).levelSystem?.checkLevelUp?.(this.player) ||
          this.player.level;
        if (npc.level <= playerLevel) return;

        // 충돌 처리
        orb.onHitPredator(npc);
      },
      undefined,
      this,
    );
  }

  // ========================================
  // 패시브 스킬 효과 Getter 메서드
  // ========================================

  /**
   * 1. 스케이트보드 - 속도 증가
   * @returns 속도 배율 (1.0 = 기본, 1.15 = +15%)
   */
  getSpeedMultiplier(): number {
    const skateboard = this.selectedSkills.find((s) => s.id === "skateboard");
    if (skateboard && skateboard.effectParams) {
      return skateboard.effectParams.speedMultiplier as number;
    }
    return 1.0;
  }

  /**
   * 2. 포만감 우유 - 공복 감소 속도 저하
   * @returns 공복 감소 배율 (1.0 = 기본, 0.8 = -20%)
   */
  getHungerMultiplier(): number {
    const milk = this.selectedSkills.find((s) => s.id === "milk");
    if (milk && milk.effectParams) {
      return milk.effectParams.hungerMultiplier as number;
    }
    return 1.0;
  }

  /**
   * 3. 경험치 버섯 - 경험치 증가
   * @returns 경험치 배율 (1.0 = 기본, 1.15 = +15%)
   */
  getExpMultiplier(): number {
    const mushroom = this.selectedSkills.find((s) => s.id === "mushroom");
    if (mushroom && mushroom.effectParams) {
      return mushroom.effectParams.expMultiplier as number;
    }
    return 1.0;
  }

  /**
   * 4. 천적 탐지기 - 포식자 하이라이트
   * @returns true면 포식자를 빨간색으로 표시
   */
  shouldHighlightPredators(): boolean {
    return this.selectedSkills.some((s) => s.id === "detector");
  }

  /**
   * 7. 왕관 - 아이템 스폰 빈도 증가
   * @returns 스폰 빈도 배율 (1.0 = 기본, 1.3 = +30%)
   */
  getItemSpawnMultiplier(): number {
    const crown = this.selectedSkills.find((s) => s.id === "crown");
    if (crown && crown.effectParams) {
      return crown.effectParams.spawnMultiplier as number;
    }
    return 1.0;
  }

  /**
   * 8. 네잎클로버 - 레어리티 확률 개선
   * @returns 레어리티 시프트 값 (0 = 기본, 0.2 = +20% 시프트)
   */
  getRarityShift(): number {
    const clover = this.selectedSkills.find((s) => s.id === "clover");
    if (clover && clover.effectParams) {
      return clover.effectParams.rarityShift as number;
    }
    return 0;
  }

  // ========================================
  // 장애물 제거 메서드 (GameScene에서 호출용)
  // ========================================

  /**
   * 곡괭이 스킬 보유 여부
   */
  hasPick(): boolean {
    return this.selectedSkills.some((s) => s.id === "pick");
  }

  /**
   * 도끼 스킬 보유 여부
   */
  hasAx(): boolean {
    return this.selectedSkills.some((s) => s.id === "ax");
  }

  // ========================================
  // 액티브 스킬 효과 Getter 메서드
  // ========================================

  /**
   * 비눗방울 버프 활성 여부
   * @returns true면 포식자 감지 거리 반감
   */
  hasBubblesActive(): boolean {
    return this.activeBuffs.has("bubbles");
  }

  // ========================================
  // 디버그
  // ========================================

  /**
   * 현재 활성화된 스킬 목록 반환
   */
  getActiveSkills(): SkillData[] {
    return this.selectedSkills;
  }

  /**
   * 스킬 쿨타임 정보 반환 (UI 표시용)
   * @returns 스킬 ID, 스킬 데이터, 남은 쿨타임(ms), 최대 쿨타임(ms) 배열
   */
  getSkillCooldowns(): Array<{
    skillId: string;
    skill: SkillData;
    remainingCooldown: number;
    maxCooldown: number;
  }> {
    const result: Array<{
      skillId: string;
      skill: SkillData;
      remainingCooldown: number;
      maxCooldown: number;
    }> = [];

    // 액티브 스킬만 쿨타임 정보 반환
    for (const skill of this.selectedSkills) {
      if (skill.type === "active" && skill.cooldown) {
        const remaining = this.cooldowns.get(skill.id) ?? 0;
        result.push({
          skillId: skill.id,
          skill: skill,
          remainingCooldown: remaining,
          maxCooldown: skill.cooldown * 1000, // 초를 ms로 변환
        });
      }
    }

    return result;
  }

  /**
   * 정리 (씬 종료 시 호출)
   */
  cleanup() {
    EventBus.off("orb-destroyed", this.orbDestroyedHandler);
    console.log("[SkillManager] Cleanup completed");
  }
}
