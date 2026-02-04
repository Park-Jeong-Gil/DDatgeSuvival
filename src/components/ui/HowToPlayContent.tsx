import { costumesData } from "@/lib/phaser/data/skinData";

const rarityColor: Record<string, string> = {
  common: "text-gray-400",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-amber-400",
};

export default function HowToPlayContent() {
  return (
    <div className="text-left space-y-5 text-sm">
      {/* Controls */}
      <section>
        <h3 className="font-bold text-white mb-2 text-base">▸ 조작법</h3>
        <div className="space-y-1 text-gray-300">
          <p>WASD / 방향키 : 이동</p>
          <p>모바일 : 터치 & 드래그</p>
        </div>
      </section>

      {/* Goals */}
      <section>
        <h3 className="font-bold text-white mb-2 text-base">▸ 목표</h3>
        <div className="space-y-1 text-gray-300">
          <p>
            ・ <span className="text-yellow-300">낮은 레벨 먹이</span>를 먹어서
            점수 획득 & 레벨업
          </p>
          <p>
            ・ <span className="text-red-400">높은 레벨 천적</span>에게 잡히면
            게임오버
          </p>
          <p>・ 나무와 바위 같은 장애물을 활용해서 천적에게 도망</p>
          <p>・ 풀숲에서는 천적의 이동 속도가 반감</p>
          <p>・ 공복 게이지가 0이 되면 사망</p>
          <p>・ 천적을 피하고 먹이를 잡으며 최대한 오래 생존하세요!</p>
        </div>
      </section>

      {/* Items */}
      <section>
        <h3 className="font-bold text-white mb-2 text-base">▸ 아이템</h3>
        <div className="space-y-3">
          <div>
            <p className="font-bold text-green-400 mb-1.5 text-xs tracking-wide">
              생존 아이템
            </p>
            <div className="space-y-1 text-gray-300">
              <div className="flex justify-between">
                <span>・ 황금 열매</span>
                <span className="text-gray-400">공복 완전 회복</span>
              </div>
              <div className="flex justify-between">
                <span>・ 포만감 물약</span>
                <span className="text-gray-400">공복 감소 느려짐 (30초)</span>
              </div>
              <div className="flex justify-between">
                <span>・ 천적 방어막</span>
                <span className="text-gray-400">무적 (10초)</span>
              </div>
            </div>
          </div>
          <div>
            <p className="font-bold text-blue-400 mb-1.5 text-xs tracking-wide">
              버프 아이템
            </p>
            <div className="space-y-1 text-gray-300">
              <div className="flex justify-between">
                <span>・ 날개 깃털</span>
                <span className="text-gray-400">이동속도 증가 (20초)</span>
              </div>
              <div className="flex justify-between">
                <span>・ 투명 망토</span>
                <span className="text-gray-400">투명화 (15초)</span>
              </div>
              <div className="flex justify-between">
                <span>・ 거인의 힘</span>
                <span className="text-gray-400">같은 레벨 먹기 (20초)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Costumes */}
      <section>
        <h3 className="font-bold text-white mb-2 text-base">▸ 코스튬</h3>
        <div className="space-y-1">
          {costumesData.map((costume) => (
            <div
              key={costume.id}
              className="flex justify-between text-gray-300"
            >
              <span>・ {costume.name}</span>
              <span
                className={`text-xs font-bold ${rarityColor[costume.rarity]}`}
              >
                {costume.rarity.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
