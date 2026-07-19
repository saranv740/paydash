import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { DiscrepancyType, ResolutionType } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats monetary amounts into clean USD/currency string
 */
export function formatCurrency(
  amount: string | number | null | undefined,
  currency: string = "USD",
): string {
  if (!amount) return "$0.00";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "$0.00";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Formats ISO date string into readable format
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "N/A";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "N/A";
  }
}

/**
 * Returns human readable label for discrepancy type
 */
export function getDiscrepancyLabel(type: DiscrepancyType): string {
  const map: Record<DiscrepancyType, string> = {
    UNPAID_ORDER: "Unpaid Order",
    ORPHAN_PAYMENT: "Orphan Payment",
    PAYMENT_PENDING: "Payment Pending",
    PAYMENT_FAILED: "Payment Failed",
    CANCELLED_ORDER_SETTLED: "Cancelled Order Settled",
    AMOUNT_MISMATCH: "Amount Mismatch",
    CURRENCY_MISMATCH: "Currency Mismatch",
    DUPLICATE_CHARGE: "Duplicate Charge",
    MISSING_PROCESSED_AT: "Missing Processed Date",
    DUPLICATE_ORDER_ENTRY: "Duplicate Order Entry",
  };
  return map[type] || type;
}

/**
 * Returns badge styling classes and severity tag for discrepancy types
 */
export function getDiscrepancyBadge(type: DiscrepancyType): {
  label: string;
  className: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
} {
  switch (type) {
    case "DUPLICATE_CHARGE":
    case "CANCELLED_ORDER_SETTLED":
      return {
        label: getDiscrepancyLabel(type),
        className: "bg-red-500/10 text-red-400 border-red-500/30",
        severity: "CRITICAL",
      };
    case "UNPAID_ORDER":
    case "ORPHAN_PAYMENT":
    case "AMOUNT_MISMATCH":
      return {
        label: getDiscrepancyLabel(type),
        className: "bg-amber-500/10 text-amber-400 border-amber-500/30",
        severity: "HIGH",
      };
    case "PAYMENT_FAILED":
    case "CURRENCY_MISMATCH":
      return {
        label: getDiscrepancyLabel(type),
        className: "bg-orange-500/10 text-orange-400 border-orange-500/30",
        severity: "MEDIUM",
      };
    default:
      return {
        label: getDiscrepancyLabel(type),
        className: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
        severity: "LOW",
      };
  }
}

/**
 * Returns badge styling classes for resolution status
 */
export function getResolutionBadge(resolution: ResolutionType): {
  label: string;
  className: string;
} {
  switch (resolution) {
    case "RESOLVED":
      return {
        label: "Resolved",
        className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      };
    case "IGNORED":
      return {
        label: "Ignored",
        className: "bg-slate-500/10 text-slate-400 border-slate-500/30",
      };
    default:
      return {
        label: "Unresolved",
        className: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      };
  }
}
