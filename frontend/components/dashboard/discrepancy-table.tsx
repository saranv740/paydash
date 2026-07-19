"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Eye, Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useApiClient } from "@/lib/api-client";
import { DiscrepancyDetail, PaginationMeta, ResolutionType } from "@/lib/types";
import { formatCurrency, formatDate, getDiscrepancyBadge, getResolutionBadge } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DiscrepancyTableProps {
  batchId: string;
  discrepancies: DiscrepancyDetail[];
  pagination: PaginationMeta;
  onSelectDiscrepancy: (id: string) => void;
}

const DISCREPANCY_TYPES = [
  { value: "ALL", label: "All Discrepancy Types" },
  { value: "UNPAID_ORDER", label: "Unpaid Order" },
  { value: "ORPHAN_PAYMENT", label: "Orphan Payment" },
  { value: "PAYMENT_PENDING", label: "Payment Pending" },
  { value: "PAYMENT_FAILED", label: "Payment Failed" },
  { value: "CANCELLED_ORDER_SETTLED", label: "Cancelled Order Settled" },
  { value: "AMOUNT_MISMATCH", label: "Amount Mismatch" },
  { value: "CURRENCY_MISMATCH", label: "Currency Mismatch" },
  { value: "DUPLICATE_CHARGE", label: "Duplicate Charge" },
  { value: "MISSING_PROCESSED_AT", label: "Missing Processed Date" },
  { value: "DUPLICATE_ORDER_ENTRY", label: "Duplicate Order Entry" },
];

const RESOLUTION_STATUSES = [
  { value: "ALL", label: "All Resolutions" },
  { value: "UNRESOLVED", label: "Unresolved" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "IGNORED", label: "Ignored" },
];

export function DiscrepancyTable({
  batchId,
  discrepancies,
  pagination,
  onSelectDiscrepancy,
}: DiscrepancyTableProps) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Search input state
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");

  // Sync state with URL search param
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchTerm(searchParams.get("search") || "");
  }, [searchParams]);

  // Update URL search parameters for filters & pagination inline (SPA style, no scroll jumps)
  const updateParams = (updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, val]) => {
      if (val === undefined || val === "" || val === "ALL") {
        params.delete(key);
      } else {
        params.set(key, String(val));
      }
    });
    router.replace(`/dashboard?${params.toString()}`, { scroll: false });
  };

  // Mutate resolution status
  const resolutionMutation = useMutation({
    mutationFn: async ({ id, resolution }: { id: string; resolution: ResolutionType }) => {
      return await api.updateDiscrepancyResolution(id, resolution);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batch-report", batchId] });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
    },
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ search: searchTerm, page: 1 });
  };

  return (
    <div className="space-y-4">
      {/* Filters & Search Header */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 md:flex-row md:items-center">
        {/* Search Bar */}
        <div className="flex w-full max-w-md flex-1 flex-col gap-1.5">
          <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
            Search Records
          </span>
          <form onSubmit={handleSearchSubmit} className="relative flex w-full items-center">
            <input
              type="text"
              placeholder="Search Order ID, Email, Transaction Ref..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="h-9 w-full rounded-xl border border-slate-800 bg-slate-950 py-2 pr-14 pl-10 text-xs text-white transition-all outline-none placeholder:text-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <Search className="absolute left-3.5 size-4 text-slate-500" />
            <Button
              type="submit"
              className="absolute right-1.5 h-6 rounded-lg border-none bg-slate-800 px-2.5 text-[9px] text-slate-200 hover:bg-slate-700"
            >
              Search
            </Button>
          </form>
        </div>

        {/* Filter Dropdowns */}
        <div className="flex w-full flex-wrap items-center gap-4 md:w-auto">
          {/* Discrepancy Type Filter */}
          <div className="flex min-w-[160px] flex-1 flex-col gap-1.5 sm:flex-initial">
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              Classification
            </span>
            <Select
              value={searchParams.get("discrepancy_type") || "ALL"}
              onValueChange={(val) => updateParams({ discrepancy_type: val || undefined, page: 1 })}
            >
              <SelectTrigger className="h-9 w-full border-slate-800 bg-slate-950 text-xs text-slate-300">
                <SelectValue placeholder="Discrepancy Type" />
              </SelectTrigger>
              <SelectContent className="border-slate-800 bg-slate-950 text-slate-300">
                {DISCREPANCY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Resolution Status Filter */}
          <div className="flex min-w-[140px] flex-1 flex-col gap-1.5 sm:flex-initial">
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              Resolution
            </span>
            <Select
              value={searchParams.get("resolution") || "ALL"}
              onValueChange={(val) => updateParams({ resolution: val || undefined, page: 1 })}
            >
              <SelectTrigger className="h-9 w-full border-slate-800 bg-slate-950 text-xs text-slate-300">
                <SelectValue placeholder="Resolution Status" />
              </SelectTrigger>
              <SelectContent className="border-slate-800 bg-slate-950 text-slate-300">
                {RESOLUTION_STATUSES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Discrepancies Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
        <Table>
          <TableHeader className="border-b border-slate-800 bg-slate-900">
            <TableRow className="border-none hover:bg-slate-900">
              <TableHead className="text-xs font-semibold text-slate-400">
                Issue Classification
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-400">Order Context</TableHead>
              <TableHead className="text-xs font-semibold text-slate-400">
                Payment Settlement
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-400">Amount at Risk</TableHead>
              <TableHead className="text-xs font-semibold text-slate-400">Status</TableHead>
              <TableHead className="text-right text-xs font-semibold text-slate-400">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {discrepancies.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="h-40 text-center text-xs text-slate-500">
                  No discrepancy records match the active filters.
                </TableCell>
              </TableRow>
            ) : (
              discrepancies.map((item) => {
                const badge = getDiscrepancyBadge(item.type);
                const resBadge = getResolutionBadge(item.resolution);

                return (
                  <TableRow
                    key={item.id}
                    className="border-slate-850 hover:bg-slate-850/40 transition-colors"
                  >
                    {/* Discrepancy Type Badge */}
                    <TableCell className="py-3">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </TableCell>

                    {/* Order Information */}
                    <TableCell className="py-3 text-slate-300">
                      {item.order ? (
                        <div className="flex flex-col">
                          <span className="font-mono text-xs font-semibold text-white">
                            {item.order.order_id}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {item.order.customer_email || "No Email"} &bull;{" "}
                            {formatDate(item.order.order_date)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">No Matching Order</span>
                      )}
                    </TableCell>

                    {/* Payment Information */}
                    <TableCell className="py-3 text-slate-300">
                      {item.payment ? (
                        <div className="flex flex-col">
                          <span className="font-mono text-xs font-semibold text-white">
                            {item.payment.transaction_ref}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {item.payment.type || "settlement"} &bull;{" "}
                            {formatDate(item.payment.processed_at)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">
                          No Processor Record
                        </span>
                      )}
                    </TableCell>

                    {/* Value At Risk */}
                    <TableCell className="py-3 font-mono text-xs font-semibold text-rose-400">
                      {formatCurrency(item.amount_at_risk)}
                    </TableCell>

                    {/* Status Badge */}
                    <TableCell className="py-3">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${resBadge.className}`}
                      >
                        {resBadge.label}
                      </span>
                    </TableCell>

                    {/* Actions Menu */}
                    <TableCell className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Inline Resolution Update Dropdown */}
                        <Select
                          value={item.resolution}
                          onValueChange={(val) =>
                            resolutionMutation.mutate({
                              id: item.id,
                              resolution: val as ResolutionType,
                            })
                          }
                          disabled={resolutionMutation.isPending}
                        >
                          <SelectTrigger className="h-7 border-slate-800 bg-slate-900 px-2.5 text-xs text-slate-400 hover:text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-slate-800 bg-slate-950 text-slate-300">
                            <SelectItem value="UNRESOLVED">Unresolved</SelectItem>
                            <SelectItem value="RESOLVED">Resolved</SelectItem>
                            <SelectItem value="IGNORED">Ignored</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Inspect Details Button */}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => onSelectDiscrepancy(item.id)}
                          className="text-indigo-400 hover:bg-indigo-600/10 hover:text-indigo-300"
                          title="Inspect discrepancy parameters"
                        >
                          <Eye className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Pagination Footer */}
        {pagination && pagination.total_pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900 px-6 py-4 text-xs text-slate-400">
            <span>
              Showing Page <strong className="text-white">{pagination.current_page}</strong> of{" "}
              <strong className="text-white">{pagination.total_pages}</strong> (
              {pagination.total_records} records)
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateParams({ page: pagination.current_page - 1 })}
                disabled={pagination.current_page === 1}
                className="border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <ChevronLeft className="size-3.5" data-icon="inline-start" />
                <span>Prev</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => updateParams({ page: pagination.current_page + 1 })}
                disabled={pagination.current_page === pagination.total_pages}
                className="border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <span>Next</span>
                <ChevronRight className="size-3.5" data-icon="inline-end" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
