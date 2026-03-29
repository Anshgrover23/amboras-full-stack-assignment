"use client";

/**
 * Shop-owner friendly “events by type” view.
 * Assignment API still supplies events_by_type; we present totals + mix % only
 * (no faux-funnel ratios that confuse when raw events exceed page views).
 */

import { useMemo, type CSSProperties } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const STAGES: { key: string; label: string }[] = [
  { key: "page_view", label: "Page views" },
  { key: "add_to_cart", label: "Add to cart" },
  { key: "remove_from_cart", label: "Remove from cart" },
  { key: "checkout_started", label: "Checkout started" },
  { key: "purchase", label: "Purchases" },
];

/** Distinct fills per stage so similar counts still read as separate series (not one teal slab). */
const STAGE_BAR_FILLS = [
  "#5eead4",
  "#2dd4bf",
  "#22d3ee",
  "#fbbf24",
  "#a78bfa",
] as const;

const TOOLTIP_STYLE: CSSProperties = {
  backgroundColor: "var(--bg-elevated)",
  border: "1px solid var(--border-strong)",
  borderRadius: "12px",
  color: "var(--text-primary)",
  fontSize: "12px",
  padding: "12px 14px",
  boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
};

function ActivityTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload: { label: string; count: number; pct: number };
    color?: string;
  }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  const swatch = payload[0]?.color ?? STAGE_BAR_FILLS[0];
  if (!row) return null;
  return (
    <div
      className="rounded-xl border px-3 py-2.5 text-xs shadow-xl"
      style={{
        ...TOOLTIP_STYLE,
        borderColor: "var(--border-strong)",
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-sm shadow-[0_0_12px_currentColor]"
          style={{ backgroundColor: swatch, color: swatch }}
          aria-hidden
        />
        <span className="font-medium text-[var(--text-primary)]">{row.label}</span>
      </div>
      <p className="mt-1.5 pl-4 text-[var(--text-muted)]">
        <span className="font-semibold tabular-nums text-[var(--accent)]">
          {row.count.toLocaleString()}
        </span>
        <span> events · </span>
        <span className="tabular-nums">{row.pct.toFixed(1)}%</span>
        <span> of these types</span>
      </p>
    </div>
  );
}

export type ActivityRow = {
  key: string;
  label: string;
  count: number;
  pctOfAll: number;
};

function buildRows(eventsByType: Record<string, number> | undefined): ActivityRow[] {
  if (!eventsByType) return [];
  const total = STAGES.reduce((s, { key }) => s + (eventsByType[key] ?? 0), 0);

  return STAGES.map(({ key, label }) => {
    const count = eventsByType[key] ?? 0;
    const pctOfAll = total > 0 ? (count / total) * 100 : 0;
    return { key, label, count, pctOfAll };
  });
}

export function EventsFunnelBlock({
  eventsByType,
}: {
  eventsByType: Record<string, number> | undefined;
}) {
  const rows = useMemo(() => buildRows(eventsByType), [eventsByType]);

  /** Journey order (top = first step in a typical visit) — same as table & assignment event list */
  const chartRows = useMemo(
    () =>
      rows.map((r) => ({
        label: r.label,
        count: r.count,
        pct: r.pctOfAll,
      })),
    [rows],
  );

  const totalEvents = useMemo(
    () => rows.reduce((s, r) => s + r.count, 0),
    [rows],
  );

  if (rows.length === 0) return null;

  return (
    <section aria-labelledby="customer-activity-heading" className="space-y-5">
      <h2
        id="customer-activity-heading"
        className="font-display text-lg font-semibold tracking-tight text-[var(--text-primary)]"
      >
        Customer activity
      </h2>

      <div className="grid min-w-0 gap-8 lg:grid-cols-5 lg:items-start lg:gap-6">
        <div className="min-w-0 lg:col-span-3">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--text-faint)]">
            Event volume
          </p>
          <div className="h-[340px] w-full min-w-0 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-gradient-to-b from-[var(--bg-card)] to-[color-mix(in_srgb,var(--bg-base)_65%,var(--bg-card))] p-2 sm:h-[380px] sm:p-3">
            {/*
              Recharts defaults initialDimension to -1×-1; that logs a console warning before
              ResizeObserver runs. Seed with positive dims matching this box height.
            */}
            <ResponsiveContainer
              width="100%"
              height="100%"
              minWidth={0}
              initialDimension={{ width: 600, height: 360 }}
            >
              <BarChart
                data={chartRows}
                layout="vertical"
                margin={{ top: 12, right: 48, left: 0, bottom: 12 }}
                barCategoryGap="22%"
              >
                <CartesianGrid
                  horizontal={false}
                  stroke="var(--chart-grid)"
                  strokeDasharray="4 6"
                />
                <XAxis
                  type="number"
                  domain={[0, (max: number) => Math.ceil(max * 1.06)]}
                  tick={{ fill: "var(--text-faint)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={128}
                  tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={8}
                />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                  content={<ActivityTooltip />}
                />
                <Bar
                  dataKey="count"
                  radius={[0, 10, 10, 0]}
                  maxBarSize={26}
                  background={{
                    fill: "rgba(148, 163, 184, 0.07)",
                    radius: 10,
                  }}
                  activeBar={{ stroke: "rgba(255,255,255,0.12)", strokeWidth: 1 }}
                >
                  {chartRows.map((_, i) => (
                    <Cell key={STAGES[i]?.key ?? i} fill={STAGE_BAR_FILLS[i]} />
                  ))}
                  <LabelList
                    dataKey="count"
                    position="right"
                    fill="var(--text-muted)"
                    fontSize={12}
                    fontWeight={500}
                    formatter={(v) => Number(v ?? 0).toLocaleString()}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-center text-[11px] text-[var(--text-faint)]">
            Total of these tracked actions:{" "}
            <span className="tabular-nums text-[var(--text-muted)]">
              {totalEvents.toLocaleString()}
            </span>
          </p>
        </div>

        <div className="lg:col-span-2">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--text-faint)]">
            Breakdown
          </p>
          <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--bg-card)]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)]">
                    Action
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)]">
                    Times
                  </th>
                  <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-faint)]">
                    Share
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr
                    key={r.key}
                    className="border-b border-[var(--border-subtle)] last:border-0"
                  >
                    <td
                      className="border-l-[3px] px-3 py-2.5 pl-2.5 text-[var(--text-primary)]"
                      style={{ borderLeftColor: STAGE_BAR_FILLS[idx] ?? STAGE_BAR_FILLS[0] }}
                    >
                      {r.label}
                    </td>
                    <td
                      className="px-3 py-2.5 tabular-nums font-medium"
                      style={{ color: STAGE_BAR_FILLS[idx] ?? STAGE_BAR_FILLS[0] }}
                    >
                      {r.count.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums text-[var(--text-muted)]">
                      {r.pctOfAll.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
