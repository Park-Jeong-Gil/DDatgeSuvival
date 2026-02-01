"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
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

  useEffect(() => {
    const stored = localStorage.getItem("mole_user_id");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (parsed.nickname) {
        useGameStore.getState().setNickname(parsed.nickname);
      }
    } catch {
      return;
    }
  }, []);

  return (
    <div className="relative w-screen h-screen bg-gray-900">
      <GameCanvas />
      <HUD />
      <LevelUpNotice />
      {isGameOver && <GameOverOverlay />}
    </div>
  );
}
