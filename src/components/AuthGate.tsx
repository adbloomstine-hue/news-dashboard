"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Eye, EyeOff, Lock, AlertCircle } from "lucide-react";

// SHA-256 hash of "Gaming123!" — used for client-side comparison.
// The plain-text password is never stored; we hash the user's input and compare.
const PASSWORD_HASH =
  "2bc87f0f815b0b34a70b7d97941a9d3516f83a46d1666611fab0ecbf41070c92";

const AUTH_KEY = "cga-dashboard-auth";

/** Routes that should NOT be gated (admin area, admin login). */
const PUBLIC_PATHS = ["/login", "/admin"];

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [authed, setAuthed] = useState<boolean | null>(null); // null = loading
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Skip gate for admin and login routes
  const isExempt = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (isExempt) {
      setAuthed(true);
      return;
    }
    const token = sessionStorage.getItem(AUTH_KEY);
    setAuthed(token === "true");
  }, [isExempt]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setLoading(true);

      try {
        const hash = await sha256(password);
        if (hash === PASSWORD_HASH) {
          sessionStorage.setItem(AUTH_KEY, "true");
          setAuthed(true);
        } else {
          setError("Incorrect password.");
        }
      } catch {
        setError("Something went wrong.");
      } finally {
        setLoading(false);
      }
    },
    [password],
  );

  // Still checking sessionStorage
  if (authed === null) {
    return null;
  }

  // Authenticated — render the app
  if (authed) {
    return <>{children}</>;
  }

  // ── Login form ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Header — mirrors dashboard masthead */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 sm:gap-4 mb-2">
            <Image
              src="/logo.png"
              alt="CGA Logo"
              width={80}
              height={80}
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain shrink-0"
              priority
            />
            <h1
              className="font-serif font-black text-ink tracking-[-0.02em] leading-none select-none"
              style={{ fontSize: "clamp(1.8rem, 5vw, 2.8rem)" }}
            >
              CGA NEWS
            </h1>
          </div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-ink-meta font-sans">
            California Gaming Association
          </p>
        </div>

        <div className="h-px bg-paper-rule mb-6" />

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-red-700 text-sm mb-4">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="gate-password"
              className="text-xs font-medium text-ink-meta font-sans uppercase tracking-wide"
            >
              Password
            </label>
            <div className="relative flex items-center">
              <input
                id="gate-password"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                autoComplete="off"
                required
                disabled={loading}
                className="flex h-10 w-full rounded-lg border border-paper-rule bg-white px-3 py-2 pr-10 text-sm text-ink placeholder:text-ink-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ink/20 focus:border-ink disabled:cursor-not-allowed disabled:opacity-50 font-sans"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPass((s) => !s)}
                className="absolute right-3 text-ink-meta hover:text-ink transition-colors"
                aria-label={showPass ? "Hide password" : "Show password"}
              >
                {showPass ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full h-10 rounded-lg bg-ink text-white text-sm font-medium font-sans transition-all hover:bg-ink-lead active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
          >
            {loading ? (
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <Lock className="h-4 w-4" />
            )}
            {loading ? "Verifying\u2026" : "Enter Dashboard"}
          </button>
        </form>

        <div className="h-px bg-paper-rule mt-6" />

        <p className="text-center text-[11px] text-ink-muted font-sans mt-4">
          Access restricted. Contact CGA for credentials.
        </p>
      </div>
    </div>
  );
}
