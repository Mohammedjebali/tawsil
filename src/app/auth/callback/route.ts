import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Handle the email confirmation redirect from Supabase
// Admin should configure Supabase Auth email templates at:
// https://supabase.com/dashboard/project/ugbibsadzjefuhativii/auth/templates
// to use custom "Tawsil" branding in confirmation emails.

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}/login?confirmed=1`);
}
