"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/gameStore";
import { useAudioStore } from "@/store/audioStore";
import HowToPlayContent from "./HowToPlayContent";

type View = "menu" | "howToPlay" | "volume";

interface GameSettingsModalProps {
  onClose: () => void;
}

export default function GameSettingsModal({ onClose }: GameSettingsModalProps) {
  const [view, setView] = useState<View>("menu");
  const router = useRouter();
  const resetGame = useGameStore((s) => s.resetGame);
  const {
    bgmVolume,
    sfxVolume,
    bgmMuted,
    sfxMuted,
    setBgmVolume,
    setSfxVolume,
    toggleBgmMute,
    toggleSfxMute,
  } = useAudioStore();

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
        className="pixel-panel bg-[#221813] p-6 w-full max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Settings Menu */}
        {view === "menu" && (
          <>
            <div className="flex justify-between items-center mb-10">
              <div className="w-9" />
              <h2 className="text-2xl font-bold text-white">SETTINGS</h2>
              <button
                onClick={onClose}
                className="pixel-ui bg-[#555] px-2 py-1.5 text-white text-lg hover:bg-[#444] transition-colors"
              >
                x
              </button>
            </div>
            <div className="flex flex-col gap-6">
              <button
                onClick={() => setView("howToPlay")}
                className="pixel-ui w-full py-3 text-white text-lg font-semibold bg-[#808080] transition-colors hover:bg-[#6e6e6e]"
              >
                HOW TO PLAY
              </button>
              <button
                onClick={() => setView("volume")}
                className="pixel-ui w-full py-3 text-white text-lg font-semibold bg-[#3f65af] transition-colors hover:bg-[#35548c]"
              >
                VOLUME
              </button>
              <button
                onClick={handleBackToMain}
                className="pixel-ui w-full py-3 text-white text-lg font-semibold bg-[#48260c] transition-colors hover:bg-[#3a1e09]"
              >
                BACK TO MAIN
              </button>
            </div>
          </>
        )}

        {/* HOW TO PLAY */}
        {view === "howToPlay" && (
          <>
            <div className="flex items-center mb-8">
              <button
                onClick={() => setView("menu")}
                className="pixel-ui bg-[#555] px-3 py-1.5 text-white text-sm hover:bg-[#444] transition-colors"
              >
                &lt;
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
            <div className="flex items-center mb-8">
              <button
                onClick={() => setView("menu")}
                className="pixel-ui bg-[#555] px-3 py-1.5 text-white text-sm hover:bg-[#444] transition-colors"
              >
                &lt;
              </button>
              <h2 className="text-2xl font-bold text-white flex-1 text-center">
                VOLUME
              </h2>
              <div className="w-[62px]" />
            </div>
            {/* BGM */}
            <div className="mb-5 text-left">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-white">BGM</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400">
                    {bgmMuted ? "OFF" : "ON"}
                  </span>
                  <button
                    onClick={toggleBgmMute}
                    className={`pixel-toggle ${!bgmMuted ? "active" : ""}`}
                    aria-label={bgmMuted ? "BGM 켜기" : "BGM 끄기"}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={bgmMuted ? 0 : bgmVolume}
                  onChange={(e) => setBgmVolume(parseFloat(e.target.value))}
                  disabled={bgmMuted}
                  className="pixel-slider w-full"
                />
                <span className="text-sm font-bold text-gray-400 w-10 text-right">
                  {bgmMuted ? 0 : Math.round(bgmVolume * 100)}%
                </span>
              </div>
            </div>

            {/* SFX */}
            <div className="mb-2 text-left">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-white">Effect</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400">
                    {sfxMuted ? "OFF" : "ON"}
                  </span>
                  <button
                    onClick={toggleSfxMute}
                    className={`pixel-toggle ${!sfxMuted ? "active" : ""}`}
                    aria-label={sfxMuted ? "효과음 켜기" : "효과음 끄기"}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={sfxMuted ? 0 : sfxVolume}
                  onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
                  disabled={sfxMuted}
                  className="pixel-slider w-full"
                />
                <span className="text-sm font-bold text-gray-400 w-10 text-right">
                  {sfxMuted ? 0 : Math.round(sfxVolume * 100)}%
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
