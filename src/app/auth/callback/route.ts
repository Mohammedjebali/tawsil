import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabase } from "@/lib/supabase-server";

function generateReferralCode(firstName: string): string {
  const letters = firstName.replace(/[^a-zA-Z]/g, "").toUpperCase();
  const prefix = (letters + "TAW").slice(0, 4);
  const digits = String(Math.floor(Math.random() * 100)).padStart(2, "0");
  return prefix + digits;
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login`);
  }

  // Build a redirect response — destination will be set after we inspect the user
  const response = NextResponse.redirect(`${origin}/app`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const user = data.user;
  const meta = user.user_metadata || {};

  // Check if this is an OAuth user missing required profile info
  const isOAuth =
    user.app_metadata?.provider === "google" ||
    user.app_metadata?.provider === "facebook" ||
    meta.iss?.includes("google");
  const missingProfile = !meta.phone || !meta.first_name;

  if (isOAuth && missingProfile) {
    // Redirect to complete-profile — session cookies are already on `response`
    response.headers.set("Location", `${origin}/register/complete-profile`);
    return response;
  }

  // Create/update customer directly via service-role client
  if (meta.first_name?.trim() && user.email?.trim() && meta.phone?.trim()) {
    try {
      const db = getSupabase();
      let referralCode = generateReferralCode(meta.first_name);
      for (let attempt = 0; attempt < 10; attempt++) {
        const { data: existing } = await db
          .from("customers")
          .select("id")
          .eq("referral_code", referralCode)
          .maybeSingle();
        if (!existing) break;
        referralCode = generateReferralCode(meta.first_name);
      }

      await db
        .from("customers")
        .upsert(
          {
            user_id: user.id,
            first_name: meta.first_name,
            last_name: meta.last_name || meta.full_name?.split(" ").slice(1).join(" ") || "",
            email: user.email,
            phone: meta.phone,
            referral_code: referralCode,
          },
          { onConflict: "email" }
        );
    } catch (_) {
      // Non-fatal: customer will be created on next login or profile visit
    }
  }

  // Redirect to /app — session cookies are set on the response
  return response;
}
