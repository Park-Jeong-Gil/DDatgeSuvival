"use client";

import type { ActiveBuff } from "@/types/game";

interface BuffDisplayProps {
  buffs: ActiveBuff[];
}

const buffColors: Record<string, string> = {
  golden_fruit: "text-yellow-400",
  satiety_potion: "text-blue-400",
  predator_shield: "text-purple-400",
  wing_feather: "text-cyan-400",
  invisible_cloak: "text-gray-300",
  giant_power: "text-red-400",
};

export default function BuffDisplay({ buffs }: BuffDisplayProps) {
  if (buffs.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      {buffs.map((buff) => (
        <div
          key={buff.id}
          className={`text-xs font-bold ${buffColors[buff.id] ?? "text-white"}`}
        >
          {buff.name} ({Math.ceil(buff.remainingTime / 1000)}s)
        </div>
      ))}
    </div>
  );
}
