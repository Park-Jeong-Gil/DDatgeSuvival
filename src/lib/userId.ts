interface UserIdentity {
  userId: string;
  nickname: string;
  createdAt: string;
}

/**
 * userId의 마지막 4자리를 사용하여 고유한 닉네임 생성
 * 예: "Player1a2b" 형식
 */
function generateDefaultNickname(userId: string): string {
  const lastFour = userId.replace(/-/g, "").slice(-4);
  return `Player${lastFour}`;
}

export function getOrCreateUserId(): string {
  if (typeof window === "undefined") return "";

  const stored = localStorage.getItem("mole_user_id");

  if (stored) {
    return JSON.parse(stored).userId;
  }

  const userId = crypto.randomUUID();
  const newUser: UserIdentity = {
    userId,
    nickname: generateDefaultNickname(userId),
    createdAt: new Date().toISOString(),
  };

  localStorage.setItem("mole_user_id", JSON.stringify(newUser));
  return newUser.userId;
}

export function updateUserNickname(nickname: string) {
  if (typeof window === "undefined") return;

  const stored = localStorage.getItem("mole_user_id");
  if (stored) {
    const parsed = JSON.parse(stored);
    parsed.nickname = nickname;
    localStorage.setItem("mole_user_id", JSON.stringify(parsed));
  }
}

export function getUserNickname(): string {
  if (typeof window === "undefined") return "";

  const stored = localStorage.getItem("mole_user_id");
  if (!stored) return "";

  const parsed = JSON.parse(stored);
  const nickname = parsed.nickname || "";

  // 닉네임이 비어있으면 기본 닉네임 생성
  if (!nickname && parsed.userId) {
    const defaultNickname = generateDefaultNickname(parsed.userId);
    updateUserNickname(defaultNickname);
    return defaultNickname;
  }

  return nickname;
}
