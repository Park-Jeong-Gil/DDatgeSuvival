# 캐릭터 이동 애니메이션

플레이어 외형 22종(기본 + 의상 21종)은 달리기, NPC 31종은 배회(walk)와 추격(chase) 애니메이션을 재생합니다. 동작마다 4·6·8프레임이며, 84개 동작에 총 494프레임입니다.

## 파일 구조

```text
public/assets/sprites/characters/
  player/
    base/                idle.png, eat.png, run.png
    costumes/<id>/       idle.png, eat.png, run.png   (의상 21종)
    costumes/{blue,green,pink,yellow}/idle.png         (단종 의상, 랭킹 표시용)
  npcs/<name>/           walk.png, chase.png          (NPC 31종)

src/lib/phaser/data/
  movementAnimations.json   이동 시트 84개의 정의
  staticPoses.json          정지 포즈 128개의 정의
src/lib/phaser/animations/movement.ts   로드·등록·정지 포즈 헬퍼
```

`run.png`, `walk.png`, `chase.png`는 이동 시트입니다. `idle.png`, `eat.png`는 원본 아트에 투명 여백만 더한 단독 이미지입니다. 단종 의상 4종은 게임에서 로드하지 않고, 예전 랭킹 기록에 남은 의상 이미지를 보여 주는 용도로만 둡니다.

## 시트 규칙

- **프레임 크기 = 원본 크기 + 대칭 여백.** `frameWidth = referenceWidth + paddingX × 2`이고, 높이도 같은 방식입니다. 여백 때문에 캐릭터 중심과 프레임 중심이 일치합니다.
- **화면 크기는 원본 기준입니다.** 이름표·그림자·게이지·충돌 박스는 여백을 뺀 `bodyDisplayWidth/Height`(= reference × scale)를 씁니다. `displayWidth`는 여백을 포함하므로 레이아웃에 쓰지 않습니다.
- **격자 배치.** 4프레임 이하는 1줄, 6프레임은 3×2, 8프레임은 4×2입니다(`columns`). 시트는 4096px 이하여야 합니다. 저사양 모바일 GPU의 텍스처 한계입니다.
- **프레임 테두리 3px은 투명해야 합니다.** 선형 필터링으로 옆 프레임이 번지지 않게 합니다.
- **지면선은 원본과 같습니다.** 생성 프레임의 발 위치를 원본 아트의 발 위치에 맞췄습니다.

## manifest 필드

| 필드 | 의미 |
|---|---|
| `textureKey` | 정지 포즈 키. 이동 애니메이션 키는 `${textureKey}_cycle` |
| `path` | `public/` 기준 이미지 경로 |
| `frames`, `frameRate`, `columns` | 프레임 수, 기준 fps, 격자 열 수 |
| `restFrame` | 멈췄을 때 보여 줄 프레임. 정지 포즈 → 이동 전환이 끊기지 않도록 이 프레임에서 재생을 시작 |
| `referenceWidth/Height` | 원본 아트 크기. 표시 크기·충돌 박스 기준 |
| `paddingX/Y` | 좌우·상하 대칭 여백 |

`staticPoses.json`에서 `frame`이 있는 항목(84개)은 이동 시트의 rest 프레임을 그대로 쓰기 때문에 별도 이미지를 로드하지 않습니다. `frame`이 없는 항목(플레이어 idle/eat 44개)만 단독 이미지를 로드합니다.

## 런타임 동작

- **재생 속도.** 실제 이동 속도에 맞춰 `anims.timeScale`을 조절합니다. 기준 속도는 다음과 같습니다.
  - 플레이어 달리기: `currentSpeed`
  - NPC 배회·도망: `baseSpeed × 0.5`
  - NPC 추격: 감속 효과 적용 전의 추격 속도
- **멈춤.**
  - 정지하면 애니메이션을 멈추고 rest 프레임을 보여 줍니다.
  - NPC가 기절·넉백 중이면 현재 프레임에서 멈춥니다.
  - 물리만 일시정지(`physics.world.pause()`)돼도 플레이어와 NPC 모두 현재 프레임에서 멈춥니다. 설정창 일시정지(`scene.pause()`)는 씬 전체를 멈춥니다.

## 의상별 화면 배율

의상 그림은 모두 370×262 캔버스지만, 캔버스 안에서 땃쥐가 차지하는 크기가 다릅니다. 장식이 큰 의상일수록 땃쥐가 작게 그려졌습니다. 그래서 의상마다 **머리 크기가 기본 땃쥐와 같아지도록** 화면 배율을 곱합니다. 값은 `src/lib/phaser/data/costumeVisualScale.ts`에 있습니다(1.03~1.46).

- **측정 방법:**
  - idle 그림에서 두 눈 사이 거리를 기본 땃쥐와 비교했습니다.
  - 기본 땃쥐의 얼굴(두 눈 + 입)을 템플릿으로 삼아, 크기를 바꿔 가며 가장 잘 맞는 배율을 찾았습니다.
  - 두 값이 모두 믿을 만하면 평균을 썼습니다. 윙크 눈이나 외곽선 때문에 한쪽 측정이 어긋난 의상은 다른 쪽 값을 썼습니다.
  - 배율은 그 역수(1 / 머리 비율)입니다.
- **화면에만 적용됩니다.** 다음은 의상과 관계없이 기본 땃쥐 기준이에요.
  - 충돌 박스, 오브 궤도, 스킬 범위, 그림자, 게이지
  - `bodyDisplayWidth/Height`
- **발 기준으로 확대합니다.** 원본 캔버스 하단(지면선)이 그림자 위치에 고정되도록 `Player.syncDisplayOrigin()`이 기준점을 옮깁니다. 이름표는 확대된 그림의 상단(`visualTopOffset`) 위에 표시합니다.
- 새 의상을 추가하면 같은 방식으로 배율을 재서 표에 넣어 주세요. 표에 없는 의상은 배율 1로 처리합니다.

## 새 캐릭터·의상 추가

1. 위 시트 규칙에 맞는 이동 시트를 만들어 `characters/` 아래 해당 폴더에 둡니다. 플레이어 외형은 `idle.png`와 `eat.png`도 같은 프레임 크기로 둡니다.
2. `movementAnimations.json`과 `staticPoses.json`에 항목을 추가합니다.
3. `PreloadScene`의 `npcNames` 또는 `costumeNames`에 이름을 추가합니다.
4. 아래 검증을 실행합니다.

## 검증

```bash
node docs/animation/verify-sprites.cjs
```

검사 항목은 다음과 같습니다.

- manifest 키 중복
- 이미지 존재와 크기
- 격자 열 수와 4096px 한도
- 대칭 여백
- 3px 투명 테두리
- 빈 프레임·중복 프레임
- 정지 포즈와 시트의 rest 프레임 일치

## 제작 기록

프레임은 원본 아트를 참조해 이미지 생성 도구로 만들었습니다. 이후 정렬·크기 보정, 격자 패킹, 폴더 정리를 거쳤습니다. 재생성 파이프라인과 입력 원본, 각 단계의 검토 보고서·비교 GIF는 용량이 커서(약 270MB) 레포에서 제외하고 `ddatgeSurvival-animation-study-20261025.tar.gz` 아카이브로 따로 보관합니다. 다시 생성하려면 이 아카이브를 레포 루트에 풀고 `node docs/animation-study/pack-all.cjs`를 실행하면 됩니다.
