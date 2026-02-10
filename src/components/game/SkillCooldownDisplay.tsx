"use client";

import { useMemo } from "react";
import { useGameStore } from "@/store/gameStore";
import { getSkillById } from "@/lib/phaser/data/skillData";

export default function SkillCooldownDisplay() {
  const selectedSkills = useGameStore((s) => s.selectedSkills);
  const skillCooldowns = useGameStore((s) => s.skillCooldowns);

  // 선택된 모든 스킬을 아이콘으로 표시
  // active 스킬은 cooldown 정보를 함께 표시
  const displaySkills = useMemo(() => {
    return selectedSkills
      .map((skillId) => {
        const skill = getSkillById(skillId);
        if (!skill) return null;

        const cooldownInfo = skillCooldowns.find(
          (cd) => cd.skillId === skillId,
        );
        const remainingCooldown = cooldownInfo?.remainingCooldown ?? 0;
        const maxCooldown = cooldownInfo?.maxCooldown ?? 1;
        const displaySeconds = Math.ceil(remainingCooldown / 1000);
        const cooldownRatio = cooldownInfo
          ? remainingCooldown / maxCooldown
          : 0;

        return {
          skillId,
          spriteKey: skill.spriteKey,
          type: skill.type,
          cooldownRatio,
          displaySeconds,
          hasCooldown: !!cooldownInfo,
        };
      })
      .filter(Boolean) as {
      skillId: string;
      spriteKey: string;
      type: string;
      cooldownRatio: number;
      displaySeconds: number;
      hasCooldown: boolean;
    }[];
  }, [
    selectedSkills.join(","),
    skillCooldowns
      .map((s) => `${s.skillId}-${Math.ceil(s.remainingCooldown / 1000)}`)
      .join(","),
  ]);

  if (displaySkills.length === 0) return null;

  const iconSize = 40;

  return (
    <div className="flex gap-2 justify-center ">
      {displaySkills.map((skill) => {
        const cooldownPercent = Math.round(skill.cooldownRatio * 100);

        // 스킬 타입별 테두리 색상
        const borderColor =
          skill.type === "passive"
            ? "rgba(74, 222, 128, 0.8)" // 초록 - 패시브
            : skill.type === "onstart"
              ? "rgba(96, 165, 250, 0.8)" // 파랑 - 시작 시
              : "rgba(255, 255, 255, 0.3)"; // 흰색 - 액티브

        return (
          <div
            key={skill.skillId}
            className="relative overflow-hidden pixel-panel_hud"
            style={{
              width: `${iconSize}px`,
              height: `${iconSize}px`,
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              border: `2px solid ${borderColor}`,
            }}
          >
            {/* 스킬 아이콘 */}
            <div className="absolute inset-0 flex items-center justify-center p-2">
              <img
                src={`/assets/sprites/skills/${skill.spriteKey}.png`}
                alt={skill.skillId}
                width={iconSize - 4}
                height={iconSize - 4}
                className="pixel-art"
                style={{ imageRendering: "pixelated" }}
              />
            </div>

            {/* 쿨타임 오버레이 (액티브 스킬 전용, 위에서 아래로 걷힘) */}
            {skill.type === "active" && cooldownPercent > 0 && (
              <div
                className="absolute top-0 left-0 right-0 bg-black/70 transition-all duration-100 ease-linear"
                style={{
                  height: `${cooldownPercent}%`,
                }}
              />
            )}

            {/* 남은 시간 텍스트 (액티브 스킬 전용) */}
            {skill.type === "active" && skill.displaySeconds > 0 && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <span
                  className="text-white font-bold"
                  style={{
                    fontSize: "20px",
                    fontFamily: "Arial, sans-serif",
                    textShadow:
                      "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 0 0 4px #000",
                  }}
                >
                  {skill.displaySeconds}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
