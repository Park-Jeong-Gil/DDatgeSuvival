"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { useAudioStore } from "@/store/audioStore";
import { EventBus } from "@/lib/phaser/EventBus";
import HUD from "@/components/game/HUD";
import LevelUpNotice from "@/components/game/LevelUpNotice";
import GameOverOverlay from "@/components/game/GameOverOverlay";
import GameSettingsModal from "@/components/ui/GameSettingsModal";

const GameCanvas = dynamic(() => import("@/components/game/GameCanvas"), {
  ssr: false,
  loading: () => <div className="w-full h-dvh bg-black" />,
});

export default function GamePage() {
  const isPlaying = useGameStore((s) => s.isPlaying);
  const isGameOver = useGameStore((s) => s.isGameOver);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const hasOpenedSettings = useRef(false);

  useEffect(() => {
    useAudioStore.getState().initFromStorage();

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

  useEffect(() => {
    if (isGameOver) setSettingsOpen(false);
  }, [isGameOver]);

  useEffect(() => {
    if (settingsOpen) {
      hasOpenedSettings.current = true;
      EventBus.emit("pause-game");
    } else if (hasOpenedSettings.current) {
      EventBus.emit("resume-game");
    }
  }, [settingsOpen]);

  return (
    <div className="relative w-screen h-dvh bg-black">
      <GameCanvas />
      <HUD />
      <LevelUpNotice />

      {isPlaying && !isGameOver && !settingsOpen && (
        <button
          onClick={() => setSettingsOpen(true)}
          className="inGameSettings pixel-ui absolute top-4 right-4 z-40 bg-[#555] hover:bg-[#444] transition-colors px-3 py-2 text-base"
        >
          SETTING
        </button>
      )}

      {settingsOpen && (
        <GameSettingsModal onClose={() => setSettingsOpen(false)} />
      )}

      {isGameOver && <GameOverOverlay />}
    </div>
  );
}
