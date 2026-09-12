import { NextResponse } from "next/server";
import { searchAirports } from "@/lib/openflights";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  try {
    const airports = await searchAirports(q);
    return NextResponse.json({ airports });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not search airports.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
