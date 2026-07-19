"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UploadBatch, DiscrepancyDetail } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, CreditCard, CheckCircle, AlertTriangle, ShieldAlert } from "lucide-react";

interface MetricCardsProps {
  batch?: UploadBatch;
  discrepancies?: DiscrepancyDetail[];
  isLoading: boolean;
}

export function MetricCards({ batch, discrepancies = [], isLoading }: MetricCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, idx) => (
          <Card key={idx} className="border-slate-800 bg-slate-900 p-4">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-24 bg-slate-800" />
              <Skeleton className="h-8 w-8 rounded-xl bg-slate-800" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-7 w-28 bg-slate-800" />
              <Skeleton className="h-4 w-20 bg-slate-800" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Calculate actual unresolved money at risk dynamically
  const unresolvedDiscrepancies = discrepancies.filter((d) => d.resolution === "UNRESOLVED");
  const moneyAtRisk = unresolvedDiscrepancies.reduce(
    (sum, d) => sum + parseFloat(d.amount_at_risk || "0"),
    0,
  );

  const metrics = [
    {
      title: "Total Orders",
      value: formatCurrency(batch?.total_orders_amount),
      subtitle: `${batch?.total_orders_count || 0} order records`,
      icon: TrendingUp,
      className: "border-slate-800 bg-slate-900/60 text-slate-100",
      iconColor: "text-slate-400 bg-slate-850",
    },
    {
      title: "Total Payments",
      value: formatCurrency(batch?.total_payments_amount),
      subtitle: `${batch?.total_payments_count || 0} processor settlements`,
      icon: CreditCard,
      className: "border-slate-800 bg-slate-900/60 text-slate-100",
      iconColor: "text-slate-400 bg-slate-850",
    },
    {
      title: "Reconciled Value",
      value: formatCurrency(batch?.reconciled_amount),
      subtitle: "Successfully matched value",
      icon: CheckCircle,
      className: "border-emerald-500/20 bg-emerald-950/10 text-emerald-100",
      iconColor: "text-emerald-400 bg-emerald-500/10",
      valueColor: "text-emerald-400",
    },
    {
      title: "Value In Dispute",
      value: formatCurrency(batch?.dispute_amount),
      subtitle: `${discrepancies.length} total discrepancies`,
      icon: AlertTriangle,
      className: "border-amber-500/20 bg-amber-950/10 text-amber-100",
      iconColor: "text-amber-400 bg-amber-500/10",
      valueColor: "text-amber-400",
    },
    {
      title: "Money At Risk",
      value: formatCurrency(moneyAtRisk),
      subtitle: `${unresolvedDiscrepancies.length} unresolved issues`,
      icon: ShieldAlert,
      className: "border-red-500/20 bg-red-950/10 text-red-100",
      iconColor: "text-red-400 bg-red-500/10",
      valueColor: "text-red-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {metrics.map((m, idx) => {
        const IconComponent = m.icon;
        return (
          <Card key={idx} className={`border p-4 transition-all hover:scale-[1.01] ${m.className}`}>
            <CardHeader className="flex flex-row items-center justify-between px-0 pt-0 pb-2">
              <CardTitle className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                {m.title}
              </CardTitle>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-xl border border-transparent ${m.iconColor}`}
              >
                <IconComponent className="size-4" />
              </div>
            </CardHeader>
            <CardContent className="mt-1.5 flex flex-col gap-0.5 p-0">
              <span
                className={`text-xl font-extrabold tracking-tight ${m.valueColor || "text-white"}`}
              >
                {m.value}
              </span>
              <span className="text-[11px] font-medium text-slate-400">{m.subtitle}</span>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
