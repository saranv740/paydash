"use client";

import { useState } from "react";
import { Navbar } from "@/components/layout/navbar";
import { UploadModal } from "@/components/dashboard/upload-modal";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar onOpenUploadModal={() => setIsUploadOpen(true)} />

      {/* Upload Modal */}
      <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />

      {/* Main Dashboard Content Area */}
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
          <span>&copy; {new Date().getFullYear()} Paydash Reconciliation Engine</span>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Deterministic Matching</span>
            <span>&bull;</span>
            <span>AI Root Cause Analysis</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
