"use client";

interface HungerBarProps {
  hunger: number;
}

export default function HungerBar({ hunger }: HungerBarProps) {
  const getColor = () => {
    if (hunger >= 80) return "bg-green-500";
    if (hunger >= 40) return "bg-yellow-500";
    if (hunger >= 20) return "bg-orange-500";
    return "bg-red-500";
  };

  const isBlinking = hunger < 20;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-bold text-white">HP</span>
      <div className="w-40 h-4 bg-gray-700 rounded-full overflow-hidden border border-gray-600">
        <div
          className={`h-full transition-all duration-300 ${getColor()} ${
            isBlinking ? "animate-pulse" : ""
          }`}
          style={{ width: `${Math.max(0, hunger)}%` }}
        />
      </div>
      <span className="text-sm text-white font-mono w-10 text-right">
        {Math.ceil(hunger)}%
      </span>
    </div>
  );
}
