"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { ScoreRecord, LeaderboardResponse } from "@/types/supabase";
import { getOrCreateUserId } from "@/lib/userId";

type SortType = "score" | "survival_time" | "max_level";

const sortLabels: Record<SortType, string> = {
  score: "Score",
  survival_time: "Time",
  max_level: "Level",
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const rankIcons = ["", "1st", "2nd", "3rd"];

export default function LeaderboardPage() {
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [sort, setSort] = useState<SortType>("score");
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchScores();
  }, [sort]);

  const fetchScores = async () => {
    setLoading(true);
    try {
      const userId = getOrCreateUserId();
      const res = await fetch(
        `/api/scores?sort=${sort}&limit=100&userId=${userId}`,
      );
      const data: LeaderboardResponse = await res.json();
      setScores(data.scores);
      setUserRank(data.userRank?.rank ?? null);
    } catch {
      // API not available yet
    }
    setLoading(false);
  };

  return (
    <main
      className="min-h-screen bg-gray-900 p-6"
      style={{
        backgroundImage: "url(/assets/background/main_background.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            LEADERBOARD
          </h1>
          <Link
            href="/"
            className="px-4 py-2 bg-gray-700/90 text-white rounded-lg hover:bg-gray-600 transition drop-shadow-lg"
          >
            BACK
          </Link>
        </div>

        {/* Sort tabs */}
        <div className="flex gap-2 mb-4">
          {(Object.keys(sortLabels) as SortType[]).map((key) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              className={`px-4 py-2 rounded-lg font-bold transition drop-shadow-lg ${
                sort === key
                  ? "bg-green-600 text-white"
                  : "bg-gray-700/80 text-gray-300 hover:bg-gray-600"
              }`}
            >
              {sortLabels[key]}
            </button>
          ))}
        </div>

        {userRank && (
          <div className="bg-green-900/40 border border-green-700 rounded-lg p-3 mb-4 text-green-400 font-bold drop-shadow-lg">
            Your Rank: #{userRank}
          </div>
        )}

        {loading ? (
          <p className="text-gray-400 text-center py-8">Loading...</p>
        ) : scores.length === 0 ? (
          <p className="text-gray-400 text-center py-8">
            No scores yet. Be the first to play!
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {scores.map((record, index) => (
              <div
                key={record.id}
                className={`flex items-center gap-3 p-3 rounded-lg drop-shadow-md ${
                  index < 3
                    ? "bg-gray-800/80 border border-yellow-600/30"
                    : "bg-gray-800/60"
                }`}
              >
                <span className="w-10 text-center font-bold text-lg">
                  {index < 3 ? (
                    <span className="text-yellow-400">
                      {rankIcons[index + 1]}
                    </span>
                  ) : (
                    <span className="text-gray-500">{index + 1}</span>
                  )}
                </span>

                <div className="flex-1">
                  <div className="text-white font-bold">
                    {record.nickname || "Anonymous"}
                  </div>
                  <div className="text-xs text-gray-400">
                    Lv {record.max_level} | {formatTime(record.survival_time)} |{" "}
                    {record.kills_count} kills
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-white font-bold">
                    {record.score.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">pts</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
