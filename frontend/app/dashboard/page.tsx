"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/lib/api-client";
import { Sparkles, Loader2 } from "lucide-react";

function DashboardContent() {
  const api = useApiClient();
  const searchParams = useSearchParams();
  const activeBatchId = searchParams.get("batch_id");

  // List all available runs
  const { data: batches = [] } = useQuery({
    queryKey: ["batches"],
    queryFn: () => api.listBatches(),
  });

  const selectedBatchId = activeBatchId || batches[0]?.id;

  // Fetch report for selected batch run
  const { data: report } = useQuery({
    queryKey: ["batch-report", selectedBatchId],
    queryFn: () => api.getBatchReport(selectedBatchId!),
    enabled: !!selectedBatchId,
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="space-y-1 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-medium text-indigo-400">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Reconciliation Dashboard</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {report?.batch.name || "Payment Reconciliation"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            {report
              ? `Reconciled ${report.batch.total_orders_count} orders against ${report.batch.total_payments_count} transactions.`
              : "Select or upload a reconciliation batch to inspect discrepancy analytics."}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-12 text-slate-400 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          <span>Loading dashboard...</span>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
