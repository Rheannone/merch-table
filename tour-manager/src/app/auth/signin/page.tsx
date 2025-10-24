"use client";

import { signIn } from "next-auth/react";

export default function SignIn() {
  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 bg-zinc-800 p-8 rounded-lg border border-zinc-700">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">
            🎸 Merch Table
          </h1>
          <p className="text-zinc-400">
            Sign in with Google to manage your merch sales
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-100 text-zinc-900 font-semibold py-4 px-6 rounded-lg transition-all active:scale-95 shadow-lg"
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
        </div>

        <div className="text-center text-sm text-zinc-500 space-y-2">
          <p>
            By signing in, you grant access to Google Sheets to save your
            product inventory and sales data.
          </p>
          <p className="text-xs">
            Your data is stored in your own Google Drive and never shared.
          </p>
        </div>
      </div>
    </div>
  );
}
