"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import {
  DocumentMagnifyingGlassIcon,
  PlusCircleIcon,
} from "@heroicons/react/24/outline";
import { useTutorial } from "@/contexts/TutorialContext";
import { enableTutorialMode } from "@/lib/tutorialData";

interface OnboardingModalProps {
  onConnectExisting: () => void;
  onCreateNew: () => void;
  onClose?: () => void; // Optional callback to close the modal
  isCreating?: boolean;
}

// Dialogue pages for Ramona the Road Dog
const DIALOGUE_PAGES = [
  "Hey there! I'm Ramona the Road Dog — welcome to Merch Table! *woof*",
  "I'm your crew's new best friend — loyal, fast, and always down to tour.",
  "Can I show you around the van? I promise I won't chew any cables this time.",
  "This is Merch Table — your pop-up point-of-sale for bands, crews, and DIY artists.",
  "You own your data — it all lives safe and sound in your Google Drive. No middlemen here.",
  "You can even add your friends to help run the table — I'll keep everything in sync, no sweat.",
  "No signal? No problem. I still run shows in basements, parking lots, even fields at 2AM.",
  "Make it yours — colors, categories, even a little sparkle if that's your vibe.",
  "Alright, crew — The Bones go on in 10. Can you help me set up the table before soundcheck? *arf arf*",
];

export default function OnboardingModal({
  onConnectExisting,
  onCreateNew,
  onClose,
  isCreating = false,
}: OnboardingModalProps) {
  const { startTutorial } = useTutorial();

  // Check if we should skip dialogue and go straight to choice screen
  const shouldSkipDialogue =
    typeof window !== "undefined" &&
    localStorage.getItem("skip_onboarding_dialogue") === "true";

  const [step, setStep] = useState<1 | 2>(shouldSkipDialogue ? 2 : 1);
  const [dialoguePage, setDialoguePage] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showContinue, setShowContinue] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [dogBounce, setDogBounce] = useState(0); // Increment to trigger bounce
  const [showHearts, setShowHearts] = useState(false);
  const [showSkip, setShowSkip] = useState(false); // Delayed skip button visibility
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [ramonaBoundingOff, setRamonaBoundingOff] = useState(false); // Animation state

  // Clear the skip flag after reading it
  useEffect(() => {
    if (shouldSkipDialogue) {
      localStorage.removeItem("skip_onboarding_dialogue");
    }
  }, [shouldSkipDialogue]);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Big haptic buzz when Ramona appears!
  useEffect(() => {
    if (navigator.vibrate) {
      // Double buzz for emphasis: 200ms, pause 100ms, 200ms
      navigator.vibrate([200, 100, 200]);
    }
  }, []); // Only on mount

  // Typing animation effect
  useEffect(() => {
    if (step !== 1 || dialoguePage >= DIALOGUE_PAGES.length) return;

    const fullText = DIALOGUE_PAGES[dialoguePage];

    // If reduced motion, show text instantly
    if (prefersReducedMotion) {
      setDisplayedText(fullText);
      setShowContinue(true);
      return;
    }

    setDisplayedText("");
    setIsTyping(true);
    setShowContinue(false);
    setShowButton(false);
    setShowSkip(false); // Reset skip button on page change

    let currentIndex = 0;

    const typeNextChar = () => {
      if (currentIndex < fullText.length) {
        setDisplayedText(fullText.slice(0, currentIndex + 1));
        currentIndex++;

        // Determine delay based on character
        let delay = 40; // Base typing speed: 35-45ms per character (Nintendo-style)
        const char = fullText[currentIndex - 1];

        if (char === "." || char === "!" || char === "?") {
          delay = 400; // Longer pause at end of sentences
        } else if (char === ",") {
          delay = 200; // Brief pause at commas
        }

        typingTimeoutRef.current = setTimeout(typeNextChar, delay);
      } else {
        // Typing complete
        setIsTyping(false);
        setShowContinue(true);

        // If last page, show button after a brief delay, and skip button after 1 second
        if (dialoguePage === DIALOGUE_PAGES.length - 1) {
          setTimeout(() => setShowButton(true), 300);
          setTimeout(() => setShowSkip(true), 1000); // Skip fades in 1s after text finishes
        }
      }
    };

    typeNextChar();

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [dialoguePage, step, prefersReducedMotion]);

  // Auto-bounce and hearts on second dialogue page ONLY
  useEffect(() => {
    if (step === 1 && dialoguePage === 1) {
      // Trigger bounce
      setDogBounce((prev) => prev + 1);

      // Show hearts automatically for 3 seconds (300% longer than the 1s default)
      setShowHearts(true);
      const heartsTimer = setTimeout(() => setShowHearts(false), 3000);

      return () => clearTimeout(heartsTimer);
    } else {
      // Hide hearts on all other pages
      setShowHearts(false);
    }
  }, [dialoguePage, step]);

  // Handle click to skip typing or advance dialogue
  const handleDialogueClick = () => {
    if (isTyping) {
      // Skip typing animation - show full text immediately
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      setDisplayedText(DIALOGUE_PAGES[dialoguePage]);
      setIsTyping(false);
      setShowContinue(true);

      if (dialoguePage === DIALOGUE_PAGES.length - 1) {
        setTimeout(() => setShowButton(true), 300);
      }
    } else if (showContinue && dialoguePage < DIALOGUE_PAGES.length - 1) {
      // Advance to next page and trigger Ramona bounce
      setDialoguePage(dialoguePage + 1);
      setDogBounce((prev) => prev + 1);
    } else if (showContinue && dialoguePage === DIALOGUE_PAGES.length - 1) {
      // Last page - start tutorial!
      handleStartTutorial();
    }
  };

  const handleStartTutorial = () => {
    // Trigger Ramona bounding off animation
    setRamonaBoundingOff(true);

    // After animation, enable tutorial mode and reload to load tutorial data
    setTimeout(() => {
      enableTutorialMode();
      // Don't call startTutorial() here - it will be called after reload
      onClose?.(); // Close the onboarding modal

      // Reload page to load tutorial products
      window.location.reload();
    }, 500); // Match animation duration
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (step === 1 && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        handleDialogueClick();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, isTyping, showContinue, dialoguePage]);

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex flex-col justify-center items-center z-50 p-4 overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-20 w-96 h-96 bg-[#FF6A00] rounded-full opacity-5 blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-[#FF6A00] rounded-full opacity-5 blur-3xl animate-pulse-slow-delayed" />
      </div>

      {/* Main content container */}
      <div className="relative w-full max-w-[500px]">
        {/* Step 1: Welcome with Typing Animation */}
        <div
          className={`transition-all duration-500 ${
            step === 1
              ? "opacity-100 translate-x-0"
              : "opacity-0 -translate-x-full absolute inset-0 pointer-events-none"
          }`}
        >
          {/* Skip intro link - only shows on final dialogue page, delayed 1s after text */}
          {dialoguePage === DIALOGUE_PAGES.length - 1 && showSkip && (
            <div className="absolute -top-12 right-0 animate-fade-in">
              <button
                onClick={() => {}} // Placeholder - will be implemented later
                className="text-slate-500 hover:text-slate-400 text-sm font-medium transition-colors"
              >
                Skip to setup
              </button>
            </div>
          )}

          <div className="text-center space-y-6 animate-fade-up">
            {/* Woofs animation - appears on initial load only */}
            {step === 1 && dialoguePage === 0 && (
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 pointer-events-none animate-woofs">
                <div className="relative bg-slate-800/10 backdrop-blur-sm rounded-2xl px-4 py-2 rotate-[-8deg] border border-slate-700/20">
                  <p className="text-slate-600/40 text-lg font-medium italic">
                    *woof* *woof* *woof*
                  </p>
                </div>
              </div>
            )}

            {/* Ramona the Road Dog with Speech Bubble */}
            <div
              className="flex flex-col items-center gap-3 py-2 cursor-pointer relative"
              onClick={() => {
                // Show hearts on Ramona click
                setShowHearts(true);
                setTimeout(() => setShowHearts(false), 1000);
                handleDialogueClick();
              }}
              role="button"
              tabIndex={0}
              aria-label={showContinue ? "Continue dialogue" : "Skip typing"}
            >
              {/* Speech Bubble with typing animation - at the top */}
              <div className="relative max-w-sm animate-bubble-pop">
                {/* Translucent white glow behind bubble */}
                <div className="absolute inset-0 bg-white/25 rounded-xl blur-[10px]" />

                {/* Bubble shadow */}
                <div className="relative shadow-[0px_4px_8px_rgba(0,0,0,0.3)]">
                  {/* Bubble tail pointing down to Ramona */}
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[12px] border-t-[#FEFEFE]" />

                  {/* Bubble content */}
                  <div className="bg-gradient-to-br from-[#FEFEFE] to-[#F8F8F8] rounded-xl px-8 py-4 border border-slate-100 backdrop-blur-sm min-h-[80px] flex flex-col justify-between">
                    <p className="text-slate-900 font-medium text-base leading-[1.6]">
                      {/* Screen reader gets full text */}
                      <span className="sr-only">
                        {DIALOGUE_PAGES[dialoguePage]}
                      </span>
                      {/* Visual users see typing animation */}
                      <span aria-hidden="true">
                        {displayedText}
                        {isTyping && <span className="animate-pulse">|</span>}
                      </span>
                    </p>

                    {/* Continue indicator */}
                    {showContinue && (
                      <div className="group/indicator relative flex justify-end items-center gap-1.5 mt-2">
                        {/* Paw print decoration on "start tutorial" hover */}
                        {dialoguePage === DIALOGUE_PAGES.length - 1 && (
                          <span className="absolute -left-6 text-[#FF6A00]/0 group-hover/indicator:text-[#FF6A00]/40 transition-all duration-300 text-lg">
                            🐾
                          </span>
                        )}
                        <span className="text-slate-500 text-xs font-medium uppercase tracking-wide">
                          {dialoguePage === DIALOGUE_PAGES.length - 1
                            ? "start tutorial"
                            : "next"}
                        </span>
                        <span className="text-[#FF6A00] text-xl animate-arrow-slide group-hover/indicator:animate-wiggle inline-block">
                          {dialoguePage === DIALOGUE_PAGES.length - 1
                            ? "▼"
                            : "→"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Ramona the Road Dog */}
              <div
                key={dogBounce} // Key changes trigger re-mount and animation restart
                className={`relative group transition-all duration-500 ${
                  ramonaBoundingOff
                    ? "translate-x-[200%] opacity-0"
                    : showButton
                    ? "animate-bounce-excited"
                    : dogBounce > 0
                    ? "animate-bounce-excited"
                    : "animate-breathe"
                }`}
              >
                {/* Orange glow with subtle pulse */}
                <div className="absolute inset-0 bg-[#FF6A00] rounded-full blur-2xl animate-glow-pulse" />

                {/* Pawprint shadow for grounding */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-4 bg-black/20 rounded-full blur-sm" />

                <Image
                  src={
                    dialoguePage === 1
                      ? "/RoadDog-wave-hello.png"
                      : dialoguePage === 2
                      ? "/RoadDog-look-back.png"
                      : dialoguePage === 8
                      ? "/RoadDog-can-i-show-you.png"
                      : "/RoadDog-in-merch-box.png" // Using placeholder for all other pages
                  }
                  alt="Ramona the Road Dog mascot"
                  width={286}
                  height={286}
                  className="relative"
                  priority
                />

                {/* Floating hearts from Ramona */}
                {showHearts && (
                  <div className="absolute inset-0 pointer-events-none">
                    <span
                      className="absolute top-8 left-1/2 -translate-x-1/2 text-2xl animate-float-heart"
                      style={{ animationDelay: "0ms" }}
                    >
                      ❤️
                    </span>
                    <span
                      className="absolute top-12 left-1/4 text-xl animate-float-heart"
                      style={{ animationDelay: "100ms" }}
                    >
                      ❤️
                    </span>
                    <span
                      className="absolute top-12 right-1/4 text-xl animate-float-heart"
                      style={{ animationDelay: "200ms" }}
                    >
                      ❤️
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Choice */}
        <div
          className={`transition-all duration-500 ${
            step === 2
              ? "opacity-100 translate-x-0"
              : "opacity-0 translate-x-full absolute inset-0 pointer-events-none"
          }`}
        >
          <div className="text-center space-y-8 animate-fade-up">
            {/* Headline */}
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 font-display tracking-wide">
                MERCH TABLE
              </h2>
              <p className="text-base text-slate-400 max-w-md mx-auto leading-relaxed">
                uses your own Google Drive to store your data on a Google Sheet.
                Do you want to
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-4">
              {/* Create New */}
              <button
                onClick={onCreateNew}
                disabled={isCreating}
                aria-label="Create a new Google Sheet"
                className="group w-full bg-[#1a1a1a] hover:bg-[#FF6A00] border border-[#2a2a2a] hover:border-[#FF6A00] text-white py-5 px-6 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-[#FF6A00]/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#1a1a1a]"
              >
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-[#FF6A00] group-hover:bg-white rounded-lg flex items-center justify-center transition-colors">
                    <PlusCircleIcon className="w-6 h-6 text-white group-hover:text-[#FF6A00] transition-colors" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-bold text-lg tracking-wide">
                      CREATE A NEW GOOGLE SHEET
                    </div>
                    <div className="text-sm text-slate-400 group-hover:text-white/80 transition-colors">
                      Start fresh with a new spreadsheet
                    </div>
                  </div>
                </div>
              </button>

              {/* Connect Existing */}
              <button
                onClick={onConnectExisting}
                disabled={isCreating}
                aria-label="Connect an existing Google Sheet"
                className="group w-full bg-[#1a1a1a] hover:bg-[#FF6A00] border border-[#2a2a2a] hover:border-[#FF6A00] text-white py-5 px-6 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-[#FF6A00]/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#1a1a1a]"
              >
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-[#FF6A00] group-hover:bg-white rounded-lg flex items-center justify-center transition-colors">
                    <DocumentMagnifyingGlassIcon className="w-6 h-6 text-white group-hover:text-[#FF6A00] transition-colors" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-bold text-lg tracking-wide">
                      CONNECT AN EXISTING GOOGLE SHEET
                    </div>
                    <div className="text-sm text-slate-400 group-hover:text-white/80 transition-colors">
                      Pick up where you left off
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {/* Loading state */}
            {isCreating && (
              <div className="pt-4">
                <div className="inline-flex items-center gap-3 text-[#FF6A00]">
                  <div className="w-5 h-5 border-2 border-[#FF6A00] border-t-transparent rounded-full animate-spin" />
                  <span className="font-medium">Creating your sheet...</span>
                </div>
              </div>
            )}

            {/* Footer note */}
            <p className="text-xs text-slate-500 pt-4">
              Your data is stored in your own Google Drive. You have full
              control.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
