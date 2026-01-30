import { create } from "zustand";
import type { ActiveBuff, NPCPosition } from "@/types/game";

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
  currentSkinId: string;
  activeBuffs: ActiveBuff[];
  nickname: string;
  npcPositions: NPCPosition[];
  playerPosition: { x: number; y: number };

  // Actions
  setScore: (score: number) => void;
  addScore: (amount: number) => void;
  setLevel: (level: number) => void;
  setHunger: (hunger: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setGameOver: (reason: "hunger" | "predator" | "boss") => void;
  setSurvivalTime: (time: number) => void;
  incrementKills: () => void;
  setCurrentSkin: (skinId: string) => void;
  setActiveBuffs: (buffs: ActiveBuff[]) => void;
  setNickname: (nickname: string) => void;
  setNpcPositions: (positions: NPCPosition[]) => void;
  setPlayerPosition: (x: number, y: number) => void;
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
  currentSkinId: "custom_1",
  activeBuffs: [] as ActiveBuff[],
  nickname: "",
  npcPositions: [] as NPCPosition[],
  playerPosition: { x: 2500, y: 2500 },
};

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,

  setScore: (score) => set({ score }),
  addScore: (amount) => set((state) => ({ score: state.score + amount })),
  setLevel: (level) => set({ level }),
  setHunger: (hunger) =>
    set({ hunger: Math.max(0, Math.min(100, hunger)) }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setGameOver: (deathReason) =>
    set({ isGameOver: true, isPlaying: false, deathReason }),
  setSurvivalTime: (survivalTime) => set({ survivalTime }),
  incrementKills: () =>
    set((state) => ({ killsCount: state.killsCount + 1 })),
  setCurrentSkin: (currentSkinId) => set({ currentSkinId }),
  setActiveBuffs: (activeBuffs) => set({ activeBuffs }),
  setNickname: (nickname) => set({ nickname }),
  setNpcPositions: (npcPositions) => set({ npcPositions }),
  setPlayerPosition: (x, y) => set({ playerPosition: { x, y } }),
  resetGame: () => set({ ...initialState }),
}));
