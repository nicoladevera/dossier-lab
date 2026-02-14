import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
  progress?: number;
}

export function LoadingState({ message, progress }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      {message && (
        <p className="mt-4 text-sm text-muted-foreground">{message}</p>
      )}
      {progress !== undefined && (
        <div className="mt-3 w-48">
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          <p className="mt-1 text-center text-xs text-muted-foreground">
            {Math.round(progress)}%
          </p>
        </div>
      )}
    </div>
  );
}
