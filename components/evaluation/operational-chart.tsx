"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface OperationalChartProps {
  data: Array<{
    date: string;
    queries: number;
    avgLatencyMs: number | null;
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

const OPERATIONAL_LEGEND_ORDER = [
  "queries",
  "avgLatencySec",
  "dailyCostUsd",
] as const;

const OPERATIONAL_LEGEND_LABELS: Record<
  (typeof OPERATIONAL_LEGEND_ORDER)[number],
  string
> = {
  queries: "Queries",
  avgLatencySec: "Avg Latency",
  dailyCostUsd: "Daily Cost",
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

export function OperationalChart({ data }: OperationalChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        No data available for this period
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    avgLatencySec: d.avgLatencyMs !== null ? Math.round((d.avgLatencyMs / 1000) * 10) / 10 : null,
    dailyCostUsd: Math.round(d.cost * 10000) / 10000,
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

  const baseDot = {
    r: 3,
    fill: "var(--foreground)",
    stroke: "var(--foreground)",
    strokeWidth: 1,
  };

  const activeDot = {
    r: 5,
    fill: "var(--card)",
    stroke: "var(--foreground)",
    strokeWidth: 2,
  };

  const queriesColor = "var(--muted-foreground)";

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={chartData}>
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
          yAxisId="queries"
          className="text-xs"
          tick={{ fontSize: 12 }}
          allowDecimals={false}
          width={42}
        />
        <YAxis
          yAxisId="latency"
          orientation="right"
          className="text-xs"
          tick={{ fontSize: 12 }}
          tickFormatter={(value: number) => `${value.toFixed(1)}s`}
          width={52}
        />
        <YAxis yAxisId="cost" hide />
        <Tooltip
          contentStyle={tooltipContentStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          formatter={(value, name) => {
            if (name === "queries") return [value, "Queries"];
            if (name === "avgLatencySec") return [`${value}s`, "Avg Latency"];
            return [`$${value}`, "Daily Cost"];
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
                .filter((k) =>
                  OPERATIONAL_LEGEND_ORDER.includes(
                    k as (typeof OPERATIONAL_LEGEND_ORDER)[number]
                  )
                )
            );

            if (keys.size === 0) return null;

            return (
              <div className="mt-2 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground sm:text-sm">
                {OPERATIONAL_LEGEND_ORDER.filter((k) => keys.has(k)).map(
                  (key) => {
                    if (key === "queries") {
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <span
                            className="inline-block h-3 w-3 rounded-[2px]"
                            style={{ backgroundColor: queriesColor }}
                          />
                          <span>{OPERATIONAL_LEGEND_LABELS[key]}</span>
                        </div>
                      );
                    }

                    return (
                      <div key={key} className="flex items-center gap-2">
                        <span
                          className="inline-block w-5 border-t-2 border-foreground"
                          style={
                            key === "dailyCostUsd"
                              ? { borderTopStyle: "dashed" }
                              : undefined
                          }
                        />
                        <span>{OPERATIONAL_LEGEND_LABELS[key]}</span>
                      </div>
                    );
                  }
                )}
              </div>
            );
          }}
        />
        <Bar
          yAxisId="queries"
          dataKey="queries"
          fill={queriesColor}
          radius={[4, 4, 0, 0]}
        />
        <Line
          yAxisId="latency"
          type="monotone"
          dataKey="avgLatencySec"
          stroke="var(--foreground)"
          strokeWidth={2.5}
          connectNulls
          dot={baseDot}
          activeDot={activeDot}
        />
        <Line
          yAxisId="cost"
          type="monotone"
          dataKey="dailyCostUsd"
          stroke="var(--foreground)"
          strokeWidth={2}
          strokeDasharray="6 4"
          connectNulls
          dot={renderSquareDot}
          activeDot={renderSquareActiveDot}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
