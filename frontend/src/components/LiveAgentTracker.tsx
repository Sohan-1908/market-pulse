"use client";

import { motion } from "framer-motion";
import {
  Globe,
  BarChart3,
  FileText,
  CheckCircle2,
  Loader2,
  Eye,
  Sparkles,
  Download,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface LiveAgentTrackerProps {
  isSearching: boolean;
  currentStep: number; // 0: Researcher, 1: Analyst, 2: Writer, 3: Complete
  statusMsg: string;
  completedReportId?: string | null;
  completedPdfUrl?: string | null;
  onOpenReport?: () => void;
  onOpenChat?: () => void;
  onReset?: () => void;
}

const STEPS = [
  { id: "researcher", title: "Researcher", subtitle: "Scraping web sources", icon: Globe },
  { id: "analyst", title: "Analyst", subtitle: "Verifying facts and citations", icon: BarChart3 },
  { id: "writer", title: "Writer", subtitle: "Writing the PDF dossier", icon: FileText },
  { id: "complete", title: "Complete", subtitle: "Dossier ready", icon: CheckCircle2 },
];

export default function LiveAgentTracker({
  isSearching,
  currentStep,
  statusMsg,
  completedReportId,
  completedPdfUrl,
  onOpenReport,
  onOpenChat,
  onReset,
}: LiveAgentTrackerProps) {
  const isComplete = Boolean(completedReportId) && !isSearching;
  // Errors are set on statusMsg while the pipeline is idle, so show them instead of the idle text.
  const isError = !isSearching && /^(Error|Failed|Connection lost)/.test(statusMsg);

  const progressPercent = isComplete
    ? 100
    : isSearching
    ? Math.min(100, Math.max(8, ((currentStep + 0.6) / STEPS.length) * 100))
    : 0;

  const message = isSearching
    ? statusMsg
    : isError
    ? statusMsg
    : isComplete
    ? "Research complete. Citations verified and dossier compiled."
    : "Enter a topic above to start.";

  return (
    <section
      aria-label="Research progress"
      className="w-full overflow-hidden rounded-xl border border-border bg-card"
    >
      {/* Slim progress bar along the top edge */}
      <div className="h-0.5 bg-border">
        <div
          className="h-full bg-primary transition-[width] duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-foreground">Research progress</h2>

          {isSearching ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-accent px-2.5 py-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              Step {Math.min(currentStep + 1, STEPS.length)} of {STEPS.length}
            </span>
          ) : isComplete ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 px-2.5 py-1 text-xs text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              Complete
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Ready
            </span>
          )}
        </div>

        {/* Steps */}
        <ol className="grid grid-cols-1 gap-2.5 sm:grid-cols-4">
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const active = isSearching && idx === currentStep;
            const past = isComplete || (isSearching && idx < currentStep);

            return (
              <li
                key={step.id}
                className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                  active
                    ? "border-primary/40 bg-accent"
                    : past
                    ? "border-emerald-500/25 bg-background/40"
                    : "border-border bg-background/40"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                    active
                      ? "bg-primary/15 text-primary"
                      : past
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-accent text-slate-400"
                  }`}
                >
                  {past ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : active ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${active || past ? "text-foreground" : "text-slate-300"}`}>
                    {step.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{step.subtitle}</p>
                </div>
              </li>
            );
          })}
        </ol>

        {/* Completion actions */}
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"
          >
            <span className="text-sm text-emerald-400">Your dossier is ready.</span>
            <div className="flex items-center gap-2">
              {onOpenReport && (
                <Button size="sm" onClick={onOpenReport} className="h-8 px-3 text-sm">
                  <Eye className="mr-1.5 h-3.5 w-3.5" /> Read dossier
                </Button>
              )}
              {onOpenChat && (
                <Button size="sm" variant="outline" onClick={onOpenChat} className="h-8 px-3 text-sm">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5 text-primary" /> Ask questions
                </Button>
              )}
              {completedPdfUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(completedPdfUrl, "_blank")}
                  className="h-8 px-3 text-sm"
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" /> PDF
                </Button>
              )}
              {onReset && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onReset}
                  aria-label="Start over"
                  title="Start over"
                  className="h-8 w-8 p-0 text-muted-foreground"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </motion.div>
        )}

        {/* Status line */}
        <div
          aria-live="polite"
          className={`flex items-center gap-2 border-t border-border pt-4 text-sm ${
            isError ? "text-red-400" : "text-muted-foreground"
          }`}
        >
          {isSearching && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />}
          <span className="truncate">{message}</span>
        </div>
      </div>
    </section>
  );
}
