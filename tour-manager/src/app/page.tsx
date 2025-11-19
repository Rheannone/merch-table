// ⚠️ WARNING: This is the PUBLIC MARKETING PAGE shown at the root (/) route
// The actual POS application is at /app route in (app)/app/page.tsx
// DO NOT replace this file with app code - it will break the marketing page!

"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();

  // Beta interest form state
  const [betaEmail, setBetaEmail] = useState("");
  const [betaName, setBetaName] = useState("");
  const [betaSubmitting, setBetaSubmitting] = useState(false);
  const [betaMessage, setBetaMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // If user is already signed in, redirect to app
  useEffect(() => {
    if (user) {
      router.push("/app");
    }
  }, [user, router]);

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
    <div className="min-h-screen bg-theme">
      {/* Header/Nav */}
      <nav className="bg-theme-secondary border-b border-theme">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl sm:text-2xl font-bold text-theme ft-heading">
              Road Dog
            </h1>
            <Link
              href="/auth/signin"
              className="px-4 py-2 sm:px-6 sm:py-2 bg-primary text-on-primary font-bold rounded-lg hover:bg-primary/90 transition-all text-sm sm:text-base"
            >
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="text-5xl sm:text-6xl md:text-7xl font-black text-theme mb-6 leading-tight ft-heading">
            Point of Sale for
            <br />
            <span className="text-primary">Touring Bands</span>
          </h2>
          <p className="text-xl sm:text-2xl text-theme-secondary mb-8 leading-relaxed">
            Track merch sales offline. Own your data. Keep it simple.
            <br />
            Built for touring musicians, craft vendors, and market sellers.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/signin"
              className="px-8 py-4 bg-primary text-on-primary font-bold text-lg rounded-lg hover:bg-primary shadow-lg transition-all"
            >
              Get Started Free →
            </Link>
            <a
              href="#features"
              className="px-8 py-4 bg-secondary text-on-secondary font-bold text-lg rounded-lg hover:bg-secondary transition-all"
            >
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* What is Road Dog */}
      <section
        id="about"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16"
      >
        <div className="bg-theme-secondary border border-theme rounded-lg p-8 md:p-12">
          <h3 className="text-3xl font-bold text-theme mb-6 text-center">
            What is Road Dog?
          </h3>
          <div className="max-w-3xl mx-auto space-y-4 text-lg text-theme-secondary">
            <p>
              <strong className="text-theme">Road Dog</strong> is a
              point-of-sale (POS) system designed specifically for touring bands
              and vendors who need to track sales on the road.
            </p>
            <p>
              Unlike traditional POS systems that require constant internet
              connectivity and charge high fees, Road Dog works completely
              offline and stores your data in your own Google Sheets spreadsheet
              - giving you full ownership and control.
            </p>
            <p>
              Whether you're selling t-shirts at a basement show, vinyl at a
              craft market, or merch on tour, Road Dog helps you track
              inventory, accept multiple payment methods, and sync your sales
              data when you're back online.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16"
      >
        <h3 className="text-4xl font-bold text-theme mb-12 text-center ft-heading">
          Features
        </h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-theme-secondary border border-theme rounded-lg p-6">
            <div className="text-4xl mb-4">📱</div>
            <h4 className="text-xl font-bold text-theme mb-3">Works Offline</h4>
            <p className="text-theme-secondary">
              No internet? No problem. Track sales in basements, parking lots,
              and venues with spotty WiFi. Data syncs when you're back online.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-theme-secondary border border-theme rounded-lg p-6">
            <div className="text-4xl mb-4">📊</div>
            <h4 className="text-xl font-bold text-theme mb-3">
              Your Data, Your Sheets
            </h4>
            <p className="text-theme-secondary">
              All sales data is stored in your own Google Sheets. Export to
              Excel, share with your band, or analyze however you want. You own
              it.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-theme-secondary border border-theme rounded-lg p-6">
            <div className="text-4xl mb-4">💰</div>
            <h4 className="text-xl font-bold text-theme mb-3">
              Multiple Payment Methods
            </h4>
            <p className="text-theme-secondary">
              Track cash, Venmo, PayPal, card readers, and custom payment
              methods. Add QR codes for instant payments. Built-in tip jar.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-theme-secondary border border-theme rounded-lg p-6">
            <div className="text-4xl mb-4">👕</div>
            <h4 className="text-xl font-bold text-theme mb-3">
              Inventory Management
            </h4>
            <p className="text-theme-secondary">
              Add products with sizes, categories, and images. Track stock
              levels. See what's selling and what's not with built-in analytics.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-theme-secondary border border-theme rounded-lg p-6">
            <div className="text-4xl mb-4">📈</div>
            <h4 className="text-xl font-bold text-theme mb-3">
              Sales Analytics
            </h4>
            <p className="text-theme-secondary">
              View daily totals, best-selling items, payment method breakdowns,
              and sales trends. Make informed decisions about what to restock.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-theme-secondary border border-theme rounded-lg p-6">
            <div className="text-4xl mb-4">🎨</div>
            <h4 className="text-xl font-bold text-theme mb-3">
              Customizable Themes
            </h4>
            <p className="text-theme-secondary">
              Choose from multiple color themes or create your own. Dark mode
              optimized for low-light venues. Easy on the eyes during long
              shifts.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h3 className="text-4xl font-bold text-theme mb-12 text-center ft-heading">
          How It Works
        </h3>
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0 w-12 h-12 bg-primary text-on-primary rounded-full flex items-center justify-center text-xl font-bold">
              1
            </div>
            <div>
              <h4 className="text-xl font-bold text-theme mb-2">
                Sign In with Google
              </h4>
              <p className="text-theme-secondary">
                Use your Google account to sign in. We'll create a spreadsheet
                in your Google Drive to store your sales data. You stay in
                control.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-6">
            <div className="flex-shrink-0 w-12 h-12 bg-primary text-on-primary rounded-full flex items-center justify-center text-xl font-bold">
              2
            </div>
            <div>
              <h4 className="text-xl font-bold text-theme mb-2">
                Add Your Products
              </h4>
              <p className="text-theme-secondary">
                Set up your inventory - t-shirts, vinyl, CDs, stickers, whatever
                you're selling. Add sizes, prices, and images. Takes just a few
                minutes.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-6">
            <div className="flex-shrink-0 w-12 h-12 bg-primary text-on-primary rounded-full flex items-center justify-center text-xl font-bold">
              3
            </div>
            <div>
              <h4 className="text-xl font-bold text-theme mb-2">
                Start Selling
              </h4>
              <p className="text-theme-secondary">
                Use the POS interface to ring up sales. Works great on phones,
                tablets, or laptops. Accepts multiple payment methods. Tracks
                tips automatically.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-6">
            <div className="flex-shrink-0 w-12 h-12 bg-primary text-on-primary rounded-full flex items-center justify-center text-xl font-bold">
              4
            </div>
            <div>
              <h4 className="text-xl font-bold text-theme mb-2">
                Sync Your Data
              </h4>
              <p className="text-theme-secondary">
                When you're back online, all your sales automatically sync to
                your Google Sheet. View reports, export data, or share with your
                bandmates.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Google Data Usage */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-theme-secondary border border-theme rounded-lg p-8 md:p-12">
          <h3 className="text-3xl font-bold text-theme mb-6 text-center">
            Your Data & Privacy
          </h3>
          <div className="max-w-3xl mx-auto space-y-4 text-theme-secondary">
            <p>
              <strong className="text-theme">Road Dog</strong> uses Google OAuth
              to access your Google Sheets, allowing you to store and sync your
              sales data. Here's exactly what we do with your data:
            </p>
            <ul className="space-y-3 ml-6">
              <li className="flex items-start gap-3">
                <span className="text-success text-xl">✓</span>
                <span>
                  <strong>We create one spreadsheet</strong> in your Google
                  Drive to store your sales, products, and settings
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-success text-xl">✓</span>
                <span>
                  <strong>We only access that one spreadsheet</strong> - we
                  cannot see or access any other files in your Google Drive
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-success text-xl">✓</span>
                <span>
                  <strong>You own all your data</strong> - it's stored in your
                  Google account, not on our servers
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-success text-xl">✓</span>
                <span>
                  <strong>We don't sell or share your data</strong> with anyone
                  - your sales information stays private
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-success text-xl">✓</span>
                <span>
                  <strong>You can revoke access anytime</strong> through your
                  Google account settings
                </span>
              </li>
            </ul>
            <p className="pt-4">
              For complete details, please read our{" "}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* Beta Interest Form */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-theme-secondary border-2 border-primary rounded-lg p-8 md:p-12">
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold text-theme mb-3 ft-heading">
              🎸 Join the Beta
            </h3>
            <p className="text-theme-secondary text-lg">
              Want early access or have questions? Drop your email and
              we&apos;ll be in touch!
            </p>
          </div>

          <form onSubmit={handleBetaSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="beta-name"
                className="block text-sm font-medium text-theme mb-2"
              >
                Name (optional)
              </label>
              <input
                id="beta-name"
                type="text"
                value={betaName}
                onChange={(e) => setBetaName(e.target.value)}
                placeholder="Your name or band name"
                className="w-full px-4 py-3 bg-theme border border-theme rounded-lg text-theme focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={betaSubmitting}
              />
            </div>

            <div>
              <label
                htmlFor="beta-email"
                className="block text-sm font-medium text-theme mb-2"
              >
                Email <span className="text-error">*</span>
              </label>
              <input
                id="beta-email"
                type="email"
                value={betaEmail}
                onChange={(e) => setBetaEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full px-4 py-3 bg-theme border border-theme rounded-lg text-theme focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={betaSubmitting}
              />
            </div>

            {betaMessage && (
              <div
                className={`p-4 rounded-lg ${
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
              className="w-full px-6 py-4 bg-primary text-on-primary font-bold text-lg rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {betaSubmitting ? "Submitting..." : "Get Early Access"}
            </button>
          </form>

          <p className="text-center text-sm text-theme-muted mt-6">
            We respect your privacy. No spam, ever. Unsubscribe anytime.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-r from-secondary to-secondary/80 border border-secondary rounded-lg p-12 text-center">
          <h3 className="text-4xl font-bold text-on-secondary mb-6 ft-heading">
            Ready to Get Started?
          </h3>
          <p className="text-xl text-on-secondary mb-8 opacity-90">
            Join bands and vendors who are ditching expensive POS systems (or
            pen and paper) for something simpler.
          </p>
          <Link
            href="/auth/signin"
            className="inline-block px-8 py-4 bg-primary text-on-primary font-bold text-lg rounded-lg hover:bg-primary shadow-lg transition-all"
          >
            Start Using Road Dog Free →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-theme-secondary border-t border-theme mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">🎸</span>
                <h4 className="text-xl font-bold text-theme ft-heading">
                  Road Dog
                </h4>
              </div>
              <p className="text-theme-secondary">
                Road-ready POS for touring bands and vendors. Track sales
                offline, own your data.
              </p>
            </div>
            <div>
              <h5 className="font-bold text-theme mb-4">Product</h5>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#features"
                    className="text-theme-secondary hover:text-theme"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <Link
                    href="/auth/signin"
                    className="text-theme-secondary hover:text-theme"
                  >
                    Sign In
                  </Link>
                </li>
                <li>
                  <a
                    href="https://github.com/Rheannone/merch-table"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-theme-secondary hover:text-theme"
                  >
                    GitHub
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold text-theme mb-4">Legal</h5>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/privacy"
                    className="text-theme-secondary hover:text-theme"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="text-theme-secondary hover:text-theme"
                  >
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-theme mt-8 pt-8 text-center text-theme-secondary">
            <p>
              © {new Date().getFullYear()} Road Dog. Currently in beta • Built
              for touring musicians.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
