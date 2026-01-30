"use client";

import dynamic from "next/dynamic";
import { useGameStore } from "@/store/gameStore";
import HUD from "@/components/game/HUD";
import LevelUpNotice from "@/components/game/LevelUpNotice";
import GameOverOverlay from "@/components/game/GameOverOverlay";

const GameCanvas = dynamic(() => import("@/components/game/GameCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <p className="text-white text-xl">Loading game...</p>
    </div>
  ),
});

export default function GamePage() {
  const isGameOver = useGameStore((s) => s.isGameOver);

  return (
    <div className="relative w-screen h-screen bg-gray-900">
      <GameCanvas />
      <HUD />
      <LevelUpNotice />
      {isGameOver && <GameOverOverlay />}
    </div>
  );
}
