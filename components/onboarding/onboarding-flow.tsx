"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { WelcomeStep } from "./welcome-step";
import { CaptureStep } from "./capture-step";
import { QueryStep } from "./query-step";
import { ExploreStep } from "./explore-step";

export function OnboardingFlow() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch("/api/onboarding")
      .then((r) => r.json())
      .then((data) => {
        if (!data.onboardingCompleted) {
          setOpen(true);
        }
        setChecked(true);
      })
      .catch(() => setChecked(true));
  }, []);

  const complete = useCallback(async () => {
    setOpen(false);
    try {
      await fetch("/api/onboarding", { method: "POST" });
    } catch {
      // Silently fail
    }
  }, []);

  if (!checked) return null;

  const progressPercentage = ((step - 1) / 3) * 100;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && complete()}>
      <DialogContent className="sm:max-w-xl">
        <DialogTitle className="sr-only">Product onboarding</DialogTitle>
        {/* Progress indicator */}
        <div className="mb-2">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Step {step} of 4</span>
          </div>
          <div className="h-1 w-full rounded-full bg-muted">
            <div
              className="h-1 rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {step === 1 && (
          <WelcomeStep onNext={() => setStep(2)} onSkip={complete} />
        )}
        {step === 2 && (
          <CaptureStep onNext={() => setStep(3)} onSkip={complete} />
        )}
        {step === 3 && (
          <QueryStep onNext={() => setStep(4)} onSkip={complete} />
        )}
        {step === 4 && <ExploreStep onFinish={complete} />}
      </DialogContent>
    </Dialog>
  );
}
