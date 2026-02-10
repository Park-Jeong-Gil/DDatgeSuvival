"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import BuffDisplay from "./BuffDisplay";
import MiniMap from "./MiniMap";
import SkillCooldownDisplay from "./SkillCooldownDisplay";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function HUD() {
  const score = useGameStore((s) => s.score);
  const level = useGameStore((s) => s.level);
  const survivalTime = useGameStore((s) => s.survivalTime);
  const activeBuffs = useGameStore((s) => s.activeBuffs);
  const selectedSkills = useGameStore((s) => s.selectedSkills);
  const isPlaying = useGameStore((s) => s.isPlaying);
  if (!isPlaying) return null;

  const hasActiveBuffs = activeBuffs.length > 0;
  const hasSkills = selectedSkills.length > 0;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none flex flex-col gap-6">
      {/* Top Center - Score & Time */}
      <div className="score-panel px-4 py-2 flex gap-4 text-sm text-white font-bold pixel-panel_hud">
        <span>Score: {score.toLocaleString()}</span>
        <span>Time: {formatTime(survivalTime)}</span>
      </div>

      {/* Top Center Below Skills - Active Buffs (아이템이 있을 때만 표시) */}
      {hasActiveBuffs && (
        <div
          className={`items-panel px-3 py-2 pixel-panel_hud ${hasSkills ? "top-[88px]" : "top-20"}`}
        >
          <BuffDisplay buffs={activeBuffs} />
        </div>
      )}
      {/* Top Center Below Score - Active Skills (스킬이 있을 때만 표시) */}
      {hasSkills && (
        <div className="">
          <SkillCooldownDisplay />
        </div>
      )}

      {/* Bottom Right - Minimap (비활성화됨) */}
      {/* <div className="absolute bottom-4 right-4">
        <MiniMap />
      </div> */}
    </div>
  );
}
