"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Check, X, Loader2 } from "lucide-react";

const MODELS: Record<string, { label: string; value: string }[]> = {
  OPENAI: [
    { label: "GPT-5 Mini", value: "gpt-5-mini" },
    { label: "GPT-5.2", value: "gpt-5.2" },
    { label: "GPT-4.1 Nano", value: "gpt-4.1-nano" },
  ],
  ANTHROPIC: [
    { label: "Claude Sonnet 4.5", value: "claude-sonnet-4-5-20250929" },
    { label: "Claude Opus 4.6", value: "claude-opus-4-6" },
    { label: "Claude Haiku 4.5", value: "claude-haiku-4-5-20251001" },
  ],
};

interface Settings {
  openaiApiKey: string | null;
  anthropicApiKey: string | null;
  defaultProvider: string;
  defaultModel: string;
  dailyCostThreshold: number;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    openaiApiKey: null,
    anthropicApiKey: null,
    defaultProvider: "OPENAI",
    defaultModel: "gpt-5-mini",
    dailyCostThreshold: 2.0,
  });
  const [openaiKey, setOpenaiKey] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState<string | null>(null);
  const [validationStatus, setValidationStatus] = useState<Record<string, boolean | null>>({});

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings(data);
        if (data.openaiApiKey) setOpenaiKey(data.openaiApiKey);
        if (data.anthropicApiKey) setAnthropicKey(data.anthropicApiKey);
      });
  }, []);

  async function validateKey(provider: string, key: string) {
    if (!key || key.includes("*")) return;
    setValidating(provider);
    setValidationStatus((prev) => ({ ...prev, [provider]: null }));

    try {
      const res = await fetch("/api/settings/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey: key }),
      });
      const data = await res.json();
      setValidationStatus((prev) => ({ ...prev, [provider]: data.valid }));
      if (data.valid) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch {
      setValidationStatus((prev) => ({ ...prev, [provider]: false }));
      toast.error("Validation failed");
    } finally {
      setValidating(null);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        defaultProvider: settings.defaultProvider,
        defaultModel: settings.defaultModel,
        dailyCostThreshold: settings.dailyCostThreshold,
      };

      if (openaiKey && !openaiKey.includes("*")) {
        body.openaiApiKey = openaiKey;
      }
      if (anthropicKey && !anthropicKey.includes("*")) {
        body.anthropicApiKey = anthropicKey;
      }

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        if (data.openaiApiKey) setOpenaiKey(data.openaiApiKey);
        if (data.anthropicApiKey) setAnthropicKey(data.anthropicApiKey);
        toast.success("Settings saved");
      } else {
        toast.error("Failed to save settings");
      }
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  function ValidationIcon({ provider }: { provider: string }) {
    if (validating === provider) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (validationStatus[provider] === true) return <Check className="h-4 w-4 text-foreground" />;
    if (validationStatus[provider] === false) return <X className="h-4 w-4 text-destructive" />;
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Manage your API keys and preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Configure your provider keys. Anthropic/OpenAI keys are used for answer generation, and OpenAI enables semantic embeddings for retrieval.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="openai-key">OpenAI API Key</Label>
            <div className="flex gap-2">
              <Input
                id="openai-key"
                type="password"
                value={openaiKey}
                onChange={(e) => {
                  setOpenaiKey(e.target.value);
                  setValidationStatus((prev) => ({ ...prev, OPENAI: null }));
                }}
                placeholder="sk-..."
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => validateKey("OPENAI", openaiKey)}
                disabled={!openaiKey || openaiKey.includes("*") || validating !== null}
              >
                <ValidationIcon provider="OPENAI" />
                Validate
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              If no OpenAI key is set, ingestion and search use keyword-only retrieval.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="anthropic-key">Anthropic API Key</Label>
            <div className="flex gap-2">
              <Input
                id="anthropic-key"
                type="password"
                value={anthropicKey}
                onChange={(e) => {
                  setAnthropicKey(e.target.value);
                  setValidationStatus((prev) => ({ ...prev, ANTHROPIC: null }));
                }}
                placeholder="sk-ant-..."
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => validateKey("ANTHROPIC", anthropicKey)}
                disabled={!anthropicKey || anthropicKey.includes("*") || validating !== null}
              >
                <ValidationIcon provider="ANTHROPIC" />
                Validate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>LLM Provider</CardTitle>
          <CardDescription>Choose your default LLM provider and model.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default Provider</Label>
            <Select
              value={settings.defaultProvider}
              onValueChange={(value) => {
                setSettings((prev) => ({
                  ...prev,
                  defaultProvider: value,
                  defaultModel: MODELS[value][0].value,
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPENAI">OpenAI</SelectItem>
                <SelectItem value="ANTHROPIC">Anthropic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Default Model</Label>
            <Select
              value={settings.defaultModel}
              onValueChange={(value) => setSettings((prev) => ({ ...prev, defaultModel: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELS[settings.defaultProvider]?.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Budget</CardTitle>
          <CardDescription>Set a daily cost threshold for LLM usage warnings.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="cost-threshold">Daily Cost Threshold (USD)</Label>
            <Input
              id="cost-threshold"
              type="number"
              step="0.50"
              min="0"
              value={settings.dailyCostThreshold}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  dailyCostThreshold: parseFloat(e.target.value) || 0,
                }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
