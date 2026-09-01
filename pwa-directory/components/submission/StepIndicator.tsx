"use client";

import React from "react";
import { Check } from "lucide-react";

interface StepIndicatorProps {
  steps: { id: number; label: string }[];
  currentStep: number;
  onStepClick?: (step: number) => void;
}

export function StepIndicator({
  steps,
  currentStep,
  onStepClick,
}: StepIndicatorProps) {
  return (
    <nav aria-label="Submission wizard progress" className="w-full mb-8">
      {/* Desktop Stepper */}
      <ol className="hidden md:flex items-center justify-between w-full border border-(--line) rounded-lg bg-(--card) p-3 shadow-xs">
        {steps.map((step, idx) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const isClickable = onStepClick && step.id < currentStep;

          return (
            <li
              key={step.id}
              className="flex items-center flex-1 last:flex-none"
            >
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick(step.id)}
                aria-current={isCurrent ? "step" : undefined}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors ${
                  isCurrent
                    ? "bg-(--ink) text-(--paper)"
                    : isCompleted
                    ? "text-(--ink) hover:bg-(--ink-soft) cursor-pointer"
                    : "text-(--body-dim) cursor-not-allowed"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-sans font-bold ${
                    isCurrent
                      ? "bg-(--coral) text-white"
                      : isCompleted
                      ? "bg-emerald-600 text-white"
                      : "bg-(--line) text-(--body)"
                  }`}
                >
                  {isCompleted ? <Check className="w-3 h-3" /> : step.id}
                </span>
                <span>{step.label}</span>
              </button>

              {idx < steps.length - 1 && (
                <div className="flex-1 h-[1px] bg-(--line) mx-3" />
              )}
            </li>
          );
        })}
      </ol>

      {/* Mobile Stepper */}
      <div className="md:hidden flex items-center justify-between bg-(--card) border border-(--line) rounded-lg px-4 py-3 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-(--coral) text-white flex items-center justify-center text-xs font-bold font-mono">
            {currentStep}
          </span>
          <span className="text-xs font-mono font-medium text-(--ink)">
            {steps.find((s) => s.id === currentStep)?.label || `Step ${currentStep}`}
          </span>
        </div>
        <span className="text-xs font-mono text-(--body-dim)">
          Step {currentStep} of {steps.length}
        </span>
      </div>
    </nav>
  );
}

