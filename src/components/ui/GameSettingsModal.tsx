"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/gameStore";
import HowToPlayContent from "./HowToPlayContent";

type View = "menu" | "howToPlay" | "volume";

interface GameSettingsModalProps {
  onClose: () => void;
}

export default function GameSettingsModal({ onClose }: GameSettingsModalProps) {
  const [view, setView] = useState<View>("menu");
  const router = useRouter();
  const resetGame = useGameStore((s) => s.resetGame);

  const handleBackToMain = () => {
    resetGame();
    router.push("/");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="pixel-panel bg-[#1a1a2e] p-6 w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Settings Menu */}
        {view === "menu" && (
          <>
            <div className="flex justify-between items-center mb-6">
              <div className="w-9" />
              <h2 className="text-2xl font-bold text-white">SETTINGS</h2>
              <button
                onClick={onClose}
                className="pixel-ui bg-[#555] px-2.5 py-1 text-white text-lg hover:bg-[#444] transition-colors"
              >
                x
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setView("howToPlay")}
                className="pixel-ui w-full py-3 text-white text-lg font-semibold bg-[#548ced] transition-colors hover:bg-[#3a6fc1]"
              >
                HOW TO PLAY
              </button>
              <button
                onClick={() => setView("volume")}
                className="pixel-ui w-full py-3 text-white text-lg font-semibold bg-[#939393] transition-colors hover:bg-[#7a7a7a]"
              >
                VOLUME
              </button>
              <button
                onClick={handleBackToMain}
                className="pixel-ui w-full py-3 text-white text-lg font-semibold bg-[#c0392b] transition-colors hover:bg-[#a93226]"
              >
                BACK TO MAIN
              </button>
            </div>
          </>
        )}

        {/* HOW TO PLAY */}
        {view === "howToPlay" && (
          <>
            <div className="flex items-center mb-4">
              <button
                onClick={() => setView("menu")}
                className="pixel-ui bg-[#555] px-3 py-1.5 text-white text-sm hover:bg-[#444] transition-colors"
              >
                BACK
              </button>
              <h2 className="text-2xl font-bold text-white flex-1 text-center">
                HOW TO PLAY
              </h2>
              <div className="w-[62px]" />
            </div>
            <div className="max-h-[60vh] overflow-y-auto pr-1">
              <HowToPlayContent />
            </div>
          </>
        )}

        {/* VOLUME */}
        {view === "volume" && (
          <>
            <div className="flex items-center mb-4">
              <button
                onClick={() => setView("menu")}
                className="pixel-ui bg-[#555] px-3 py-1.5 text-white text-sm hover:bg-[#444] transition-colors"
              >
                BACK
              </button>
              <h2 className="text-2xl font-bold text-white flex-1 text-center">
                VOLUME
              </h2>
              <div className="w-[62px]" />
            </div>
            <div className="py-8 text-center">
              <p className="text-gray-400 text-sm">
                사운드 에셋 준비 중입니다
              </p>
              <p className="text-gray-500 text-xs mt-1">Coming Soon</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
