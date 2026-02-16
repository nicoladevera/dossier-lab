"use client";

import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";

interface QuestionInputProps {
  onSubmit: (question: string) => void;
  loading?: boolean;
  disabled?: boolean;
  isNewChat?: boolean;
}

export function QuestionInput({ onSubmit, loading, disabled, isNewChat }: QuestionInputProps) {
  const [question, setQuestion] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (question.trim() && !loading && !disabled) {
      onSubmit(question.trim());
      setQuestion("");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Textarea
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder={isNewChat
          ? "Ask a question about your knowledge base..."
          : "Follow up on this conversation..."}
        rows={1}
        className="resize-none pr-12 max-h-[10rem] overflow-y-auto"
        disabled={loading || disabled}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
          }
        }}
      />
      <Button
        type="submit"
        size="icon"
        disabled={!question.trim() || loading || disabled}
        className="absolute bottom-1.5 right-1.5 h-8 w-8"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </Button>
    </form>
  );
}
