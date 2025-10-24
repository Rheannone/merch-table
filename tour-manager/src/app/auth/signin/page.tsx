"use client";

import { signIn } from "next-auth/react";

export default function SignIn() {
  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl md:text-6xl font-black text-white mb-2">
            🎸 Merch Table
          </h1>
          <p className="text-xl md:text-2xl text-red-400 font-bold">
            Point of Sale for DIY Tours
          </p>
          <p className="text-zinc-400 text-lg max-w-xl mx-auto">
            No Amazon. No Meta. No corporate BS.
            <br />
            Just you, your band, and your data.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 text-center">
            <div className="text-3xl mb-2">🔒</div>
            <h3 className="font-bold text-white mb-2">Your Data</h3>
            <p className="text-sm text-zinc-400">
              All sales stored in <span className="text-red-400">your own Google Drive</span>. Complete custody and control.
            </p>
          </div>
          
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 text-center">
            <div className="text-3xl mb-2">📱</div>
            <h3 className="font-bold text-white mb-2">Offline First</h3>
            <p className="text-sm text-zinc-400">
              Works without internet. Syncs when you can. Perfect for basements and dive bars.
            </p>
          </div>
          
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 text-center">
            <div className="text-3xl mb-2">🤝</div>
            <h3 className="font-bold text-white mb-2">Hook Ups</h3>
            <p className="text-sm text-zinc-400">
              Track discounts and freebies for your crew. Keep it real.
            </p>
          </div>
        </div>

        {/* Sign In Box */}
        <div className="bg-zinc-800 p-8 rounded-lg border border-zinc-700">
          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-100 text-zinc-900 font-semibold py-4 px-6 rounded-lg transition-all active:scale-95 shadow-lg mb-4"
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
          
          <div className="text-center text-sm text-zinc-500 space-y-2">
            <p>
              We only use Google for authentication and storing <span className="text-zinc-400">your</span> data in <span className="text-zinc-400">your</span> Drive.
            </p>
            <p className="text-xs">
              No tracking. No selling your info. No algorithmic manipulation.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-zinc-500">
          <p>
            Made with ❤️ in <span className="text-red-400 font-semibold">Philadelphia</span>
          </p>
          <p className="text-xs mt-1">
            The city of DIY music, basement shows, and keeping it real since forever
          </p>
        </div>
      </div>
    </div>
  );
}
