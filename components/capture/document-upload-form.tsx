"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Upload, AlertTriangle, CheckCircle2, FileText } from "lucide-react";
import type { CapturedSourceSummary } from "@/lib/sources/source-status";

const ACCEPTED_TYPES = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/msword": ".doc",
  "text/markdown": ".md",
  "text/plain": ".txt",
};

const ACCEPT_STRING = Object.values(ACCEPTED_TYPES).join(",") + ",.markdown";

interface DocumentUploadFormProps {
  onSuccess?: (source: CapturedSourceSummary) => void;
}

export function DocumentUploadForm({ onSuccess }: DocumentUploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((selectedFile: File) => {
    setError(null);
    setSuccess(false);
    setFile(selectedFile);
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Please select a file");
      return;
    }

    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/ingest/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to upload document");
        return;
      }

      setSuccess(true);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      onSuccess?.(data.source);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div
        className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {file ? (
          <div className="flex items-center gap-2 text-sm">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">{file.name}</span>
            <span className="text-muted-foreground">
              ({(file.size / 1024).toFixed(0)} KB)
            </span>
          </div>
        ) : (
          <>
            <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Drag and drop a file here, or click to browse
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDF, Word (.doc, .docx), Markdown (.md), Text (.txt)
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_STRING}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
          className={file ? "hidden" : "absolute inset-0 cursor-pointer opacity-0"}
        />
      </div>

      {file && (
        <div className="flex gap-2">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setFile(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            disabled={loading}
          >
            Clear
          </Button>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            Document uploaded successfully. Live processing updates will appear below.
          </AlertDescription>
        </Alert>
      )}
    </form>
  );
}
