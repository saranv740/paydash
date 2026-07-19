"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Cpu, Loader2 } from "lucide-react";
import { useState } from "react";
import { useApiClient } from "@/lib/api-client";
import { ResolutionType } from "@/lib/types";
import {
	formatCurrency,
	formatDate,
	getDiscrepancyBadge,
	getResolutionBadge,
} from "@/lib/utils";
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

export function DiscrepancyDrawer({
	discrepancyId,
	onClose,
	batchId,
}: DiscrepancyDrawerProps) {
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
			<SheetContent className="sm:max-w-xl bg-slate-900 border-l border-slate-800 text-slate-100 p-0 flex flex-col h-full">
				{isLoadingDetail || !detail ? (
					<div className="p-6 space-y-6 flex-1 overflow-y-auto">
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
						<SheetHeader className="p-6 border-b border-slate-850 flex flex-col gap-3">
							<div className="flex items-center gap-2">
								<span
									className={`px-2.5 py-1 rounded-full text-[10px] font-medium border ${badge?.className}`}
								>
									{badge?.label}
								</span>
								<span
									className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${resBadge?.className}`}
								>
									{resBadge?.label}
								</span>
							</div>
							<div>
								<SheetTitle className="text-lg font-bold text-white tracking-tight">
									Transaction Audit Inspector
								</SheetTitle>
								<SheetDescription className="text-xs text-slate-400">
									Case ID:{" "}
									<code className="font-mono text-indigo-400">{detail.id}</code>
								</SheetDescription>
							</div>
						</SheetHeader>

						{/* Scrollable details */}
						<div className="flex-1 overflow-y-auto p-6 space-y-6">
							{/* Value at Risk Banner */}
							<div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center gap-3">
								<div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-400">
									<AlertTriangle className="size-5" />
								</div>
								<div>
									<p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
										Unreconciled Value at Risk
									</p>
									<p className="text-xl font-extrabold text-rose-400 font-mono">
										{formatCurrency(detail.amount_at_risk)}
									</p>
								</div>
							</div>

							{/* Side-by-Side Audit Card Stack */}
							<div className="flex flex-col gap-4">
								{/* 1. Order Record Details */}
								<div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3 relative overflow-hidden">
									<div className="absolute top-0 right-0 w-24 h-full bg-indigo-500/5 blur-xl pointer-events-none" />
									<h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
										<CheckCircle2 className="size-3.5" />
										<span>Order System Record</span>
									</h3>

									{detail.order ? (
										<div className="grid grid-cols-2 gap-3 text-xs">
											<div>
												<p className="text-slate-500">Order ID</p>
												<p className="font-mono font-semibold text-slate-200 truncate">
													{detail.order.order_id}
												</p>
											</div>
											<div>
												<p className="text-slate-500">Customer Email</p>
												<p className="font-semibold text-slate-200 truncate">
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
													{formatCurrency(
														detail.order.net_amount,
														detail.order.currency || "USD",
													)}
												</p>
											</div>
											<div>
												<p className="text-slate-500">Order Status</p>
												<p className="font-semibold capitalize text-slate-300">
													{detail.order.status || "N/A"}
												</p>
											</div>
											<div>
												<p className="text-slate-500">Currency</p>
												<p className="font-semibold font-mono text-slate-300">
													{detail.order.currency || "USD"}
												</p>
											</div>
										</div>
									) : (
										<div className="p-4 rounded-xl bg-slate-900/40 border border-dashed border-slate-800 text-center text-xs text-slate-500">
											No corresponding entry was found in the order log
											database.
										</div>
									)}
								</div>

								{/* 2. Payment Record Details */}
								<div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3 relative overflow-hidden">
									<div className="absolute top-0 right-0 w-24 h-full bg-violet-500/5 blur-xl pointer-events-none" />
									<h3 className="text-xs font-bold text-violet-400 uppercase tracking-wider flex items-center gap-1.5">
										<CheckCircle2 className="size-3.5" />
										<span>Payment Processor Record</span>
									</h3>

									{detail.payment ? (
										<div className="grid grid-cols-2 gap-3 text-xs">
											<div>
												<p className="text-slate-500">Transaction Ref</p>
												<p className="font-mono font-semibold text-slate-200 truncate">
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
													{formatCurrency(
														detail.payment.amount,
														detail.payment.currency || "USD",
													)}
												</p>
											</div>
											<div>
												<p className="text-slate-500">Settlement Status</p>
												<p className="font-semibold capitalize text-slate-300">
													{detail.payment.status || "N/A"}
												</p>
											</div>
											<div>
												<p className="text-slate-500">Processing Fee</p>
												<p className="font-semibold font-mono text-slate-300">
													{formatCurrency(
														detail.payment.fee,
														detail.payment.currency || "USD",
													)}
												</p>
											</div>
										</div>
									) : (
										<div className="p-4 rounded-xl bg-slate-900/40 border border-dashed border-slate-800 text-center text-xs text-slate-500">
											No corresponding settlement was reported by the payment
											processor.
										</div>
									)}
								</div>
							</div>

							{/* AI Roots Analysis Section */}
							<div className="border-t border-slate-850 pt-5 space-y-4">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<Cpu className="size-4.5 text-indigo-400" />
										<h4 className="text-sm font-bold text-white">
											AI Case Explanation
										</h4>
									</div>
									{!aiExplanation && (
										<Button
											onClick={handleTriggerAi}
											disabled={isAiLoading}
											size="sm"
											className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium gap-1 text-[11px]"
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
									<div className="p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-2.5">
										<div className="flex items-center gap-2 text-xs text-slate-400">
											<Loader2 className="size-3.5 animate-spin text-indigo-500" />
											<span>
												AI Engine is reviewing records and synthesizing
												root-cause variables...
											</span>
										</div>
										<Skeleton className="h-4 w-3/4 bg-slate-800" />
										<Skeleton className="h-4 w-1/2 bg-slate-800" />
									</div>
								)}

								{aiExplanation && (
									<div className="space-y-4 animate-in fade-in duration-200">
										{/* Summary & Root Cause */}
										<div className="p-4 rounded-2xl bg-slate-950 border border-slate-850 space-y-3 text-xs leading-relaxed">
											<div className="space-y-1">
												<span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
													Case Summary
												</span>
												<p className="text-slate-300">
													{aiExplanation.summary}
												</p>
											</div>
											<div className="space-y-1">
												<span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
													Likely Root Cause
												</span>
												<p className="text-slate-300">
													{aiExplanation.root_cause}
												</p>
											</div>
											<div className="space-y-1">
												<span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">
													Business Impact
												</span>
												<p className="text-slate-300">
													{aiExplanation.business_impact}
												</p>
											</div>
										</div>

										{/* Recommended Actions Checklists */}
										<div className="p-4 rounded-2xl bg-slate-950 border border-slate-850 space-y-2.5">
											<span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
												Recommended Next Steps
											</span>
											<div className="space-y-2">
												{aiExplanation.recommended_actions.map((act, index) => (
													<div
														key={index}
														className="flex items-start gap-2.5 text-xs text-slate-300"
													>
														<span className="h-4 w-4 shrink-0 rounded bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-[10px] mt-0.5">
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
						<div className="p-6 border-t border-slate-850 bg-slate-950/40 flex items-center justify-between gap-4">
							<div className="flex flex-col gap-0.5">
								<span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
									Set Case Resolution
								</span>
								<span className="text-xs text-slate-400">
									Mark resolution state of this audit log.
								</span>
							</div>
							<div className="flex items-center gap-2">
								{(
									["UNRESOLVED", "RESOLVED", "IGNORED"] as ResolutionType[]
								).map((r) => (
									<Button
										key={r}
										variant={detail.resolution === r ? "default" : "outline"}
										size="sm"
										onClick={() => resolutionMutation.mutate(r)}
										disabled={resolutionMutation.isPending}
										className={`text-[11px] font-medium rounded-xl h-8 ${
											detail.resolution === r
												? r === "RESOLVED"
													? "bg-emerald-600 hover:bg-emerald-500 text-white"
													: r === "IGNORED"
														? "bg-slate-700 hover:bg-slate-600 text-white"
														: "bg-amber-600 hover:bg-amber-500 text-white"
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
