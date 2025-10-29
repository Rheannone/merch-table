"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  const handleBetaInterest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage("");

    try {
      const response = await fetch("/api/beta-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitMessage("Thanks! We'll be in touch soon. 🎉");
        setEmail("");
      } else {
        setSubmitMessage(
          data.error || "Something went wrong. Please try again."
        );
      }
    } catch (error) {
      setSubmitMessage("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-theme flex items-center justify-center p-4">
      <div className="max-w-3xl w-full space-y-8 py-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-theme mb-2 leading-tight">
            🎸 Merch Table
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-primary font-bold">
            Point of Sale for Pop-Up Commerce
          </p>
          <p className="text-base sm:text-lg text-theme-secondary max-w-2xl mx-auto leading-relaxed">
            Built for touring bands, craft vendors, and market sellers.
            <br />
            Track sales offline. Own your data. Keep it simple.
          </p>
        </div>

        {/* Why This Exists */}
        <div className="bg-theme-secondary border border-theme rounded-lg p-6">
          <h2 className="text-xl font-bold text-theme mb-3 text-center">
            Why Merch Table Exists
          </h2>
          <p className="text-sm text-theme-muted leading-relaxed mb-4">
            I watched friends lose money at shows because tracking sales with
            paper and Venmo screenshots is chaos. Square costs too much and
            doesn&rsquo;t work in basements. Big tech wants to own your customer
            data.
          </p>
          <p className="text-sm text-theme-secondary leading-relaxed font-medium">
            So I built something different: a POS that works offline, stores
            everything in <span className="text-primary">your</span> Google
            Sheet, and costs less than one t-shirt sale per month.
          </p>
        </div>

        {/* Values Statement */}
        <div className="bg-theme-tertiary border border-theme rounded-lg p-6 text-center">
          <p className="text-sm text-theme-secondary leading-relaxed">
            <strong className="text-theme">
              Built by an independent developer who believes:
            </strong>
            <br />
            You should own your data. Software should serve you, not exploit
            you.
            <br />
            The best tools are simple, honest, and built for real people doing
            real work.
          </p>
        </div>

        {/* Beta Tester Sign In - Moved Up */}
        <div className="bg-theme-secondary p-8 rounded-lg border-2 border-primary shadow-lg">
          <h2 className="text-2xl font-bold text-theme mb-2 text-center">
            Beta Tester Sign In
          </h2>
          <p className="text-xs text-center text-theme-muted mb-6">
            Your data stays in your Google Drive. No tracking, no BS.
          </p>

          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-800 font-semibold py-4 px-6 rounded-lg transition-all active:scale-95 shadow-lg mb-6 border border-gray-300"
          >
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
            Sign in with Google
          </button>

          {/* Beta Interest Form */}
          <div className="border-t border-theme pt-6">
            <h3 className="text-lg font-bold text-theme text-center mb-4">
              Want Early Access?
            </h3>
            <form onSubmit={handleBetaInterest} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full px-4 py-3 bg-theme-tertiary border border-theme rounded-lg text-theme placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                type="submit"
                disabled={isSubmitting || !email}
                className="w-full px-4 py-3 bg-primary hover:bg-primary-hover text-white font-semibold rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Submitting..." : "Notify Me"}
              </button>
              {submitMessage && (
                <p
                  className={`text-sm text-center font-medium ${
                    submitMessage.includes("Thanks")
                      ? "text-success"
                      : "text-error"
                  }`}
                >
                  {submitMessage}
                </p>
              )}
            </form>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-theme-secondary border border-theme rounded-lg p-6">
            <div className="text-3xl mb-3 text-center">�</div>
            <h3 className="font-bold text-theme mb-2 text-center">
              Your Data, Your Sheet
            </h3>
            <p className="text-sm text-theme-muted leading-relaxed">
              Everything lives in{" "}
              <span className="text-primary font-semibold">
                your own Google Drive
              </span>
              . Export to Excel anytime. No lock-in. No proprietary formats.
            </p>
          </div>

          <div className="bg-theme-secondary border border-theme rounded-lg p-6">
            <div className="text-3xl mb-3 text-center">📱</div>
            <h3 className="font-bold text-theme mb-2 text-center">
              Works Offline
            </h3>
            <p className="text-sm text-theme-muted leading-relaxed">
              Basement shows. Remote markets. Zero wifi. No problem. Syncs
              automatically when you&rsquo;re back online.
            </p>
          </div>

          <div className="bg-theme-secondary border border-theme rounded-lg p-6">
            <div className="text-3xl mb-3 text-center">💰</div>
            <h3 className="font-bold text-theme mb-2 text-center">
              Tips & Discounts
            </h3>
            <p className="text-sm text-theme-muted leading-relaxed">
              Track tips separately. Give discounts to your crew. Accept cash,
              Venmo, card - whatever your customers use.
            </p>
          </div>
        </div>

        {/* What You Get */}
        <div className="bg-theme-secondary border border-theme rounded-lg p-6">
          <h2 className="text-xl font-bold text-theme mb-4 text-center">
            What You Get
          </h2>
          <div className="space-y-3 max-w-2xl mx-auto">
            <div className="flex items-start gap-3">
              <span className="text-success text-lg flex-shrink-0 mt-0.5">
                ✓
              </span>
              <p className="text-sm text-theme-secondary">
                <strong className="text-theme">Mobile-first POS</strong> - Add
                products, build cart, process sales in seconds
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-success text-lg flex-shrink-0 mt-0.5">
                ✓
              </span>
              <p className="text-sm text-theme-secondary">
                <strong className="text-theme">
                  Automatic Google Sheets sync
                </strong>{" "}
                - Every sale saved with timestamp, payment method, items sold
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-success text-lg flex-shrink-0 mt-0.5">
                ✓
              </span>
              <p className="text-sm text-theme-secondary">
                <strong className="text-theme">Product management</strong> -
                Track inventory, sizes, categories, pricing
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-success text-lg flex-shrink-0 mt-0.5">
                ✓
              </span>
              <p className="text-sm text-theme-secondary">
                <strong className="text-theme">Sales insights</strong> - Revenue
                by date, payment breakdown, top sellers, daily trends
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-success text-lg flex-shrink-0 mt-0.5">
                ✓
              </span>
              <p className="text-sm text-theme-secondary">
                <strong className="text-theme">QR code payments</strong> - Show
                custom QR codes for Venmo, PayPal, CashApp
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-success text-lg flex-shrink-0 mt-0.5">
                ✓
              </span>
              <p className="text-sm text-theme-secondary">
                <strong className="text-theme">No transaction fees</strong> - We
                don&rsquo;t process payments, so we don&rsquo;t take a cut
              </p>
            </div>
          </div>
        </div>

        {/* Social Proof */}
        <div className="bg-theme-secondary border-2 border-primary rounded-lg p-4 text-center">
          <p className="text-sm text-theme-muted">
            <span className="text-primary font-semibold">
              &ldquo;We&rsquo;re on day 3 of tour using this every night. Game
              changer.&rdquo;
            </span>
            <br />
            <span className="text-xs opacity-75">
              — Band currently on the road
            </span>
          </p>
        </div>

        {/* Perfect For */}
        <div className="bg-theme-tertiary border border-theme rounded-lg p-6">
          <h2 className="text-lg font-bold text-theme mb-3 text-center">
            Perfect For
          </h2>
          <div className="flex flex-wrap justify-center gap-2 text-sm">
            <span className="bg-theme-secondary text-theme px-3 py-1 rounded-full border border-theme">
              🎸 Touring Bands
            </span>
            <span className="bg-theme-secondary text-theme px-3 py-1 rounded-full border border-theme">
              🎨 Craft Fair Vendors
            </span>
            <span className="bg-theme-secondary text-theme px-3 py-1 rounded-full border border-theme">
              🌽 Farmers Market Sellers
            </span>
            <span className="bg-theme-secondary text-theme px-3 py-1 rounded-full border border-theme">
              🪶 Pow Wow Vendors
            </span>
            <span className="bg-theme-secondary text-theme px-3 py-1 rounded-full border border-theme">
              🎪 Pop-Up Shops
            </span>
            <span className="bg-theme-secondary text-theme px-3 py-1 rounded-full border border-theme">
              📚 Book Fairs
            </span>
            <span className="bg-theme-secondary text-theme px-3 py-1 rounded-full border border-theme">
              🏛️ Convention Vendors
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-theme-muted space-y-2">
          <p className="font-medium">Made with &lt;3 in Philadelphia</p>
          <p className="text-xs opacity-75">
            Currently in beta • Serving touring bands and market vendors
          </p>
        </div>
      </div>
    </div>
  );
}
