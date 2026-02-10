"use client";

import { useState, useEffect } from "react";
import { sortedSkillsByUnlock } from "@/lib/phaser/data/skillData";
import SkillCard from "./SkillCard";

interface SkillSelectTabProps {
  unlockedSkills: string[];
  purchasedSkills: string[];
  selectedSkills: string[];
  currency: number;
  maxSelection: number; // 언락된 슬롯 수 (0~3)
  onPurchaseSkill: (skillId: string) => Promise<void>;
  onSelectSkills: (skills: string[]) => void;
}

export default function SkillSelectTab({
  unlockedSkills,
  purchasedSkills,
  selectedSkills,
  currency,
  maxSelection,
  onPurchaseSkill,
  onSelectSkills,
}: SkillSelectTabProps) {
  const [localSelectedSkills, setLocalSelectedSkills] =
    useState<string[]>(selectedSkills);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  // 슬롯 박스에서 스킬 제거 시 동기화
  useEffect(() => {
    setLocalSelectedSkills(selectedSkills);
  }, [selectedSkills.join(",")]);

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
      newSelection = localSelectedSkills.filter((id) => id !== skillId);
    } else {
      if (localSelectedSkills.length >= maxSelection) {
        return;
      }
      newSelection = [...localSelectedSkills, skillId];
    }

    setLocalSelectedSkills(newSelection);
    onSelectSkills(newSelection);
  };

  // 슬롯이 없으면 안내 메시지
  if (maxSelection === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="text-4xl mb-3">🔒</div>
        <div className="text-gray-300 text-sm font-bold mb-1">
          스킬 슬롯이 없습니다
        </div>
        <div className="text-gray-500 text-xs">
          위의 슬롯을 먼저 구매하세요
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 스킬 그리드 */}
      <div className="flex-1 overflow-y-auto pr-1">
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

      {purchasedSkills.length === 0 && (
        <div className="mt-3 p-3 bg-gray-800 text-center text-gray-300 text-xs">
          <div className="mb-1">💡 스킬을 구매하세요!</div>
          <div className="text-gray-500">
            게임을 플레이하여 누적 스코어를 쌓으면 스킬이 언락됩니다.
          </div>
        </div>
      )}

      {purchasedSkills.length > 0 && localSelectedSkills.length === 0 && (
        <div className="mt-3 p-3 bg-yellow-900/30 border border-yellow-600 text-center text-yellow-200 text-xs">
          ⚠️ 스킬을 선택하지 않으면 스킬 없이 게임이 시작됩니다
        </div>
      )}
    </div>
  );
}
