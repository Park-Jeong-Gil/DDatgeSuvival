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
    <div className="flex items-center justify-center h-dvh bg-black">
      <div className="relative w-80 h-12 bg-[#222222] rounded-sm">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[300px] h-[30px] bg-[#cccccc] animate-pulse" />
        </div>
      </div>
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
    <div className="relative w-screen h-dvh bg-black">
      <GameCanvas />
      <HUD />
      <LevelUpNotice />
      {isGameOver && <GameOverOverlay />}
    </div>
  );
}
