"use client";

import { useState, useEffect, useCallback } from "react";
import { EventBus } from "@/lib/phaser/EventBus";

export default function LevelUpNotice() {
  const [show, setShow] = useState(false);
  const [level, setLevel] = useState(0);

  const handleLevelUp = useCallback((...args: unknown[]) => {
    const data = args[0] as { level: number };
    setLevel(data.level);
    setShow(true);
    setTimeout(() => setShow(false), 2000);
  }, []);

  useEffect(() => {
    EventBus.on("level-up", handleLevelUp);
    return () => {
      EventBus.off("level-up", handleLevelUp);
    };
  }, [handleLevelUp]);

  if (!show) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="animate-bounce text-shadow-lg">
        <div className="text-5xl font-bold text-yellow-400 drop-shadow-lg text-center">
          LEVEL UP!
        </div>
        <div className="text-3xl font-bold text-white drop-shadow-lg text-center">
          Lv {level}
        </div>
      </div>
    </div>
  );
}
