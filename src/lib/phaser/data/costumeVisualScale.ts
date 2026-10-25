// 의상별 화면 배율.
// 의상 그림은 모두 370×262 캔버스지만 캔버스 안에서 땃쥐 머리 크기가 제각각이라,
// 기본 땃쥐의 얼굴(두 눈과 입) 크기에 맞도록 측정한 값이다. (측정 방법: docs/animation/README.md)
// 화면 크기에만 적용되며 충돌 판정·스킬 범위는 기본 땃쥐 크기를 유지한다.
export const COSTUME_VISUAL_SCALE: Record<string, number> = {
  rock: 1.34,
  fire: 1.23,
  ice: 1.03,
  golden: 1.04,
  rainbow: 1.1,
  sherbet: 1.11,
  fighter: 1.22,
  angel: 1.2,
  cosmic: 1.25,
  ghost: 1.06,
  crystal: 1.11,
  ninja: 1.35,
  robot: 1.05,
  icecream: 1.33,
  pierrot: 1.23,
  cowboy: 1.27,
  magic: 1.22,
  skater: 1.32,
  street_fighter: 1.09,
  king: 1.46,
  link: 1.44,
};

export function costumeVisualScale(costume: string | null): number {
  return (costume && COSTUME_VISUAL_SCALE[costume]) || 1;
}
