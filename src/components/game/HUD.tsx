"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import BuffDisplay from "./BuffDisplay";
import MiniMap from "./MiniMap";

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
  const isPlaying = useGameStore((s) => s.isPlaying);
  if (!isPlaying) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top Center - Buffs */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 rounded-lg px-3 py-2">
        <BuffDisplay buffs={activeBuffs} />
      </div>

      {/* Bottom Center - Score & Time */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 rounded-lg px-4 py-2 flex gap-4 text-sm text-white font-bold">
        <span>Score: {score.toLocaleString()}</span>
        <span>Time: {formatTime(survivalTime)}</span>
      </div>

      {/* Bottom Right - Minimap (비활성화됨) */}
      {/* <div className="absolute bottom-4 right-4">
        <MiniMap />
      </div> */}
    </div>
  );
}
