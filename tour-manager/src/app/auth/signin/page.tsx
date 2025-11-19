"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function SignIn() {
  const { signInWithGoogle, user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check for error from URL params
  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      setErrorMessage(decodeURIComponent(error));
    }
  }, [searchParams]);

  // Redirect if already authenticated
  useEffect(() => {
    if (user && !loading) {
      router.push("/app");
    }
  }, [user, loading, router]);

  const handleGoogleSignIn = async () => {
    if (isSigningIn) return;

    setIsSigningIn(true);
    setErrorMessage(null);

    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Sign-in error:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Sign-in failed"
      );
      setIsSigningIn(false);
    }
  };

  // Beta interest form state
  const [betaEmail, setBetaEmail] = useState("");
  const [betaName, setBetaName] = useState("");
  const [betaSubmitting, setBetaSubmitting] = useState(false);
  const [betaMessage, setBetaMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // Handle beta interest form submission
  const handleBetaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBetaSubmitting(true);
    setBetaMessage(null);

    try {
      const response = await fetch("/api/beta-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: betaEmail, name: betaName }),
      });

      const data = await response.json();

      if (response.ok) {
        setBetaMessage({
          text: data.message || "Thanks! We'll be in touch soon.",
          type: "success",
        });
        setBetaEmail("");
        setBetaName("");
      } else {
        setBetaMessage({
          text: data.error || "Something went wrong. Please try again.",
          type: "error",
        });
      }
    } catch (error) {
      setBetaMessage({
        text: "Failed to submit. Please try again.",
        type: "error",
      });
    } finally {
      setBetaSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-theme flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Back to Home Link */}
        <Link
          href="/"
          className="text-theme-secondary hover:text-theme transition-colors text-sm flex items-center gap-2"
        >
          ← Back to Home
        </Link>

        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl sm:text-5xl font-black text-theme ft-heading">
            Road Dog
          </h1>
          <p className="text-lg text-primary font-bold">Beta Access Required</p>
        </div>

        {/* Beta Access Notice */}
        <div className="bg-primary/10 border-2 border-primary rounded-lg p-6">
          <div className="text-center space-y-3">
            <div className="text-3xl">🔐</div>
            <h2 className="text-xl font-bold text-theme">
              Currently in Private Beta
            </h2>
            <p className="text-sm text-theme-secondary">
              Road Dog is currently in beta testing. To sign in, you must first{" "}
              <strong>request beta access</strong> and be approved by our team.
            </p>
            <p className="text-sm text-theme-secondary">
              If you&apos;ve already been approved, sign in below!
            </p>
          </div>
        </div>

        {/* Sign In Box */}
        <div className="bg-theme-secondary p-8 rounded-lg border border-theme shadow-lg">
          <p className="text-sm text-center text-theme-secondary mb-6">
            <strong>Approved beta users:</strong> Sign in with Google to create
            your sales tracking spreadsheet.
            <br />
            <span className="text-theme-muted text-xs">
              Your data stays in your Google Drive.
            </span>
          </p>

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {errorMessage}
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={isSigningIn || loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-800 font-semibold py-4 px-6 rounded-lg transition-all active:scale-95 shadow-lg mb-6 border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSigningIn ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-800"></div>
            ) : (
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            {isSigningIn ? "Signing in..." : "Sign in with Google"}
          </button>

          <p className="text-xs text-center text-theme-muted mt-4">
            Free during beta • No credit card required
          </p>
        </div>

        {/* Quick Feature List */}
        <div className="bg-theme-secondary border border-theme rounded-lg p-6">
          <h3 className="text-lg font-bold text-theme mb-4 text-center">
            What you&apos;ll get:
          </h3>
          <div className="space-y-2 text-sm text-theme-secondary">
            <div className="flex items-center gap-2">
              <span className="text-success">✓</span>
              <span>Offline POS that syncs to your Google Sheets</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-success">✓</span>
              <span>Track cash, Venmo, cards, and tips</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-success">✓</span>
              <span>Product inventory & sales analytics</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-success">✓</span>
              <span>Your data, your control - export anytime</span>
            </div>
          </div>
        </div>

        {/* Beta Interest Form */}
        <div className="bg-theme-secondary border-2 border-primary rounded-lg p-6">
          <h3 className="text-lg font-bold text-theme mb-3 text-center">
            🎸 Request Beta Access
          </h3>
          <p className="text-sm text-center text-theme-muted mb-4">
            Don&apos;t have access yet? Drop your email and we&apos;ll reach out
            with next steps!
          </p>

          <form onSubmit={handleBetaSubmit} className="space-y-3">
            <input
              type="text"
              value={betaName}
              onChange={(e) => setBetaName(e.target.value)}
              placeholder="Name or band name (optional)"
              className="w-full px-3 py-2 bg-theme border border-theme rounded text-theme text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={betaSubmitting}
            />

            <input
              type="email"
              value={betaEmail}
              onChange={(e) => setBetaEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full px-3 py-2 bg-theme border border-theme rounded text-theme text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={betaSubmitting}
            />

            {betaMessage && (
              <div
                className={`p-3 rounded text-sm ${
                  betaMessage.type === "success"
                    ? "bg-success/20 border border-success text-success"
                    : "bg-error/20 border border-error text-error"
                }`}
              >
                {betaMessage.text}
              </div>
            )}

            <button
              type="submit"
              disabled={betaSubmitting}
              className="w-full px-4 py-2 bg-primary text-on-primary font-semibold rounded hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {betaSubmitting ? "Requesting Access..." : "Request Beta Access"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-theme-muted space-y-2">
          <p>
            Want to learn more?{" "}
            <Link href="/" className="text-primary hover:underline">
              Check out the homepage
            </Link>
          </p>
          <p className="text-xs opacity-75">
            Currently in private beta • Made for touring bands and vendors
          </p>
        </div>
      </div>
    </div>
  );
}
