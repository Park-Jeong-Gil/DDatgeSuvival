interface UserIdentity {
  userId: string;
  nickname: string;
  createdAt: string;
}

export function getOrCreateUserId(): string {
  if (typeof window === "undefined") return "";

  const stored = localStorage.getItem("mole_user_id");

  if (stored) {
    return JSON.parse(stored).userId;
  }

  const newUser: UserIdentity = {
    userId: crypto.randomUUID(),
    nickname: "",
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

  return JSON.parse(stored).nickname || "";
}
