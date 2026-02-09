"use client";

import { useState } from "react";
import { costumesData } from "@/lib/phaser/data/skinData";
import SkillSelectTab from "./SkillSelectTab";

interface CostumeSelectModalProps {
  isOpen: boolean;
  unlockedCostumes: string[];
  unlockedSkills: string[];
  purchasedSkills: string[];
  currency: number;
  onSelect: (data: { costume: string | null; skills: string[] }) => void;
  onClose: () => void;
  onPurchaseSkill: (skillId: string) => Promise<void>;
}

export default function CostumeSelectModal({
  isOpen,
  unlockedCostumes,
  unlockedSkills,
  purchasedSkills,
  currency,
  onSelect,
  onClose,
  onPurchaseSkill,
}: CostumeSelectModalProps) {
  const [activeTab, setActiveTab] = useState<"costume" | "skill">("costume");
  const [selectedCostume, setSelectedCostume] = useState<string | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  if (!isOpen) return null;

  // 전체 코스튬 목록 (획득 여부와 함께)
  const allCostumes = costumesData.map((costume) => ({
    id: costume.id,
    name: costume.name,
    rarity: costume.rarity,
    unlocked: unlockedCostumes.includes(costume.id),
  }));

  // 희귀도별 색상
  const rarityColors: Record<string, string> = {
    common: "#b5bcc9", // gray-400
    uncommon: "#4ade80", // green-400
    rare: "#60a5fa", // blue-400
    epic: "#c084fc", // purple-400
    legendary: "#fbbf24", // amber-400
  };

  const handleContinue = () => {
    onSelect({
      costume: selectedCostume,
      skills: selectedSkills,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <div
        className="pixel-panel bg-[#221813] backdrop-blur p-6 w-full max-w-4xl mx-4 text-center max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-3xl font-bold mb-6 text-[#fff]">▪︎ GAME SETUP ▪︎</h2>

        {/* 탭 버튼 */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("costume")}
            className={`flex-1 py-3 px-4 font-bold transition-all ${
              activeTab === "costume"
                ? "bg-[#1a963e] text-white"
                : "bg-[#2a2a2a] text-gray-400 hover:bg-[#333]"
            }`}
          >
            🎨 코스튬
          </button>
          <button
            onClick={() => setActiveTab("skill")}
            className={`flex-1 py-3 px-4 font-bold transition-all ${
              activeTab === "skill"
                ? "bg-[#1a963e] text-white"
                : "bg-[#2a2a2a] text-gray-400 hover:bg-[#333]"
            }`}
          >
            ✨ 스킬
          </button>
        </div>

        {/* 탭 컨텐츠 */}
        <div className="flex-1 overflow-hidden overflow-y-scroll">
          {activeTab === "costume" ? (
            <div className="h-full flex flex-col">
              <p className="text-gray-300 mb-4 text-sm">
                게임을 시작할 코스튬을 선택하세요
              </p>

              {/* 코스튬 그리드 */}
              <div className="flex-1 overflow-y-auto mb-4 py-2 px-2">
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {allCostumes.map((costume) => {
                    const isSelected = selectedCostume === costume.id;
                    const isLocked = !costume.unlocked;
                    const borderColor = rarityColors[costume.rarity];

                    return (
                      <button
                        key={costume.id ?? "default"}
                        onClick={() => {
                          if (!isLocked) {
                            // Toggle: if already selected, deselect (set to null)
                            setSelectedCostume(
                              selectedCostume === costume.id
                                ? null
                                : costume.id,
                            );
                          }
                        }}
                        disabled={isLocked}
                        className={`pixel-ui p-3 text-center transition-all ${
                          isLocked
                            ? "bg-[#1a1a1a] cursor-not-allowed opacity-60"
                            : isSelected
                              ? "bg-[#515151] scale-105"
                              : "bg-[#2a2a2a] hover:bg-[#333]"
                        }`}
                        style={{
                          borderColor:
                            isSelected && !isLocked
                              ? borderColor
                              : isLocked
                                ? "#444"
                                : "transparent",
                          borderWidth: isSelected || isLocked ? "3px" : "2px",
                        }}
                      >
                        <div className="flex flex-col gap-2 items-center">
                          {/* 코스튬 썸네일 */}
                          <div className="relative w-16 h-16 rounded flex items-center justify-center overflow-hidden">
                            {/* 배경 */}
                            <div
                              className="absolute inset-0"
                              style={{
                                backgroundColor: `${borderColor}22`,
                              }}
                            />

                            {/* 코스튬 이미지 */}
                            <img
                              src={
                                costume.id === null
                                  ? "/assets/sprites/player/idle.png"
                                  : `/assets/sprites/player/costume/${costume.id}_idle.png`
                              }
                              alt={costume.name}
                              className={`relative w-full h-full object-contain ${
                                isLocked
                                  ? "brightness-[0.25] grayscale opacity-50"
                                  : ""
                              }`}
                              onError={(e) => {
                                // 이미지 로드 실패 시 fallback
                                const target = e.target as HTMLImageElement;
                                target.style.display = "none";
                              }}
                            />

                            {/* 잠금 오버레이 */}
                            {isLocked && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                <span className="text-2xl">🔒</span>
                              </div>
                            )}
                          </div>

                          {/* 코스튬 이름 */}
                          <div
                            className="text-xs font-bold"
                            style={{
                              color: isLocked ? "#666" : borderColor,
                            }}
                          >
                            {isLocked ? "???" : costume.name}
                          </div>

                          {/* 희귀도 */}
                          <div className="text-[10px] text-gray-500 capitalize">
                            {isLocked ? "Locked" : costume.rarity}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="text-xs text-gray-400 text-center">
                코스튬을 선택하지 않으면 기본 땃쥐로 시작합니다
              </p>
            </div>
          ) : (
            <SkillSelectTab
              unlockedSkills={unlockedSkills}
              purchasedSkills={purchasedSkills}
              selectedSkills={selectedSkills}
              currency={currency}
              onPurchaseSkill={onPurchaseSkill}
              onSelectSkills={setSelectedSkills}
            />
          )}
        </div>

        {/* CONTINUE 버튼 */}
        <button
          onClick={handleContinue}
          className="pixel-ui w-full py-3 text-white text-lg font-semibold transition-colors bg-[#1a963e] hover:bg-[#178032] mt-6"
        >
          CONTINUE
        </button>
      </div>
    </div>
  );
}
