import { captureError, captureApiError } from "@/lib/sentry";
import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .order("name");

    if (error) {
      captureApiError(error.message, 500);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ stores: data });
  } catch (err) {
    captureError(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await req.json();
    const { name, category, address } = body;

    // Handle toggle active
    if (body._toggle && body.id) {
      const { error: toggleErr } = await supabase
        .from("stores")
        .update({ is_active: body.is_active })
        .eq("id", body.id);
      if (toggleErr) {
        captureApiError(toggleErr.message, 500);
        return NextResponse.json({ error: toggleErr.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    if (!name) {
      captureApiError("Name is required", 400);
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("stores")
      .insert({ name, category: category || "other", address: address || null, is_approved: true })
      .select()
      .single();

    if (error) {
      captureApiError(error.message, 500);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ store: data });
  } catch (err) {
    captureError(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      captureApiError("id is required", 400);
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { error } = await supabase.from("stores").delete().eq("id", id);
    if (error) {
      captureApiError(error.message, 500);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    captureError(err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
