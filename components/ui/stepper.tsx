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
  const rawProgress = ((currentStep + 1) / steps.length) * 100;

// On limite à 95%
const progressPercentage = Math.min(rawProgress, 95);

  return (
    <div className={cn("w-full text-center", className)}>
      {/* Barre de progression globale */}
      <div className="relative h-2 bg-accent rounded-full overflow-hidden">
        <div
          className=" h-full bg-primary/80  transition-all duration-500 ease-out rounded-full"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Stepper avec étapes 
      <div className="flex flex-row items-start justify-between w-full relative">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = onStepClick && (isCompleted || isCurrent);

          return (
            <div key={index} className="flex flex-col items-center flex-1 relative z-10">
              {/* Ligne de connexion horizontale 
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "absolute top-5 left-[50%] w-full h-0.5 -translate-x-1/2 transition-colors duration-300",
                    index < currentStep ? "bg-primary" : "bg-muted"
                  )}
                  style={{ width: `calc(100% - 2rem)` }}
                />
              )}

              {/* Cercle de l'étape 
              <button
                type="button"
                onClick={() => isClickable && onStepClick?.(index)}
                disabled={!isClickable}
                className={cn(
                  "relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 shadow-sm",
                  isCompleted
                    ? "border-primary bg-primary text-primary-foreground shadow-primary/20"
                    : isCurrent
                    ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110"
                    : "border-muted bg-background text-muted-foreground",
                  isClickable && "cursor-pointer hover:scale-110 hover:shadow-md",
                  !isClickable && "cursor-not-allowed"
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-semibold">{index + 1}</span>
                )}
                {/* Indicateur de l'étape actuelle 
                {isCurrent && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rounded-full animate-pulse" />
                )}
              </button>

              {/* Titre de l'étape 
              <div className="mt-3 text-center max-w-[120px] sm:max-w-none">
                <p
                  className={cn(
                    "text-xs sm:text-sm font-medium transition-colors duration-300",
                    isCurrent
                      ? "text-primary font-semibold"
                      : isCompleted
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {step.title}
                </p>
              </div>
            </div>
          );
        })}
      </div>  */}
    </div>
  );
}
