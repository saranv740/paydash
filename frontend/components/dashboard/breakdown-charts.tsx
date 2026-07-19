"use client";

import {
  Bar,
  BarChart,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DiscrepancyBreakdown } from "@/lib/types";
import { formatCurrency, getDiscrepancyLabel } from "@/lib/utils";

interface BreakdownChartsProps {
  breakdown: DiscrepancyBreakdown[];
  isLoading?: boolean;
}

// Tailored color palette for discrepancy types
const COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f43f5e", // rose
  "#f59e0b", // amber
  "#eab308", // yellow
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#64748b", // slate
];

export function BreakdownCharts({ breakdown, isLoading }: BreakdownChartsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, idx) => (
          <Card key={idx} className="border-slate-800 bg-slate-900/60 p-6 flex flex-col gap-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-40 bg-slate-800" />
              <Skeleton className="h-4 w-72 bg-slate-800" />
            </div>
            <div className="h-60 flex items-center justify-center">
              <Skeleton className="size-48 rounded-full bg-slate-800 animate-pulse" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!breakdown || breakdown.length === 0) {
    return (
      <Card className="bg-slate-900 border-slate-800 p-8 text-center text-slate-500">
        No discrepancy breakdown data available. Upload files to generate analytics.
      </Card>
    );
  }

  // Format data for Recharts, passing 'fill' property directly in the data objects
  const chartData = breakdown.map((item, idx) => ({
    name: getDiscrepancyLabel(item.type),
    count: item.count,
    amount: parseFloat(item.total_amount_at_risk || "0"),
    percentage: item.percentage_of_total_risk,
    fill: COLORS[idx % COLORS.length], // Map colors directly to standard 'fill' key
  }));

  // Sort by count for Pie chart representation
  const pieData = [...chartData].sort((a, b) => b.count - a.count);

  // Sort by amount at risk for Bar chart representation
  const barData = [...chartData].sort((a, b) => b.amount - a.amount);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Donut Chart - Count by Category */}
      <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm text-slate-100 flex flex-col justify-between">
        <CardHeader>
          <CardTitle className="text-base font-bold text-white">
            Discrepancy Count
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Distribution of reconciliation issues by transaction count.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart style={{ outline: "none" }} className="outline-none">
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={95}
                paddingAngle={3}
                dataKey="count"
                style={{ outline: "none" }}
                className="outline-none focus:outline-none"
              />
              <Tooltip
                isAnimationActive={false}
                cursor={false}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-950/95 border border-slate-800 p-3 rounded-xl shadow-2xl flex flex-col gap-1 transition-opacity duration-150 backdrop-blur-sm animate-in fade-in-0 duration-75">
                        <span className="text-xs font-semibold text-white">
                          {data.name}
                        </span>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-slate-400">Count:</span>
                          <span className="font-semibold text-slate-200 font-mono">
                            {data.count} issues
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-[10px]">
                          <span className="text-slate-400">Share:</span>
                          <span className="font-semibold text-indigo-400">
                            {data.percentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                content={({ payload }) => (
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[11px] text-slate-400 pt-4">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {payload?.map((entry: any, index) => {
                      const itemColor = entry.payload?.fill || entry.color;
                      return (
                        <div key={index} className="flex items-center gap-1.5">
                          <span
                            className="size-2 rounded-full shrink-0"
                            style={{ backgroundColor: itemColor }}
                          />
                          <span className="truncate max-w-[140px]">{entry.value}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 2. Bar Chart - Financial Value at Risk */}
      <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-sm text-slate-100 flex flex-col justify-between">
        <CardHeader>
          <CardTitle className="text-base font-bold text-white">
            Financial Impact
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Total monetary value at risk grouped by discrepancy category.
          </CardDescription>
        </CardHeader>
        <CardContent className="h-80 pb-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={barData}
              layout="vertical"
              margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
              style={{ outline: "none" }}
              className="outline-none"
            >
              <XAxis
                type="number"
                stroke="#64748b"
                fontSize={10}
                tickFormatter={(value) => `$${value}`}
              />
              <YAxis
                dataKey="name"
                type="category"
                stroke="#64748b"
                fontSize={10}
                width={120}
                tickFormatter={(value) =>
                  value.length > 18 ? `${value.substring(0, 18)}...` : value
                }
              />
              <Tooltip
                isAnimationActive={false}
                cursor={{ fill: "rgba(100, 116, 139, 0.05)" }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-950/95 border border-slate-800 p-3 rounded-xl shadow-2xl flex flex-col gap-1 transition-opacity duration-150 backdrop-blur-sm animate-in fade-in-0 duration-75">
                        <span className="text-xs font-semibold text-white">
                          {data.name}
                        </span>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-slate-400">Value at Risk:</span>
                          <span className="font-semibold text-rose-400 font-mono">
                            {formatCurrency(data.amount)}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar
                dataKey="amount"
                radius={[0, 6, 6, 0]}
                style={{ outline: "none" }}
                className="outline-none focus:outline-none"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
