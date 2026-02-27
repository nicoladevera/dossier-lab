"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface MetricsChartProps {
  data: Array<{
    date: string;
    retrievalAccuracy: number | null;
    groundedness: number | null;
    queries: number;
    cost: number;
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

const METRICS_LEGEND_ORDER = ["retrievalAccuracy", "groundedness"] as const;
const METRICS_LEGEND_LABELS: Record<(typeof METRICS_LEGEND_ORDER)[number], string> =
  {
    retrievalAccuracy: "Retrieval Accuracy",
    groundedness: "Groundedness",
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

export function MetricsChart({ data }: MetricsChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        No data available for this period
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    retrievalAccuracy: d.retrievalAccuracy !== null ? Math.round(d.retrievalAccuracy * 100) : null,
    groundedness: d.groundedness !== null ? Math.round(d.groundedness * 100) : null,
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

  // Default point: high contrast with background.
  const baseDot = {
    r: 3,
    fill: "var(--foreground)",
    stroke: "var(--foreground)",
    strokeWidth: 1,
  };

  // Hover point: inverted center per theme.
  const activeDot = {
    r: 5,
    fill: "var(--card)",
    stroke: "var(--foreground)",
    strokeWidth: 2,
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
        />
        <Tooltip
          contentStyle={tooltipContentStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          formatter={(value, name) => [
            `${value}%`,
            name === "retrievalAccuracy"
              ? "Retrieval Accuracy"
              : "Groundedness",
          ]}
          labelFormatter={(label) =>
            new Date(String(label)).toLocaleDateString()
          }
        />
        <Legend
          content={({ payload }) => {
            const keys = new Set(
              (payload || [])
                .map((entry) => String(entry.dataKey || ""))
                .filter((k) => METRICS_LEGEND_ORDER.includes(k as (typeof METRICS_LEGEND_ORDER)[number]))
            );

            if (keys.size === 0) return null;

            return (
              <div className="mt-2 flex items-center justify-center gap-6 text-xs text-muted-foreground sm:text-sm">
                {METRICS_LEGEND_ORDER.filter((k) => keys.has(k)).map((key) => (
                  <div key={key} className="flex items-center gap-2">
                    <span
                      className="inline-block w-5 border-t-2 border-foreground"
                      style={
                        key === "groundedness"
                          ? { borderTopStyle: "dashed" }
                          : undefined
                      }
                    />
                    <span>{METRICS_LEGEND_LABELS[key]}</span>
                  </div>
                ))}
              </div>
            );
          }}
        />
        <Line
          type="monotone"
          dataKey="retrievalAccuracy"
          stroke="var(--foreground)"
          strokeWidth={2.5}
          connectNulls
          dot={baseDot}
          activeDot={activeDot}
        />
        <Line
          type="monotone"
          dataKey="groundedness"
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
