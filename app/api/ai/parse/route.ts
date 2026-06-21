import { NextResponse } from "next/server";
import { aiDraftSchema } from "@/lib/schemas";

const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "lines", "warnings"],
  properties: {
    summary: { type: "string" },
    lines: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["provider", "category", "region", "searchTerms", "quantity", "usageAmount", "schedule", "unresolved"],
        properties: {
          provider: { type: "string", enum: ["aws", "azure", "gcp"] },
          category: { type: "string", enum: ["compute", "block_storage", "object_storage", "database", "egress", "other"] },
          region: { type: ["string", "null"] },
          searchTerms: { type: "string" },
          quantity: { type: "number", exclusiveMinimum: 0 },
          usageAmount: { type: "number", minimum: 0 },
          schedule: {
            anyOf: [
              { type: "null" },
              {
                type: "object",
                additionalProperties: false,
                required: ["kind", "totalHours", "hoursPerDay", "daysPerWeek"],
                properties: {
                  kind: { type: "string", enum: ["one_time", "recurring"] },
                  totalHours: { type: ["number", "null"] },
                  hoursPerDay: { type: ["number", "null"] },
                  daysPerWeek: { type: ["number", "null"] },
                },
              },
            ],
          },
          unresolved: { type: "array", items: { type: "string" } },
        },
      },
    },
    warnings: { type: "array", items: { type: "string" } },
  },
} as const;

export async function GET() {
  return NextResponse.json({ enabled: Boolean(process.env.OPENAI_API_KEY) });
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "AI workload parsing is not configured" }, { status: 503 });
  }
  try {
    const body = (await request.json()) as { prompt?: unknown };
    if (typeof body.prompt !== "string" || body.prompt.trim().length < 10 || body.prompt.length > 4000) {
      return NextResponse.json({ error: "Prompt must contain 10–4000 characters" }, { status: 400 });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL ?? "gpt-5.4-nano",
        input: [
          {
            role: "system",
            content:
              "Extract a cloud workload into an unconfirmed estimate draft. Never invent prices or claim services are equivalent. Use searchTerms rather than provider SKU IDs. Put every missing fact in unresolved.",
          },
          { role: "user", content: body.prompt.trim() },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "cloud_workload_draft",
            strict: true,
            schema: responseSchema,
          },
        },
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!response.ok) {
      console.error("OpenAI parser request failed", response.status, await response.text());
      return NextResponse.json({ error: "AI parser is temporarily unavailable" }, { status: 502 });
    }
    const payload = (await response.json()) as {
      output_text?: string;
      output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
    };
    const text =
      payload.output_text ??
      payload.output?.flatMap((item) => item.content ?? []).find((item) => item.type === "output_text")?.text;
    if (!text) throw new Error("AI response did not contain structured output");
    const parsed = aiDraftSchema.parse(JSON.parse(text));
    return NextResponse.json({ ...parsed, confirmed: false });
  } catch (error) {
    console.error("AI parser failed", error);
    return NextResponse.json({ error: "AI output could not be validated" }, { status: 502 });
  }
}
