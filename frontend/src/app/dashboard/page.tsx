"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EventsFunnelBlock } from "@/components/events-funnel-block";
import {
  clearSession,
  fetchOverview,
  fetchRecentActivity,
  fetchTopProducts,
  getStoredToken,
  getStoredUser,
  login,
  setStoredToken,
  setStoredUser,
} from "@/lib/api";
import {
  DEMO_ACCOUNT_PASSWORD,
  demoLabel,
  otherDemoEmail,
  otherDemoLabel,
} from "@/lib/demo-accounts";
import { formatProductLabel } from "@/lib/product-label";
import type { RecentEvent, SessionUser } from "@/lib/types";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const currencyDetail = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function pct(n: number | null) {
  if (n === null || Number.isNaN(n)) return "—";
  return `${(n * 100).toFixed(2)}%`;
}

/** Surfaces JSON `data` from the API (e.g. product_id, amount, currency on purchases). */
function RecentEventDetails({ ev }: { ev: RecentEvent }) {
  const d = ev.data;
  if (!d || typeof d !== "object") return null;

  if (ev.event_type === "purchase") {
    const pid = d.product_id;
    const amt = d.amount;
    const cur = d.currency;
    if (pid == null && amt == null && cur == null) return null;
    return (
      <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-[var(--text-muted)]">
        {pid != null ? (
          <span className="font-medium text-[var(--text-primary)]" title={String(pid)}>
            {formatProductLabel(String(pid))}
          </span>
        ) : null}
        {amt != null && !Number.isNaN(Number(amt)) ? (
          <span className="tabular-nums">{currencyDetail.format(Number(amt))}</span>
        ) : null}
        {cur != null ? <span className="text-[var(--text-faint)]">{String(cur)}</span> : null}
      </p>
    );
  }

  if (
    (ev.event_type === "add_to_cart" || ev.event_type === "remove_from_cart") &&
    d.product_id != null
  ) {
    const raw = String(d.product_id);
    return (
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        <span title={raw}>{formatProductLabel(raw)}</span>
      </p>
    );
  }

  return null;
}

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [authed, setAuthed] = useState(false);
  const [viewer, setViewer] = useState<SessionUser | null>(null);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (!getStoredToken()) {
      router.replace("/login");
      return;
    }
    setViewer(getStoredUser());
    setAuthed(true);
  }, [router]);

  const storeKey = viewer?.store_id ?? "";

  const overview = useQuery({
    queryKey: ["analytics", "overview", storeKey],
    queryFn: fetchOverview,
    enabled: authed && !!storeKey,
  });

  const topProducts = useQuery({
    queryKey: ["analytics", "top-products", storeKey],
    queryFn: fetchTopProducts,
    enabled: authed && !!storeKey,
  });

  const recent = useQuery({
    queryKey: ["analytics", "recent", storeKey],
    queryFn: () => fetchRecentActivity(20),
    enabled: authed && !!storeKey,
    refetchInterval: 15_000,
  });

  async function switchAccount() {
    const nextEmail = otherDemoEmail(viewer?.email);
    setSwitching(true);
    try {
      const res = await login(nextEmail, DEMO_ACCOUNT_PASSWORD);
      setStoredToken(res.access_token);
      setStoredUser(res.user);
      setViewer(res.user);
      await queryClient.invalidateQueries({ queryKey: ["analytics"] });
    } catch (e) {
      console.error(e);
      alert(
        e instanceof Error
          ? e.message
          : "Could not switch account. Use the same password as your seeded demo (default: demo1234).",
      );
    } finally {
      setSwitching(false);
    }
  }

  function logout() {
    clearSession();
    setViewer(null);
    void queryClient.removeQueries({ queryKey: ["analytics"] });
    router.replace("/login");
  }

  const err =
    overview.error || topProducts.error || recent.error
      ? String(overview.error || topProducts.error || recent.error)
      : null;

  const loading =
    overview.isPending || topProducts.isPending || recent.isPending;

  const maxProductRevenue = topProducts.data?.length
    ? Math.max(...topProducts.data.map((r) => r.revenue), 1)
    : 1;

  return (
    <div className="app-shell text-[var(--text-primary)]">
      <div className="app-content flex min-h-full flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--bg-elevated)_92%,transparent)] backdrop-blur-xl">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
              <div className="min-w-0 flex-1 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
                    Amboras · Analytics
                  </p>
                  {viewer?.store_id ? (
                    <span className="inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-1.5 text-xs text-[var(--text-muted)]">
                      <span className="text-[var(--text-faint)]">Store</span>
                      <span
                        className="font-medium text-[var(--accent)]"
                        title={`Store ID: ${viewer.store_id}`}
                      >
                        {demoLabel(viewer.store_id)}
                      </span>
                      <span className="hidden sm:inline text-[var(--text-faint)]">·</span>
                      <span className="max-w-[200px] truncate text-[11px] sm:max-w-none">{viewer.email}</span>
                    </span>
                  ) : null}
                </div>
                <div>
                  <h1 className="font-display text-3xl font-semibold leading-[1.15] text-[var(--text-primary)] sm:text-4xl">
                    Your store at a glance
                  </h1>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--text-muted)]">
                    Revenue, conversion, event mix, and recent actions. Live feed refreshes every 15
                    seconds.
                  </p>
                </div>
              </div>
              <nav
                className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end lg:pt-1"
                aria-label="Account"
              >
                <button
                  type="button"
                  onClick={() => void switchAccount()}
                  disabled={switching || !viewer}
                  className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[var(--text-muted)] transition hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:opacity-50 sm:text-right"
                >
                  {switching
                    ? "Switching…"
                    : `Switch to ${otherDemoLabel(viewer?.email)}`}
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-lg border border-[var(--border-strong)] bg-[var(--bg-card)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] shadow-[0_1px_0_rgba(255,255,255,0.04)] transition hover:border-[var(--accent)] hover:bg-[var(--bg-card-hover)]"
                >
                  Log out
                </button>
              </nav>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 space-y-12 px-4 py-10 sm:px-6 lg:px-8">
          {err ? (
            <div
              role="alert"
              className="animate-fade-up rounded-[var(--radius-xl)] border border-[color-mix(in_srgb,var(--danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] p-5 text-[var(--text-primary)]"
            >
              <p className="font-display text-lg font-semibold">Could not load data</p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">{err}</p>
              <button
                type="button"
                className="mt-4 rounded-lg bg-[var(--text-primary)] px-4 py-2 text-sm font-medium text-[var(--bg-base)] transition hover:opacity-90"
                onClick={() => {
                  void overview.refetch();
                  void topProducts.refetch();
                  void recent.refetch();
                }}
              >
                Retry
              </button>
            </div>
          ) : null}

          {loading && !overview.data ? (
            <div className="stagger space-y-6" aria-busy="true" aria-label="Loading dashboard">
              <div className="grid gap-4 sm:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-28 rounded-[var(--radius-lg)] bg-[var(--bg-card)] animate-pulse"
                  />
                ))}
              </div>
              <div className="h-40 rounded-[var(--radius-xl)] bg-[var(--bg-card)] animate-pulse" />
              <div className="h-72 rounded-[var(--radius-xl)] bg-[var(--bg-card)] animate-pulse" />
            </div>
          ) : null}

          {overview.data ? (
            <section className="stagger space-y-6" aria-labelledby="revenue-heading">
              <h2
                id="revenue-heading"
                className="font-display text-lg font-semibold text-[var(--text-primary)]"
              >
                Revenue
              </h2>
              <div className="grid gap-4 sm:grid-cols-3">
                {(
                  [
                    ["Today", overview.data.revenue.today, "var(--accent)"],
                    ["This week", overview.data.revenue.week, "var(--warm)"],
                    ["This month", overview.data.revenue.month, "#94a3b8"],
                  ] as const
                ).map(([label, value, accent]) => (
                  <article
                    key={label}
                    className="group relative overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] transition hover:border-[var(--border-strong)] hover:bg-[var(--bg-card-hover)]"
                  >
                    <div
                      className="absolute left-0 top-0 h-1 w-full opacity-90"
                      style={{ background: accent }}
                      aria-hidden
                    />
                    <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-faint)]">
                      {label}
                    </p>
                    <p className="font-display mt-3 text-3xl font-semibold tabular-nums tracking-tight text-[var(--text-primary)] sm:text-4xl">
                      {currency.format(value)}
                    </p>
                  </article>
                ))}
              </div>

              <article className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 sm:p-8">
                <div
                  className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl"
                  style={{ background: "var(--accent-dim)" }}
                  aria-hidden
                />
                <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-faint)]">
                  Conversion rate
                </p>
                <p className="font-display mt-2 text-4xl font-semibold tabular-nums text-[var(--accent)] sm:text-5xl">
                  {pct(overview.data.conversion_rate)}
                </p>
                <p className="mt-2 text-xs text-[var(--text-faint)]">
                  All-time · purchases per page view
                </p>
              </article>
            </section>
          ) : null}

          {overview.data?.events_by_type ? (
            <EventsFunnelBlock eventsByType={overview.data.events_by_type} />
          ) : null}

          {topProducts.data ? (
            <section aria-labelledby="products-heading">
              <div className="mb-4">
                <h2
                  id="products-heading"
                  className="font-display text-lg font-semibold text-[var(--text-primary)]"
                >
                  Top products by revenue
                </h2>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Up to 10 products · showing{" "}
                  <span className="tabular-nums text-[var(--text-primary)]">
                    {topProducts.data.length}
                  </span>{" "}
                  with purchase data in this store (fewer rows if your catalog only has that many
                  distinct products with sales).
                </p>
              </div>
              <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-[0_24px_80px_-32px_rgba(0,0,0,0.65)]">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                      <th
                        scope="col"
                        className="px-5 py-4 text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)]"
                      >
                        Product
                      </th>
                      <th
                        scope="col"
                        className="hidden w-[45%] min-w-[180px] py-4 pl-2 pr-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)] sm:table-cell"
                      >
                        Mix
                      </th>
                      <th
                        scope="col"
                        className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)]"
                      >
                        Revenue
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.data.map((row, idx) => {
                      const share = row.revenue / maxProductRevenue;
                      return (
                        <tr
                          key={row.product_id}
                          className={
                            idx % 2 === 0
                              ? "bg-transparent"
                              : "bg-[color-mix(in_srgb,var(--bg-elevated)_40%,transparent)]"
                          }
                        >
                        <td className="px-5 py-3.5 text-sm text-[var(--text-primary)]">
                          <span title={row.product_id}>{formatProductLabel(row.product_id)}</span>
                        </td>
                          <td className="hidden align-middle px-2 py-3 sm:table-cell">
                            <div
                              className="h-2 overflow-hidden rounded-full bg-[var(--bg-base)] ring-1 ring-[var(--border-subtle)]"
                              title={`${(share * 100).toFixed(0)}% of top product in this list`}
                            >
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[color-mix(in_srgb,var(--accent)_85%,var(--warm))]"
                                style={{ width: `${share * 100}%` }}
                              />
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right tabular-nums font-semibold text-[var(--text-primary)]">
                            {currency.format(row.revenue)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {recent.data ? (
            <section aria-labelledby="activity-heading">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <h2
                  id="activity-heading"
                  className="font-display text-lg font-semibold text-[var(--text-primary)]"
                >
                  Recent activity
                </h2>
                <span className="text-xs text-[var(--text-faint)]">
                  Last 20 events · auto-refresh 15s
                </span>
              </div>
              <ul className="space-y-3">
                {recent.data.map((ev) => (
                  <li
                    key={ev.event_id}
                    className="flex gap-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 transition hover:border-[var(--border-strong)]"
                  >
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--accent)] shadow-[0_0_12px_var(--accent-glow)]"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-medium capitalize text-[var(--text-primary)]">
                          {ev.event_type.replace(/_/g, " ")}
                        </span>
                        <code className="truncate text-xs text-[var(--text-faint)]">
                          {ev.event_id}
                        </code>
                      </div>
                      <time
                        className="mt-1 block text-xs text-[var(--text-muted)]"
                        dateTime={ev.timestamp}
                      >
                        {new Date(ev.timestamp).toLocaleString()}
                      </time>
                      <RecentEventDetails ev={ev} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </main>

        <footer className="border-t border-[var(--border-subtle)] py-6 text-center text-xs text-[var(--text-faint)]">
          Built for store owners · UTC metrics
        </footer>
      </div>
    </div>
  );
}
