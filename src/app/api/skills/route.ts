import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getSkillById, checkSkillUnlocks } from "@/lib/phaser/data/skillData";

/**
 * POST /api/skills - 스킬 구매
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { userId, skillId } = await request.json();

    if (!userId || !skillId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // 스킬 데이터 조회
    const skill = getSkillById(skillId);
    if (!skill) {
      return NextResponse.json({ error: "Invalid skill" }, { status: 400 });
    }

    // 현재 사용자 데이터 조회
    const { data: userScore, error: fetchError } = await supabase
      .from("scores")
      .select("currency, purchased_skills, unlocked_skills, total_accumulated_score")
      .eq("user_id", userId)
      .single();

    if (fetchError || !userScore) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 },
      );
    }

    // 언락 확인: unlocked_skills가 비어있으면 total_accumulated_score로 동적 계산 (마이그레이션 전 데이터 호환)
    const storedUnlockedSkills = (userScore.unlocked_skills as string[]) ?? [];
    const accScore = userScore.total_accumulated_score ?? 0;
    const unlockedSkills = storedUnlockedSkills.length > 0
      ? storedUnlockedSkills
      : checkSkillUnlocks(accScore);
    if (!unlockedSkills.includes(skillId)) {
      return NextResponse.json(
        { error: "Skill not unlocked" },
        { status: 403 },
      );
    }

    // 이미 구매 확인
    const purchasedSkills = (userScore.purchased_skills as string[]) ?? [];
    if (purchasedSkills.includes(skillId)) {
      return NextResponse.json(
        { error: "Already purchased" },
        { status: 400 },
      );
    }

    // 화폐 확인
    const currentCurrency = userScore.currency ?? 0;
    if (currentCurrency < skill.price) {
      return NextResponse.json(
        { error: "Insufficient currency" },
        { status: 400 },
      );
    }

    // 구매 처리
    const newCurrency = currentCurrency - skill.price;
    const newPurchasedSkills = [...purchasedSkills, skillId];

    const { error: updateError } = await supabase
      .from("scores")
      .update({
        currency: newCurrency,
        purchased_skills: newPurchasedSkills,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Skill purchase error:", updateError);
      return NextResponse.json(
        { error: "Failed to purchase skill" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      newCurrency,
      purchasedSkills: newPurchasedSkills,
    });
  } catch (error) {
    console.error("Skill purchase error:", error);
    return NextResponse.json(
      { error: "Failed to purchase skill" },
      { status: 500 },
    );
  }
}
