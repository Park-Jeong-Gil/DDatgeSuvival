"use client";

import { useState } from "react";
import type { ActiveBuff } from "@/types/game";

interface BuffDisplayProps {
  buffs: ActiveBuff[];
}

const buffColors: Record<string, string> = {
  grape: "text-purple-300",
  satiety_potion: "text-blue-400",
  golden_fruit: "text-yellow-400",
  honey_pot: "text-amber-400",
  poison_potion: "text-green-500",
  wing_feather: "text-cyan-400",
  punch_glove: "text-purple-400",
  invisible_cloak: "text-gray-300",
  giant_power: "text-red-400",
  crystal: "text-pink-400",
};

function BuffIcon({ buff }: { buff: ActiveBuff }) {
  const [imageError, setImageError] = useState(false);

  if (!buff.spriteKey || imageError) {
    console.warn(`[BuffDisplay] Missing or failed spriteKey for buff:`, {
      id: buff.id,
      name: buff.name,
      spriteKey: buff.spriteKey,
      imageError,
    });
    return <div className="w-6 h-6 rounded bg-white/20 flex-shrink-0" />;
  }

  const imagePath = `/assets/sprites/items/${buff.spriteKey}.png`;

  return (
    <img
      src={imagePath}
      alt={buff.name}
      className="w-6 h-6 object-contain flex-shrink-0"
      onError={() => {
        console.error(`[BuffDisplay] Failed to load image:`, {
          path: imagePath,
          buff: buff.name,
          spriteKey: buff.spriteKey,
        });
        setImageError(true);
      }}
      onLoad={() => {
        // console.log(`[BuffDisplay] Successfully loaded image:`, {
        //   path: imagePath,
        //   buff: buff.name,
        // });
      }}
    />
  );
}

export default function BuffDisplay({ buffs }: BuffDisplayProps) {
  if (buffs.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      {buffs.map((buff) => (
        <div
          key={buff.id}
          className={`flex items-center gap-2 font-bold ${buffColors[buff.id] ?? "text-white"}`}
        >
          <BuffIcon buff={buff} />
          <span>
            {buff.name} ({Math.ceil(buff.remainingTime / 1000)}s)
          </span>
        </div>
      ))}
    </div>
  );
}
