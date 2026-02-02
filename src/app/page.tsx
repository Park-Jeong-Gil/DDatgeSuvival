"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function HomePage() {
  const [nickname, setNickname] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("mole_user_id");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.nickname) setNickname(parsed.nickname);
    }
  }, []);

  const handleNicknameChange = (value: string) => {
    const trimmed = value.slice(0, 12);
    setNickname(trimmed);

    const stored = localStorage.getItem("mole_user_id");
    if (stored) {
      const parsed = JSON.parse(stored);
      parsed.nickname = trimmed;
      localStorage.setItem("mole_user_id", JSON.stringify(parsed));
    } else {
      localStorage.setItem(
        "mole_user_id",
        JSON.stringify({
          userId: crypto.randomUUID(),
          nickname: trimmed,
          createdAt: new Date().toISOString(),
        }),
      );
    }
  };

  return (
    <main
      className="flex flex-col items-center justify-center h-screen bg-gray-900 gap-6"
      style={{
        backgroundImage: "url(/assets/background/main_background.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <h1 className="text-5xl font-bold text-white tracking-wider drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
        DDatge Survival
      </h1>
      <p className="text-gray-200 text-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
        Eat or Be Eaten
      </p>

      <input
        type="text"
        value={nickname}
        onChange={(e) => handleNicknameChange(e.target.value)}
        placeholder="Enter nickname..."
        maxLength={12}
        className="px-4 py-2 bg-gray-800/90 border border-gray-600 rounded-lg text-white text-center text-lg w-64 focus:outline-none focus:border-green-500 drop-shadow-lg"
      />

      <div className="flex flex-col gap-3 w-64">
        <Link
          href="/game"
          className="px-8 py-4 bg-green-600 text-white rounded-lg text-xl font-bold text-center hover:bg-green-500 transition drop-shadow-lg"
        >
          START GAME
        </Link>
        <Link
          href="/leaderboard"
          className="px-8 py-3 bg-gray-700/90 text-white rounded-lg text-center hover:bg-gray-600 transition drop-shadow-lg"
        >
          LEADERBOARD
        </Link>
        <button className="px-8 py-3 bg-gray-700/90 text-white rounded-lg hover:bg-gray-600 transition drop-shadow-lg">
          HOW TO PLAY
        </button>
      </div>
    </main>
  );
}
