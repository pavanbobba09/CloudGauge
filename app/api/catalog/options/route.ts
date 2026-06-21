import { NextRequest, NextResponse } from "next/server";
import { getCatalog } from "@/lib/catalog";
import { CATEGORIES, PROVIDERS, type Category, type Provider } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const providerValue = request.nextUrl.searchParams.get("provider") ?? undefined;
  const categoryValue = request.nextUrl.searchParams.get("category") ?? undefined;
  const region = request.nextUrl.searchParams.get("region") ?? undefined;
  const service = request.nextUrl.searchParams.get("service") ?? undefined;
  const query = request.nextUrl.searchParams.get("query") ?? undefined;
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const pageSize = Number(request.nextUrl.searchParams.get("pageSize") ?? "50");

  if (providerValue && !PROVIDERS.includes(providerValue as Provider)) {
    return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
  }
  if (categoryValue && !CATEGORIES.includes(categoryValue as Category)) {
    return NextResponse.json({ error: "Unsupported category" }, { status: 400 });
  }

  const catalog = await getCatalog({
    provider: providerValue as Provider | undefined,
    category: categoryValue as Category | undefined,
    service,
    region,
    query,
    page,
    pageSize,
  });
  const regions = [...new Set(catalog.options.map((option) => option.region))].sort();
  const services = [...new Map(catalog.options.map((option) => [option.serviceCode, {
    code: option.serviceCode,
    name: option.serviceName,
  }])).values()].sort((a, b) => a.name.localeCompare(b.name));
  return NextResponse.json({ ...catalog, regions, services, count: catalog.total });
}
