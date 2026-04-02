import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";

function generateReferralCode(firstName: string): string {
  const letters = firstName.replace(/[^a-zA-Z]/g, "").toUpperCase();
  const prefix = (letters + "TAW").slice(0, 4);
  const digits = String(Math.floor(Math.random() * 100)).padStart(2, "0");
  return prefix + digits;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const { first_name, last_name, email, phone, user_id, referred_by } = await req.json();

    if (!first_name || !last_name || !email || !phone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Generate unique referral code
    let referralCode = generateReferralCode(first_name);
    for (let attempt = 0; attempt < 10; attempt++) {
      const { data: existing } = await supabase
        .from("customers")
        .select("id")
        .eq("referral_code", referralCode)
        .maybeSingle();
      if (!existing) break;
      referralCode = generateReferralCode(first_name);
    }

    // Validate referred_by code if provided
    let validReferredBy: string | null = null;
    if (referred_by) {
      const { data: referrer } = await supabase
        .from("customers")
        .select("id")
        .eq("referral_code", referred_by)
        .maybeSingle();
      if (referrer) validReferredBy = referred_by;
    }

    // Upsert by email — if email exists, update phone/name/user_id
    const row: Record<string, unknown> = { first_name, last_name, email, phone, referral_code: referralCode };
    if (user_id) row.user_id = user_id;
    if (validReferredBy) row.referred_by = validReferredBy;

    const { data, error } = await supabase
      .from("customers")
      .upsert(row, { onConflict: "email" })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        // unique constraint — email already exists, just return it
        const { data: existing } = await supabase
          .from("customers")
          .select()
          .eq("email", email)
          .single();
        return NextResponse.json({ customer: existing });
      }
      throw error;
    }

    // Award 20 points to the new customer if they used a valid referral code
    if (validReferredBy && data) {
      await supabase
        .from("customers")
        .update({ points: (data.points || 0) + 20 })
        .eq("id", data.id);
      data.points = (data.points || 0) + 20;
    }

    return NextResponse.json({ customer: data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (email) {
      const { data, error } = await supabase
        .from("customers")
        .select()
        .eq("email", email)
        .single();
      if (error) return NextResponse.json({ customer: null });
      return NextResponse.json({ customer: data });
    }

    const { data, error } = await supabase
      .from("customers")
      .select()
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return NextResponse.json({ customers: data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const { email, first_name, last_name, points_delta, claim_referral_bonus } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Handle claim_referral_bonus
    if (claim_referral_bonus) {
      const { data: current, error: fetchErr } = await supabase
        .from("customers")
        .select("id, points, successful_referrals_count, referral_bonus_claimed")
        .eq("email", email)
        .single();
      if (fetchErr) throw fetchErr;

      if (
        current &&
        (current.successful_referrals_count || 0) >= 5 &&
        !current.referral_bonus_claimed
      ) {
        const { data, error } = await supabase
          .from("customers")
          .update({
            points: (current.points || 0) + 50,
            referral_bonus_claimed: true,
          })
          .eq("id", current.id)
          .select()
          .single();
        if (error) throw error;
        return NextResponse.json({ customer: data });
      }

      // Conditions not met — return current state
      return NextResponse.json({ customer: current });
    }

    // Handle points_delta: fetch current points, then add delta
    if (typeof points_delta === "number") {
      const { data: current, error: fetchErr } = await supabase
        .from("customers")
        .select("points")
        .eq("email", email)
        .single();
      if (fetchErr) throw fetchErr;

      const newPoints = (current?.points || 0) + points_delta;
      const { data, error } = await supabase
        .from("customers")
        .update({ points: newPoints })
        .eq("email", email)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ customer: data });
    }

    const update: Record<string, string> = {};
    if (first_name !== undefined) update.first_name = first_name;
    if (last_name !== undefined) update.last_name = last_name;

    const { data, error } = await supabase
      .from("customers")
      .update(update)
      .eq("email", email)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ customer: data });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
