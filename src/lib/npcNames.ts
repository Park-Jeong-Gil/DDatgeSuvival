// Pure data - no Phaser dependency
// Used by React UI components to display NPC names
export const npcNamesByLevel: Record<number, string> = {
  0: "개미",
  1: "애벌레",
  2: "딱정벌레",
  3: "거미",
  4: "메뚜기",
  5: "개구리",
  6: "도마뱀",
  7: "뱁새",
  8: "까마귀",
  9: "뱀",
  10: "고양이",
  11: "족제비",
  12: "왜가리",
  13: "스라소니",
  14: "송골매",
  15: "멧돼지",
  16: "늑대",
  17: "반달곰",
  18: "호랑이",
  19: "최강",
  99: "공룡",
};

export function getNpcNameKo(level: number): string {
  return npcNamesByLevel[level] ?? `Lv ${level}`;
}
