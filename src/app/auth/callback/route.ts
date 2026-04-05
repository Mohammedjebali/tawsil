import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const user = data.user;
  const meta = user.user_metadata || {};

  // Check if this is an OAuth user missing required profile info
  const isOAuth = user.app_metadata?.provider === "google" || meta.iss?.includes("google");
  const missingProfile = !meta.phone || !meta.first_name;

  if (isOAuth && missingProfile) {
    return NextResponse.redirect(`${origin}/register/complete-profile`);
  }

  // Only create/update customer if profile data is complete
  if (meta.first_name && meta.phone) {
    try {
      await fetch(`${origin}/api/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          first_name: meta.first_name,
          last_name: meta.last_name || meta.full_name?.split(" ").slice(1).join(" ") || "",
          email: user.email,
          phone: meta.phone,
        }),
      });
    } catch (_) {}
  }

  return NextResponse.redirect(`${origin}/login?confirmed=1`);
}
