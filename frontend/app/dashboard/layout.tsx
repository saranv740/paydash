"use client";

import { useState } from "react";
import { Navbar } from "@/components/layout/navbar";
import { UploadModal } from "@/components/dashboard/upload-modal";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar onOpenUploadModal={() => setIsUploadOpen(true)} />

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
      />

      {/* Main Dashboard Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 bg-slate-950 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
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

