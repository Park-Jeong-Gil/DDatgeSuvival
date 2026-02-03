"use client";

import { useEffect, useRef } from "react";

let phaserGame: Phaser.Game | null = null;

export default function GameCanvas() {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || gameRef.current) return;

    const initGame = async () => {
      const Phaser = (await import("phaser")).default;
      const { gameConfig } = await import("@/lib/phaser/config");

      const container = document.getElementById("game-container");
      if (!container) return;

      // Clean up any existing canvas elements
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      if (phaserGame) {
        phaserGame.destroy(true);
        phaserGame = null;
      }

      const config = { ...gameConfig, parent: container };
      phaserGame = new Phaser.Game(config);
      gameRef.current = phaserGame;
    };

    initGame();

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
      if (phaserGame) {
        phaserGame.destroy(true);
        phaserGame = null;
      }
    };
  }, []);

  return <div id="game-container" className="w-full h-full relative" />;
}
