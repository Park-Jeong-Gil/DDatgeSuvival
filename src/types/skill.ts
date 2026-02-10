/**
 * 스킬 데이터 인터페이스
 */
export interface SkillData {
  id: string; // 스킬 고유 ID
  name: string; // 스킬 이름
  description: string; // 스킬 설명
  type: "passive" | "active" | "onstart"; // 스킬 타입
  price: number; // 구매 가격 (화폐)
  unlockScore: number; // 언락 필요 누적 스코어
  cooldown?: number; // 자동 발동 간격 (초) - 액티브 스킬만
  spriteKey: string; // 스프라이트 키
  effect: string; // 효과 식별자
  effectParams?: Record<string, any>; // 효과 매개변수
}

/**
 * 게임 중 스킬 쿨타임 상태
 */
export interface SkillCooldownState {
  skillId: string;
  remainingTime: number; // 남은 시간 (ms)
  totalCooldown: number; // 전체 쿨타임 (ms)
  charges?: number; // 남은 충전 횟수 (거미줄 등)
  maxCharges?: number; // 최대 충전 횟수
}

/**
 * 액티브 버프 상태
 */
export interface ActiveSkillBuff {
  skillId: string;
  duration: number; // 남은 지속시간 (ms)
  totalDuration: number; // 전체 지속시간 (ms)
  params: Record<string, any>; // 버프 매개변수
}
