import { NextResponse } from "next/server";
import { getMetersById } from "@/lib/catalog";
import { calculateEstimate } from "@/lib/estimate";
import { estimateRequestSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  try {
    const parsed = estimateRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid estimate request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const catalog = await getMetersById(parsed.data.lines.map((line) => line.meterId));
    if (catalog.options.length !== new Set(parsed.data.lines.map((line) => line.meterId)).size) {
      return NextResponse.json({ error: "One or more meters do not exist in the active catalog" }, { status: 400 });
    }
    const result = calculateEstimate(parsed.data, catalog.options, catalog);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to calculate estimate";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
