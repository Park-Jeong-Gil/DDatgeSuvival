"use client";

interface HungerBarProps {
  hunger: number;
  size?: "default" | "compact";
}

export default function HungerBar({ hunger, size = "default" }: HungerBarProps) {
  const getColor = () => {
    if (hunger >= 80) return "bg-green-500";
    if (hunger >= 40) return "bg-yellow-500";
    if (hunger >= 20) return "bg-orange-500";
    return "bg-red-500";
  };

  const isBlinking = hunger < 20;
  const isCompact = size === "compact";

  return (
    <div className={`flex items-center ${isCompact ? "text-xs" : ""}`}>
      <div
        className={`bg-gray-700 rounded-full overflow-hidden border border-gray-600 ${
          isCompact ? "w-28 h-3" : "w-40 h-4"
        }`}
      >
        <div
          className={`h-full transition-[width] duration-300 ease-linear ${getColor()} ${
            isBlinking ? "animate-pulse" : ""
          }`}
          style={{ width: `${Math.max(0, hunger)}%` }}
        />
      </div>
    </div>
  );
}
