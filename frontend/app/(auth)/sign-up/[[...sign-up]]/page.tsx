import { SignUp } from "@clerk/nextjs";
import { CheckCircle2, ShieldCheck, Zap } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Left side: Feature Showcase & Branding */}
      <div className="relative flex-1 hidden lg:flex flex-col justify-between p-12 overflow-hidden border-r border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40">
        {/* Ambient background glows */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">
            Paydash
          </span>
        </div>

        {/* Value Proposition */}
        <div className="relative z-10 max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-medium text-indigo-400">
            <Zap className="h-3.5 w-3.5" />
            <span>Automated Payment Reconciliation</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white leading-tight">
            Get instant clarity on your order & payment discrepancies.
          </h1>
          <p className="text-slate-400 text-base leading-relaxed">
            Create an account to start uploading payment datasets, isolating missing transactions, and generating AI resolution reports.
          </p>

          {/* Feature Bullets */}
          <div className="space-y-3 pt-2">
            {[
              "Multi-tenant data isolation & secure user auth",
              "Instant batch processing with zero matching false positives",
              "Exportable audit logs & plain-language AI summaries",
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3 text-sm text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-xs text-slate-500 flex items-center justify-between border-t border-slate-800/60 pt-6">
          <span>&copy; {new Date().getFullYear()} Paydash Reconciliation Platform</span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            System Status: Operational
          </span>
        </div>
      </div>

      {/* Right side: Clerk Sign-Up Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 relative bg-slate-950">
        {/* Mobile Header Logo */}
        <div className="lg:hidden flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">
            Paydash
          </span>
        </div>

        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2 lg:text-left">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Create your account
            </h2>
            <p className="text-sm text-slate-400">
              Sign up to get started with payment reconciliation.
            </p>
          </div>

          <div className="flex justify-center lg:justify-start">
            <SignUp
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl rounded-2xl w-full p-6 sm:p-8",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  socialButtonsBlockButton:
                    "bg-slate-800 hover:bg-slate-700/80 border-slate-700 text-white transition-all duration-200",
                  socialButtonsBlockButtonText: "text-slate-200 font-medium",
                  dividerLine: "bg-slate-800",
                  dividerText: "text-slate-500 text-xs uppercase tracking-wider",
                  formFieldLabel: "text-slate-300 font-medium text-xs uppercase tracking-wider",
                  formFieldInput:
                    "bg-slate-950 border-slate-800 text-white rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all",
                  formButtonPrimary:
                    "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/25 rounded-xl font-medium transition-all duration-200 py-2.5",
                  footerActionLink: "text-indigo-400 hover:text-indigo-300 font-medium",
                  footerActionText: "text-slate-400",
                  identityPreviewText: "text-slate-200",
                  formFieldAction: "text-indigo-400 hover:text-indigo-300",
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
