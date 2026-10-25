"use client";

import { useState } from "react";
import { costumesData } from "@/lib/phaser/data/skinData";
import { getSkillById } from "@/lib/phaser/data/skillData";
import SkillSelectTab from "./SkillSelectTab";

const SLOT_PRICES = [200, 300, 400];
const SLOT_LABELS = ["슬롯 I", "슬롯 II", "슬롯 III"];

interface CostumeSelectModalProps {
  isOpen: boolean;
  unlockedCostumes: string[];
  unlockedSkills: string[];
  purchasedSkills: string[];
  currency: number;
  totalScore: number;
  unlockedSlots: number; // 0~3
  onSelect: (data: { costume: string | null; skills: string[] }) => void;
  onClose: () => void;
  onPurchaseSkill: (skillId: string) => Promise<void>;
  onPurchaseSlot: (slotIndex: number) => Promise<void>;
}

export default function CostumeSelectModal({
  isOpen,
  unlockedCostumes,
  unlockedSkills,
  purchasedSkills,
  currency,
  totalScore,
  unlockedSlots,
  onSelect,
  onClose,
  onPurchaseSkill,
  onPurchaseSlot,
}: CostumeSelectModalProps) {
  const [activeTab, setActiveTab] = useState<"costume" | "skill">("costume");
  const [selectedCostume, setSelectedCostume] = useState<string | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [purchasingSlot, setPurchasingSlot] = useState<number | null>(null);

  if (!isOpen) return null;

  const allCostumes = costumesData.map((costume) => ({
    ...costume,
    unlocked: unlockedCostumes.includes(costume.id),
  }));

  const selectedCostumeData = selectedCostume
    ? costumesData.find((c) => c.id === selectedCostume)
    : null;

  const rarityColors: Record<string, string> = {
    common: "#b5bcc9",
    uncommon: "#4ade80",
    rare: "#60a5fa",
    epic: "#c084fc",
    legendary: "#fbbf24",
  };

  const handleContinue = () => {
    onSelect({ costume: selectedCostume, skills: selectedSkills });
  };

  const handleRemoveSkillFromSlot = (slotIndex: number) => {
    const newSkills = [...selectedSkills];
    newSkills.splice(slotIndex, 1);
    setSelectedSkills(newSkills);
  };

  const handlePurchaseSlotLocal = async (slotIndex: number) => {
    try {
      setPurchasingSlot(slotIndex);
      await onPurchaseSlot(slotIndex);
    } catch (error) {
      console.error("Slot purchase failed:", error);
    } finally {
      setPurchasingSlot(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <div
        className="pixel-panel bg-[#221813] backdrop-blur p-5 w-full max-w-lg mx-4 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 타이틀 + 화폐 */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">▪︎ GAME SETUP ▪︎</h2>
          <div className="flex flex-col items-end gap-0.5">
            <div className="text-blue-300 font-bold text-xs">
              ★ {totalScore.toLocaleString()}점
            </div>
            <div className="text-yellow-400 font-bold text-xs">
              💰 {currency.toLocaleString()}원{" "}
              <span className="text-[10px]">(스코어 머니)</span>
            </div>
          </div>
        </div>

        {/* 상단: 플레이어 미리보기 + 스킬 슬롯 */}
        <div className="flex gap-3 mb-4 shrink-0">
          {/* 플레이어 미리보기 */}
          <div className="w-28 shrink-0 bg-[#1a1a1a] border-2 border-[#333] flex flex-col items-center justify-center p-3 gap-2">
            <div className="w-16 h-16 flex items-center justify-center overflow-hidden">
              <img
                src={
                  selectedCostume
                    ? `/assets/sprites/characters/player/costumes/${selectedCostume}/idle.png`
                    : "/assets/sprites/characters/player/base/idle.png"
                }
                alt="player preview"
                className="w-full h-full object-contain"
                style={{ imageRendering: "pixelated" }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "/assets/sprites/characters/player/base/idle.png";
                }}
              />
            </div>
            <div className="text-center">
              <div
                className="text-[10px] font-bold leading-tight"
                style={{
                  color: selectedCostumeData
                    ? rarityColors[selectedCostumeData.rarity]
                    : "#888",
                }}
              >
                {selectedCostumeData?.name ?? "기본 땃쥐"}
              </div>
              <div className="text-[9px] text-gray-600 capitalize mt-0.5">
                {selectedCostumeData?.rarity ?? "default"}
              </div>
            </div>
          </div>

          {/* 스킬 슬롯 */}
          <div className="flex-1 flex flex-col gap-2">
            {[0, 1, 2].map((slotIndex) => {
              const isUnlocked = slotIndex < unlockedSlots;
              const assignedSkillId = selectedSkills[slotIndex];
              const assignedSkill = assignedSkillId
                ? getSkillById(assignedSkillId)
                : null;
              const price = SLOT_PRICES[slotIndex];
              const canAfford = currency >= price;
              const isNextSlot = slotIndex === unlockedSlots;

              return (
                <div
                  key={slotIndex}
                  className={`flex items-center gap-2 px-3 py-2 border-2 ${
                    isUnlocked
                      ? "border-[#3a5a3a] bg-[#121e12]"
                      : "border-[#3a3a3a] bg-[#181818]"
                  }`}
                  style={{ minHeight: "42px" }}
                >
                  {/* 슬롯 라벨 */}
                  <div className="text-[10px] text-gray-500 w-10 shrink-0 font-bold uppercase tracking-wider">
                    {SLOT_LABELS[slotIndex]}
                  </div>

                  {isUnlocked ? (
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      {assignedSkill ? (
                        <>
                          <img
                            src={`/assets/sprites/skills/skills_${assignedSkill.id}.png`}
                            alt={assignedSkill.name}
                            className="w-6 h-6 object-contain shrink-0"
                            style={{ imageRendering: "pixelated" }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                          <span className="flex-1 text-xs text-white truncate">
                            {assignedSkill.name}
                          </span>
                          <button
                            onClick={() => handleRemoveSkillFromSlot(slotIndex)}
                            className="text-gray-500 hover:text-red-400 text-xs px-1 shrink-0 leading-none"
                          >
                            ✕
                          </button>
                        </>
                      ) : (
                        <span className="text-gray-600 text-xs italic">
                          {activeTab === "skill"
                            ? "↓ 스킬 탭에서 선택"
                            : "비어 있음"}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center gap-2">
                      <span className="text-sm">🔒</span>
                      <span className="flex-1 text-yellow-400 text-xs font-bold">
                        {price.toLocaleString()}원
                      </span>
                      {isNextSlot && (
                        <button
                          onClick={() => handlePurchaseSlotLocal(slotIndex)}
                          disabled={!canAfford || purchasingSlot !== null}
                          className={`text-xs px-2 py-1 font-bold transition-colors ${
                            canAfford && purchasingSlot === null
                              ? "bg-yellow-500 hover:bg-yellow-400 text-black cursor-pointer"
                              : "bg-gray-700 text-gray-500 cursor-not-allowed"
                          }`}
                        >
                          {purchasingSlot === slotIndex ? "..." : "구매"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 탭 메뉴 */}
        <div className="flex gap-2 shrink-0 pb-2">
          <button
            onClick={() => setActiveTab("costume")}
            className={`flex-1 py-2 px-4 font-bold text-sm transition-all pixel-ui ${
              activeTab === "costume"
                ? "bg-[#52a9ff] text-white"
                : "bg-[#595959] text-gray-400 hover:bg-[#333]"
            }`}
          >
            🎨 코스튬
          </button>
          <button
            onClick={() => setActiveTab("skill")}
            className={`flex-1 py-2 px-4 font-bold text-sm transition-all pixel-ui ${
              activeTab === "skill"
                ? "bg-[#52a9ff] text-white"
                : "bg-[#595959] text-gray-400 hover:bg-[#333]"
            }`}
          >
            ✨ 스킬
          </button>
        </div>

        {/* 탭 컨텐츠 */}
        <div className="flex-1 overflow-hidden overflow-y-scroll py-3 min-h-0">
          {activeTab === "costume" ? (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-3 gap-3 px-2 py-2">
                  {allCostumes.map((costume) => {
                    const isSelected = selectedCostume === costume.id;
                    const isLocked = !costume.unlocked;
                    const borderColor = rarityColors[costume.rarity];

                    return (
                      <button
                        key={costume.id ?? "default"}
                        onClick={() => {
                          if (!isLocked) {
                            setSelectedCostume(
                              selectedCostume === costume.id
                                ? null
                                : costume.id,
                            );
                          }
                        }}
                        disabled={isLocked}
                        className={`pixel-ui p-2 text-center transition-all ${
                          isLocked
                            ? "bg-[#1a1a1a] cursor-not-allowed opacity-60"
                            : isSelected
                              ? "bg-[#515151] scale-103"
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
                        <div className="flex flex-col gap-1 items-center">
                          <div className="relative w-12 h-12 flex items-center justify-center overflow-hidden">
                            <div
                              className="absolute inset-0"
                              style={{
                                backgroundColor: `${borderColor}22`,
                              }}
                            />
                            <img
                              src={
                                costume.id === null
                                  ? "/assets/sprites/characters/player/base/idle.png"
                                  : `/assets/sprites/characters/player/costumes/${costume.id}/idle.png`
                              }
                              alt={costume.name}
                              className={`relative w-full h-full object-contain ${
                                isLocked
                                  ? "brightness-[0.25] grayscale opacity-50"
                                  : ""
                              }`}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
                              }}
                            />
                            {isLocked && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                <span className="text-xl">🔒</span>
                              </div>
                            )}
                          </div>
                          <div
                            className="text-[10px] font-bold"
                            style={{
                              color: isLocked ? "#666" : borderColor,
                            }}
                          >
                            {isLocked ? "???" : costume.name}
                          </div>
                          <div className="text-[9px] text-gray-500 capitalize">
                            {isLocked ? "Locked" : costume.rarity}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className="text-xs text-gray-500 text-center mt-3">
                코스튬을 선택하지 않으면 기본 땃쥐로 시작합니다
              </p>
            </div>
          ) : (
            <SkillSelectTab
              unlockedSkills={unlockedSkills}
              purchasedSkills={purchasedSkills}
              selectedSkills={selectedSkills}
              currency={currency}
              maxSelection={unlockedSlots}
              onPurchaseSkill={onPurchaseSkill}
              onSelectSkills={setSelectedSkills}
            />
          )}
        </div>

        {/* CONTINUE 버튼 */}
        <button
          onClick={handleContinue}
          className="pixel-ui w-full py-3 text-white text-lg font-semibold transition-colors bg-[#1a963e] hover:bg-[#178032] mt-3 shrink-0"
        >
          CONTINUE
        </button>
      </div>
    </div>
  );
}
