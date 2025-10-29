"use client";

import { useState } from "react";
import { ChatBubbleLeftIcon, XMarkIcon } from "@heroicons/react/24/outline";

export default function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<"feature" | "bug">(
    "feature"
  );
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus("idle");

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: feedbackType,
          message,
        }),
      });

      if (response.ok) {
        setSubmitStatus("success");
        setMessage("");
        setTimeout(() => {
          setIsOpen(false);
          setSubmitStatus("idle");
        }, 2000);
      } else {
        setSubmitStatus("error");
      }
    } catch {
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 z-40 bg-primary hover:bg-primary-hover text-white p-3 sm:p-4 rounded-full shadow-lg transition-all active:scale-95 flex items-center gap-2"
          title="Send Feedback"
        >
          <ChatBubbleLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          <span className="hidden sm:inline text-sm font-medium">
            Feedback
          </span>
        </button>
      )}

      {/* Feedback Modal */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 bg-theme-secondary border-2 border-theme rounded-lg shadow-2xl w-[calc(100vw-2rem)] sm:w-96 max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="bg-theme-tertiary border-b border-theme p-4 flex items-center justify-between">
            <h3 className="font-bold text-theme flex items-center gap-2">
              <ChatBubbleLeftIcon className="w-5 h-5" />
              Send Feedback
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-theme-muted hover:text-theme transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Type Selection */}
            <div>
              <label className="block text-sm font-medium text-theme mb-2">
                What would you like to share?
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFeedbackType("feature")}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    feedbackType === "feature"
                      ? "bg-primary text-white"
                      : "bg-theme-tertiary text-theme-secondary hover:bg-theme border border-theme"
                  }`}
                >
                  💡 Feature Request
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackType("bug")}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    feedbackType === "bug"
                      ? "bg-primary text-white"
                      : "bg-theme-tertiary text-theme-secondary hover:bg-theme border border-theme"
                  }`}
                >
                  🐛 Bug Report
                </button>
              </div>
            </div>

            {/* Message Input */}
            <div>
              <label
                htmlFor="feedback-message"
                className="block text-sm font-medium text-theme mb-2"
              >
                {feedbackType === "feature"
                  ? "What feature would you like to see?"
                  : "What's not working?"}
              </label>
              <textarea
                id="feedback-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={4}
                className="w-full px-3 py-2 bg-theme-tertiary border border-theme rounded-lg text-theme placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                placeholder={
                  feedbackType === "feature"
                    ? "I'd love to see..."
                    : "I noticed that..."
                }
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !message.trim()}
              className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Sending..." : "Send Feedback"}
            </button>

            {/* Status Messages */}
            {submitStatus === "success" && (
              <p className="text-sm text-success text-center font-medium">
                ✓ Thanks! We&apos;ll review your feedback soon.
              </p>
            )}
            {submitStatus === "error" && (
              <p className="text-sm text-error text-center">
                Failed to send. Please try again.
              </p>
            )}
          </form>

          {/* Footer Note */}
          <div className="bg-theme-tertiary border-t border-theme p-3 text-xs text-theme-muted text-center">
            Your feedback helps make Merch Table better!
          </div>
        </div>
      )}
    </>
  );
}
