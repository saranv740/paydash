export type DiscrepancyType =
  | "UNPAID_ORDER"
  | "ORPHAN_PAYMENT"
  | "PAYMENT_PENDING"
  | "PAYMENT_FAILED"
  | "CANCELLED_ORDER_SETTLED"
  | "AMOUNT_MISMATCH"
  | "CURRENCY_MISMATCH"
  | "DUPLICATE_CHARGE"
  | "MISSING_PROCESSED_AT"
  | "DUPLICATE_ORDER_ENTRY";

export type ResolutionType = "RESOLVED" | "UNRESOLVED" | "IGNORED";

export interface UploadBatch {
  id: string;
  owner_id: string;
  name: string;
  total_orders_count: number;
  total_orders_amount: string;
  total_payments_count: number;
  total_payments_amount: string;
  reconciled_amount: string;
  dispute_amount: string;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  owner_id: string;
  batch_id: string;
  order_id: string;
  order_date: string | null;
  customer_email: string | null;
  currency: string | null;
  gross_amount: string | null;
  discount: string | null;
  net_amount: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  owner_id: string;
  batch_id: string;
  transaction_ref: string;
  processed_at: string | null;
  order_id: string | null;
  currency: string | null;
  amount: string | null;
  fee: string | null;
  net_settled: string | null;
  type: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiscrepancyDetail {
  id: string;
  batch_id: string;
  type: DiscrepancyType;
  amount_at_risk: string;
  explanation: string | null;
  resolution: ResolutionType;
  created_at: string;
  order?: Order | null;
  payment?: Payment | null;
}

export interface DiscrepancyBreakdown {
  type: DiscrepancyType;
  count: number;
  total_amount_at_risk: string;
  percentage_of_total_risk: number;
}

export interface PaginationMeta {
  current_page: number;
  page_size: number;
  total_records: number;
  total_pages: number;
}

export interface BatchReportResponse {
  batch: UploadBatch;
  breakdown: DiscrepancyBreakdown[];
  discrepancies: DiscrepancyDetail[];
  pagination: PaginationMeta;
}

export interface LLMExplanation {
  summary: string;
  root_cause: string;
  business_impact: string;
  recommended_actions: string[];
}

export interface ReportFilterParams {
  page?: number;
  page_size?: number;
  search?: string;
  discrepancy_type?: string;
  resolution?: string;
  min_amount?: number;
  max_amount?: number;
  sort_by?: string;
  sort_order?: string;
}

export interface ApiResponse<T> {
  status: "success" | "fail" | "error";
  data?: T;
  message?: string;
}
