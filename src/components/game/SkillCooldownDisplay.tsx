"use client";

import { useMemo } from "react";
import { useGameStore } from "@/store/gameStore";

export default function SkillCooldownDisplay() {
  const skillCooldowns = useGameStore((s) => s.skillCooldowns);

  // 초 단위로만 업데이트 (최적화)
  const displaySkills = useMemo(() => {
    return skillCooldowns.map((skill) => ({
      ...skill,
      displaySeconds: Math.ceil(skill.remainingCooldown / 1000),
      cooldownRatio: skill.remainingCooldown / skill.maxCooldown,
    }));
  }, [
    skillCooldowns
      .map((s) => `${s.skillId}-${Math.ceil(s.remainingCooldown / 1000)}`)
      .join(","),
  ]);

  if (displaySkills.length === 0) return null;

  const iconSize = 40;
  const gap = 8;

  return (
    <div className="flex gap-2 justify-center">
      {displaySkills.map((skill) => {
        const cooldownPercent = Math.round(skill.cooldownRatio * 100);

        return (
          <div
            key={skill.skillId}
            className="relative overflow-hidden"
            style={{
              width: `${iconSize}px`,
              height: `${iconSize}px`,
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              border: "2px solid rgba(255, 255, 255, 0.3)",
            }}
          >
            {/* 스킬 아이콘 */}
            <div className="absolute inset-0 flex items-center justify-center">
              <img
                src={`/assets/sprites/skills/${skill.spriteKey}.png`}
                alt={skill.skillId}
                width={iconSize - 4}
                height={iconSize - 4}
                className="pixel-art"
                style={{ imageRendering: "pixelated" }}
              />
            </div>

            {/* 쿨타임 오버레이 (위에서 아래로 걷힘) */}
            {cooldownPercent > 0 && (
              <div
                className="absolute top-0 left-0 right-0 bg-black/70 transition-all duration-100 ease-linear"
                style={{
                  height: `${cooldownPercent}%`,
                }}
              />
            )}

            {/* 남은 시간 텍스트 */}
            {skill.displaySeconds > 0 && (
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
