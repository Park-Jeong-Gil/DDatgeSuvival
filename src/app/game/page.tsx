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
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    useAudioStore.getState().initFromStorage();

    // 닉네임 설정
    const stored = localStorage.getItem("mole_user_id");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.nickname) {
          useGameStore.getState().setNickname(parsed.nickname);
        }
      } catch {
        // ignore
      }
    }

    // 선택한 코스튬 설정
    const selectedCostume = localStorage.getItem("selected_costume");
    // console.log("📦 localStorage에서 읽은 코스튬:", selectedCostume);

    if (selectedCostume && selectedCostume !== "") {
      useGameStore.getState().setCurrentCostume(selectedCostume);
      // console.log("✅ gameStore에 설정한 코스튬:", useGameStore.getState().currentCostume);
      // localStorage는 GameScene에서 코스튬 적용 후 제거됨
    }

    // 모든 설정이 완료되면 게임 렌더링
    setIsReady(true);
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
      {!isReady ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-white text-xl">Loading...</div>
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
