import { create } from "zustand";
import { EventBus } from "@/lib/phaser/EventBus";

interface AudioSettings {
  bgmVolume: number;
  sfxVolume: number;
  bgmMuted: boolean;
  sfxMuted: boolean;
}

interface AudioStore extends AudioSettings {
  setBgmVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
  toggleBgmMute: () => void;
  toggleSfxMute: () => void;
  initFromStorage: () => void;
}

const STORAGE_KEY = "ddatge_audio_settings";

function emitAndSave(settings: AudioSettings) {
  EventBus.emit("audio-settings-changed", settings);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage 접근 불가 시 무시
  }
}

export const useAudioStore = create<AudioStore>((set, get) => ({
  bgmVolume: 0.5,
  sfxVolume: 0.5,
  bgmMuted: false,
  sfxMuted: false,

  setBgmVolume: (volume) => {
    set({ bgmVolume: volume });
    const { sfxVolume, bgmMuted, sfxMuted } = get();
    emitAndSave({ bgmVolume: volume, sfxVolume, bgmMuted, sfxMuted });
  },

  setSfxVolume: (volume) => {
    set({ sfxVolume: volume });
    const { bgmVolume, bgmMuted, sfxMuted } = get();
    emitAndSave({ bgmVolume, sfxVolume: volume, bgmMuted, sfxMuted });
  },

  toggleBgmMute: () => {
    const muted = !get().bgmMuted;
    set({ bgmMuted: muted });
    const { bgmVolume, sfxVolume, sfxMuted } = get();
    emitAndSave({ bgmVolume, sfxVolume, bgmMuted: muted, sfxMuted });
  },

  toggleSfxMute: () => {
    const muted = !get().sfxMuted;
    set({ sfxMuted: muted });
    const { bgmVolume, sfxVolume, bgmMuted } = get();
    emitAndSave({ bgmVolume, sfxVolume, bgmMuted, sfxMuted: muted });
  },

  initFromStorage: () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<AudioSettings>;
        const settings = {
          bgmVolume: parsed.bgmVolume ?? 0.5,
          sfxVolume: parsed.sfxVolume ?? 0.5,
          bgmMuted: parsed.bgmMuted ?? false,
          sfxMuted: parsed.sfxMuted ?? false,
        };
        set(settings);
      }
    } catch {
      // localStorage 접근 불가 시 기본값 유지
    }
  },
}));
