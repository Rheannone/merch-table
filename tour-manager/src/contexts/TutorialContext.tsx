"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { exitTutorialMode, isTutorialMode } from "@/lib/tutorialData";

// Tutorial step definition
export interface TutorialStep {
  id: string;
  dialogue: string;
  targetElement?: string; // CSS selector for highlighting (optional)
  completeOn: string; // Event name or 'click-anywhere' or 'timer:3000'
  ramonaImage?: string; // Optional custom Ramona image per step
}

// Tutorial steps for The Bones' show
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "welcome",
    dialogue: "Alright! Here's our merch setup for tonight. Let's make a sale!",
    completeOn: "click-anywhere",
    ramonaImage: "/RoadDog-can-i-show-you.png",
  },
  {
    id: "tap-product",
    dialogue: "Someone wants a Spiked Collar! Tap it to start the sale. *woof*",
    targetElement: '[data-product-name="Spiked Collar"]',
    completeOn: "product-selected",
    ramonaImage: "/RoadDog-look-back.png",
  },
  {
    id: "increase-quantity",
    dialogue: "They want 2 collars! Tap the + button to add another one.",
    targetElement: ".quantity-increase",
    completeOn: "quantity-increased",
    ramonaImage: "/RoadDog-wave-hello.png",
  },
  {
    id: "checkout",
    dialogue:
      "Perfect! Tap the $20 bill, then hit 'Review Order' to complete the sale!",
    targetElement: ".checkout-button",
    completeOn: "sale-completed",
    ramonaImage: "/RoadDog-in-merch-box.png",
  },
  {
    id: "success",
    dialogue:
      "Nice! You just sold $40 worth of merch! You're a natural! *arf arf*",
    completeOn: "timer:3000",
    ramonaImage: "/RoadDog-wave-hello.png",
  },
  {
    id: "complete",
    dialogue:
      "You're ready to run your own table! Want to keep working on The Bones' sheet, or start fresh?",
    completeOn: "user-choice",
    ramonaImage: "/RoadDog-can-i-show-you.png",
  },
];

interface TutorialContextType {
  tutorialActive: boolean;
  currentStepIndex: number;
  currentStep: TutorialStep | null;
  startTutorial: () => void;
  advanceStep: () => void;
  completeTutorial: (keepData: boolean) => void;
  skipTutorial: () => void;
  emitTutorialEvent: (eventName: string) => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(
  undefined
);

export function TutorialProvider({ children }: { children: ReactNode }) {
  // Auto-start tutorial if in tutorial mode
  const [tutorialActive, setTutorialActive] = useState(() => isTutorialMode());
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Check for tutorial mode on mount (in case localStorage wasn't ready during useState initialization)
  useEffect(() => {
    if (isTutorialMode() && !tutorialActive) {
      console.log("🎓 Tutorial mode detected - auto-starting tutorial");
      setTutorialActive(true);
      setCurrentStepIndex(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const currentStep =
    tutorialActive && currentStepIndex < TUTORIAL_STEPS.length
      ? TUTORIAL_STEPS[currentStepIndex]
      : null;

  const startTutorial = () => {
    setTutorialActive(true);
    setCurrentStepIndex(0);
  };

  const advanceStep = () => {
    if (currentStepIndex < TUTORIAL_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const completeTutorial = async (keepData: boolean) => {
    setTutorialActive(false);
    setCurrentStepIndex(0);

    if (keepData) {
      // Keep The Bones - create sheet automatically and sync
      console.log("✅ Tutorial completed - creating The Bones sheet");
      await exitTutorialMode(true);

      // Set flag to auto-create "The Bones Merch Table" sheet on reload
      localStorage.setItem("auto_create_tutorial_sheet", "true");

      // Reload to trigger sheet creation
      window.location.reload();
    } else {
      // Start fresh - clear everything and show onboarding
      console.log("🗑️ Tutorial completed - starting fresh");
      await exitTutorialMode(false);

      // Set flag to skip dialogue and go straight to choice screen
      localStorage.setItem("skip_onboarding_dialogue", "true");

      // Reload page to show onboarding with empty state
      window.location.reload();
    }
  };

  const skipTutorial = async () => {
    setTutorialActive(false);
    setCurrentStepIndex(0);
    await exitTutorialMode(false);
    // Reload to return to onboarding
    window.location.reload();
  };

  const emitTutorialEvent = (eventName: string) => {
    if (!currentStep) return;

    // Check if this event completes the current step
    if (currentStep.completeOn === eventName) {
      advanceStep();
    } else if (currentStep.completeOn === "click-anywhere") {
      advanceStep();
    } else if (currentStep.completeOn.startsWith("timer:")) {
      const delay = parseInt(currentStep.completeOn.split(":")[1]);
      setTimeout(advanceStep, delay);
    }
  };

  return (
    <TutorialContext.Provider
      value={{
        tutorialActive,
        currentStepIndex,
        currentStep,
        startTutorial,
        advanceStep,
        completeTutorial,
        skipTutorial,
        emitTutorialEvent,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error("useTutorial must be used within a TutorialProvider");
  }
  return context;
}
