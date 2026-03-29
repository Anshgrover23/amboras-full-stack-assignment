"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { login, setStoredToken, setStoredUser } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("owner@store-a.test");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login(email, password);
      setStoredToken(res.access_token);
      setStoredUser(res.user);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell flex min-h-full flex-1 flex-col">
      <div className="app-content flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="animate-fade-up w-full max-w-md">
          <div className="mb-10 text-center">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--accent)]">
              Amboras
            </p>
            <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-4xl">
              Store analytics
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">
              Sign in to open your performance dashboard.
            </p>
          </div>

          <div className="rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)]"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 text-[var(--text-primary)] shadow-inner outline-none transition placeholder:text-[var(--text-faint)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                  placeholder="you@store.com"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)]"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-3 text-[var(--text-primary)] shadow-inner outline-none transition focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                  required
                />
              </div>
              {error ? (
                <p
                  role="alert"
                  className="rounded-lg border border-[color-mix(in_srgb,var(--danger)_40%,transparent)] bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] px-4 py-3 text-sm text-[var(--text-primary)]"
                >
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center rounded-lg bg-[var(--accent)] px-4 py-3.5 text-sm font-semibold text-[var(--bg-base)] shadow-[0_0_24px_var(--accent-glow)] transition hover:brightness-110 disabled:opacity-60"
              >
                {loading ? "Signing in…" : "Enter dashboard"}
              </button>
            </form>
            <p className="mt-8 border-t border-[var(--border-subtle)] pt-6 text-center text-xs leading-relaxed text-[var(--text-faint)]">
              Try{" "}
              <code className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 font-mono text-[var(--accent)]">
                owner@store-b.test
              </code>{" "}
              with the same password to see another tenant&apos;s data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
