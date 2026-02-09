"use client";

import type { SkillData } from "@/types/skill";
import Image from "next/image";

interface SkillCardProps {
  skill: SkillData;
  isUnlocked: boolean;
  isPurchased: boolean;
  isSelected: boolean;
  currency: number;
  onPurchase: (skillId: string) => void;
  onSelect: (skillId: string) => void;
}

export default function SkillCard({
  skill,
  isUnlocked,
  isPurchased,
  isSelected,
  currency,
  onPurchase,
  onSelect,
}: SkillCardProps) {
  const canAfford = currency >= skill.price;
  const canPurchase = isUnlocked && !isPurchased && canAfford;
  const canSelect = isPurchased;

  return (
    <div
      className={`
        relative border-4 p-3 rounded-lg transition-all cursor-pointer
        ${isSelected ? "border-yellow-400 bg-yellow-900/30 scale-105" : "border-gray-600"}
        ${!isPurchased ? "opacity-75" : ""}
        ${canSelect ? "hover:border-yellow-300" : ""}
      `}
      onClick={() => canSelect && onSelect(skill.id)}
    >
      {/* 잠금 상태 */}
      {!isUnlocked && (
        <div className="absolute inset-0 bg-black/70 rounded-lg flex items-center justify-center z-10">
          <div className="text-center">
            <div className="text-4xl mb-2">🔒</div>
            <div className="text-sm text-gray-300">
              누적 {skill.unlockScore.toLocaleString()}점 필요
            </div>
          </div>
        </div>
      )}

      {/* 스킬 이미지 */}
      <div className="relative w-full aspect-square mb-2 bg-gray-800 rounded">
        <Image
          src={`/assets/sprites/skills/skills_${skill.id}.png`}
          alt={skill.name}
          fill
          className="object-contain p-2"
          onError={(e) => {
            // 이미지 로드 실패 시 기본 이미지 표시
            e.currentTarget.style.display = "none";
          }}
        />
        {/* 이미지 로드 실패 시 폴백 */}
        <div className="absolute inset-0 flex items-center justify-center text-4xl pointer-events-none">
          {getSkillEmoji(skill.id)}
        </div>
      </div>

      {/* 스킬 정보 */}
      <div className="text-center">
        <h3 className="text-lg font-bold text-white mb-1">{skill.name}</h3>
        <p className="text-xs text-gray-300 mb-2 min-h-[32px]">
          {skill.description}
        </p>

        {/* 타입 뱃지 */}
        <div className="flex justify-center gap-1 mb-2">
          <span
            className={`
              text-[10px] px-2 py-0.5 rounded
              ${skill.type === "passive" ? "bg-blue-600" : skill.type === "active" ? "bg-red-600" : "bg-green-600"}
            `}
          >
            {skill.type === "passive"
              ? "패시브"
              : skill.type === "active"
                ? "액티브"
                : "시작 시"}
          </span>
          {skill.cooldown && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-gray-600">
              쿨타임 {skill.cooldown}초
            </span>
          )}
        </div>

        {/* 구매/선택 상태 */}
        {!isPurchased ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (canPurchase) onPurchase(skill.id);
            }}
            disabled={!canPurchase}
            className={`
              w-full py-2 rounded font-bold text-sm
              ${
                canPurchase
                  ? "bg-yellow-500 hover:bg-yellow-400 text-black cursor-pointer"
                  : "bg-gray-700 text-gray-500 cursor-not-allowed"
              }
            `}
          >
            {isUnlocked ? (
              <>
                💰 {skill.price.toLocaleString()}원
                {!canAfford && (
                  <span className="text-xs block">화폐 부족</span>
                )}
              </>
            ) : (
              "잠김"
            )}
          </button>
        ) : (
          <div
            className={`
              w-full py-2 rounded font-bold text-sm
              ${isSelected ? "bg-yellow-500 text-black" : "bg-green-600 text-white"}
            `}
          >
            {isSelected ? "✓ 선택됨" : "보유 중"}
          </div>
        )}
      </div>
    </div>
  );
}

// 스킬별 이모지 (이미지 로드 실패 시 폴백)
function getSkillEmoji(skillId: string): string {
  const emojiMap: Record<string, string> = {
    skateboard: "🛹",
    milk: "🥛",
    mushroom: "🍄",
    detector: "📡",
    pick: "⛏️",
    ax: "🪓",
    crown: "👑",
    clover: "🍀",
    bubbles: "🫧",
    revolver: "🔫",
    cobweb: "🕸️",
    fireball: "🔥",
    iceball: "❄️",
    stone: "🪨",
    lightning: "⚡",
  };
  return emojiMap[skillId] || "✨";
}
