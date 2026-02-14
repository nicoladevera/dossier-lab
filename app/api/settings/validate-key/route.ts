import { NextResponse } from "next/server";
import { getRequiredAuthSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    await getRequiredAuthSession();
    const body = await request.json();
    const { provider, apiKey } = body;

    if (!provider || !apiKey) {
      return NextResponse.json({ error: "Provider and API key are required" }, { status: 400 });
    }

    if (provider === "OPENAI") {
      const response = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      if (response.ok) {
        return NextResponse.json({ valid: true, message: "OpenAI API key is valid" });
      } else {
        return NextResponse.json({
          valid: false,
          message: `Invalid OpenAI API key: ${response.status}`,
        });
      }
    }

    if (provider === "ANTHROPIC") {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-5-20250929",
          max_tokens: 1,
          messages: [{ role: "user", content: "Hi" }],
        }),
      });

      // 200 or 400 (bad request but valid key) means key works
      if (response.ok || response.status === 400) {
        return NextResponse.json({ valid: true, message: "Anthropic API key is valid" });
      } else {
        return NextResponse.json({
          valid: false,
          message: `Invalid Anthropic API key: ${response.status}`,
        });
      }
    }

    return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Validation failed" }, { status: 500 });
  }
}
