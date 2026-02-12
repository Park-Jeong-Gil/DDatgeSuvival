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
  const [unlockedSkills, setUnlockedSkills] = useState<string[]>([]);
  const [purchasedSkills, setPurchasedSkills] = useState<string[]>([]);
  const [currency, setCurrency] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [unlockedSlots, setUnlockedSlots] = useState(0);
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
        let skills = data.userUnlockedSkills ?? [];
        let purchased = data.userPurchasedSkills ?? [];
        let userCurrency = data.userCurrency ?? 0;

        // 디버그 모드: 모든 스킬 언락 및 구매 처리
        const isDebugMode =
          typeof window !== "undefined" &&
          localStorage.getItem("DEBUG_MODE") === "true";

        let userUnlockedSlots = data.userUnlockedSlots ?? 0;

        if (isDebugMode) {
          // 모든 스킬 ID 목록
          const allSkillIds = [
            "skateboard",
            "milk",
            "mushroom",
            "detector",
            "pick",
            "ax",
            "crown",
            "clover",
            "bubbles",
            "revolver",
            "cobweb",
            "fireball",
            "iceball",
            "stone",
            "lightning",
          ];
          skills = allSkillIds;
          purchased = allSkillIds;
          userCurrency = 999999; // 충분한 화폐
          userUnlockedSlots = 3;
          console.log("[DEBUG MODE] All skills unlocked and purchased");
        }

        setUnlockedCostumes(costumes);
        setUnlockedSkills(skills);
        setPurchasedSkills(purchased);
        setCurrency(userCurrency);
        setTotalScore(data.userTotalScore ?? 0);
        setUnlockedSlots(userUnlockedSlots);

        // 항상 게임 셋업 모달 표시
        setCostumeSelectOpen(true);
      } else {
        // API 실패 시 바로 게임 시작
        router.push("/game");
      }
    } catch (error) {
      console.error("Failed to fetch game data:", error);
      // 에러 발생 시 바로 게임 시작
      router.push("/game");
    } finally {
      setIsCheckingCostumes(false);
    }
  };

  const handleGameSetup = (data: {
    costume: string | null;
    skills: string[];
  }) => {
    // 선택한 코스튬을 gameStore에 저장
    useGameStore.getState().setCurrentCostume(data.costume);
    if (data.costume) {
      useGameStore.getState().addUnlockedCostume(data.costume);
    }

    // 선택한 스킬을 gameStore에 저장
    useGameStore.getState().setSelectedSkills(data.skills);

    // localStorage에도 저장 (페이지 이동 시 유지하기 위해)
    localStorage.setItem("selected_costume", data.costume ?? "");
    localStorage.setItem("selected_skills", JSON.stringify(data.skills));

    // 게임 페이지로 이동 (setCostumeSelectOpen 제거 - 모달을 닫으면 메인 화면이 잠깐 노출되므로)
    router.push("/game");
  };

  const handlePurchaseSlot = async (slotIndex: number) => {
    try {
      const userId = getOrCreateUserId();
      const res = await fetch("/api/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, slotIndex }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrency(data.newCurrency);
        setUnlockedSlots(data.unlockedSlots);
      } else {
        const error = await res.json();
        alert(error.error || "슬롯 구매 실패");
      }
    } catch (error) {
      console.error("Failed to purchase slot:", error);
      alert("슬롯 구매 중 오류가 발생했습니다");
    }
  };

  const handlePurchaseSkill = async (skillId: string) => {
    try {
      const userId = getOrCreateUserId();
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, skillId }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrency(data.newCurrency);
        setPurchasedSkills(data.purchasedSkills);
      } else {
        const error = await res.json();
        alert(error.error || "스킬 구매 실패");
      }
    } catch (error) {
      console.error("Failed to purchase skill:", error);
      alert("스킬 구매 중 오류가 발생했습니다");
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
        onClose={() => setCostumeSelectOpen(false)}
        unlockedCostumes={unlockedCostumes}
        unlockedSkills={unlockedSkills}
        purchasedSkills={purchasedSkills}
        currency={currency}
        totalScore={totalScore}
        unlockedSlots={unlockedSlots}
        onSelect={handleGameSetup}
        onPurchaseSkill={handlePurchaseSkill}
        onPurchaseSlot={handlePurchaseSlot}
      />

      {/* 푸터 */}
      <p className="mt-8 text-sm text-white text-shadow-lg">
        © 2026 by{" "}
        <a href="https://girgir.dev" target="_blank" rel="noopener noreferrer">
          girgir
        </a>
        . All rights reserved.
      </p>
    </main>
  );
}
