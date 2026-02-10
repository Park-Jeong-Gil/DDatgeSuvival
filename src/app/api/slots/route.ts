import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

const SLOT_PRICES = [200, 300, 400]; // 슬롯 1, 2, 3 가격

/**
 * POST /api/slots - 스킬 슬롯 구매
 * Body: { userId: string, slotIndex: number } (slotIndex: 0-based)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { userId, slotIndex } = await request.json();

    if (!userId || slotIndex === undefined || slotIndex < 0 || slotIndex > 2) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // 현재 사용자 데이터 조회
    const { data: userScore, error: fetchError } = await supabase
      .from("scores")
      .select("currency, unlocked_slots")
      .eq("user_id", userId)
      .single();

    if (fetchError || !userScore) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentUnlockedSlots = userScore.unlocked_slots ?? 0;

    // 순서대로 구매해야 함 (슬롯 1 → 2 → 3)
    if (slotIndex !== currentUnlockedSlots) {
      return NextResponse.json(
        { error: "Must unlock slots in order" },
        { status: 400 },
      );
    }

    const price = SLOT_PRICES[slotIndex];
    const currentCurrency = userScore.currency ?? 0;

    if (currentCurrency < price) {
      return NextResponse.json(
        { error: "Insufficient currency" },
        { status: 400 },
      );
    }

    const newCurrency = currentCurrency - price;
    const newUnlockedSlots = currentUnlockedSlots + 1;

    const { error: updateError } = await supabase
      .from("scores")
      .update({
        currency: newCurrency,
        unlocked_slots: newUnlockedSlots,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (updateError) {
      console.error("Slot purchase error:", updateError);
      return NextResponse.json(
        { error: "Failed to purchase slot" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      newCurrency,
      unlockedSlots: newUnlockedSlots,
    });
  } catch (error) {
    console.error("Slot purchase error:", error);
    return NextResponse.json(
      { error: "Failed to purchase slot" },
      { status: 500 },
    );
  }
}
