"use client";

import { SourceList } from "@/components/knowledge-base/source-list";
import { CaptureTabs } from "@/components/capture/capture-tabs";
import { useRouter } from "next/navigation";

export default function KnowledgeBasePage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Knowledge Base</h2>
        <p className="text-muted-foreground mt-1">
          Manage your captured sources
        </p>
      </div>

      <CaptureTabs onSuccess={() => router.refresh()} />

      <SourceList />
    </div>
  );
}
