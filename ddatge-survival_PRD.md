# DDatge Suvival (DDatge Suvival) - PRD v3.0

## 📋 프로젝트 개요

### 게임 컨셉
뱀파이어 서바이벌 + agar.io 스타일의 탑다운 서바이벌 성장 게임. 플레이어는 Lv 1 땃쥐로 시작하여 낮은 레벨 NPC를 잡아먹으며 성장하고, 공복 게이지를 관리하며 최대한 오래 생존하는 것이 목표.

### 장르
- 탑다운 액션 서바이벌
- 로그라이크 (run-based)
- 성장형 게임 (progression)

### 타겟 유저
- 뱀파이어 서바이벌 유저
- io 게임 (agar.io, slither.io) 유저
- 캐주얼 성장형 게임 선호 유저
- 짧은 세션 반복 플레이 선호 유저

### 핵심 가치
- 간단한 조작 (방향키 또는 버추얼 조이스틱)
- 명확한 성장 루프 (먹이 → 레벨업 → 더 큰 먹이)
- 긴장감 있는 자원 관리 (공복 게이지)
- 한 판 15-30분의 적당한 플레이 타임
- 매번 다른 경험 (랜덤 아이템, 동적 생태계)

---

## 🎮 게임 기능 명세

### 1. 코어 게임플레이

#### 1.1 조작 시스템

**입력 방식:**
- **PC**: 방향키 (또는 WASD)
- **모바일**: 버추얼 조이스틱 UI (화면 좌측 하단)
- ESC: 일시정지

**이동 메커니즘:**
```typescript
// 뱀파이어 서바이벌 방식
// 입력하는 동안만 해당 방향으로 이동
// 입력 없으면 정지

if (isKeyPressed || joystickActive) {
  const direction = getInputDirection() // 8방향
  player.velocity = direction.normalize() * player.speed
} else {
  player.velocity = Vector2.ZERO // 정지
}
```

**특징:**
- 키를 누르는 동안만 이동
- 키에서 손 떼면 즉시 정지
- 관성 없음 (즉각 반응)
- 8방향 이동 지원

#### 1.2 시점 & 그래픽 스타일

**시점:**
- 탑다운 (위에서 내려다보는 시점)
- 카메라는 플레이어 중심으로 고정
- 배경: 평면 바닥만 (하늘 없음)

**캐릭터 표현:**
```
평면 맵에서 옆모습 스프라이트 사용
- 기본: 오른쪽을 바라보는 옆모습
- 좌측 이동: 스프라이트 좌우 반전 (flipX)
- 상하 이동: 동일한 옆모습 (반전 없음)

예시:
  →  기본 (오른쪽)
  ←  반전된 모습 (왼쪽)
  ↑  기본 옆모습 유지
  ↓  기본 옆모습 유지
```

**스프라이트 구조:**
```
각 동물은 옆모습 기준으로 제작
- idle_side.png   (옆에서 본 대기)
- walk_side.png   (옆에서 본 걷기)
- eat_side.png    (옆에서 본 먹기)

코드에서 좌우 반전 처리:
if (velocity.x < 0) sprite.flipX = true
else if (velocity.x > 0) sprite.flipX = false
```

#### 1.3 먹이 사슬 시스템 (재설계)

**레벨 구조:**
```
플레이어: Lv 1 땃쥐로 시작

NPC 레벨 (Lv 0 ~ Lv 18):
Lv 0:  개미
Lv 1:  애벌레
Lv 2:  딱정벌레
Lv 3:  거미
Lv 4:  메뚜기
Lv 5:  개구리
Lv 6:  도마뱀
Lv 7:  뱁새 (작은 새)
Lv 8:  까마귀
Lv 9:  뱀
Lv 10: 고양이
Lv 11: 족제비
Lv 12: 왜가리
Lv 13: 스라소니
Lv 14: 송골매
Lv 15: 멧돼지
Lv 16: 늑대
Lv 17: 반달곰
Lv 18: 호랑이

특수: 공룡 (보스, 만나면 즉시 게임오버)
```

**레벨별 상호작용 규칙:**
```typescript
interface FoodChainRule {
  canEat: (npcLevel: number) => boolean       // 나보다 낮은 레벨 모두
  cannotEat: (npcLevel: number) => boolean    // 나와 같은 레벨
  mustFlee: (npcLevel: number) => boolean     // 나보다 높은 레벨
}

// 규칙
const foodChainRules = {
  canEat: (playerLevel: number, npcLevel: number) => {
    return npcLevel < playerLevel
  },
  
  cannotEat: (playerLevel: number, npcLevel: number) => {
    return npcLevel === playerLevel
  },
  
  mustFlee: (playerLevel: number, npcLevel: number) => {
    return npcLevel > playerLevel
  }
}

// 예시: 플레이어 Lv 3
{
  canEat: [0, 1, 2]        // 개미, 애벌레, 딱정벌레
  cannotEat: [3]           // 거미 (충돌 시 넉백)
  mustFlee: [4, 5, 6, ...] // 메뚜기 이상 (도망)
}
```

**충돌 판정:**
- **먹을 수 있는 대상** (낮은 레벨): 충돌 시 즉시 먹음 → 점수 획득 + 공복 회복
- **같은 레벨**: 충돌 시 밀려남 (넉백), 먹지 못함
- **천적** (높은 레벨): 충돌 시 즉시 게임오버

**레벨별 속도 & 크기 밸런싱:**
```typescript
interface NPCStats {
  level: number
  baseSpeed: number    // 기본 속도
  baseSize: number     // 기본 크기
}

// 레벨에 비례한 스탯 증가
const calculateStats = (level: number): NPCStats => {
  return {
    level,
    baseSpeed: 80 + (level * 5),      // Lv 0: 80, Lv 1: 85, ... Lv 18: 170
    baseSize: 16 + (level * 2)        // Lv 0: 16px, Lv 1: 18px, ... Lv 18: 52px
  }
}

// 플레이어 스탯 (레벨업 시)
const playerStats = {
  speed: calculateStats(playerLevel).baseSpeed,
  size: calculateStats(playerLevel).baseSize
}

// 먹이(낮은 레벨): 플레이어보다 약간 느림 (90%)
const preySpeed = playerSpeed * 0.9

// 천적(높은 레벨): 플레이어보다 약간 빠름 (110%)
const predatorSpeed = playerSpeed * 1.1
```

**NPC 스폰 규칙 (동적 생태계):**
```typescript
// 플레이어 레벨에 따라 ±3 레벨 범위의 NPC만 스폰
const getSpawnableNPCs = (playerLevel: number): number[] => {
  const minLevel = Math.max(0, playerLevel - 3)
  const maxLevel = Math.min(18, playerLevel + 3)
  
  const levels: number[] = []
  for (let i = minLevel; i <= maxLevel; i++) {
    levels.push(i)
  }
  return levels
}

// 예시
플레이어 Lv 1 → NPC Lv 0, 1, 2, 3, 4 스폰
플레이어 Lv 5 → NPC Lv 2, 3, 4, 5, 6, 7, 8 스폰
플레이어 Lv 10 → NPC Lv 7, 8, 9, 10, 11, 12, 13 스폰
플레이어 Lv 18 → NPC Lv 15, 16, 17, 18, BOSS 스폰

// 레벨업 시 기존 범위 밖 NPC 제거 및 새로운 NPC 스폰
onLevelUp() {
  despawnOutOfRangeNPCs()
  spawnNewNPCs()
}
```

**천적 추격 제한:**
```typescript
// 천적(높은 레벨)은 10초 이상 추격 불가
class PredatorAI {
  private chaseStartTime: number = 0
  private readonly MAX_CHASE_DURATION = 10000 // 10초
  
  update() {
    if (this.state === 'CHASE') {
      const chaseDuration = Date.now() - this.chaseStartTime
      
      if (chaseDuration > this.MAX_CHASE_DURATION) {
        // 추격 중단, 배회로 전환
        this.state = 'WANDER'
        this.chaseStartTime = 0
      }
    }
  }
  
  startChase() {
    this.state = 'CHASE'
    this.chaseStartTime = Date.now()
  }
}
```

#### 1.4 공복(Hunger) 시스템

**게이지 구조:**
```typescript
interface HungerSystem {
  max: 100              // 최대 포만감
  current: 100          // 현재 포만감 (게임 시작 시 만복)
  decreaseRate: 1       // 초당 감소량
  criticalThreshold: 20 // 위험 구간 (빨간색 경고)
}

// 레벨에 따른 감소 속도 증가
decreaseRate = 1 + (level * 0.1) // 레벨 10이면 초당 2 감소
```

**공복 효과:**
- 80-100: 정상 (초록색)
- 40-79: 주의 (노란색)
- 20-39: 위험 (주황색)
- 0-19: 심각 (빨간색, 깜빡임)
- 0: 게임오버 (아사)

**공복 회복:**
```typescript
// 먹이 레벨에 비례한 회복량
recoveryAmount = npcLevel * 5 + 10

// 예시
개미(Lv 0) 먹기: +10
애벌레(Lv 1) 먹기: +15
개구리(Lv 5) 먹기: +35
```

#### 1.5 레벨업 시스템

**경험치 & 레벨업:**
```typescript
// 레벨업에 필요한 점수
requiredScore(level) = level * 100 + 50

// 예시
Lv 1 → 2: 150점
Lv 2 → 3: 250점
Lv 3 → 4: 350점
...
Lv 18 → 19: 1850점 (최고 레벨)
```

**레벨업 효과:**
```typescript
onLevelUp() {
  this.level++
  
  // 스탯 재계산 (레벨에 비례)
  const stats = calculateStats(this.level)
  this.speed = stats.baseSpeed
  this.setScale(stats.baseSize / 32) // 32px 기준
  
  // NPC 스폰 범위 업데이트
  updateNPCSpawnRange(this.level)
  
  // 시각/청각 피드백
  this.scene.cameras.main.shake(200, 0.01)
  this.scene.sound.play('level_up')
  this.scene.events.emit('levelUp', this.level)
}
```

**시각적 피드백:**
- 레벨업 시 캐릭터 빛남 (1초)
- 화면 흔들림 효과
- "LEVEL UP!" 텍스트 표시
- 레벨업 사운드

#### 1.6 맵 & 생태계

**맵 크기:**
```typescript
mapSize = {
  width: 5000,  // 픽셀
  height: 5000  // 픽셀
}

// 뷰포트: 800x600
// 미니맵 표시 (우측 상단)
```

**지형 요소:**
- 평면 바닥 (단색 또는 텍스처)
- 나무: 장애물, NPC 은신처
- 바위: 장애물
- 풀숲: 플레이어 은신 가능 (속도 50% 감소)

**NPC 분포 (동적 스폰):**
```typescript
// 플레이어 레벨에 따른 동적 스폰
const npcSpawnManager = {
  spawnInterval: 5, // 5초마다 체크
  
  update(playerLevel: number) {
    const spawnableRange = getSpawnableNPCs(playerLevel) // ±3 레벨
    
    spawnableRange.forEach(level => {
      const currentCount = this.countNPCsByLevel(level)
      const targetCount = this.getTargetCount(level, playerLevel)
      
      // 부족하면 스폰
      if (currentCount < targetCount) {
        this.spawnNPC(level)
      }
    })
    
    // 범위 밖 NPC 제거
    this.despawnOutOfRangeNPCs(playerLevel)
  },
  
  getTargetCount(npcLevel: number, playerLevel: number): number {
    const levelDiff = Math.abs(npcLevel - playerLevel)
    
    // 플레이어와 가까운 레벨일수록 많이 스폰
    if (levelDiff === 0) return 15      // 같은 레벨
    if (levelDiff === 1) return 12      // ±1 레벨
    if (levelDiff === 2) return 8       // ±2 레벨
    if (levelDiff === 3) return 5       // ±3 레벨
    return 0
  }
}

// 예시: 플레이어 Lv 5
맵에 존재하는 NPC:
- Lv 2: 8마리
- Lv 3: 12마리
- Lv 4: 12마리
- Lv 5: 15마리 (가장 많음)
- Lv 6: 12마리
- Lv 7: 12마리
- Lv 8: 8마리
총 약 79마리 (동적 조정)
```

#### 1.7 아이템 시스템

**아이템 카테고리:**

**1. 생존 아이템 (Survival)**
```typescript
items_survival = [
  {
    name: '황금 열매',
    effect: '공복 게이지 100% 회복',
    duration: 0,
    rarity: 'rare',
  },
  {
    name: '포만감 물약',
    effect: '공복 감소 속도 50% 감소',
    duration: 30,
    rarity: 'uncommon',
  },
  {
    name: '천적 방어막',
    effect: '높은 레벨 천적에게 무적',
    duration: 10,
    rarity: 'epic',
  }
]
```

**2. 능력 강화 아이템 (Buff)**
```typescript
items_buff = [
  {
    name: '날개 깃털',
    effect: '이동 속도 50% 증가',
    duration: 20,
    rarity: 'uncommon',
  },
  {
    name: '투명 망토',
    effect: '천적에게 감지 안 됨',
    duration: 15,
    rarity: 'rare',
  },
  {
    name: '거인의 힘',
    effect: '같은 레벨도 먹을 수 있음',
    duration: 20,
    rarity: 'epic',
  }
]
```

**3. 커스터마이징 아이템 (간소화)**
```typescript
// 플레이어 외형을 완전히 교체하는 스킨
const cosmeticSkins = [
  {
    id: 'custom_1',
    name: '기본 땃쥐',
    rarity: 'common',
    dropRate: 0,        // 기본 외형, 드롭 안 됨
    sprite: 'mole_basic_side'
  },
  {
    id: 'custom_2',
    name: '황금 땃쥐',
    rarity: 'uncommon',
    dropRate: 20,       // 20%
    sprite: 'mole_golden_side'
  },
  {
    id: 'custom_3',
    name: '무지개 땃쥐',
    rarity: 'rare',
    dropRate: 10,       // 10%
    sprite: 'mole_rainbow_side'
  },
  {
    id: 'custom_4',
    name: '유령 땃쥐',
    rarity: 'rare',
    dropRate: 10,
    sprite: 'mole_ghost_side'
  },
  {
    id: 'custom_5',
    name: '로봇 땃쥐',
    rarity: 'epic',
    dropRate: 5,        // 5%
    sprite: 'mole_robot_side'
  },
  {
    id: 'custom_6',
    name: '불꽃 땃쥐',
    rarity: 'epic',
    dropRate: 5,
    sprite: 'mole_fire_side'
  },
  {
    id: 'custom_7',
    name: '얼음 땃쥐',
    rarity: 'legendary',
    dropRate: 2,        // 2%
    sprite: 'mole_ice_side'
  },
  {
    id: 'custom_8',
    name: '우주 땃쥐',
    rarity: 'legendary',
    dropRate: 1,        // 1%
    sprite: 'mole_cosmic_side'
  }
]

// 획득 시 즉시 외형 교체
onAcquireSkin(skinId: string) {
  this.currentSkin = skinId
  this.setTexture(cosmeticSkins.find(s => s.id === skinId).sprite)
  
  // 획득 알림
  showNotification(`${skinId} 획득!`)
}
```

**아이템 드롭:**
```typescript
const itemSpawnConfig = {
  maxItemsOnMap: 15,
  spawnInterval: 10,
  despawnTime: 60,
  
  rarityWeights: {
    common: 60,
    uncommon: 25,
    rare: 12,
    epic: 3
  }
}

// NPC 처치 시 커스터마이징 드롭
onNPCKilled(npc: NPC) {
  const dropChance = npc.level * 5 + 10 // 레벨이 높을수록 높은 확률
  
  if (Math.random() * 100 < dropChance) {
    const skin = rollSkinDrop() // 드롭률 기반 추첨
    dropItem(skin, npc.x, npc.y)
  }
}
```

---

### 2. NPC AI 시스템

#### 2.1 AI 행동 패턴
```typescript
enum NPCState {
  WANDER,    // 배회
  CHASE,     // 추격 (플레이어가 낮은 레벨일 때)
  FLEE,      // 도망 (플레이어가 높은 레벨일 때)
}

class NPCAIController {
  private state: NPCState = NPCState.WANDER
  private chaseStartTime: number = 0
  private readonly MAX_CHASE_DURATION = 10000 // 10초
  
  update(delta: number) {
    const player = this.scene.player
    if (!player) return
    
    const distance = Phaser.Math.Distance.Between(
      this.npc.x, this.npc.y,
      player.x, player.y
    )
    
    const levelDiff = player.level - this.npc.level
    const detectionRange = 200 + (this.npc.level * 10)
    
    if (distance > detectionRange) {
      this.state = NPCState.WANDER
      this.wander()
      return
    }
    
    // 플레이어가 먹이 (낮은 레벨)
    if (levelDiff < 0) {
      // 추격 시간 체크
      if (this.state === NPCState.CHASE) {
        const chaseDuration = Date.now() - this.chaseStartTime
        
        if (chaseDuration > this.MAX_CHASE_DURATION) {
          // 10초 경과, 추격 중단
          this.state = NPCState.WANDER
          this.chaseStartTime = 0
          this.wander()
          return
        }
      } else {
        // 추격 시작
        this.state = NPCState.CHASE
        this.chaseStartTime = Date.now()
      }
      
      this.chaseTarget(player)
    }
    // 플레이어가 천적 (높은 레벨)
    else if (levelDiff > 0) {
      this.state = NPCState.FLEE
      this.chaseStartTime = 0
      this.fleeFrom(player)
    }
    // 같은 레벨 (경계)
    else {
      this.state = NPCState.WANDER
      this.chaseStartTime = 0
      this.wander()
    }
  }
  
  chaseTarget(target: Player) {
    const angle = Phaser.Math.Angle.Between(
      this.npc.x, this.npc.y,
      target.x, target.y
    )
    
    // 플레이어보다 약간 빠르게 (110%)
    const speed = this.npc.baseSpeed * 1.1
    
    this.npc.setVelocity(
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    )
    
    // 좌우 반전
    if (Math.cos(angle) < 0) this.npc.setFlipX(true)
    else this.npc.setFlipX(false)
    
    this.npc.play('run_side', true)
  }
  
  fleeFrom(target: Player) {
    const angle = Phaser.Math.Angle.Between(
      this.npc.x, this.npc.y,
      target.x, target.y
    )
    
    // 플레이어보다 약간 느리게 (90%)
    const speed = this.npc.baseSpeed * 0.9
    
    // 반대 방향으로 도망
    this.npc.setVelocity(
      -Math.cos(angle) * speed,
      -Math.sin(angle) * speed
    )
    
    if (-Math.cos(angle) < 0) this.npc.setFlipX(true)
    else this.npc.setFlipX(false)
    
    this.npc.play('flee_side', true)
  }
  
  wander() {
    // 배회 로직 (이전과 동일)
  }
}
```

#### 2.2 NPC 데이터베이스
```typescript
interface NPCData {
  level: number
  name: string
  baseSpeed: number
  baseSize: number
  scoreValue: number
  hungerRestore: number
}

const npcDatabase: NPCData[] = [
  { level: 0, name: '개미', baseSpeed: 80, baseSize: 16, scoreValue: 5, hungerRestore: 10 },
  { level: 1, name: '애벌레', baseSpeed: 85, baseSize: 18, scoreValue: 10, hungerRestore: 15 },
  { level: 2, name: '딱정벌레', baseSpeed: 90, baseSize: 20, scoreValue: 15, hungerRestore: 20 },
  { level: 3, name: '거미', baseSpeed: 95, baseSize: 22, scoreValue: 20, hungerRestore: 25 },
  { level: 4, name: '메뚜기', baseSpeed: 100, baseSize: 24, scoreValue: 25, hungerRestore: 30 },
  { level: 5, name: '개구리', baseSpeed: 105, baseSize: 26, scoreValue: 30, hungerRestore: 35 },
  { level: 6, name: '도마뱀', baseSpeed: 110, baseSize: 28, scoreValue: 35, hungerRestore: 40 },
  { level: 7, name: '뱁새', baseSpeed: 115, baseSize: 30, scoreValue: 40, hungerRestore: 45 },
  { level: 8, name: '까마귀', baseSpeed: 120, baseSize: 32, scoreValue: 45, hungerRestore: 50 },
  { level: 9, name: '뱀', baseSpeed: 125, baseSize: 34, scoreValue: 50, hungerRestore: 55 },
  { level: 10, name: '고양이', baseSpeed: 130, baseSize: 36, scoreValue: 55, hungerRestore: 60 },
  { level: 11, name: '족제비', baseSpeed: 135, baseSize: 38, scoreValue: 60, hungerRestore: 65 },
  { level: 12, name: '왜가리', baseSpeed: 140, baseSize: 40, scoreValue: 65, hungerRestore: 70 },
  { level: 13, name: '스라소니', baseSpeed: 145, baseSize: 42, scoreValue: 70, hungerRestore: 75 },
  { level: 14, name: '송골매', baseSpeed: 150, baseSize: 44, scoreValue: 75, hungerRestore: 80 },
  { level: 15, name: '멧돼지', baseSpeed: 155, baseSize: 46, scoreValue: 80, hungerRestore: 85 },
  { level: 16, name: '늑대', baseSpeed: 160, baseSize: 48, scoreValue: 85, hungerRestore: 90 },
  { level: 17, name: '반달곰', baseSpeed: 165, baseSize: 50, scoreValue: 90, hungerRestore: 95 },
  { level: 18, name: '호랑이', baseSpeed: 170, baseSize: 52, scoreValue: 95, hungerRestore: 100 },
  
  // 보스
  { level: 99, name: '공룡', baseSpeed: 100, baseSize: 128, scoreValue: 0, hungerRestore: 0 }
]
```

---

### 3. UI/UX

#### 3.1 메인 메뉴 (간소화)
```
┌─────────────────────────────────────┐
│                                     │
│       🐭 DDatge Suvival 🏃           │
│                                     │
│     [닉네임 입력: _______]          │
│                                     │
│       ▶ START GAME                  │
│         LEADERBOARD                 │
│         HOW TO PLAY                 │
│                                     │
│  Best Record: 2,345점 (Lv 14)      │
└─────────────────────────────────────┘
```

**변경점:**
- SETTINGS 메뉴 제거
- 게임 시작 / 리더보드 / 사용법만 제공

#### 3.2 게임 HUD
```
┌─────────────────────────────────────┐
│ ❤️ 공복: [████████░░] 80%          │
│ ⭐ 점수: 1,234  🏆 레벨: 8          │
│                                     │
│          [게임 화면]                │
│                                     │
│                                     │
│  [조이스틱]                         │
│     (모바일)                        │
│                                     │
│  버프: ⚡속도업 (15초)               │
│                                     │
│              [미니맵]               │
│              ┌─────┐                │
│              │ 🐭  │                │
│              └─────┘                │
└─────────────────────────────────────┘
```

#### 3.3 게임오버 화면 (고유 ID 시스템)
```
┌─────────────────────────────────────┐
│                                     │
│         💀 YOU DIED 💀              │
│                                     │
│       생존 시간: 15:34              │
│       최종 점수: 2,345              │
│       최고 레벨: Lv 14 (송골매)     │
│       처치 수: 87마리               │
│                                     │
│         전체 순위 #156              │
│                                     │
│     [최종 외형]                     │
│      ┌─────────┐                   │
│      │  🐭💎  │  ← 우주 땃쥐       │
│      └─────────┘                   │
│                                     │
│      [RETRY]    [MENU]             │
└─────────────────────────────────────┘
```

#### 3.4 리더보드 (고유 ID 기반)
```
┌─────────────────────────────────────┐
│         🏆 LEADERBOARD 🏆           │
│                                     │
│  필터: [점수순] [시간순] [레벨순]   │
│                                     │
│  1. 🥇 [💎] MoleKing    5,678 Lv19 │
│  2. 🥈 [🔥] Survivor    4,923 Lv18 │
│  3. 🥉 [🌈] Hunter      4,512 Lv17 │
│  4.    [⭐] FastMole    4,201 Lv17 │
│  5.    [👻] Speedrun    3,987 Lv16 │
│  ...                                │
│  42.   [💎] YOU         2,345 Lv14 │
│  ...                                │
│                                     │
│  [외형 아이콘 클릭 시 확대]         │
│         [CLOSE]                     │
└─────────────────────────────────────┘
```

---

### 4. 유저 식별 시스템 (고유 ID)

#### 4.1 고유 ID 생성
```typescript
// 브라우저 로컬 스토리지에 고유 ID 저장
interface UserIdentity {
  userId: string       // UUID
  nickname: string     // 사용자 입력 닉네임
  createdAt: string
}

// 첫 방문 시 ID 생성
function getOrCreateUserId(): string {
  const stored = localStorage.getItem('mole_user_id')
  
  if (stored) {
    return JSON.parse(stored).userId
  }
  
  // 새 ID 생성
  const newUser: UserIdentity = {
    userId: crypto.randomUUID(),
    nickname: '',
    createdAt: new Date().toISOString()
  }
  
  localStorage.setItem('mole_user_id', JSON.stringify(newUser))
  return newUser.userId
}

// 닉네임 업데이트
function updateNickname(nickname: string) {
  const stored = JSON.parse(localStorage.getItem('mole_user_id')!)
  stored.nickname = nickname
  localStorage.setItem('mole_user_id', JSON.stringify(stored))
}
```

#### 4.2 점수 저장 (중복 방지)
```typescript
// 같은 userId의 기록이 있으면 업데이트, 없으면 새로 생성
async function saveScore(data: ScoreData) {
  const userId = getOrCreateUserId()
  
  // 기존 기록 확인
  const { data: existing } = await supabase
    .from('scores')
    .select('id, score')
    .eq('user_id', userId)
    .single()
  
  if (existing) {
    // 새 기록이 더 높으면 업데이트
    if (data.score > existing.score) {
      await supabase
        .from('scores')
        .update({
          nickname: data.nickname,
          score: data.score,
          max_level: data.maxLevel,
          survival_time: data.survivalTime,
          kills_count: data.killsCount,
          death_reason: data.deathReason,
          skin_id: data.skinId,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
      
      return { updated: true, rank: await getRank(data.score) }
    } else {
      return { updated: false, rank: await getRank(existing.score) }
    }
  } else {
    // 신규 기록
    await supabase
      .from('scores')
      .insert({
        user_id: userId,
        nickname: data.nickname,
        score: data.score,
        max_level: data.maxLevel,
        survival_time: data.survivalTime,
        kills_count: data.killsCount,
        death_reason: data.deathReason,
        skin_id: data.skinId
      })
    
    return { updated: true, rank: await getRank(data.score) }
  }
}
```

#### 4.3 내 기록 조회
```typescript
// userId로 내 기록만 조회
async function getMyScore(): Promise<ScoreRecord | null> {
  const userId = getOrCreateUserId()
  
  const { data } = await supabase
    .from('scores')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  return data
}

// 리더보드에서 내 순위 표시
async function getMyRank(): Promise<number | null> {
  const myScore = await getMyScore()
  if (!myScore) return null
  
  const { count } = await supabase
    .from('scores')
    .select('*', { count: 'exact', head: true })
    .gt('score', myScore.score)
  
  return (count || 0) + 1
}
```

---

## 📊 데이터베이스 스키마 (수정)

### Supabase 테이블
```sql
CREATE TABLE scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,               -- 고유 사용자 ID
  nickname VARCHAR(12) NOT NULL,        -- 닉네임 (중복 가능)
  score INTEGER NOT NULL,
  max_level INTEGER NOT NULL,
  survival_time INTEGER NOT NULL,
  kills_count INTEGER NOT NULL,
  death_reason VARCHAR(50),
  skin_id VARCHAR(50),                  -- 최종 외형 ID (custom_1 ~ custom_8)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 인덱스
  INDEX idx_user_id (user_id),
  INDEX idx_score (score DESC),
  INDEX idx_level (max_level DESC),
  INDEX idx_time (survival_time DESC),
  
  -- user_id는 유니크 (한 사용자당 하나의 기록)
  UNIQUE(user_id)
);

-- Row Level Security
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view scores"
  ON scores FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert scores"
  ON scores FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update their own score"
  ON scores FOR UPDATE
  USING (true);
```

### API 엔드포인트
```typescript
// POST /api/scores
interface ScoreSubmitRequest {
  userId: string        // 고유 사용자 ID
  nickname: string
  score: number
  maxLevel: number
  survivalTime: number
  killsCount: number
  deathReason: 'hunger' | 'predator' | 'boss'
  skinId: string        // custom_1 ~ custom_8
}

interface ScoreSubmitResponse {
  success: boolean
  updated: boolean      // true: 신규 또는 갱신, false: 기존 기록이 더 높음
  rank: number
}

// GET /api/scores?sort=score&limit=100
interface LeaderboardResponse {
  scores: ScoreRecord[]
  total: number
  userRank?: {
    rank: number
    score: ScoreRecord
  }
}

interface ScoreRecord {
  id: string
  userId: string
  nickname: string
  score: number
  maxLevel: number
  survivalTime: number
  killsCount: number
  skinId: string        // 외형 ID
  createdAt: string
  updatedAt: string
}
```

---

## 🏗 프로젝트 구조
```
mole-survival/
├── public/
│   ├── assets/
│   │   ├── sprites/
│   │   │   ├── player/
│   │   │   │   ├── mole_basic_side.png      (기본)
│   │   │   │   ├── mole_golden_side.png     (황금)
│   │   │   │   ├── mole_rainbow_side.png    (무지개)
│   │   │   │   ├── mole_ghost_side.png      (유령)
│   │   │   │   ├── mole_robot_side.png      (로봇)
│   │   │   │   ├── mole_fire_side.png       (불꽃)
│   │   │   │   ├── mole_ice_side.png        (얼음)
│   │   │   │   └── mole_cosmic_side.png     (우주)
│   │   │   ├── npcs/
│   │   │   │   ├── ant_side.png             (Lv 0)
│   │   │   │   ├── caterpillar_side.png     (Lv 1)
│   │   │   │   ├── beetle_side.png          (Lv 2)
│   │   │   │   └── ... (Lv 18까지)
│   │   │   └── items/
│   │   │       ├── golden_fruit.png
│   │   │       ├── potion_blue.png
│   │   │       └── ...
│   │   ├── tiles/
│   │   │   ├── ground.png       (평면 바닥)
│   │   │   ├── tree.png
│   │   │   ├── rock.png
│   │   │   └── bush.png
│   │   └── sounds/
│   │       ├── player/
│   │       ├── items/
│   │       ├── npc/
│   │       └── music/
│   └── fonts/
│       └── press-start-2p.ttf
│
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # 메인 메뉴
│   │   ├── game/
│   │   │   └── page.tsx
│   │   ├── leaderboard/
│   │   │   └── page.tsx
│   │   └── api/
│   │       └── scores/
│   │           └── route.ts
│   │
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── ProgressBar.tsx
│   │   ├── game/
│   │   │   ├── GameCanvas.tsx
│   │   │   ├── HUD.tsx
│   │   │   ├── HungerBar.tsx
│   │   │   ├── BuffDisplay.tsx
│   │   │   ├── VirtualJoystick.tsx
│   │   │   ├── MiniMap.tsx
│   │   │   └── LevelUpNotice.tsx
│   │   └── leaderboard/
│   │       ├── LeaderboardList.tsx
│   │       └── SkinPreview.tsx
│   │
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── userId.ts                 # 고유 ID 관리
│   │   └── phaser/
│   │       ├── config.ts
│   │       ├── scenes/
│   │       │   ├── PreloadScene.ts
│   │       │   ├── GameScene.ts
│   │       │   └── GameOverScene.ts
│   │       ├── entities/
│   │       │   ├── Player.ts
│   │       │   ├── NPC.ts
│   │       │   └── Item.ts
│   │       ├── systems/
│   │       │   ├── NPCManager.ts     # 동적 스폰
│   │       │   ├── ItemManager.ts
│   │       │   ├── HungerSystem.ts
│   │       │   ├── LevelSystem.ts
│   │       │   └── FoodChain.ts      # 먹이 사슬 규칙
│   │       ├── ai/
│   │       │   ├── NPCAIController.ts
│   │       │   └── behaviors/
│   │       │       ├── WanderBehavior.ts
│   │       │       ├── ChaseBehavior.ts
│   │       │       └── FleeBehavior.ts
│   │       ├── utils/
│   │       │   ├── mapGenerator.ts
│   │       │   ├── objectPool.ts
│   │       │   └── collision.ts
│   │       └── data/
│   │           ├── npcData.ts
│   │           ├── itemData.ts
│   │           └── skinData.ts       # 커스터마이징 데이터
│   │
│   ├── store/
│   │   └── gameStore.ts
│   │
│   ├── types/
│   │   ├── game.d.ts
│   │   ├── npc.d.ts
│   │   ├── item.d.ts
│   │   └── supabase.d.ts
│   │
│   └── styles/
│       └── globals.css
│
├── .env.local
├── next.config.js
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

---

## 🎯 구현 우선순위 & 마일스톤

### Week 1: 프로토타입

#### Day 1: 프로젝트 셋업 (3-4시간)
- [ ] Next.js 15 프로젝트 생성
- [ ] Phaser 3 + Arcade Physics 설정
- [ ] 고유 ID 시스템 구현
- [ ] 기본 씬 구조

#### Day 2-3: 플레이어 & 이동 (6-8시간)
- [ ] 키 입력 기반 이동 (누르는 동안만)
- [ ] 8방향 이동 + 정규화
- [ ] 옆모습 스프라이트 좌우 반전
- [ ] 카메라 추적

**목표:** 플레이어가 방향키로 자유롭게 이동, 멈춤

#### Day 4-5: NPC 기본 & 레벨 시스템 (6-8시간)
- [ ] NPC 엔티티 (레벨 0~3)
- [ ] 먹이 사슬 규칙 구현
```typescript
  canEat: npcLevel < playerLevel
  cannotEat: npcLevel === playerLevel
  mustFlee: npcLevel > playerLevel
```
- [ ] 충돌 판정 (먹기, 넉백, 게임오버)
- [ ] 레벨별 속도/크기 적용

**목표:** 레벨 시스템 작동, 먹이 사슬 확인

#### Day 6-7: AI & 공복 (5-6시간)
- [ ] NPC AI (배회, 추격, 도망)
- [ ] 천적 10초 추격 제한
- [ ] 공복 게이지
- [ ] HUD (공복, 점수, 레벨)

**목표:** 1주차 MVP 완성

---

### Week 2: 동적 생태계

#### Day 8-10: 동적 NPC 스폰 (10-12시간)
- [ ] ±3 레벨 범위 스폰 시스템
- [ ] 레벨업 시 NPC 범위 업데이트
- [ ] NPC 데이터베이스 (Lv 0~18)
- [ ] NPCManager 구현
```typescript
  onLevelUp() {
    despawnOutOfRangeNPCs()
    spawnNewNPCs()
  }
```

**목표:** 동적 생태계 작동

#### Day 11-12: 아이템 (6-8시간)
- [ ] 생존/버프 아이템 3종씩
- [ ] 아이템 스폰
- [ ] 버프 시스템
- [ ] 버프 UI

#### Day 13-14: 맵 & 미니맵 (6-8시간)
- [ ] 평면 바닥 타일맵
- [ ] 장애물 배치
- [ ] 미니맵 (±3 레벨 NPC 표시)

---

### Week 3: 커스터마이징 & 모바일

#### Day 15-17: 커스터마이징 (8-10시간)
- [ ] 스킨 8종 데이터
- [ ] 드롭 시스템 (레어도별)
- [ ] 스킨 교체 시스템
```typescript
  onAcquireSkin(skinId) {
    this.setTexture(skinId)
  }
```
- [ ] 게임오버 시 스킨 저장

**목표:** 커스터마이징 완성

#### Day 18-19: 고유 ID & 점수 (6-8시간)
- [ ] 고유 ID 생성/저장
- [ ] 중복 방지 점수 저장
- [ ] 내 기록 조회
- [ ] 리더보드 (스킨 표시)

#### Day 20-21: 모바일 지원 (6-8시간)
- [ ] 버추얼 조이스틱
- [ ] 터치 입력
- [ ] 반응형 레이아웃
- [ ] 성능 최적화

---

### Week 4: 폴리싱

#### Day 22-24: UI/UX (8-10시간)
- [ ] 메인 메뉴 폴리싱
- [ ] HUD 개선
- [ ] 게임오버 화면
- [ ] 리더보드 개선
- [ ] 튜토리얼

#### Day 25-26: 사운드 & 그래픽 (6-8시간)
- [ ] 효과음
- [ ] BGM
- [ ] 도트 그래픽 완성
- [ ] 파티클 효과

#### Day 27-28: 테스트 & 버그 수정 (6-8시간)
- [ ] 밸런싱
- [ ] 버그 수정
- [ ] 성능 최적화

#### Day 29: 배포 (3-4시간)
- [ ] Vercel 배포
- [ ] Supabase 설정
- [ ] 출시 준비

---

## 🔧 핵심 코드 스니펫

### 1. 고유 ID 시스템
```typescript
// src/lib/userId.ts
interface UserIdentity {
  userId: string
  nickname: string
  createdAt: string
}

export function getOrCreateUserId(): string {
  if (typeof window === 'undefined') return ''
  
  const stored = localStorage.getItem('mole_user_id')
  
  if (stored) {
    return JSON.parse(stored).userId
  }
  
  const newUser: UserIdentity = {
    userId: crypto.randomUUID(),
    nickname: '',
    createdAt: new Date().toISOString()
  }
  
  localStorage.setItem('mole_user_id', JSON.stringify(newUser))
  return newUser.userId
}

export function updateUserNickname(nickname: string) {
  if (typeof window === 'undefined') return
  
  const stored = JSON.parse(localStorage.getItem('mole_user_id')!)
  stored.nickname = nickname
  localStorage.setItem('mole_user_id', JSON.stringify(stored))
}

export function getUserNickname(): string {
  if (typeof window === 'undefined') return ''
  
  const stored = localStorage.getItem('mole_user_id')
  if (!stored) return ''
  
  return JSON.parse(stored).nickname || ''
}
```

### 2. 동적 NPC 스폰
```typescript
// src/lib/phaser/systems/NPCManager.ts
export class NPCManager {
  private scene: Phaser.Scene
  private npcs: NPC[] = []
  private spawnTimer: number = 0
  private readonly SPAWN_INTERVAL = 5000 // 5초
  
  update(delta: number, playerLevel: number) {
    this.spawnTimer += delta
    
    if (this.spawnTimer >= this.SPAWN_INTERVAL) {
      this.spawnTimer = 0
      this.updateNPCSpawns(playerLevel)
    }
    
    // NPC AI 업데이트
    this.npcs.forEach(npc => {
      if (npc.active) npc.update()
    })
  }
  
  private updateNPCSpawns(playerLevel: number) {
    // ±3 레벨 범위
    const minLevel = Math.max(0, playerLevel - 3)
    const maxLevel = Math.min(18, playerLevel + 3)
    
    for (let level = minLevel; level <= maxLevel; level++) {
      const current = this.countNPCsByLevel(level)
      const target = this.getTargetCount(level, playerLevel)
      
      // 부족하면 스폰
      if (current < target) {
        this.spawnNPC(level)
      }
    }
    
    // 범위 밖 제거
    this.despawnOutOfRange(minLevel, maxLevel)
  }
  
  private getTargetCount(npcLevel: number, playerLevel: number): number {
    const diff = Math.abs(npcLevel - playerLevel)
    
    if (diff === 0) return 15
    if (diff === 1) return 12
    if (diff === 2) return 8
    if (diff === 3) return 5
    return 0
  }
  
  private spawnNPC(level: number) {
    const data = npcDatabase.find(n => n.level === level)!
    const pos = this.getRandomPosition()
    
    const npc = new NPC(this.scene, pos.x, pos.y, data)
    this.npcs.push(npc)
  }
  
  private despawnOutOfRange(minLevel: number, maxLevel: number) {
    this.npcs.forEach(npc => {
      if (npc.level < minLevel || npc.level > maxLevel) {
        npc.destroy()
      }
    })
    
    this.npcs = this.npcs.filter(n => n.active)
  }
}
```

### 3. 스킨 시스템
```typescript
// src/lib/phaser/data/skinData.ts
export const skins = [
  { id: 'custom_1', name: '기본', rarity: 'common', dropRate: 0 },
  { id: 'custom_2', name: '황금', rarity: 'uncommon', dropRate: 20 },
  { id: 'custom_3', name: '무지개', rarity: 'rare', dropRate: 10 },
  { id: 'custom_4', name: '유령', rarity: 'rare', dropRate: 10 },
  { id: 'custom_5', name: '로봇', rarity: 'epic', dropRate: 5 },
  { id: 'custom_6', name: '불꽃', rarity: 'epic', dropRate: 5 },
  { id: 'custom_7', name: '얼음', rarity: 'legendary', dropRate: 2 },
  { id: 'custom_8', name: '우주', rarity: 'legendary', dropRate: 1 }
]

// 드롭 추첨
export function rollSkinDrop(): string | null {
  const roll = Math.random() * 100
  let cumulative = 0
  
  for (const skin of skins) {
    if (skin.dropRate === 0) continue
    
    cumulative += skin.dropRate
    if (roll < cumulative) {
      return skin.id
    }
  }
  
  return null
}
```

### 4. 점수 저장 API
```typescript
// src/app/api/scores/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const {
      userId,
      nickname,
      score,
      maxLevel,
      survivalTime,
      killsCount,
      deathReason,
      skinId
    } = await request.json()
    
    // 기존 기록 확인
    const { data: existing } = await supabase
      .from('scores')
      .select('id, score')
      .eq('user_id', userId)
      .single()
    
    let updated = false
    
    if (existing) {
      // 새 기록이 더 높으면 업데이트
      if (score > existing.score) {
        await supabase
          .from('scores')
          .update({
            nickname,
            score,
            max_level: maxLevel,
            survival_time: survivalTime,
            kills_count: killsCount,
            death_reason: deathReason,
            skin_id: skinId,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
        
        updated = true
      }
    } else {
      // 신규 기록
      await supabase
        .from('scores')
        .insert({
          user_id: userId,
          nickname,
          score,
          max_level: maxLevel,
          survival_time: survivalTime,
          kills_count: killsCount,
          death_reason: deathReason,
          skin_id: skinId
        })
      
      updated = true
    }
    
    // 순위 계산
    const { count } = await supabase
      .from('scores')
      .select('*', { count: 'exact', head: true })
      .gt('score', score)
    
    return NextResponse.json({
      success: true,
      updated,
      rank: (count || 0) + 1
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Failed to save score' },
      { status: 500 }
    )
  }
}
```

---

## 📝 환경 변수
```bash
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Game
NEXT_PUBLIC_GAME_VERSION=1.0.0
```

---

## 🧪 테스트 체크리스트

### 레벨 시스템
- [ ] Lv 1로 게임 시작
- [ ] 낮은 레벨 NPC 먹을 수 있음
- [ ] 같은 레벨은 넉백
- [ ] 높은 레벨에게 죽음
- [ ] 레벨업 시 속도/크기 증가

### 동적 생태계
- [ ] ±3 레벨 범위 NPC만 스폰
- [ ] 레벨업 시 NPC 교체
- [ ] 천적 10초 후 추격 중단

### 커스터마이징
- [ ] 스킨 드롭
- [ ] 스킨 즉시 적용
- [ ] 레어도별 드롭률 차이

### 고유 ID
- [ ] 첫 방문 시 ID 생성
- [ ] 중복 닉네임 허용
- [ ] 같은 ID는 하나의 기록만
- [ ] 신기록 시 업데이트

---

## 🚀 배포 가이드
```bash
# 1. 저장소 생성
git init
git add .
git commit -m "Initial commit"
git push

# 2. Vercel 배포
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_KEY
vercel --prod
```

---

## 🎨 에셋 리소스

### 도트 그래픽
1. **Kenney.nl** - https://kenney.nl/assets
2. **itch.io** - https://itch.io/game-assets
3. **Piskel** - https://www.piskelapp.com (직접 제작)

### 사운드
1. **Pixabay** - https://pixabay.com/sound-effects/
2. **Freesound.org** - https://freesound.org
3. **Incompetech** - https://incompetech.com

---

## 🎯 출시 후 로드맵

### 단기 (1개월)
- [ ] 일일 챌린지
- [ ] 업적 시스템

### 중기 (3개월)
- [ ] 새로운 맵
- [ ] 시즌 이벤트

### 장기 (6개월)
- [ ] 협동 모드
- [ ] 모바일 앱

---

**이 PRD 문서 버전:** 3.0  
**최종 업데이트:** 2025-01-30  
**작성자:** Claude (Anthropic)

**땃쥐 서바이벌을 만들어보세요! 🐭🏃💨**