"use client";

import { useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UrlCaptureForm } from "./url-capture-form";
import { DocumentUploadForm } from "./document-upload-form";
import { TextPasteForm } from "./text-paste-form";
import { Globe, Upload, FileText } from "lucide-react";
import type { CapturedSourceSummary } from "@/lib/sources/source-status";

interface CaptureTabsProps {
  onSuccess?: (source: CapturedSourceSummary) => void;
}

export function CaptureTabs({ onSuccess }: CaptureTabsProps) {
  const tabsRef = useRef<HTMLDivElement>(null);

  function switchToText() {
    // Programmatically switch to text tab
    const textTab = tabsRef.current?.querySelector('[data-value="text"]') as HTMLButtonElement;
    textTab?.click();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Capture Content</CardTitle>
        <CardDescription>
          Add articles, documents, or text to your knowledge base
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="url" ref={tabsRef}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="url" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">URL</span>
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2" data-value="upload">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Upload</span>
            </TabsTrigger>
            <TabsTrigger value="text" className="flex items-center gap-2" data-value="text">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Text</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="url" className="mt-4">
            <UrlCaptureForm onSuccess={onSuccess} onSwitchToText={switchToText} />
          </TabsContent>
          <TabsContent value="upload" className="mt-4">
            <DocumentUploadForm onSuccess={onSuccess} />
          </TabsContent>
          <TabsContent value="text" className="mt-4">
            <TextPasteForm onSuccess={onSuccess} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
