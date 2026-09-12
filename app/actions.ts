"use server";

import { calculateIfConnected } from "@/lib/openflights";
import type { DistanceResult } from "@/lib/types";

export type CheckState = DistanceResult | { status: "error"; message: string } | null;

export async function checkDistanceAction(
  _prev: CheckState,
  formData: FormData,
): Promise<CheckState> {
  const from = String(formData.get("from") ?? "").trim();
  const to = String(formData.get("to") ?? "").trim();
  if (!from || !to) {
    return { status: "error", message: "Enter both airports to check for a connecting flight." };
  }
  try {
    return await calculateIfConnected(from, to);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not load OpenFlights data.";
    return { status: "error", message };
  }
}
