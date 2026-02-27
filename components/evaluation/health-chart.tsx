"use client";

import {
  CartesianGrid,
  LineChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface HealthChartProps {
  data: Array<{
    date: string;
    retrievalScoredPct: number | null;
    groundednessScoredPct: number | null;
  }>;
}

interface DotRenderProps {
  cx?: number;
  cy?: number;
  stroke?: string;
  strokeWidth?: string | number;
}

interface LegendPayloadEntry {
  dataKey?: string | number;
}

const HEALTH_LEGEND_ORDER = [
  "retrievalScoredPct",
  "groundednessScoredPct",
] as const;

const HEALTH_LEGEND_LABELS: Record<(typeof HEALTH_LEGEND_ORDER)[number], string> =
  {
    retrievalScoredPct: "Retrieval Scored %",
    groundednessScoredPct: "Groundedness Scored %",
  };

function renderSquareDot(props: DotRenderProps) {
  const { cx, cy, stroke = "var(--foreground)", strokeWidth = 1.5 } = props;
  if (cx === undefined || cy === undefined) return null;
  const size = 6;
  return (
    <rect
      x={cx - size / 2}
      y={cy - size / 2}
      width={size}
      height={size}
      fill={stroke}
      stroke={stroke}
      strokeWidth={strokeWidth}
      rx={1}
    />
  );
}

function renderSquareActiveDot(props: DotRenderProps) {
  const { cx, cy, strokeWidth = 2 } = props;
  if (cx === undefined || cy === undefined) return null;
  const size = 9;
  return (
    <rect
      x={cx - size / 2}
      y={cy - size / 2}
      width={size}
      height={size}
      fill="var(--card)"
      stroke="var(--foreground)"
      strokeWidth={strokeWidth}
      rx={1}
    />
  );
}

function renderCircleActiveDot(props: DotRenderProps) {
  const { cx, cy, strokeWidth = 2 } = props;
  if (cx === undefined || cy === undefined) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill="var(--card)"
      stroke="var(--foreground)"
      strokeWidth={strokeWidth}
    />
  );
}

export function HealthChart({ data }: HealthChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        No data available for this period
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    retrievalScoredPct: d.retrievalScoredPct !== null ? Math.round(d.retrievalScoredPct * 100) : null,
    groundednessScoredPct: d.groundednessScoredPct !== null ? Math.round(d.groundednessScoredPct * 100) : null,
  }));

  const tooltipContentStyle = {
    backgroundColor: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    color: "var(--card-foreground)",
  };

  const tooltipLabelStyle = {
    color: "var(--card-foreground)",
    fontWeight: 600,
  };

  const tooltipItemStyle = {
    color: "var(--card-foreground)",
  };

  // Match metrics chart contrast behavior.
  const baseDot = {
    r: 3,
    fill: "var(--foreground)",
    stroke: "var(--foreground)",
    strokeWidth: 1,
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="date"
          className="text-xs"
          tick={{ fontSize: 12 }}
          tickFormatter={(value: string) => {
            const d = new Date(value);
            return `${d.getMonth() + 1}/${d.getDate()}`;
          }}
        />
        <YAxis
          className="text-xs"
          tick={{ fontSize: 12 }}
          domain={[0, 100]}
          tickFormatter={(value: number) => `${value}%`}
          width={50}
        />
        <Tooltip
          contentStyle={tooltipContentStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          formatter={(value, name) => {
            if (name === "retrievalScoredPct")
              return [`${value}%`, "Retrieval Scored %"];
            return [`${value}%`, "Groundedness Scored %"];
          }}
          labelFormatter={(label) =>
            new Date(String(label)).toLocaleDateString()
          }
        />
        <Legend
          content={({ payload }) => {
            const keys = new Set(
              (payload || [])
                .map((entry) => String(entry.dataKey || ""))
                .filter((k) => HEALTH_LEGEND_ORDER.includes(k as (typeof HEALTH_LEGEND_ORDER)[number]))
            );

            if (keys.size === 0) return null;

            return (
              <div className="mt-2 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground sm:text-sm">
                {HEALTH_LEGEND_ORDER.filter((k) => keys.has(k)).map((key) => (
                    <div key={key} className="flex items-center gap-2">
                      <span
                        className="inline-block w-5 border-t-2 border-foreground"
                        style={
                          key === "groundednessScoredPct"
                            ? { borderTopStyle: "dashed" }
                            : undefined
                        }
                      />
                      <span>{HEALTH_LEGEND_LABELS[key]}</span>
                    </div>
                  ))}
              </div>
            );
          }}
        />
        <Line
          type="monotone"
          dataKey="retrievalScoredPct"
          stroke="var(--foreground)"
          strokeWidth={2.5}
          connectNulls
          dot={baseDot}
          activeDot={renderCircleActiveDot}
        />
        <Line
          type="monotone"
          dataKey="groundednessScoredPct"
          stroke="var(--foreground)"
          strokeWidth={2}
          strokeDasharray="6 4"
          connectNulls
          dot={renderSquareDot}
          activeDot={renderSquareActiveDot}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
