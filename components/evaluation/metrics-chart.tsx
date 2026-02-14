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
    retrievalAccuracy: number;
    groundedness: number;
    queries: number;
    cost: number;
  }>;
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
    retrievalAccuracy: Math.round(d.retrievalAccuracy * 100),
    groundedness: Math.round(d.groundedness * 100),
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
          formatter={(value: string) =>
            value === "retrievalAccuracy"
              ? "Retrieval Accuracy"
              : "Groundedness"
          }
        />
        <Line
          type="monotone"
          dataKey="retrievalAccuracy"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="groundedness"
          stroke="hsl(var(--chart-2, 160 60% 45%))"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
