"use client";

import { useState } from "react";
import { SourceList } from "@/components/knowledge-base/source-list";
import { CaptureTabs } from "@/components/capture/capture-tabs";
import type { CapturedSourceSummary } from "@/lib/sources/source-status";

export default function KnowledgeBasePage() {
  const [capturedSources, setCapturedSources] = useState<CapturedSourceSummary[]>(
    []
  );

  function handleCaptureSuccess(source: CapturedSourceSummary) {
    setCapturedSources((current) => [
      source,
      ...current.filter((existingSource) => existingSource.id !== source.id),
    ]);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif tracking-tight">Knowledge Base</h2>
        <p className="text-muted-foreground mt-1">
          Manage your captured sources
        </p>
      </div>

      <CaptureTabs onSuccess={handleCaptureSuccess} />

      <SourceList trackedSources={capturedSources} />
    </div>
  );
}
