"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useTutorial } from "@/contexts/TutorialContext";

export default function RamonaDrawer() {
  const {
    tutorialActive,
    currentStep,
    advanceStep,
    completeTutorial,
    skipTutorial,
    emitTutorialEvent,
  } = useTutorial();

  // Show choices when on final step
  const showChoices = currentStep?.id === "complete";

  // Auto-advance on timer steps
  useEffect(() => {
    if (!currentStep) return;

    if (currentStep.completeOn.startsWith("timer:")) {
      const delay = parseInt(currentStep.completeOn.split(":")[1]);
      const timer = setTimeout(() => {
        advanceStep();
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [currentStep, advanceStep]);

  // Handle click-anywhere steps
  const handleDrawerClick = () => {
    if (currentStep?.completeOn === "click-anywhere") {
      emitTutorialEvent("click-anywhere");
    }
  };

  if (!tutorialActive || !currentStep) return null;

  // Position at top for checkout and quantity increase steps
  const isTopPosition =
    currentStep.id === "checkout" || currentStep.id === "increase-quantity";
  // Center position for final complete step
  const isCenterPosition = currentStep.id === "complete";

  return (
    <>
      {/* Ramona Drawer */}
      <div
        className={`fixed left-0 right-0 md:left-auto md:w-[420px] z-40 animate-slide-up ${
          isCenterPosition
            ? "top-1/2 -translate-y-1/2 md:left-1/2 md:-translate-x-1/2 md:w-[500px]"
            : isTopPosition
            ? "top-20 md:top-4 md:left-4"
            : "bottom-0 md:bottom-4 md:right-4"
        }`}
        onClick={handleDrawerClick}
      >
        <div className="md:rounded-2xl relative">
          {/* Skip Tutorial Button */}
          {currentStep.id !== "complete" && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                skipTutorial();
              }}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 text-xs font-medium transition-colors z-10"
            >
              Skip Tutorial
            </button>
          )}

          <div className="p-6 flex flex-col gap-4 relative">
            {/* Ramona Image - position changes based on drawer location */}
            <div
              className={`absolute shrink-0 z-10 ${
                isTopPosition
                  ? "bottom-[-90px] left-4" // Moved down 90px below bubble when drawer is at top
                  : "-top-12 right-4" // Top-right when drawer is at bottom
              }`}
            >
              {/* Orange glow */}
              <div className="absolute inset-0 bg-[#FF6A00] rounded-full blur-2xl opacity-20 animate-glow-pulse" />

              {/* Ramona */}
              <Image
                src={currentStep.ramonaImage || "/RoadDog-in-merch-box.png"}
                alt="Ramona the Road Dog"
                width={120}
                height={120}
                className="relative"
                priority
              />
            </div>

            {/* Speech Bubble */}
            <div
              className={`flex-1 ${
                isTopPosition ? "pb-8" : "pt-8" // Padding bottom when Ramona is at bottom, padding top when at top
              }`}
            >
              <div className="bg-slate-100 rounded-xl px-5 py-4 shadow-lg relative">
                <p className="text-slate-900 font-medium text-base leading-relaxed">
                  {currentStep.dialogue}
                </p>

                {/* Action indicator for click-anywhere steps */}
                {currentStep.completeOn === "click-anywhere" && (
                  <div className="flex justify-end items-center gap-1.5 mt-2">
                    <span className="text-slate-500 text-xs font-medium uppercase tracking-wide">
                      tap to continue
                    </span>
                    <span className="text-[#FF6A00] text-xl animate-bounce-slow">
                      ▶
                    </span>
                  </div>
                )}
              </div>

              {/* Choice buttons on final step */}
              {showChoices && currentStep.id === "complete" && (
                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await completeTutorial(true);
                    }}
                    className="flex-1 bg-gradient-to-b from-[#FF7A1A] to-[#E65C00] hover:from-[#FFA14D] hover:to-[#FF7A1A] text-white font-bold py-3 px-4 rounded-lg transition-all duration-150 shadow-lg"
                  >
                    Keep The Bones
                  </button>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await completeTutorial(false);
                    }}
                    className="flex-1 bg-gradient-to-b from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white font-bold py-3 px-4 rounded-lg transition-all duration-150 shadow-lg"
                  >
                    Start Fresh
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
