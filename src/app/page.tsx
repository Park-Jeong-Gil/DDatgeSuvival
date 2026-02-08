"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import HowToPlayModal from "@/components/ui/HowToPlayModal";
import CostumeSelectModal from "@/components/game/CostumeSelectModal";
import { getOrCreateUserId } from "@/lib/userId";
import { useGameStore } from "@/store/gameStore";

export default function HomePage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);
  const [costumeSelectOpen, setCostumeSelectOpen] = useState(false);
  const [unlockedCostumes, setUnlockedCostumes] = useState<string[]>([]);
  const [isCheckingCostumes, setIsCheckingCostumes] = useState(false);

  useEffect(() => {
    console.log(
      `
%c _____         _         _____                 _
%c|     | ___  _| | ___   |   __| ___  ___  ___ | |_  ___  ___
%c|   --|| . || . || -_|  |  |  ||  _|| .'|| . ||   || -_||  _|
%c|_____||___||___||___|  |_____||_|  |__,||  _||_|_||___||_|
%c                                         |_|
📞 010-4468-7412
📧 wjdrlf5986@naver.com
`,
      "color:#22577A",
      "color:#38A3A5",
      "color:#57CC99",
      "color:#80ED99",
      "color:#99FFED",
    );

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

  const handleStartGame = async () => {
    setIsCheckingCostumes(true);
    try {
      const userId = getOrCreateUserId();
      const res = await fetch(`/api/scores?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        const costumes = data.userUnlockedCostumes ?? [];
        setUnlockedCostumes(costumes);

        // 코스튬이 있으면 선택 모달 표시
        if (costumes.length > 0) {
          setCostumeSelectOpen(true);
        } else {
          // 코스튬이 없으면 바로 게임 시작
          router.push("/game");
        }
      } else {
        // API 실패 시 바로 게임 시작
        router.push("/game");
      }
    } catch (error) {
      console.error("Failed to fetch unlocked costumes:", error);
      // 에러 발생 시 바로 게임 시작
      router.push("/game");
    } finally {
      setIsCheckingCostumes(false);
    }
  };

  const handleCostumeSelect = (costumeId: string | null) => {
    // console.log("🎨 선택한 코스튬:", costumeId);

    // 선택한 코스튬을 gameStore에 저장
    useGameStore.getState().setCurrentCostume(costumeId);
    if (costumeId) {
      useGameStore.getState().addUnlockedCostume(costumeId);
    }

    // localStorage에도 저장 (페이지 이동 시 유지하기 위해)
    localStorage.setItem("selected_costume", costumeId ?? "");
    // console.log("💾 localStorage에 저장:", localStorage.getItem("selected_costume"));

    setCostumeSelectOpen(false);
    // 게임 페이지로 이동
    router.push("/game");
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
        <button
          onClick={handleStartGame}
          disabled={isCheckingCostumes}
          className="pixel-ui w-full py-3 text-white text-xl font-bold text-center bg-[#2266cc] transition-colors hover:bg-[#1b4f99] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCheckingCostumes ? "LOADING..." : "START GAME"}
        </button>
        <Link
          href="/leaderboard"
          className="pixel-ui w-full py-3 text-white text-xl text-center font-semibold bg-[#ff9030] transition-colors hover:bg-[#cc7326]"
        >
          LEADERBOARD
        </Link>
        <button
          onClick={() => setHowToPlayOpen(true)}
          className="pixel-ui w-full py-3 text-white text-xl font-semibold bg-[#808080] transition-colors hover:bg-[#6e6e6e]"
        >
          HOW TO PLAY
        </button>
      </div>

      <HowToPlayModal
        isOpen={howToPlayOpen}
        onClose={() => setHowToPlayOpen(false)}
      />

      <CostumeSelectModal
        isOpen={costumeSelectOpen}
        unlockedCostumes={unlockedCostumes}
        onSelect={handleCostumeSelect}
      />

      {/* 푸터 */}
      <p className="mt-8 text-sm text-gray-100 text-shadow-md">
        © 2026 by{" "}
        <a href="https://girgir.dev" target="_blank" rel="noopener noreferrer">
          girgir
        </a>
        . All rights reserved.
      </p>
    </main>
  );
}
