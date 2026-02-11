import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { checkSkillUnlocks } from "@/lib/phaser/data/skillData";

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const {
      userId,
      nickname,
      score,
      maxLevel,
      survivalTime,
      killsCount,
      deathReason,
      skinId,
      costume,
      unlockedCostumes,
      collectedItems,
    } = await request.json();

    // Check existing record
    const { data: existing } = await supabase
      .from("scores")
      .select(
        "id, score, unlocked_costumes, total_accumulated_score, currency, purchased_skills",
      )
      .eq("user_id", userId)
      .single();

    // 기존 코스튬과 새 코스튬 병합 (중복 제거)
    const mergedCostumes = existing?.unlocked_costumes
      ? Array.from(
          new Set([
            ...(existing.unlocked_costumes as string[]),
            ...(unlockedCostumes ?? []),
          ]),
        )
      : unlockedCostumes ?? [];

    // 누적 스코어 계산
    const previousAccumulatedScore =
      existing?.total_accumulated_score ?? 0;
    const newAccumulatedScore = previousAccumulatedScore + score;

    // 화폐 계산: 이번 세션에서 새로 얻은 증가분만 기존 잔액에 추가
    // (기존 방식은 누적 스코어 전체를 재계산하여 구매 차감분을 덮어쓰는 버그 있음)
    const previousEarnedCurrency = Math.floor(previousAccumulatedScore / 10);
    const newEarnedCurrency = Math.floor(newAccumulatedScore / 10);
    const additionalCurrency = newEarnedCurrency - previousEarnedCurrency;
    const newCurrency = (existing?.currency ?? 0) + additionalCurrency;

    // 스킬 언락 체크
    const unlockedSkills = checkSkillUnlocks(newAccumulatedScore);

    // purchased_skills는 기존 데이터 유지
    const purchasedSkills = existing?.purchased_skills ?? [];

    let updated = false;

    if (existing) {
      if (score > existing.score) {
        // Update all fields including costume when score is higher
        await supabase
          .from("scores")
          .update({
            nickname,
            score,
            max_level: maxLevel,
            survival_time: survivalTime,
            kills_count: killsCount,
            death_reason: deathReason,
            skin_id: skinId,
            costume: costume ?? null,
            unlocked_costumes: mergedCostumes,
            collected_items: collectedItems ?? null,
            total_accumulated_score: newAccumulatedScore,
            currency: newCurrency,
            unlocked_skills: unlockedSkills,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        updated = true;
      } else {
        // Even if score is not higher, always update nickname, skin, costume, accumulated score and currency
        await supabase
          .from("scores")
          .update({
            nickname,
            skin_id: skinId,
            costume: costume ?? null,
            unlocked_costumes: mergedCostumes,
            total_accumulated_score: newAccumulatedScore,
            currency: newCurrency,
            unlocked_skills: unlockedSkills,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      }
    } else {
      await supabase.from("scores").insert({
        user_id: userId,
        nickname,
        score,
        max_level: maxLevel,
        survival_time: survivalTime,
        kills_count: killsCount,
        death_reason: deathReason,
        skin_id: skinId,
        costume: costume ?? null,
        unlocked_costumes: mergedCostumes,
        collected_items: collectedItems ?? null,
        total_accumulated_score: newAccumulatedScore,
        currency: newCurrency,
        unlocked_skills: unlockedSkills,
        purchased_skills: purchasedSkills,
      });

      updated = true;
    }

    // Calculate rank
    const finalScore = updated ? score : (existing?.score ?? score);
    const { count } = await supabase
      .from("scores")
      .select("*", { count: "exact", head: true })
      .gt("score", finalScore);

    return NextResponse.json({
      success: true,
      updated,
      rank: (count ?? 0) + 1,
      previousScore: existing?.score ?? null,
      currentScore: score,
    });
  } catch (error) {
    console.error("Score save error:", error);
    return NextResponse.json(
      { error: "Failed to save score" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get("sort") ?? "score";
    const limit = parseInt(searchParams.get("limit") ?? "10", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);
    const userId = searchParams.get("userId");

    const sortColumn =
      sort === "survival_time"
        ? "survival_time"
        : sort === "max_level"
          ? "max_level"
          : "score";

    const { data: scores, count } = await supabase
      .from("scores")
      .select("*", { count: "exact" })
      .order(sortColumn, { ascending: false })
      .range(offset, offset + limit - 1);

    let userRank = undefined;
    let userUnlockedCostumes = undefined;
    let userUnlockedSkills = undefined;
    let userPurchasedSkills = undefined;
    let userCurrency = undefined;
    let userUnlockedSlots = undefined;
    let userTotalScore = undefined;

    if (userId) {
      const { data: userScore } = await supabase
        .from("scores")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (userScore) {
        const { count: higherCount } = await supabase
          .from("scores")
          .select("*", { count: "exact", head: true })
          .gt("score", userScore.score);

        userRank = {
          rank: (higherCount ?? 0) + 1,
          score: userScore,
        };

        // 획득한 코스튬 목록 반환
        userUnlockedCostumes = userScore.unlocked_costumes ?? [];

        // 스킬 관련 정보 반환
        // unlocked_skills가 비어있으면 total_accumulated_score로 동적 계산 (마이그레이션 전 데이터 호환)
        const storedUnlockedSkills = (userScore.unlocked_skills as string[]) ?? [];
        const accScore = userScore.total_accumulated_score ?? 0;
        userUnlockedSkills = storedUnlockedSkills.length > 0
          ? storedUnlockedSkills
          : checkSkillUnlocks(accScore);
        userPurchasedSkills = userScore.purchased_skills ?? [];
        userCurrency = userScore.currency ?? 0;
        userUnlockedSlots = userScore.unlocked_slots ?? 0;
        userTotalScore = accScore;
      }
    }

    return NextResponse.json({
      scores: scores ?? [],
      total: count ?? 0,
      userRank,
      userUnlockedCostumes,
      userUnlockedSkills,
      userPurchasedSkills,
      userCurrency,
      userUnlockedSlots,
      userTotalScore,
    });
  } catch (error) {
    console.error("Leaderboard fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 },
    );
  }
}
