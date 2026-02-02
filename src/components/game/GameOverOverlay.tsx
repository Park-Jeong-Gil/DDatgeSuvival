"use client";

import { useGameStore } from "@/store/gameStore";
import { useRef, useEffect, useState } from "react";
import { getNpcNameKo } from "@/lib/npcNames";
import { useRouter } from "next/navigation";
import { getOrCreateUserId, getUserNickname } from "@/lib/userId";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const deathReasonText: Record<string, string> = {
  hunger: "Starved to death",
  predator: "Eaten by predator",
  boss: "Destroyed by Dinosaur",
};

export default function GameOverOverlay() {
  const router = useRouter();
  const score = useGameStore((s) => s.score);
  const level = useGameStore((s) => s.level);
  const survivalTime = useGameStore((s) => s.survivalTime);
  const killsCount = useGameStore((s) => s.killsCount);
  const deathReason = useGameStore((s) => s.deathReason);
  const predatorName = useGameStore((s) => s.predatorName);
  const collectedItems = useGameStore((s) => s.collectedItems);
  // 최초 predatorName을 보존
  const predatorNameRef = useRef<string | null>(predatorName);
  if (predatorName && predatorNameRef.current !== predatorName) {
    predatorNameRef.current = predatorName;
  }
  const currentSkinId = useGameStore((s) => s.currentSkinId);
  const nickname = useGameStore((s) => s.nickname);
  const resetGame = useGameStore((s) => s.resetGame);

  const [rank, setRank] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState(false);
  const submitted = useRef(false);

  useEffect(() => {
    if (submitted.current) return;
    submitted.current = true;

    const submitScore = async () => {
      try {
        const userId = getOrCreateUserId();
        const displayName = nickname || getUserNickname() || "Anonymous";

        const res = await fetch("/api/scores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            nickname: displayName,
            score,
            maxLevel: level,
            survivalTime,
            killsCount,
            deathReason: deathReason ?? "hunger",
            skinId: currentSkinId,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setRank(data.rank);
        } else {
          setSubmitError(true);
        }
      } catch {
        setSubmitError(true);
      }
    };

    submitScore();
  }, [score, level, survivalTime, killsCount, deathReason, currentSkinId, nickname]);

  const npcName = getNpcNameKo(level);

  // 아이템 개수 집계
  const itemCounts = collectedItems.reduce(
    (acc, item) => {
      acc[item.id] = (acc[item.id] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const handleRetry = () => {
    resetGame();
    // Reload the page to restart Phaser
    window.location.reload();
  };

  const handleMenu = () => {
    resetGame();
    router.push("/");
  };

  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-md w-full mx-4 text-center">
        <h2 className="text-4xl font-bold text-red-500 mb-6">YOU DIED</h2>

        <p className="text-gray-400 mb-4">
          {deathReasonText[deathReason ?? "hunger"]}
        </p>
        {deathReason === "predator" && predatorNameRef.current && (
          <div className="mb-4">
            <span className="inline-block px-3 py-2 bg-red-900/80 rounded-lg text-lg font-bold text-red-200 border border-red-500 shadow">
              포식자: {predatorNameRef.current}
            </span>
          </div>
        )}

        <div className="flex flex-col gap-2 mb-6 text-left">
          <div className="flex justify-between text-white">
            <span className="text-gray-400">Survival Time</span>
            <span className="font-bold">{formatTime(survivalTime)}</span>
          </div>
          <div className="flex justify-between text-white">
            <span className="text-gray-400">Final Score</span>
            <span className="font-bold">{score.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-white">
            <span className="text-gray-400">Max Level</span>
            <span className="font-bold">
              Lv {level} ({npcName})
            </span>
          </div>
          <div className="flex justify-between text-white">
            <span className="text-gray-400">Kills</span>
            <span className="font-bold">{killsCount}</span>
          </div>
        </div>

        {/* 수집한 아이템 목록 */}
        {collectedItems.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-300 mb-2 text-left">
              Collected Items
            </h3>
            <div className="bg-gray-800/50 rounded-lg p-3 max-h-32 overflow-y-auto">
              <div className="flex flex-col gap-1.5 text-left">
                {Object.entries(itemCounts).map(([itemId, count]) => {
                  const item = collectedItems.find((i) => i.id === itemId);
                  if (!item) return null;
                  return (
                    <div
                      key={itemId}
                      className="flex justify-between items-center text-sm"
                    >
                      <span className="text-gray-300">{item.name}</span>
                      <span className="font-bold text-white">×{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {rank !== null && (
          <div className="mb-4 px-4 py-2 bg-yellow-900/60 border border-yellow-600 rounded-lg">
            <span className="text-yellow-300 font-bold text-lg">Rank #{rank}</span>
          </div>
        )}
        {submitError && (
          <p className="mb-4 text-sm text-red-400">Score submission failed.</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleRetry}
            className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-500 transition"
          >
            RETRY
          </button>
          <button
            onClick={handleMenu}
            className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-lg font-bold hover:bg-gray-600 transition"
          >
            MENU
          </button>
        </div>
      </div>
    </div>
  );
}
