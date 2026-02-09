"use client";

import { useState } from "react";
import { sortedSkillsByUnlock } from "@/lib/phaser/data/skillData";
import SkillCard from "./SkillCard";

interface SkillSelectTabProps {
  unlockedSkills: string[];
  purchasedSkills: string[];
  selectedSkills: string[];
  currency: number;
  onPurchaseSkill: (skillId: string) => Promise<void>;
  onSelectSkills: (skills: string[]) => void;
}

export default function SkillSelectTab({
  unlockedSkills,
  purchasedSkills,
  selectedSkills,
  currency,
  onPurchaseSkill,
  onSelectSkills,
}: SkillSelectTabProps) {
  const [localSelectedSkills, setLocalSelectedSkills] =
    useState<string[]>(selectedSkills);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const MAX_SELECTION = 3;

  const handlePurchase = async (skillId: string) => {
    try {
      setPurchasing(skillId);
      await onPurchaseSkill(skillId);
    } catch (error) {
      console.error("Purchase failed:", error);
    } finally {
      setPurchasing(null);
    }
  };

  const handleSelect = (skillId: string) => {
    let newSelection: string[];

    if (localSelectedSkills.includes(skillId)) {
      // 이미 선택된 스킬이면 제거
      newSelection = localSelectedSkills.filter((id) => id !== skillId);
    } else {
      // 최대 3개까지만 선택 가능
      if (localSelectedSkills.length >= MAX_SELECTION) {
        return;
      }
      newSelection = [...localSelectedSkills, skillId];
    }

    setLocalSelectedSkills(newSelection);
    onSelectSkills(newSelection);
  };

  return (
    <div className="flex flex-col h-full">
      {/* 헤더 */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold text-white">스킬 선택</h2>
          <div className="text-yellow-400 font-bold">
            💰 {currency.toLocaleString()}원
          </div>
        </div>
        <p className="text-sm text-gray-300 mb-2">
          구매한 스킬 중 최대 {MAX_SELECTION}개를 선택하세요
        </p>
        <div className="text-xs text-gray-400">
          선택: {localSelectedSkills.length} / {MAX_SELECTION}
        </div>
      </div>

      {/* 스킬 그리드 */}
      <div className="flex-1 overflow-y-auto pr-2">
        <div className="grid grid-cols-3 gap-3">
          {sortedSkillsByUnlock.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              isUnlocked={unlockedSkills.includes(skill.id)}
              isPurchased={purchasedSkills.includes(skill.id)}
              isSelected={localSelectedSkills.includes(skill.id)}
              currency={currency}
              onPurchase={handlePurchase}
              onSelect={handleSelect}
            />
          ))}
        </div>

        {/* 구매 중 오버레이 */}
        {purchasing && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="text-white text-center">
                <div className="animate-spin text-4xl mb-2">⏳</div>
                <div>구매 중...</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 안내 메시지 */}
      {purchasedSkills.length === 0 && (
        <div className="mt-4 p-4 bg-gray-800 rounded text-center text-gray-300 text-sm">
          <div className="mb-2">💡 스킬을 구매하세요!</div>
          <div className="text-xs">
            게임을 플레이하여 누적 스코어를 쌓으면 스킬이 언락됩니다.
          </div>
        </div>
      )}

      {purchasedSkills.length > 0 && localSelectedSkills.length === 0 && (
        <div className="mt-4 p-4 bg-yellow-900/30 border border-yellow-600 rounded text-center text-yellow-200 text-sm">
          <div>⚠️ 스킬을 선택하지 않으면 스킬 없이 게임이 시작됩니다</div>
        </div>
      )}
    </div>
  );
}
