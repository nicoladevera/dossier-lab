"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CaptureTabs } from "@/components/capture/capture-tabs";
import { SearchInput } from "@/components/search/search-input";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, File, FileText, FileCode, AlignLeft } from "lucide-react";

const typeIcons: Record<string, React.ElementType> = {
  URL: Globe,
  PDF: File,
  WORD: FileText,
  MARKDOWN: FileCode,
  TEXT: AlignLeft,
};

interface RecentSource {
  id: string;
  title: string;
  sourceType: string;
  captureDate: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [recentSources, setRecentSources] = useState<RecentSource[]>([]);

  useEffect(() => {
    fetch("/api/sources?limit=5&sort=newest")
      .then((r) => r.json())
      .then((data) => {
        if (data.sources) setRecentSources(data.sources);
      })
      .catch(() => {});
  }, []);

  function handleSearch(query: string) {
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  function handleCaptureSuccess() {
    router.push("/knowledge-base");
  }

  return (
    <div className="space-y-6">
      <OnboardingFlow />

      <div>
        <h2 className="text-2xl font-serif tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground mt-2 italic">
          Welcome to Dossier Lab. Capture content, search your knowledge base, and ask questions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Search</CardTitle>
        </CardHeader>
        <CardContent>
          <SearchInput onSearch={handleSearch} placeholder="Search your knowledge base..." />
        </CardContent>
      </Card>

      <CaptureTabs onSuccess={handleCaptureSuccess} />

      {recentSources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentSources.map((source) => {
                const Icon = typeIcons[source.sourceType] || FileText;
                return (
                  <Link
                    key={source.id}
                    href={`/knowledge-base/${source.id}`}
                    className="flex items-center gap-3 rounded-md p-2 hover:bg-accent transition-colors"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate flex-1">{source.title}</span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {source.sourceType}
                    </Badge>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(source.captureDate).toLocaleDateString()}
                    </span>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
