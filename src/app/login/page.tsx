"use client";

import React, { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, LogIn, AlertCircle } from "lucide-react";
import { Logo } from "@/components/shared/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Inner component isolates useSearchParams() so it can be Suspense-wrapped
function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl  = searchParams.get("callbackUrl") ?? "/admin/queue";

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const isError = searchParams.get("error") === "CredentialsSignin";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password.");
    } else if (result?.url) {
      router.push(result.url);
    }
  }

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center p-4">
      {/* ── Background — CGA radial rings ────────────────────────────────── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Deep teal top glow (blue ring color) */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-[#1E6BC0]/8 blur-3xl" />
        {/* California green bottom-left orb */}
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-brand-600/7 blur-3xl" />
        {/* California green top-right orb */}
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-brand-500/6 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm animate-fade-in">
        {/* Card — CGA teal surface */}
        <div className="bg-surface border border-surface-border rounded-2xl shadow-modal p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            {/* CGA logo badge — prominent, centered */}
            <div className="flex justify-center mb-2">
              <Logo size="lg" showText={false} />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-[--text-primary]">
                Admin Sign In
              </h1>
              <p className="text-sm text-[--text-muted] mt-1">
                California Gaming Association
              </p>
            </div>
          </div>

          {/* Error states */}
          {(error || isError) && (
            <div className="flex items-center gap-2 bg-red-950/60 border border-red-700/50 rounded-xl px-3 py-2.5 text-red-300 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error ?? "Invalid credentials. Please try again."}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-medium text-[--text-secondary]">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                autoComplete="email"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-medium text-[--text-secondary]">
                Password
              </label>
              <Input
                id="password"
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                disabled={loading}
                rightIcon={
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPass((s) => !s)}
                    className="hover:text-[--text-primary] transition-colors"
                    aria-label={showPass ? "Hide password" : "Show password"}
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              {loading ? "Signing in…" : "Sign In"}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-[--text-muted] mt-4">
          Access restricted to authorized administrators only.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
