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

interface HealthChartProps {
  data: Array<{
    date: string;
    queries: number;
    retrievalScoredQueries: number;
    groundednessScoredQueries: number;
    retrievalScoredPct: number;
    groundednessScoredPct: number;
  }>;
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
    retrievalScoredPct: Math.round(d.retrievalScoredPct * 100),
    groundednessScoredPct: Math.round(d.groundednessScoredPct * 100),
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
          width={40}
        />
        <YAxis
          yAxisId="pct"
          orientation="right"
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
            if (name === "queries") return [value, "Queries"];
            if (name === "retrievalScoredPct")
              return [`${value}%`, "Retrieval Scored %"];
            return [`${value}%`, "Groundedness Scored %"];
          }}
          labelFormatter={(label) =>
            new Date(String(label)).toLocaleDateString()
          }
        />
        <Legend
          formatter={(value: string) => {
            if (value === "queries") return "Queries";
            if (value === "retrievalScoredPct") return "Retrieval Scored %";
            return "Groundedness Scored %";
          }}
        />
        <Bar
          yAxisId="queries"
          dataKey="queries"
          fill="hsl(var(--muted-foreground) / 0.35)"
          radius={[4, 4, 0, 0]}
        />
        <Line
          yAxisId="pct"
          type="monotone"
          dataKey="retrievalScoredPct"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          yAxisId="pct"
          type="monotone"
          dataKey="groundednessScoredPct"
          stroke="hsl(var(--chart-2, 160 60% 45%))"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
