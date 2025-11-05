"use client";

import { useState, useEffect } from "react";
import { EmailSignupSettings } from "@/types";
import { XMarkIcon, EnvelopeIcon } from "@heroicons/react/24/outline";

interface EmailSignupModalProps {
  onClose: () => void;
  onSubmit: (data: { email: string; name?: string; phone?: string }) => void;
  settings: EmailSignupSettings;
}

export default function EmailSignupModal({
  onClose,
  onSubmit,
  settings,
}: EmailSignupModalProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(settings.autoDismissSeconds || 10);
  const [hasInteracted, setHasInteracted] = useState(false);

  // Auto-dismiss countdown (only if user hasn't interacted)
  useEffect(() => {
    if (hasInteracted) return; // Stop countdown if user is typing
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onClose, hasInteracted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) return;

    setIsSubmitting(true);

    await onSubmit({
      email: email.trim().toLowerCase(),
      name: settings.collectName && name.trim() ? name.trim() : undefined,
      phone: settings.collectPhone && phone.trim() ? phone.trim() : undefined,
    });

    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-theme-secondary border-2 border-primary rounded-lg w-full max-w-md shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="bg-primary p-4 rounded-t-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <EnvelopeIcon className="w-6 h-6 text-on-primary" />
            <h2 className="text-xl font-bold text-on-primary">
              {settings.promptMessage || "Join our mailing list!"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-on-primary hover:bg-black/10 rounded-full p-1 transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-theme-secondary text-sm">
            {settings.promptMessage || "Want to join our email list?"}
          </p>

          {/* Email Input (Required) */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-semibold text-theme mb-2"
            >
              Email Address *
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setHasInteracted(true);
              }}
              placeholder="your@email.com"
              required
              className="w-full px-4 py-3 bg-theme-tertiary border border-theme rounded-lg text-theme placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Name Input (Optional) */}
          {settings.collectName && (
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-semibold text-theme mb-2"
              >
                Name (optional)
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setHasInteracted(true);
                }}
                placeholder="Your name"
                className="w-full px-4 py-3 bg-theme-tertiary border border-theme rounded-lg text-theme placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          )}

          {/* Phone Input (Optional) */}
          {settings.collectPhone && (
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-semibold text-theme mb-2"
              >
                Phone (optional)
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setHasInteracted(true);
                }}
                placeholder="(555) 123-4567"
                className="w-full px-4 py-3 bg-theme-tertiary border border-theme rounded-lg text-theme placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-theme-tertiary hover:bg-theme border border-theme text-theme font-semibold rounded-lg transition-all active:scale-95"
            >
              {hasInteracted ? "Skip" : `Skip (${countdown}s)`}
            </button>
            <button
              type="submit"
              disabled={!email.trim() || isSubmitting}
              className="flex-1 px-6 py-3 bg-primary hover:bg-primary text-on-primary font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-md"
            >
              {isSubmitting ? "Saving..." : "Sign Me Up!"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
