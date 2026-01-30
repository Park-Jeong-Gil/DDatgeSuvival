import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

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
    } = await request.json();

    // Check existing record
    const { data: existing } = await supabase
      .from("scores")
      .select("id, score")
      .eq("user_id", userId)
      .single();

    let updated = false;

    if (existing) {
      if (score > existing.score) {
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
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        updated = true;
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
      });

      updated = true;
    }

    // Calculate rank
    const finalScore = updated ? score : existing?.score ?? score;
    const { count } = await supabase
      .from("scores")
      .select("*", { count: "exact", head: true })
      .gt("score", finalScore);

    return NextResponse.json({
      success: true,
      updated,
      rank: (count ?? 0) + 1,
    });
  } catch (error) {
    console.error("Score save error:", error);
    return NextResponse.json(
      { error: "Failed to save score" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get("sort") ?? "score";
    const limit = parseInt(searchParams.get("limit") ?? "100", 10);
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
      .limit(limit);

    let userRank = undefined;
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
      }
    }

    return NextResponse.json({
      scores: scores ?? [],
      total: count ?? 0,
      userRank,
    });
  } catch (error) {
    console.error("Leaderboard fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
