"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { markOnboardingComplete } from "@/lib/onboarding";

interface OnboardingProps {
  // Where to land when the tour ends: customize first, or straight to selling
  onFinish: (destination: "settings" | "pos") => void;
}

interface Slide {
  emoji: string;
  title: string;
  body: string;
  hint?: string;
}

const SLIDES: Slide[] = [
  {
    emoji: "🐕",
    title: "Hey, I'm Ramona.",
    body: "Folks on the road call me Road Dog. I'll help you get your merch table ready before doors open.",
    hint: "This takes about a minute. You can skip any time.",
  },
  {
    emoji: "🧰",
    title: "One table, everything on it.",
    body: "Road Dog keeps your products, prices, cart, and sales in one place — built for busy merch tables, pop-ups, and shows.",
  },
  {
    emoji: "⚡",
    title: "Keep the line moving.",
    body: "Tap a product, build the cart, pick a payment method, done. Big buttons, no fiddly menus — made for a loud room.",
  },
  {
    emoji: "📦",
    title: "Know what's in the bins.",
    body: "Track what you brought, what sold, and what needs restocking. Sizes and stock counts update with every sale.",
  },
  {
    emoji: "📡",
    title: "Bad venue Wi-Fi? No panic.",
    body: "Road Dog saves every sale on this device and syncs when you're back online. No signal? Keep selling — reconcile later.",
  },
  {
    emoji: "🎨",
    title: "Make it yours.",
    body: "Set up your payment methods, currency, product categories, tip jar, and theme in Settings — your crew will find their way around fast.",
  },
  {
    emoji: "🌙",
    title: "Close out the night.",
    body: "When the show's over, run a close-out to count the drawer, reconcile cash, and keep each night's sales organized.",
  },
  {
    emoji: "🤘",
    title: "Ready for tonight's table?",
    body: "Set up your payments and merch now, or jump straight in and explore — I'll be around.",
  },
];

export default function Onboarding({ onFinish }: OnboardingProps) {
  const [slideIndex, setSlideIndex] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);

  const isLastSlide = slideIndex === SLIDES.length - 1;
  const slide = SLIDES[slideIndex];

  const finish = useCallback(
    (destination: "settings" | "pos") => {
      markOnboardingComplete();
      onFinish(destination);
    },
    [onFinish]
  );

  const goNext = useCallback(() => {
    setSlideIndex((i) => Math.min(i + 1, SLIDES.length - 1));
  }, []);

  const goBack = useCallback(() => {
    setSlideIndex((i) => Math.max(i - 1, 0));
  }, []);

  // Keyboard navigation + focus the dialog so arrow keys work immediately
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      if (!isLastSlide) goNext();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goBack();
    } else if (e.key === "Escape") {
      e.preventDefault();
      finish("pos");
    }
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome tour"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-[60] bg-theme flex flex-col focus:outline-none"
    >
      {/* Skip - present but not visually dominant */}
      <div className="flex justify-end p-4">
        <button
          onClick={() => finish("pos")}
          className="px-4 py-2 text-sm text-theme-muted hover:text-theme rounded-lg transition-colors touch-manipulation"
        >
          Skip tour
        </button>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-full max-w-md">
          {/* Mascot badge - emoji-based so it works without image assets */}
          <div
            aria-hidden="true"
            className="mx-auto mb-6 w-24 h-24 rounded-full bg-theme-secondary border-4 border-primary flex items-center justify-center text-5xl shadow-lg"
          >
            {slide.emoji}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-theme mb-4 ft-heading">
            {slide.title}
          </h1>
          <p className="text-base sm:text-lg text-theme-secondary leading-relaxed">
            {slide.body}
          </p>
          {slide.hint && (
            <p className="text-sm text-theme-muted mt-4">{slide.hint}</p>
          )}
        </div>
      </div>

      {/* Progress dots */}
      <div
        className="flex justify-center gap-2 pb-6"
        role="progressbar"
        aria-valuenow={slideIndex + 1}
        aria-valuemin={1}
        aria-valuemax={SLIDES.length}
        aria-label={`Step ${slideIndex + 1} of ${SLIDES.length}`}
      >
        {SLIDES.map((s, i) => (
          <span
            key={s.title}
            className={`h-2 rounded-full transition-all ${
              i === slideIndex ? "w-6 bg-primary" : "w-2 bg-theme-tertiary"
            }`}
          />
        ))}
      </div>

      {/* Navigation */}
      <div className="px-6 pb-8 w-full max-w-md mx-auto">
        {isLastSlide ? (
          <div className="space-y-3">
            <button
              onClick={() => finish("settings")}
              className="w-full bg-primary text-on-primary py-4 rounded-lg font-bold text-lg hover:bg-primary-hover active:scale-95 transition-all touch-manipulation shadow-lg"
            >
              Set up my table
            </button>
            <button
              onClick={() => finish("pos")}
              className="w-full bg-theme-tertiary text-theme-secondary py-3 rounded-lg font-medium hover:text-theme active:scale-95 transition-all touch-manipulation"
            >
              Skip to the app
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={goBack}
              disabled={slideIndex === 0}
              className="flex-1 bg-theme-tertiary text-theme-secondary py-4 rounded-lg font-medium hover:text-theme active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all touch-manipulation"
            >
              Back
            </button>
            <button
              onClick={goNext}
              className="flex-[2] bg-primary text-on-primary py-4 rounded-lg font-bold text-lg hover:bg-primary-hover active:scale-95 transition-all touch-manipulation shadow-lg"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
