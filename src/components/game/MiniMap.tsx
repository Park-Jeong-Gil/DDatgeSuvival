"use client";

import { useRef, useEffect } from "react";
import { useGameStore } from "@/store/gameStore";
import { MAP_WIDTH, MAP_HEIGHT } from "@/lib/phaser/constants";

const MINIMAP_SIZE = 140;

export default function MiniMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerPosition = useGameStore((s) => s.playerPosition);
  const npcPositions = useGameStore((s) => s.npcPositions);
  const playerLevel = useGameStore((s) => s.level);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear
    ctx.fillStyle = "#1a2e1a";
    ctx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

    // Border
    ctx.strokeStyle = "#4ade80";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

    const scaleX = MINIMAP_SIZE / MAP_WIDTH;
    const scaleY = MINIMAP_SIZE / MAP_HEIGHT;

    // Draw NPCs
    for (const npc of npcPositions) {
      const nx = npc.x * scaleX;
      const ny = npc.y * scaleY;

      if (npc.level < playerLevel) {
        ctx.fillStyle = "#3b82f6"; // Blue - prey
      } else if (npc.level === playerLevel) {
        ctx.fillStyle = "#eab308"; // Yellow - same
      } else {
        ctx.fillStyle = "#ef4444"; // Red - predator
      }

      ctx.fillRect(nx - 1, ny - 1, 2, 2);
    }

    // Draw player
    const px = playerPosition.x * scaleX;
    const py = playerPosition.y * scaleY;
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(px - 2, py - 2, 4, 4);
  }, [playerPosition, npcPositions, playerLevel]);

  return (
    <canvas
      ref={canvasRef}
      width={MINIMAP_SIZE}
      height={MINIMAP_SIZE}
      className="rounded-lg border border-gray-600 opacity-80"
    />
  );
}
