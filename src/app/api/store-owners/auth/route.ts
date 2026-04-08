import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";
import { captureError } from "@/lib/sentry";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, first_name, last_name, phone, password } = body;

    if (!phone || !password) {
      return NextResponse.json(
        { error: "Phone and password are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    if (action === "register") {
      if (!first_name || !last_name) {
        return NextResponse.json(
          { error: "First name and last name are required" },
          { status: 400 }
        );
      }

      if (password.length < 8) {
        return NextResponse.json(
          { error: "Password must be at least 8 characters" },
          { status: 400 }
        );
      }

      // Check if phone already registered
      const { data: existing } = await supabase
        .from("store_owners")
        .select("id")
        .eq("phone", phone)
        .single();

      if (existing) {
        return NextResponse.json(
          { error: "Phone number already registered" },
          { status: 409 }
        );
      }

      const password_hash = await bcrypt.hash(password, 10);

      const { data, error } = await supabase
        .from("store_owners")
        .insert({ first_name, last_name, phone, password_hash })
        .select("id, first_name, last_name, phone, status, created_at")
        .single();

      if (error) throw error;

      return NextResponse.json({ owner: data }, { status: 201 });
    }

    if (action === "login") {
      const { data: owner, error } = await supabase
        .from("store_owners")
        .select("id, first_name, last_name, phone, password_hash, status, created_at")
        .eq("phone", phone)
        .single();

      if (error || !owner) {
        return NextResponse.json(
          { error: "Invalid phone or password" },
          { status: 401 }
        );
      }

      const valid = await bcrypt.compare(password, owner.password_hash);
      if (!valid) {
        return NextResponse.json(
          { error: "Invalid phone or password" },
          { status: 401 }
        );
      }

      // Don't return password hash
      const { password_hash: _, ...safeOwner } = owner;

      return NextResponse.json({ owner: safeOwner });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    captureError(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
