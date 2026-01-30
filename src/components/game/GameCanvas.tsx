"use client";

import { useEffect, useRef } from "react";

export default function GameCanvas() {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || gameRef.current) return;

    const initGame = async () => {
      const Phaser = (await import("phaser")).default;
      const { gameConfig } = await import("@/lib/phaser/config");

      gameRef.current = new Phaser.Game(gameConfig);
    };

    initGame();

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return <div id="game-container" className="w-full h-full" />;
}
