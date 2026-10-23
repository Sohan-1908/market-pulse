"use client";

import { useState } from "react";
import {
  Search,
  Download,
  MessageSquare,
  Trash2,
  RefreshCw,
  FolderOpen,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Report } from "@/types";
import { API_BASE_URL } from "@/lib/supabase";

interface HistoryViewProps {
  reports: Report[];
  isLoading: boolean;
  onRefresh: () => void;
  onSelectReport: (report: Report, tab?: "dossier" | "chat") => void;
  onDeleteReport: (reportId: string) => void;
  onNavigateHome: () => void;
}

export default function HistoryView({
  reports,
  isLoading,
  onRefresh,
  onSelectReport,
  onDeleteReport,
  onNavigateHome,
}: HistoryViewProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredReports = reports.filter((r) =>
    r.topic.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 py-4 sm:py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">History</h1>
          <p className="text-sm text-muted-foreground">
            Your saved research dossiers. Open one to read it or ask follow-up questions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-10 px-3 text-sm"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={onNavigateHome} className="h-10 px-4 text-sm font-semibold">
            <Plus className="mr-1.5 h-4 w-4" /> New research
          </Button>
        </div>
      </div>

      {/* Filter */}
      {reports.length > 0 && (
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Filter reports"
            placeholder="Filter by topic or company"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 rounded-lg border-border bg-card pl-10 text-sm placeholder:text-slate-500"
          />
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-44 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      )}

      {/* Empty */}
      {!isLoading && reports.length === 0 && (
        <div className="mx-auto max-w-lg rounded-xl border border-border bg-card px-6 py-14 text-center">
          <FolderOpen className="mx-auto mb-4 h-8 w-8 text-muted-foreground" />
          <h2 className="mb-1.5 text-lg font-semibold">No reports yet</h2>
          <p className="mx-auto mb-6 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Finished research dossiers are saved here. Run your first research to see one.
          </p>
          <Button onClick={onNavigateHome} className="h-10 px-5 text-sm font-semibold">
            Start research
          </Button>
        </div>
      )}

      {/* No filter matches */}
      {!isLoading && reports.length > 0 && filteredReports.length === 0 && (
        <div className="py-16 text-center text-muted-foreground">
          <p className="text-sm">No reports match &ldquo;{searchQuery}&rdquo;.</p>
          <Button
            variant="ghost"
            onClick={() => setSearchQuery("")}
            className="mt-2 text-sm text-primary"
          >
            Clear filter
          </Button>
        </div>
      )}

      {/* Reports */}
      {!isLoading && filteredReports.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredReports.map((report) => {
            const formattedDate = report.created_at
              ? new Date(report.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "Recent";

            const pdfUrl = report.pdf_url || `${API_BASE_URL}/api/reports/${report.id}.pdf`;

            return (
              <article
                key={report.id}
                className="flex flex-col justify-between gap-5 rounded-xl border border-border bg-card p-5 transition-colors hover:border-slate-600"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="capitalize">{report.depth || "standard"} depth</span>
                    <time>{formattedDate}</time>
                  </div>

                  <h2 className="text-base font-semibold leading-snug">
                    <button
                      type="button"
                      onClick={() => onSelectReport(report, "dossier")}
                      className="line-clamp-2 cursor-pointer text-left transition-colors hover:text-primary"
                    >
                      {report.topic}
                    </button>
                  </h2>

                  {report.focus && report.focus.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {report.focus.slice(0, 3).map((f) => (
                        <span
                          key={f}
                          className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground"
                        >
                          {f}
                        </span>
                      ))}
                      {report.focus.length > 3 && (
                        <span className="px-1 py-0.5 text-xs text-slate-500">
                          +{report.focus.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-border pt-4">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => onSelectReport(report, "dossier")}
                      className="h-8 px-3 text-sm"
                    >
                      Read report
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSelectReport(report, "chat")}
                      aria-label="Ask questions about this report"
                      title="Ask questions"
                      className="h-8 w-8 p-0"
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-primary" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(pdfUrl, "_blank")}
                      aria-label="Download PDF"
                      title="Download PDF"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDeleteReport(report.id)}
                      aria-label="Delete report"
                      title="Delete report"
                      className="h-8 w-8 p-0 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
