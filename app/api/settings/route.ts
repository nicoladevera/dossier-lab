import { NextResponse } from "next/server";
import { getRequiredAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { encrypt, decrypt, maskApiKey } from "@/lib/services/encryption";

export async function GET() {
  try {
    const session = await getRequiredAuthSession();

    const settings = await prisma.userSettings.findUnique({
      where: { userId: session.user.id },
    });

    if (!settings) {
      return NextResponse.json({
        openaiApiKey: null,
        anthropicApiKey: null,
        defaultProvider: "OPENAI",
        defaultModel: "gpt-4o",
        dailyCostThreshold: 2.0,
      });
    }

    return NextResponse.json({
      openaiApiKey: settings.openaiApiKey
        ? maskApiKey(decrypt(settings.openaiApiKey))
        : null,
      anthropicApiKey: settings.anthropicApiKey
        ? maskApiKey(decrypt(settings.anthropicApiKey))
        : null,
      defaultProvider: settings.defaultProvider,
      defaultModel: settings.defaultModel,
      dailyCostThreshold: Number(settings.dailyCostThreshold),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getRequiredAuthSession();
    const body = await request.json();

    const data: Record<string, unknown> = {};

    if (body.openaiApiKey !== undefined && !body.openaiApiKey?.includes("*")) {
      data.openaiApiKey = body.openaiApiKey ? encrypt(body.openaiApiKey) : null;
    }

    if (body.anthropicApiKey !== undefined && !body.anthropicApiKey?.includes("*")) {
      data.anthropicApiKey = body.anthropicApiKey ? encrypt(body.anthropicApiKey) : null;
    }

    if (body.defaultProvider !== undefined) {
      data.defaultProvider = body.defaultProvider;
    }

    if (body.defaultModel !== undefined) {
      data.defaultModel = body.defaultModel;
    }

    if (body.dailyCostThreshold !== undefined) {
      data.dailyCostThreshold = body.dailyCostThreshold;
    }

    const settings = await prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: data,
      create: {
        userId: session.user.id,
        ...data,
      },
    });

    return NextResponse.json({
      openaiApiKey: settings.openaiApiKey
        ? maskApiKey(decrypt(settings.openaiApiKey))
        : null,
      anthropicApiKey: settings.anthropicApiKey
        ? maskApiKey(decrypt(settings.anthropicApiKey))
        : null,
      defaultProvider: settings.defaultProvider,
      defaultModel: settings.defaultModel,
      dailyCostThreshold: Number(settings.dailyCostThreshold),
    });
  } catch {
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
