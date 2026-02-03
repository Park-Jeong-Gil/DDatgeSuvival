// Pure data - no Phaser dependency
// Used by React UI components to display NPC names
export const npcNamesByLevel: Record<number, string> = {
  0: "개미",
  1: "뿔 송충이",
  2: "사마귀",
  3: "거미",
  4: "도마뱀",
  5: "참새",
  6: "독 두꺼비",
  7: "뱀",
  8: "까마귀",
  9: "고양이",
  10: "족제비",
  11: "부엉이",
  12: "여우",
  13: "킹 코모도",
  14: "독수리",
  15: "멧돼지",
  16: "늑대",
  17: "반달곰",
  18: "호랑이",
  99: "공룡",
};

export function getNpcNameKo(level: number): string {
  return npcNamesByLevel[level] ?? `Lv ${level}`;
}
