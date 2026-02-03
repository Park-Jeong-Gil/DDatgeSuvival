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
      <header>
        <h1 className="title">
          <span className="mo_br">DDatge</span>
          <span className="mo_br">Survival</span>
        </h1>
        <p className="subtitle">Eat or Be Eaten</p>
      </header>

      <input
        type="text"
        value={nickname}
        onChange={(e) => handleNicknameChange(e.target.value)}
        placeholder="Enter nickname!"
        maxLength={10}
        className="pixel-ui nicnameInput px-4 py-2 text-white text-center text-lg w-68"
      />

      <div className="flex flex-col gap-4 w-68">
        <Link
          href="/game"
          className="pixel-ui w-full py-3 text-white text-xl font-bold text-center bg-[#ff7127] transition-colors hover:bg-[#cc5a1f]"
        >
          START GAME
        </Link>
        <Link
          href="/leaderboard"
          className="pixel-ui w-full py-3 text-white text-center font-semibold bg-[#ffbd30] transition-colors hover:bg-[#cc9a27]"
        >
          LEADERBOARD
        </Link>
        <button
          onClick={() => setHowToPlayOpen(true)}
          className="pixel-ui w-full py-3 text-white font-semibold bg-[#808080] transition-colors hover:bg-[#6e6e6e]"
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
