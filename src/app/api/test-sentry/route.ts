import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    throw new Error("Sentry server-side test error — if you see this in Sentry, it works!");
  } catch (error) {
    Sentry.captureException(error);
    await Sentry.flush(2000);
    return NextResponse.json({
      ok: true,
      message: "Test error sent to Sentry. Check your Sentry dashboard.",
    });
  }
}
