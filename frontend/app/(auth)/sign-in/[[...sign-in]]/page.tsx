import { SignIn } from "@clerk/nextjs";
import { CheckCircle2, ShieldCheck, Zap } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white lg:flex-row">
      {/* Left side: Feature Showcase & Branding */}
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden border-r border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 p-12 lg:flex">
        {/* Ambient background glows */}
        <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 -right-40 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/30">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">Paydash</span>
        </div>

        {/* Value Proposition */}
        <div className="relative z-10 max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3.5 py-1.5 text-xs font-medium text-indigo-400">
            <Zap className="h-3.5 w-3.5" />
            <span>Deterministic Financial Reconciliation</span>
          </div>
          <h1 className="text-4xl leading-tight font-extrabold tracking-tight text-white">
            Stop revenue leakage before it costs your business.
          </h1>
          <p className="text-base leading-relaxed text-slate-400">
            Automatically ingest{" "}
            <code className="rounded border border-slate-800 bg-slate-900 px-1.5 py-0.5 font-mono text-xs text-indigo-300">
              orders.csv
            </code>{" "}
            and{" "}
            <code className="rounded border border-slate-800 bg-slate-900 px-1.5 py-0.5 font-mono text-xs text-indigo-300">
              payments.csv
            </code>
            , discover discrepancies in seconds, and leverage AI root-cause analysis.
          </p>

          {/* Feature Bullets */}
          <div className="space-y-3 pt-2">
            {[
              "100% Deterministic record matching & discrepancy classification",
              "AI-powered root cause explanations & resolution workflows",
              "Complete financial risk breakdown & discrepancy audit trail",
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3 text-sm text-slate-300">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-indigo-400" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="relative z-10 flex items-center justify-between border-t border-slate-800/60 pt-6 text-xs text-slate-500">
          <span>&copy; {new Date().getFullYear()} Paydash Reconciliation Engine</span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            System Status: Operational
          </span>
        </div>
      </div>

      {/* Right side: Clerk Sign-In Form */}
      <div className="relative flex flex-1 flex-col items-center justify-center bg-slate-950 p-6 sm:p-12">
        {/* Mobile Header Logo */}
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/30">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">Paydash</span>
        </div>

        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-2xl font-bold tracking-tight text-white">Welcome back</h2>
            <p className="text-sm text-slate-400">
              Sign in to your account to view reconciliation runs.
            </p>
          </div>

          <div className="flex justify-center lg:justify-start">
            <SignIn
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
