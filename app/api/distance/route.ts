import { NextResponse } from "next/server";
import { calculateIfConnected } from "@/lib/openflights";

export async function POST(request: Request) {
  let body: { from?: string; to?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Send JSON with from and to airport codes or names." },
      { status: 400 },
    );
  }

  const from = body.from?.trim() ?? "";
  const to = body.to?.trim() ?? "";
  if (!from || !to) {
    return NextResponse.json(
      { error: "Enter both a departure and an arrival airport." },
      { status: 400 },
    );
  }

  try {
    const result = await calculateIfConnected(from, to);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load OpenFlights data.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
