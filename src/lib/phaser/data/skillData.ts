import type { SkillData } from "@/types/skill";

/**
 * 15개 스킬 정의
 * 난이도별로 정렬: 간단한 패시브 → 시작 시 → 액티브 → 오브
 */
export const skillsData: SkillData[] = [
  // 1. 스케이트보드 (패시브, 속도 증가)
  {
    id: "skateboard",
    name: "스케이트보드",
    description: "기본 이동 속도 +15% (패시브)",
    type: "passive",
    price: 1000,
    unlockScore: 15000,
    spriteKey: "skills_skateboard",
    effect: "speed_boost_passive",
    effectParams: { speedMultiplier: 1.15 },
  },

  // 2. 포만감 우유 (패시브, 공복 감소 저하)
  {
    id: "milk",
    name: "포만감 우유",
    description: "공복 감소 속도 20% 저하 (패시브)",
    type: "passive",
    price: 1200,
    unlockScore: 18000,
    spriteKey: "skills_milk",
    effect: "hunger_reduction",
    effectParams: { hungerMultiplier: 0.8 },
  },

  // 3. 경험치 버섯 (패시브, 경험치 증가)
  {
    id: "mushroom",
    name: "경험치 버섯",
    description: "획득 경험치 +15% (패시브)",
    type: "passive",
    price: 1500,
    unlockScore: 20000,
    spriteKey: "skills_mushroom",
    effect: "exp_boost",
    effectParams: { expMultiplier: 1.15 },
  },

  // 4. 천적 탐지기 (패시브, 포식자 하이라이트)
  {
    id: "detector",
    name: "천적 탐지기",
    description: "포식자에게 빨간색 오버레이 표시 (패시브)",
    type: "passive",
    price: 900,
    unlockScore: 13000,
    spriteKey: "skills_detector",
    effect: "highlight_predators",
  },

  // 5. 곡괭이 (시작 시, 바위 제거)
  {
    id: "pick",
    name: "곡괭이",
    description: "게임 시작 시 모든 바위 장애물 제거",
    type: "onstart",
    price: 800,
    unlockScore: 11000,
    spriteKey: "skills_pick",
    effect: "remove_rocks",
  },

  // 6. 도끼 (시작 시, 나무 제거)
  {
    id: "ax",
    name: "도끼",
    description: "게임 시작 시 모든 나무 장애물 제거",
    type: "onstart",
    price: 800,
    unlockScore: 11000,
    spriteKey: "skills_ax",
    effect: "remove_trees",
  },

  // 7. 왕관 (패시브, 아이템 스폰 빈도)
  {
    id: "crown",
    name: "왕관",
    description: "아이템 출몰 빈도 +30% (패시브)",
    type: "passive",
    price: 1800,
    unlockScore: 25000,
    spriteKey: "skills_crown",
    effect: "item_spawn_boost",
    effectParams: { spawnMultiplier: 1.3 },
  },

  // 8. 네잎클로버 (패시브, 레어리티 확률)
  {
    id: "clover",
    name: "네잎클로버",
    description: "아이템 레어리티 확률 +20% 시프트 (패시브)",
    type: "passive",
    price: 2000,
    unlockScore: 30000,
    spriteKey: "skills_clover",
    effect: "rarity_boost",
    effectParams: { rarityShift: 0.2 },
  },

  // 9. 비눗방울 (액티브, 감지 거리 반감)
  {
    id: "bubbles",
    name: "비눗방울",
    description: "15초간 포식자의 감지 거리 반감 (쿨타임 30초)",
    type: "active",
    price: 700,
    unlockScore: 10000,
    cooldown: 30,
    spriteKey: "skills_bubbles",
    effect: "reduce_detection",
    effectParams: { detectionMultiplier: 0.5, duration: 15000 },
  },

  // 10. 리볼버 (액티브, 무작위 사냥)
  {
    id: "revolver",
    name: "리볼버",
    description: "무작위 먹이 1마리 즉시 사냥 (쿨타임 30초)",
    type: "active",
    price: 800,
    unlockScore: 12000,
    cooldown: 30,
    spriteKey: "skills_revolver",
    effect: "kill_random_prey",
    effectParams: { range: 500 },
  },

  // 11. 거미줄 (액티브, 먹이 감속 - 지속형)
  {
    id: "cobweb",
    name: "거미줄",
    description:
      "10초간 범위 내 먹이 이동 속도 50% 감소 (범위 200px, 쿨타임 20초)",
    type: "active",
    price: 600,
    unlockScore: 8000,
    cooldown: 20,
    spriteKey: "skills_cobweb",
    effect: "slow_prey",
    effectParams: {
      duration: 10000,
      slowMultiplier: 0.5,
      range: 200,
    },
  },

  // 12. 파이어볼 (액티브, 오브 - 기절)
  {
    id: "fireball",
    name: "파이어볼",
    description:
      "플레이어 주변을 도는 화염구. 포식자 충돌 시 3초 기절 (쿨타임 25초)",
    type: "active",
    price: 500,
    unlockScore: 5000,
    cooldown: 25,
    spriteKey: "skills_fireball",
    effect: "stun_predator",
    effectParams: {
      stunDuration: 3000,
      orbitRadius: 60,
      effectColor: 0xff4500,
    },
  },

  // 13. 아이스볼 (액티브, 오브 - 감속)
  {
    id: "iceball",
    name: "아이스볼",
    description:
      "플레이어 주변을 도는 얼음구. 포식자 충돌 시 3초간 속도 반감 (쿨타임 25초)",
    type: "active",
    price: 500,
    unlockScore: 6000,
    cooldown: 25,
    spriteKey: "skills_iceball",
    effect: "slow_predator",
    effectParams: {
      slowDuration: 3000,
      slowMultiplier: 0.5,
      orbitRadius: 60,
      effectColor: 0x00bfff,
    },
  },

  // 14. 돌멩이 (액티브, 오브 - 넉백)
  {
    id: "stone",
    name: "돌멩이",
    description:
      "플레이어 주변을 도는 돌. 포식자 충돌 시 100px 넉백 (쿨타임 25초)",
    type: "active",
    price: 450,
    unlockScore: 4000,
    cooldown: 25,
    spriteKey: "skills_stone",
    effect: "knockback_predator",
    effectParams: {
      knockbackDistance: 100,
      orbitRadius: 60,
      effectColor: 0x808080,
    },
  },

  // 15. 번개 (액티브, 전체 정지)
  {
    id: "lightning",
    name: "번개",
    description: "5초간 모든 NPC 정지 (쿨타임 60초)",
    type: "active",
    price: 2500,
    unlockScore: 35000,
    cooldown: 60,
    spriteKey: "skills_lightning",
    effect: "freeze_all_npcs",
    effectParams: { freezeDuration: 5000 },
  },
];

/**
 * 누적 스코어에 따른 스킬 언락 체크
 * @param accumulatedScore 누적 스코어
 * @returns 언락된 스킬 ID 배열
 */
export function checkSkillUnlocks(accumulatedScore: number): string[] {
  return skillsData
    .filter((skill) => accumulatedScore >= skill.unlockScore)
    .map((skill) => skill.id);
}

/**
 * 스킬 ID로 스킬 데이터 찾기
 * @param skillId 스킬 ID
 * @returns 스킬 데이터 (없으면 undefined)
 */
export function getSkillById(skillId: string): SkillData | undefined {
  return skillsData.find((skill) => skill.id === skillId);
}

/**
 * 언락 스코어 순으로 정렬된 스킬 목록
 */
export const sortedSkillsByUnlock = [...skillsData].sort(
  (a, b) => a.unlockScore - b.unlockScore,
);

/**
 * 가격 순으로 정렬된 스킬 목록
 */
export const sortedSkillsByPrice = [...skillsData].sort(
  (a, b) => a.price - b.price,
);
