import { useAuth } from "@clerk/nextjs";
import axios, { AxiosInstance } from "axios";
import { useMemo } from "react";
import {
  ApiResponse,
  BatchReportResponse,
  DiscrepancyDetail,
  LLMExplanation,
  ReportFilterParams,
  ResolutionType,
  UploadBatch,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/v1";

/**
 * Creates an Axios instance with automatic authorization header injection
 */
export function createApiClient(tokenFetcher: () => Promise<string | null>): AxiosInstance {
  const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      "Content-Type": "application/json",
    },
  });

  client.interceptors.request.use(async (config) => {
    try {
      const token = await tokenFetcher();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn("Failed to retrieve auth token for request:", err);
    }
    return config;
  });

  return client;
}

/**
 * React Hook providing type-safe API methods bound to the current Clerk user session
 */
export function useApiClient() {
  const { getToken } = useAuth();

  const api = useMemo(() => {
    const client = createApiClient(() => getToken());

    return {
      // 1. Upload reconciliation batch CSVs
      async uploadBatch(ordersFile: File, paymentsFile: File, name?: string) {
        const formData = new FormData();
        formData.append("orders", ordersFile);
        formData.append("payments", paymentsFile);
        if (name) {
          formData.append("name", name);
        }

        const res = await client.post<
          ApiResponse<{ batch: UploadBatch; discrepancies_count: number }>
        >("/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        return res.data.data;
      },

      // 2. Fetch all reconciliation upload runs
      async listBatches() {
        const res =
          await client.get<ApiResponse<{ batches: UploadBatch[]; total: number }>>("/batches");
        return res.data.data?.batches || [];
      },

      // 3. Get full batch report with filters and pagination
      async getBatchReport(batchId: string, params: ReportFilterParams = {}) {
        const res = await client.get<ApiResponse<BatchReportResponse>>(
          `/batches/${batchId}/report`,
          {
            params: {
              page: params.page || 1,
              page_size: params.page_size || 20,
              search: params.search || undefined,
              discrepancy_type: params.discrepancy_type || undefined,
              resolution: params.resolution || undefined,
              min_amount: params.min_amount || undefined,
              max_amount: params.max_amount || undefined,
              sort_by: params.sort_by || undefined,
              sort_order: params.sort_order || undefined,
            },
          },
        );
        return res.data.data;
      },

      // 4. Update display name of batch
      async updateBatchName(batchId: string, name: string) {
        const res = await client.patch<ApiResponse<{ id: string; name: string }>>(
          `/batches/${batchId}`,
          { name },
        );
        return res.data.data;
      },

      // 5. Delete upload batch run
      async deleteBatch(batchId: string) {
        const res = await client.delete<ApiResponse<{ id: string; message: string }>>(
          `/batches/${batchId}`,
        );
        return res.data.data;
      },

      // 6. Get discrepancy detail with joined Order and Payment
      async getDiscrepancyDetail(id: string) {
        const res = await client.get<ApiResponse<DiscrepancyDetail>>(`/discrepancies/${id}`);
        return res.data.data;
      },

      // 7. Update discrepancy resolution state
      async updateDiscrepancyResolution(id: string, resolution: ResolutionType) {
        const res = await client.patch<ApiResponse<{ id: string; resolution: ResolutionType }>>(
          `/discrepancies/${id}/resolution`,
          { resolution },
        );
        return res.data.data;
      },

      // 8. Generate AI root-cause explanation via backend LLM
      async explainDiscrepancy(id: string) {
        const res = await client.get<ApiResponse<LLMExplanation>>(`/discrepancies/${id}/explain`);
        return res.data.data;
      },
    };
  }, [getToken]);

  return api;
}
