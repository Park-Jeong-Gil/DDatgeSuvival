"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import type { ScoreRecord, LeaderboardResponse } from "@/types/supabase";
import { getOrCreateUserId } from "@/lib/userId";
import { getSkinById, getCostumeById } from "@/lib/phaser/data/skinData";
import { getItemById } from "@/lib/phaser/data/itemData";

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

const rankIcons = ["", "🥇1st", "🥈2nd", "🥉3rd"];

const rarityColors: Record<string, string> = {
  common: "text-gray-400",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-yellow-400",
};

export default function LeaderboardPage() {
  const [scores, setScores] = useState<ScoreRecord[]>([]);
  const [sort, setSort] = useState<SortType>("score");
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const userId = getOrCreateUserId();
    setCurrentUserId(userId);
    setScores([]);
    setOffset(0);
    setHasMore(true);
    fetchScores(0, true);
  }, [sort]);

  const fetchScores = async (currentOffset: number, isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    try {
      const userId = getOrCreateUserId();
      const res = await fetch(
        `/api/scores?sort=${sort}&limit=10&offset=${currentOffset}&userId=${userId}`,
      );
      const data: LeaderboardResponse = await res.json();

      if (isInitial) {
        setScores(data.scores);
        setUserRank(data.userRank?.rank ?? null);
      } else {
        setScores((prev) => [...prev, ...data.scores]);
      }

      setHasMore(data.scores.length === 10);
      setOffset(currentOffset + data.scores.length);
    } catch {
      // API not available yet
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      const scrollTop = target.scrollTop;
      const scrollHeight = target.scrollHeight;
      const clientHeight = target.clientHeight;

      if (
        scrollHeight - scrollTop - clientHeight < 100 &&
        hasMore &&
        !loadingMore
      ) {
        fetchScores(offset);
      }
    };

    const mainElement = document.querySelector(".leaderboardPage");
    if (mainElement) {
      mainElement.addEventListener("scroll", handleScroll);
      return () => mainElement.removeEventListener("scroll", handleScroll);
    }
  }, [offset, hasMore, loadingMore]);

  return (
    <main
      className="leaderboardPage h-dvh bg-gray-900 p-6 overflow-y-auto"
      style={{
        backgroundImage: "url(/assets/background/main_background.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="max-w-2xl mx-auto z-2">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            LEADERBOARD
          </h1>
          <Link
            href="/"
            className="pixel-ui bg-[#555] px-3 py-1.5 text-white text-lg hover:bg-[#444] transition-colors"
          >
            BACK
          </Link>
        </div>

        {/* Sort tabs */}
        <div className="flex gap-5 mb-8 z-2">
          {(Object.keys(sortLabels) as SortType[]).map((key) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              className={`pixel-ui bg-[#555] px-2.5 py-1.5 text-white text-lg hover:bg-[#444] transition-colors ${
                sort === key
                  ? "bg-[#ff9030] transition-colors hover:bg-[#cc7326]"
                  : "bg-[#808080] transition-colors hover:bg-[#6e6e6e]"
              }`}
            >
              {sortLabels[key]}
            </button>
          ))}
        </div>

        {userRank && (
          <div className="pixel-panel_green p-3 mb-4 text-[#00ffe6] bg-[#6dff8769] font-bold">
            Your Rank: #{userRank}
          </div>
        )}

        {loading ? (
          <p className="text-white text-center py-8">Loading...</p>
        ) : scores.length === 0 ? (
          <p className="text-white text-center py-8">
            No scores yet. Be the first to play!
          </p>
        ) : (
          <div className="flex flex-col gap-4 pb-6">
            {scores.map((record, index) => {
              const skin = getSkinById(record.skin_id);
              const costume = record.costume
                ? getCostumeById(record.costume)
                : null;
              const items = record.collected_items;
              const isCurrentUser = record.user_id === currentUserId;

              // 코스튬이 있으면 코스튬 정보 사용, 없으면 기본 스킨 사용
              const displayName = costume
                ? costume.name
                : skin
                  ? skin.name
                  : "기본 땃쥐";
              const displayRarity = costume
                ? costume.rarity
                : skin
                  ? skin.rarity
                  : "common";

              return (
                <div
                  key={record.id}
                  className={`flex items-center gap-3 p-3 pixel-panel_leaderboard-normal ${
                    isCurrentUser
                      ? "pixel-panel_leaderboard-me"
                      : index < 3
                        ? "pixel-panel_leaderboard-ranked"
                        : "bg-[#221813]/50"
                  }`}
                >
                  <span className="w-10 text-center font-bold text-lg shrink-0">
                    {index < 3 ? (
                      <span className="text-yellow-400">
                        {rankIcons[index + 1]}
                      </span>
                    ) : (
                      <span className="text-gray-400">{index + 1}</span>
                    )}
                  </span>

                  <div className="w-10 h-10 shrink-0 rounded-full bg-gray-900 overflow-hidden flex items-center justify-center">
                    <Image
                      src={
                        record.costume
                          ? `/assets/sprites/player/costume/${record.costume}_idle.png`
                          : "/assets/sprites/player/idle.png"
                      }
                      alt="player"
                      width={32}
                      height={32}
                      className="object-contain"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold truncate">
                        {record.nickname || "Anonymous"}
                      </span>
                      <span
                        className={`text-xs ${rarityColors[displayRarity] ?? "text-gray-400"}`}
                      >
                        {displayName}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      Lv {record.max_level} | {formatTime(record.survival_time)}{" "}
                      | {record.kills_count} kills
                    </div>
                    {items && Object.keys(items).length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {Object.entries(items).map(([itemId, count]) => {
                          const item = getItemById(itemId);
                          if (!item) return null;
                          return (
                            <div
                              key={itemId}
                              className="flex items-center gap-0.5 bg-gray-900/60 rounded px-1 py-0.5"
                              title={item.name}
                            >
                              <Image
                                src={`/assets/sprites/items/${item.spriteKey}.png`}
                                alt={item.name}
                                width={14}
                                height={14}
                                className="object-contain"
                              />
                              <span className="text-[10px] text-gray-300">
                                {count}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-white font-bold">
                      {record.score.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400">pts</div>
                  </div>
                </div>
              );
            })}
            {loadingMore && (
              <div className="text-center py-4">
                <span className="text-white">Loading more...</span>
              </div>
            )}
            {!hasMore && scores.length > 0 && (
              <div className="text-center py-4">
                <span className="text-gray-400">No more results</span>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
