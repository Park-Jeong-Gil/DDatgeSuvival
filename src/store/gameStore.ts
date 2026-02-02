import { create } from "zustand";
import type { ActiveBuff, NPCPosition } from "@/types/game";
import type { ItemData } from "@/types/item";

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
  activeBuffs: ActiveBuff[];
  nickname: string;
  npcPositions: NPCPosition[];
  playerPosition: { x: number; y: number };
  playerDisplaySize: { width: number; height: number };
  cameraScroll: { x: number; y: number };
  cameraZoom: number;
  collectedItems: ItemData[];

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
  setActiveBuffs: (buffs: ActiveBuff[]) => void;
  setNickname: (nickname: string) => void;
  setNpcPositions: (positions: NPCPosition[]) => void;
  setPlayerPosition: (x: number, y: number) => void;
  setPlayerDisplaySize: (width: number, height: number) => void;
  setCameraScroll: (x: number, y: number, zoom: number) => void;
  addCollectedItem: (item: ItemData) => void;
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
  activeBuffs: [] as ActiveBuff[],
  nickname: "",
  npcPositions: [] as NPCPosition[],
  playerPosition: { x: 2500, y: 2500 },
  playerDisplaySize: { width: 32, height: 32 },
  cameraScroll: { x: 0, y: 0 },
  cameraZoom: 1,
  collectedItems: [] as ItemData[],
};

export const useGameStore = create<GameStore>((set) => ({
  ...initialState,

  setScore: (score) => set({ score }),
  addScore: (amount) => set((state) => ({ score: state.score + amount })),
  setLevel: (level) => set({ level }),
  setHunger: (hunger) => set({ hunger: Math.max(0, Math.min(100, hunger)) }),
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
  setActiveBuffs: (activeBuffs) => set({ activeBuffs }),
  setNickname: (nickname) => set({ nickname }),
  setNpcPositions: (npcPositions) => set({ npcPositions }),
  setPlayerPosition: (x, y) => set({ playerPosition: { x, y } }),
  setPlayerDisplaySize: (width, height) =>
    set({ playerDisplaySize: { width, height } }),
  setCameraScroll: (x, y, zoom) =>
    set({ cameraScroll: { x, y }, cameraZoom: zoom }),
  addCollectedItem: (item) =>
    set((state) => ({ collectedItems: [...state.collectedItems, item] })),
  resetGame: () =>
    set((state) => ({ ...initialState, nickname: state.nickname })),
}));
