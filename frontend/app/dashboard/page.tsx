"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/lib/api-client";
import { Sparkles, Loader2, AlertCircle } from "lucide-react";
import { MetricCards } from "@/components/dashboard/metric-cards";
import { BreakdownCharts } from "@/components/dashboard/breakdown-charts";
import { DiscrepancyTable } from "@/components/dashboard/discrepancy-table";
import { DiscrepancyDrawer } from "@/components/dashboard/discrepancy-drawer";

function DashboardContent() {
  const api = useApiClient();
  const searchParams = useSearchParams();

  // URL query parameters for table filtering and pagination
  const activeBatchId = searchParams.get("batch_id");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const search = searchParams.get("search") || "";
  const discrepancy_type = searchParams.get("discrepancy_type") || "";
  const resolution = searchParams.get("resolution") || "";

  // Selected discrepancy ID (for side drawer inspector)
  const [selectedDiscrepancyId, setSelectedDiscrepancyId] = useState<string | null>(null);

  // List all available runs (cached, doesn't reload on page/filter change)
  const { data: batches = [], isLoading: isLoadingBatches } = useQuery({
    queryKey: ["batches"],
    queryFn: () => api.listBatches(),
  });

  const selectedBatchId = activeBatchId || batches[0]?.id;

  // Single unified API query fetching the report
  // placeholderData: keepPreviousData preserves data between query keys to prevent skeletons/flicker
  const {
    data: report,
    isLoading: isLoadingReport,
    isPlaceholderData,
    error,
  } = useQuery({
    queryKey: ["batch-report", selectedBatchId, { page, search, discrepancy_type, resolution }],
    queryFn: () =>
      api.getBatchReport(selectedBatchId!, {
        page,
        search,
        discrepancy_type,
        resolution,
        page_size: 10,
      }),
    placeholderData: keepPreviousData,
    enabled: !!selectedBatchId,
  });

  // Only show initial loader when there is no cached or placeholder data on first load
  const isInitialLoading =
    (isLoadingBatches && batches.length === 0) || (isLoadingReport && !report);

  return (
    <div className="flex flex-col gap-6">
      {/* Header Banner */}
      <div className="relative flex flex-col justify-between gap-4 overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 p-6 sm:flex-row sm:items-center">
        <div className="pointer-events-none absolute top-0 right-0 h-full w-80 bg-indigo-500/10 blur-3xl" />
        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400">
            <Sparkles className="size-3.5" />
            <span>Reconciliation Dashboard</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            {report?.batch.name || "Payment Reconciliation"}
          </h1>
          <p className="text-xs text-slate-400 sm:text-sm">
            {report
              ? `Reconciled ${report.batch.total_orders_count} orders against ${report.batch.total_payments_count} transactions.`
              : "Select or upload a reconciliation batch to inspect discrepancy analytics."}
          </p>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-xs text-red-400">
          <AlertCircle className="mt-0.5 size-5 shrink-0" />
          <div className="space-y-1">
            <span className="block font-semibold">Error Loading Report</span>
            <span>
              Failed to load reconciliation report details. Please try switching batches or checking
              API status.
            </span>
          </div>
        </div>
      ) : (
        <>
          {/* Headline Metric Cards */}
          <MetricCards
            batch={report?.batch}
            discrepancies={report?.discrepancies}
            isLoading={isInitialLoading}
          />

          {/* Analytics Charts */}
          <BreakdownCharts breakdown={report?.breakdown || []} isLoading={isInitialLoading} />

          {/* Drill-down Table Section */}
          {selectedBatchId && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h2 className="text-lg font-bold tracking-tight text-white">
                    Discrepancy Drill-Down
                  </h2>
                  <p className="text-xs text-slate-400">
                    Filter, search, audit, and mark resolutions for specific discrepancies.
                  </p>
                </div>
                {/* Tiny indicator to show loading when filters are active in background */}
                {isPlaceholderData && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Loader2 className="size-3 animate-spin text-indigo-500" />
                    <span>Syncing...</span>
                  </div>
                )}
              </div>

              {isInitialLoading ? (
                <div className="flex h-[400px] items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center text-xs text-slate-500">
                  <Loader2 className="size-4 animate-spin text-indigo-500" />
                  <span>Loading transaction data...</span>
                </div>
              ) : (
                <DiscrepancyTable
                  batchId={selectedBatchId}
                  discrepancies={report?.discrepancies || []}
                  pagination={
                    report?.pagination || {
                      current_page: 1,
                      page_size: 15,
                      total_records: 0,
                      total_pages: 1,
                    }
                  }
                  onSelectDiscrepancy={(id) => setSelectedDiscrepancyId(id)}
                />
              )}
            </div>
          )}

          {/* Side Drawer Transaction Audit Inspector & AI analysis */}
          {selectedBatchId && (
            <DiscrepancyDrawer
              discrepancyId={selectedDiscrepancyId}
              onClose={() => setSelectedDiscrepancyId(null)}
              batchId={selectedBatchId}
            />
          )}
        </>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center gap-3 p-12 text-slate-400">
          <Loader2 className="size-6 animate-spin text-indigo-500" />
          <span>Loading dashboard...</span>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
