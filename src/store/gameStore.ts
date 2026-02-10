import { create } from "zustand";
import type { ActiveBuff, NPCPosition } from "@/types/game";
import type { ItemData } from "@/types/item";

export interface SkillCooldown {
  skillId: string;
  remainingCooldown: number; // ms
  maxCooldown: number; // ms
  spriteKey: string;
}

interface GameStore {
  // State
  score: number;
  level: number;
  hunger: number;
  maxHunger: number;
  survivalTime: number;
  killsCount: number;
  isPlaying: boolean;
  isGameOver: boolean;
  deathReason: "hunger" | "predator" | "boss" | null;
  predatorName: string | null;
  currentSkinId: string;
  currentCostume: string | null;
  unlockedCostumes: string[]; // 획득한 모든 코스튬 ID 목록
  selectedSkills: string[]; // 게임 시작 시 선택한 스킬 (최대 3개)
  skillCooldowns: SkillCooldown[]; // 스킬 쿨타임 정보
  activeBuffs: ActiveBuff[];
  nickname: string;
  npcPositions: NPCPosition[];
  playerPosition: { x: number; y: number };
  playerDisplaySize: { width: number; height: number };
  cameraScroll: { x: number; y: number };
  cameraZoom: number;
  collectedItems: Record<string, number>; // itemId -> count

  // Actions
  setScore: (score: number) => void;
  addScore: (amount: number) => void;
  setLevel: (level: number) => void;
  setHunger: (hunger: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setGameOver: (
    reason: "hunger" | "predator" | "boss",
    predatorName?: string,
  ) => void;
  setSurvivalTime: (time: number) => void;
  incrementKills: () => void;
  setCurrentSkin: (skinId: string) => void;
  setCurrentCostume: (costume: string | null) => void;
  addUnlockedCostume: (costumeId: string) => void; // 코스튬 획득 추가
  setSelectedSkills: (skills: string[]) => void; // 선택한 스킬 설정 (최대 3개)
  setSkillCooldowns: (cooldowns: SkillCooldown[]) => void; // 스킬 쿨타임 설정
  setActiveBuffs: (buffs: ActiveBuff[]) => void;
  setNickname: (nickname: string) => void;
  setNpcPositions: (positions: NPCPosition[]) => void;
  setPlayerPosition: (x: number, y: number) => void;
  setPlayerDisplaySize: (width: number, height: number) => void;
  setCameraScroll: (x: number, y: number, zoom: number) => void;
  addCollectedItem: (itemId: string) => void;
  resetGame: () => void;
}

const initialState = {
  score: 0,
  level: 1,
  hunger: 100,
  maxHunger: 100,
  survivalTime: 0,
  killsCount: 0,
  isPlaying: false,
  isGameOver: false,
  deathReason: null as "hunger" | "predator" | "boss" | null,
  predatorName: null as string | null,
  currentSkinId: "custom_1",
  currentCostume: null as string | null,
  unlockedCostumes: [] as string[],
  selectedSkills: [] as string[],
  skillCooldowns: [] as SkillCooldown[],
  activeBuffs: [] as ActiveBuff[],
  nickname: "",
  npcPositions: [] as NPCPosition[],
  playerPosition: { x: 2500, y: 2500 },
  playerDisplaySize: { width: 32, height: 32 },
  cameraScroll: { x: 0, y: 0 },
  cameraZoom: 1,
  collectedItems: {} as Record<string, number>,
};

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,

  setScore: (score) => set({ score }),
  addScore: (amount) => set((state) => ({ score: state.score + amount })),
  setLevel: (level) =>
    set((state) => {
      const maxHunger = 100 + (level - 1) * 15;
      return { level, maxHunger };
    }),
  setHunger: (hunger) =>
    set((state) => ({
      hunger: Math.max(0, Math.min(state.maxHunger, hunger)),
    })),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setGameOver: (deathReason, predatorName) =>
    set((state) => {
      if (state.isGameOver) return state;
      return {
        isGameOver: true,
        isPlaying: false,
        deathReason,
        predatorName: predatorName ?? null,
      };
    }),
  setSurvivalTime: (survivalTime) => set({ survivalTime }),
  incrementKills: () => set((state) => ({ killsCount: state.killsCount + 1 })),
  setCurrentSkin: (currentSkinId) => set({ currentSkinId }),
  setCurrentCostume: (currentCostume) => set({ currentCostume }),
  addUnlockedCostume: (costumeId) =>
    set((state) => {
      // 이미 획득한 코스튬인지 확인
      if (state.unlockedCostumes.includes(costumeId)) {
        return state;
      }
      return {
        unlockedCostumes: [...state.unlockedCostumes, costumeId],
      };
    }),
  setSelectedSkills: (selectedSkills) => set({ selectedSkills }),
  setSkillCooldowns: (skillCooldowns) => set({ skillCooldowns }),
  setActiveBuffs: (activeBuffs) => set({ activeBuffs }),
  setNickname: (nickname) => set({ nickname }),
  setNpcPositions: (npcPositions) => set({ npcPositions }),
  setPlayerPosition: (x, y) => set({ playerPosition: { x, y } }),
  setPlayerDisplaySize: (width, height) =>
    set({ playerDisplaySize: { width, height } }),
  setCameraScroll: (x, y, zoom) =>
    set({ cameraScroll: { x, y }, cameraZoom: zoom }),
  addCollectedItem: (itemId) =>
    set((state) => ({
      collectedItems: {
        ...state.collectedItems,
        [itemId]: (state.collectedItems[itemId] || 0) + 1,
      },
    })),
  resetGame: () =>
    set((state) => ({
      ...initialState,
      nickname: state.nickname,
      currentCostume: state.currentCostume, // 현재 코스튬 유지 (RETRY 시 같은 코스튬으로 시작)
      unlockedCostumes: state.unlockedCostumes, // 획득한 코스튬은 유지
      selectedSkills: state.selectedSkills, // 선택한 스킬 유지
    })),
}));
