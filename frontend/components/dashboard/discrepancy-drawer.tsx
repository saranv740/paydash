"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Cpu, Loader2 } from "lucide-react";
import { useState } from "react";
import { useApiClient } from "@/lib/api-client";
import { ResolutionType } from "@/lib/types";
import { formatCurrency, formatDate, getDiscrepancyBadge, getResolutionBadge } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

interface DiscrepancyDrawerProps {
  discrepancyId: string | null;
  onClose: () => void;
  batchId: string;
}

export function DiscrepancyDrawer({ discrepancyId, onClose, batchId }: DiscrepancyDrawerProps) {
  const api = useApiClient();
  const queryClient = useQueryClient();

  const [isAiLoading, setIsAiLoading] = useState(false);

  // Fetch discrepancy detail (Order + Payment join)
  const { data: detail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ["discrepancy-detail", discrepancyId],
    queryFn: () => api.getDiscrepancyDetail(discrepancyId!),
    enabled: !!discrepancyId,
  });

  // Fetch or trigger cached AI explanation
  const { data: aiExplanation, refetch: fetchAiExplanation } = useQuery({
    queryKey: ["discrepancy-explanation", discrepancyId],
    queryFn: () => api.explainDiscrepancy(discrepancyId!),
    enabled: false, // Only trigger on demand
  });

  // Mutate resolution status
  const resolutionMutation = useMutation({
    mutationFn: async (resolution: ResolutionType) => {
      if (!discrepancyId) return;
      return await api.updateDiscrepancyResolution(discrepancyId, resolution);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batch-report", batchId] });
      queryClient.invalidateQueries({
        queryKey: ["discrepancy-detail", discrepancyId],
      });
    },
  });

  const handleTriggerAi = async () => {
    setIsAiLoading(true);
    try {
      await fetchAiExplanation();
    } catch (err) {
      console.error("AI explanation failed:", err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const badge = detail ? getDiscrepancyBadge(detail.type) : null;
  const resBadge = detail ? getResolutionBadge(detail.resolution) : null;

  // Render side-by-side transaction review details
  return (
    <Sheet open={!!discrepancyId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="flex h-full flex-col border-l border-slate-800 bg-slate-900 p-0 text-slate-100 sm:max-w-xl">
        {isLoadingDetail || !detail ? (
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48 bg-slate-800" />
              <Skeleton className="h-4 w-72 bg-slate-800" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-24 w-full bg-slate-800" />
              <Skeleton className="h-24 w-full bg-slate-800" />
              <Skeleton className="h-40 w-full bg-slate-800" />
            </div>
          </div>
        ) : (
          <>
            {/* Header section */}
            <SheetHeader className="border-slate-850 flex flex-col gap-3 border-b p-6">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${badge?.className}`}
                >
                  {badge?.label}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${resBadge?.className}`}
                >
                  {resBadge?.label}
                </span>
              </div>
              <div>
                <SheetTitle className="text-lg font-bold tracking-tight text-white">
                  Transaction Audit Inspector
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-400">
                  Case ID: <code className="font-mono text-indigo-400">{detail.id}</code>
                </SheetDescription>
              </div>
            </SheetHeader>

            {/* Scrollable details */}
            <div className="flex-1 space-y-6 overflow-y-auto p-6">
              {/* Value at Risk Banner */}
              <div className="flex items-center gap-3 rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    Unreconciled Value at Risk
                  </p>
                  <p className="font-mono text-xl font-extrabold text-rose-400">
                    {formatCurrency(detail.amount_at_risk)}
                  </p>
                </div>
              </div>

              {/* Side-by-Side Audit Card Stack */}
              <div className="flex flex-col gap-4">
                {/* 1. Order Record Details */}
                <div className="relative space-y-3 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="pointer-events-none absolute top-0 right-0 h-full w-24 bg-indigo-500/5 blur-xl" />
                  <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-indigo-400 uppercase">
                    <CheckCircle2 className="size-3.5" />
                    <span>Order System Record</span>
                  </h3>

                  {detail.order ? (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-slate-500">Order ID</p>
                        <p className="truncate font-mono font-semibold text-slate-200">
                          {detail.order.order_id}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Customer Email</p>
                        <p className="truncate font-semibold text-slate-200">
                          {detail.order.customer_email || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Order Date</p>
                        <p className="font-semibold text-slate-200">
                          {formatDate(detail.order.order_date)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Net Amount</p>
                        <p className="font-mono font-semibold text-emerald-400">
                          {formatCurrency(detail.order.net_amount, detail.order.currency || "USD")}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Order Status</p>
                        <p className="font-semibold text-slate-300 capitalize">
                          {detail.order.status || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Currency</p>
                        <p className="font-mono font-semibold text-slate-300">
                          {detail.order.currency || "USD"}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 p-4 text-center text-xs text-slate-500">
                      No corresponding entry was found in the order log database.
                    </div>
                  )}
                </div>

                {/* 2. Payment Record Details */}
                <div className="relative space-y-3 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="pointer-events-none absolute top-0 right-0 h-full w-24 bg-violet-500/5 blur-xl" />
                  <h3 className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-violet-400 uppercase">
                    <CheckCircle2 className="size-3.5" />
                    <span>Payment Processor Record</span>
                  </h3>

                  {detail.payment ? (
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-slate-500">Transaction Ref</p>
                        <p className="truncate font-mono font-semibold text-slate-200">
                          {detail.payment.transaction_ref}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Payment Type</p>
                        <p className="font-semibold text-slate-200 capitalize">
                          {detail.payment.type || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Settled Date</p>
                        <p className="font-semibold text-slate-200">
                          {formatDate(detail.payment.processed_at)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Settled Amount</p>
                        <p className="font-mono font-semibold text-violet-400">
                          {formatCurrency(detail.payment.amount, detail.payment.currency || "USD")}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Settlement Status</p>
                        <p className="font-semibold text-slate-300 capitalize">
                          {detail.payment.status || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Processing Fee</p>
                        <p className="font-mono font-semibold text-slate-300">
                          {formatCurrency(detail.payment.fee, detail.payment.currency || "USD")}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 p-4 text-center text-xs text-slate-500">
                      No corresponding settlement was reported by the payment processor.
                    </div>
                  )}
                </div>
              </div>

              {/* AI Roots Analysis Section */}
              <div className="border-slate-850 space-y-4 border-t pt-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="size-4.5 text-indigo-400" />
                    <h4 className="text-sm font-bold text-white">AI Case Explanation</h4>
                  </div>
                  {!aiExplanation && (
                    <Button
                      onClick={handleTriggerAi}
                      disabled={isAiLoading}
                      size="sm"
                      className="gap-1 bg-indigo-600 text-[11px] font-medium text-white hover:bg-indigo-500"
                    >
                      {isAiLoading ? (
                        <>
                          <Loader2 className="size-3 animate-spin" />
                          <span>Analyzing Case...</span>
                        </>
                      ) : (
                        <>
                          <Cpu className="size-3.5" data-icon="inline-start" />
                          <span>Generate AI Insight</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {isAiLoading && (
                  <div className="border-slate-850 space-y-2.5 rounded-xl border bg-slate-950 p-4">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Loader2 className="size-3.5 animate-spin text-indigo-500" />
                      <span>
                        AI Engine is reviewing records and synthesizing root-cause variables...
                      </span>
                    </div>
                    <Skeleton className="h-4 w-3/4 bg-slate-800" />
                    <Skeleton className="h-4 w-1/2 bg-slate-800" />
                  </div>
                )}

                {aiExplanation && (
                  <div className="animate-in fade-in space-y-4 duration-200">
                    {/* Summary & Root Cause */}
                    <div className="border-slate-850 space-y-3 rounded-2xl border bg-slate-950 p-4 text-xs leading-relaxed">
                      <div className="space-y-1">
                        <span className="block text-[10px] font-bold tracking-wider text-indigo-400 uppercase">
                          Case Summary
                        </span>
                        <p className="text-slate-300">{aiExplanation.summary}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="block text-[10px] font-bold tracking-wider text-indigo-400 uppercase">
                          Likely Root Cause
                        </span>
                        <p className="text-slate-300">{aiExplanation.root_cause}</p>
                      </div>
                      <div className="space-y-1">
                        <span className="block text-[10px] font-bold tracking-wider text-rose-400 uppercase">
                          Business Impact
                        </span>
                        <p className="text-slate-300">{aiExplanation.business_impact}</p>
                      </div>
                    </div>

                    {/* Recommended Actions Checklists */}
                    <div className="border-slate-850 space-y-2.5 rounded-2xl border bg-slate-950 p-4">
                      <span className="block text-[10px] font-bold tracking-wider text-emerald-400 uppercase">
                        Recommended Next Steps
                      </span>
                      <div className="space-y-2">
                        {aiExplanation.recommended_actions.map((act, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-2.5 text-xs text-slate-300"
                          >
                            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded bg-indigo-500/10 text-[10px] font-bold text-indigo-400">
                              {index + 1}
                            </span>
                            <span>{act}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Resolution Footer controls */}
            <div className="border-slate-850 flex items-center justify-between gap-4 border-t bg-slate-950/40 p-6">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                  Set Case Resolution
                </span>
                <span className="text-xs text-slate-400">
                  Mark resolution state of this audit log.
                </span>
              </div>
              <div className="flex items-center gap-2">
                {(["UNRESOLVED", "RESOLVED", "IGNORED"] as ResolutionType[]).map((r) => (
                  <Button
                    key={r}
                    variant={detail.resolution === r ? "default" : "outline"}
                    size="sm"
                    onClick={() => resolutionMutation.mutate(r)}
                    disabled={resolutionMutation.isPending}
                    className={`h-8 rounded-xl text-[11px] font-medium ${
                      detail.resolution === r
                        ? r === "RESOLVED"
                          ? "bg-emerald-600 text-white hover:bg-emerald-500"
                          : r === "IGNORED"
                            ? "bg-slate-700 text-white hover:bg-slate-600"
                            : "bg-amber-600 text-white hover:bg-amber-500"
                        : "border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    {r.toLowerCase()}
                  </Button>
                ))}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
