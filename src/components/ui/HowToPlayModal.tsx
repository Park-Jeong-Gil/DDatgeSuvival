"use client";

import HowToPlayContent from "./HowToPlayContent";

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HowToPlayModal({
  isOpen,
  onClose,
}: HowToPlayModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="pixel-panel bg-[#1a1a2e] p-6 w-full max-w-sm mx-4 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-white mb-4">HOW TO PLAY</h2>

        <div className="max-h-[60vh] overflow-y-auto pr-1 mb-5">
          <HowToPlayContent />
        </div>

        <button
          onClick={onClose}
          className="pixel-ui w-full py-3 text-white text-lg font-semibold bg-[#939393] transition-colors hover:bg-[#7a7a7a]"
        >
          CLOSE
        </button>
      </div>
    </div>
  );
}
