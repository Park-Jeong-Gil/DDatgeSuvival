const rarityColor: Record<string, string> = {
  common: "text-gray-400",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-amber-400",
};

const skins = [
  { name: "기본 땃쥐", rarity: "common" },
  { name: "황금 땃쥐", rarity: "uncommon" },
  { name: "무지개 땃쥐", rarity: "rare" },
  { name: "유령 땃쥐", rarity: "rare" },
  { name: "로봇 땃쥐", rarity: "epic" },
  { name: "불꽃 땃쥐", rarity: "epic" },
  { name: "얼음 땃쥐", rarity: "legendary" },
  { name: "우주 땃쥐", rarity: "legendary" },
];

export default function HowToPlayContent() {
  return (
    <div className="text-left space-y-5 text-sm">
      {/* Controls */}
      <section>
        <h3 className="font-bold text-white mb-2 text-base">조작법</h3>
        <div className="space-y-1 text-gray-300">
          <p>WASD / 방향키 : 이동</p>
          <p>모바일 : 가상 조이스틱</p>
        </div>
      </section>

      {/* Goals */}
      <section>
        <h3 className="font-bold text-white mb-2 text-base">목표</h3>
        <div className="space-y-1 text-gray-300">
          <p>- 나보다 작은 생물을 먹어 점수 획득 & 레벨업</p>
          <p>- 천적(높은 레벨)에게 잡히면 게임오버</p>
          <p>- 허기 게이지가 0이 되면 사망</p>
          <p>- 최대한 오래 생존하세요!</p>
        </div>
      </section>

      {/* Items */}
      <section>
        <h3 className="font-bold text-white mb-2 text-base">아이템</h3>
        <div className="space-y-3">
          <div>
            <p className="font-bold text-green-400 mb-1.5 text-xs tracking-wide">
              생존 아이템
            </p>
            <div className="space-y-1 text-gray-300">
              <div className="flex justify-between">
                <span>황금 열매</span>
                <span className="text-gray-400">허기 완전 회복</span>
              </div>
              <div className="flex justify-between">
                <span>포만감 물약</span>
                <span className="text-gray-400">30초 허기 감소 느려짐</span>
              </div>
              <div className="flex justify-between">
                <span>천적 방어막</span>
                <span className="text-gray-400">10초 무적</span>
              </div>
            </div>
          </div>
          <div>
            <p className="font-bold text-blue-400 mb-1.5 text-xs tracking-wide">
              버프 아이템
            </p>
            <div className="space-y-1 text-gray-300">
              <div className="flex justify-between">
                <span>날개 깃털</span>
                <span className="text-gray-400">20초 이동속도 증가</span>
              </div>
              <div className="flex justify-between">
                <span>투명 망토</span>
                <span className="text-gray-400">15초 투명화</span>
              </div>
              <div className="flex justify-between">
                <span>거인의 힘</span>
                <span className="text-gray-400">20초 같은 레벨 먹기</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Costumes */}
      <section>
        <h3 className="font-bold text-white mb-2 text-base">코스튬</h3>
        <div className="space-y-1">
          {skins.map((skin) => (
            <div key={skin.name} className="flex justify-between text-gray-300">
              <span>{skin.name}</span>
              <span className={`text-xs font-bold ${rarityColor[skin.rarity]}`}>
                {skin.rarity.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
