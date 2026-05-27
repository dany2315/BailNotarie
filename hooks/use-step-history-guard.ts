"use client";

import { useEffect, useRef } from "react";

/**
 * Intercepts the browser back navigation (iOS swipe-back, Android back button,
 * browser back) and turns it into a step-back inside a multi-step form.
 *
 * - On mount: pushes a history marker so the first back gesture is captured.
 * - On popstate: if currentStep > 0, calls onStepBack and re-pushes a marker
 *   so further back gestures keep being intercepted.
 * - When currentStep === 0, the popstate is not intercepted, letting the user
 *   exit the page naturally.
 */
export function useStepHistoryGuard(currentStep: number, onStepBack: () => void) {
  const stepRef = useRef(currentStep);
  const onStepBackRef = useRef(onStepBack);

  useEffect(() => {
    stepRef.current = currentStep;
  }, [currentStep]);

  useEffect(() => {
    onStepBackRef.current = onStepBack;
  }, [onStepBack]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.history.pushState({ stepGuard: true }, "");

    const onPop = () => {
      if (stepRef.current > 0) {
        onStepBackRef.current();
        window.history.pushState({ stepGuard: true }, "");
      }
    };

    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
}
