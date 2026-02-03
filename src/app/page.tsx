"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import HowToPlayModal from "@/components/ui/HowToPlayModal";

export default function HomePage() {
  const [nickname, setNickname] = useState("");
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);

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
        className="pixel-ui px-4 py-2 bg-gray-800/90 text-white text-center text-lg w-64"
      />

      <div className="flex flex-col gap-4 w-64">
        <Link
          href="/game"
          className="pixel-ui w-full py-3 text-white text-xl font-bold text-center bg-[#548ced] transition-colors hover:bg-[#3a6fc1]"
        >
          START GAME
        </Link>
        <Link
          href="/leaderboard"
          className="pixel-ui w-full py-3 text-white text-center font-semibold bg-[#3bc6d8] transition-colors hover:bg-[#33b0c7]"
        >
          LEADERBOARD
        </Link>
        <button
          onClick={() => setHowToPlayOpen(true)}
          className="pixel-ui w-full py-3 text-white font-semibold bg-[#939393] transition-colors hover:bg-[#7a7a7a]"
        >
          HOW TO PLAY
        </button>
      </div>

      <HowToPlayModal
        isOpen={howToPlayOpen}
        onClose={() => setHowToPlayOpen(false)}
      />
    </main>
  );
}
