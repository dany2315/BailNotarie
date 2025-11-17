"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface StepperProps {
  steps: { title: string; description?: string }[];
  currentStep: number;
  onStepClick?: (step: number) => void;
  className?: string;
}

export function Stepper({ steps, currentStep, onStepClick, className }: StepperProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex flex-row items-center justify-between py-2 w-full ml-8">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = onStepClick && (isCompleted || isCurrent);

          return (
            <div key={index} className="flex items-center flex-1">
              {/* Step circle */}
              <div className="flex flex-col items-center flex-1">
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick?.(index)}
                  disabled={!isClickable}
                  className={cn(
                    "relative flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border-2 transition-all",
                    isCompleted
                      ? "border-primary bg-primary text-primary-foreground"
                      : isCurrent
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted bg-background text-muted-foreground",
                    isClickable && "cursor-pointer hover:scale-110",
                    !isClickable && "cursor-not-allowed"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <span className="text-xs sm:text-sm font-semibold">{index + 1}</span>
                  )}
                </button>
                <div className="mt-1 sm:mt-2 text-center">
                  <p
                    className={cn(
                      "text-xs sm:text-sm font-medium hidden sm:block",
                      isCurrent ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {step.title}
                  </p>
                  
                </div>
              </div>

              {/* Connector line */}
              {index < steps.length  && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-1 sm:mx-2 -mt-1 sm:-mt-5",
                    isCompleted ? "bg-primary" : "bg-muted",
                    index === steps.length -1 ? "bg-background " : "block"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}



