"use client";

import { useGameStore } from "@/store/gameStore";
import HungerBar from "./HungerBar";
import BuffDisplay from "./BuffDisplay";
import MiniMap from "./MiniMap";
import { getNpcNameKo } from "@/lib/npcNames";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function HUD() {
  const score = useGameStore((s) => s.score);
  const level = useGameStore((s) => s.level);
  const hunger = useGameStore((s) => s.hunger);
  const survivalTime = useGameStore((s) => s.survivalTime);
  const activeBuffs = useGameStore((s) => s.activeBuffs);
  const isPlaying = useGameStore((s) => s.isPlaying);

  if (!isPlaying) return null;

  const npcName = getNpcNameKo(level);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top Left - Stats */}
      <div className="absolute top-4 left-4 flex flex-col gap-2 bg-black/50 rounded-lg p-3">
        <HungerBar hunger={hunger} />
        <div className="flex gap-4 text-sm text-white font-bold">
          <span>Score: {score.toLocaleString()}</span>
          <span>
            Lv {level} ({npcName})
          </span>
        </div>
        <div className="text-xs text-gray-300">
          Time: {formatTime(survivalTime)}
        </div>
      </div>

      {/* Bottom Left - Buffs */}
      <div className="absolute bottom-4 left-4 bg-black/50 rounded-lg p-2">
        <BuffDisplay buffs={activeBuffs} />
      </div>

      {/* Bottom Right - Minimap (비활성화됨) */}
      {/* <div className="absolute bottom-4 right-4">
        <MiniMap />
      </div> */}
    </div>
  );
}
