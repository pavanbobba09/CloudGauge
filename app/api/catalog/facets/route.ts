import { NextRequest, NextResponse } from "next/server";
import { getCatalogFacets } from "@/lib/catalog";
import { PROVIDERS, type Provider } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const value = request.nextUrl.searchParams.get("provider") ?? undefined;
  if (value && !PROVIDERS.includes(value as Provider)) {
    return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
  }
  return NextResponse.json(await getCatalogFacets(value as Provider | undefined));
}
