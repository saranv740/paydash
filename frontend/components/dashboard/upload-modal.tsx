"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, FileSpreadsheet, Loader2, UploadCloud } from "lucide-react";
import { useApiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const router = useRouter();

  const [name, setName] = useState("");
  const [ordersFile, setOrdersFile] = useState<File | null>(null);
  const [paymentsFile, setPaymentsFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Dropzone for orders.csv
  const {
    getRootProps: getOrdersRootProps,
    getInputProps: getOrdersInputProps,
    isDragActive: isOrdersDragActive,
  } = useDropzone({
    accept: { "text/csv": [".csv"] },
    multiple: false,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setOrdersFile(acceptedFiles[0]);
        setErrorMsg(null);
      }
    },
  });

  // Dropzone for payments.csv
  const {
    getRootProps: getPaymentsRootProps,
    getInputProps: getPaymentsInputProps,
    isDragActive: isPaymentsDragActive,
  } = useDropzone({
    accept: { "text/csv": [".csv"] },
    multiple: false,
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setPaymentsFile(acceptedFiles[0]);
        setErrorMsg(null);
      }
    },
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!ordersFile) throw new Error("Please select the orders.csv file");
      if (!paymentsFile) throw new Error("Please select the payments.csv file");

      return await api.uploadBatch(ordersFile, paymentsFile, name.trim() || "Reconciliation Run");
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      onClose();
      // Reset form
      setOrdersFile(null);
      setPaymentsFile(null);
      setName("");
      setErrorMsg(null);

      if (data?.batch?.id) {
        router.push(`/dashboard?batch_id=${data.batch.id}`);
      }
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (err: any) => {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.data?.orders ||
        err?.response?.data?.data?.payments ||
        err?.message ||
        "Failed to upload and reconcile datasets. Please check file format.";
      setErrorMsg(msg);
    },
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !uploadMutation.isPending && !open && onClose()}>
      <DialogContent
        className="rounded-3xl border-slate-800 bg-slate-900 p-6 text-slate-100 sm:max-w-2xl sm:p-8"
        showCloseButton={false}
      >
        <DialogHeader className="border-slate-850 flex flex-row items-center gap-3 border-b pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
            <UploadCloud className="size-5" />
          </div>
          <div className="flex flex-col gap-0.5">
            <DialogTitle className="text-xl font-bold tracking-tight text-white">
              New Reconciliation Run
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Upload your store orders and payment processor CSV exports.
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Error Alert */}
        {errorMsg && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <div className="flex flex-col gap-1">
              <span className="block font-semibold">Upload Failed</span>
              <span>{errorMsg}</span>
            </div>
          </div>
        )}

        {/* Form Body */}
        <div className="flex flex-col gap-5 py-2">
          {/* Run Name Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold tracking-wider text-slate-300 uppercase">
              Run Title (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. July 2026 Monthly Settlement"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={uploadMutation.isPending}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-white transition-all outline-none placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Dual Dropzone Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Orders Dropzone */}
            <div className="flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-slate-300 uppercase">
                <FileSpreadsheet className="size-3.5 text-indigo-400" />
                <span>Orders Export (`orders.csv`)</span>
              </span>

              {ordersFile ? (
                <div className="group flex items-center justify-between rounded-2xl border border-indigo-500/40 bg-slate-950 p-4">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <CheckCircle2 className="size-5 shrink-0 text-emerald-400" />
                    <div className="truncate">
                      <p className="truncate text-xs font-medium text-white">{ordersFile.name}</p>
                      <p className="font-mono text-[10px] text-slate-400">
                        {formatFileSize(ordersFile.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setOrdersFile(null)}
                    disabled={uploadMutation.isPending}
                    className="text-slate-500 hover:text-red-400"
                  >
                    <XIcon className="size-3.5" />
                  </Button>
                </div>
              ) : (
                <div
                  {...getOrdersRootProps()}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
                    isOrdersDragActive
                      ? "border-indigo-500 bg-indigo-500/10"
                      : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                  }`}
                >
                  <input {...getOrdersInputProps()} />
                  <FileSpreadsheet className="size-7 text-slate-500" />
                  <p className="text-xs font-medium text-slate-300">
                    Drag & drop <code className="text-indigo-400">orders.csv</code>
                  </p>
                  <p className="text-[10px] text-slate-500">or click to browse file</p>
                </div>
              )}
            </div>

            {/* Payments Dropzone */}
            <div className="flex flex-col gap-1.5">
              <span className="flex items-center gap-1.5 text-xs font-semibold tracking-wider text-slate-300 uppercase">
                <FileSpreadsheet className="size-3.5 text-violet-400" />
                <span>Payments Export (`payments.csv`)</span>
              </span>

              {paymentsFile ? (
                <div className="group flex items-center justify-between rounded-2xl border border-violet-500/40 bg-slate-950 p-4">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <CheckCircle2 className="size-5 shrink-0 text-emerald-400" />
                    <div className="truncate">
                      <p className="truncate text-xs font-medium text-white">{paymentsFile.name}</p>
                      <p className="font-mono text-[10px] text-slate-400">
                        {formatFileSize(paymentsFile.size)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setPaymentsFile(null)}
                    disabled={uploadMutation.isPending}
                    className="text-slate-500 hover:text-red-400"
                  >
                    <XIcon className="size-3.5" />
                  </Button>
                </div>
              ) : (
                <div
                  {...getPaymentsRootProps()}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition-all ${
                    isPaymentsDragActive
                      ? "border-violet-500 bg-violet-500/10"
                      : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                  }`}
                >
                  <input {...getPaymentsInputProps()} />
                  <FileSpreadsheet className="size-7 text-slate-500" />
                  <p className="text-xs font-medium text-slate-300">
                    Drag & drop <code className="text-violet-400">payments.csv</code>
                  </p>
                  <p className="text-[10px] text-slate-500">or click to browse file</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="flex items-center justify-end gap-3 border-t border-slate-800/80 pt-4">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={uploadMutation.isPending}
            className="bg-slate-850 border-slate-800"
          >
            Cancel
          </Button>

          <Button
            onClick={() => uploadMutation.mutate()}
            disabled={!ordersFile || !paymentsFile || uploadMutation.isPending}
            className="bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500"
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Processing & Reconciling...</span>
              </>
            ) : (
              <>
                <UploadCloud data-icon="inline-start" />
                <span>Start Reconciliation</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Custom simple helper icons
function XIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}
