"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ChevronRight, FileText, Loader2, Search } from "lucide-react";
import Navbar from "@/components/Navbar";
import HistoryView from "@/components/HistoryView";
import LiveAgentTracker from "@/components/LiveAgentTracker";
import ReportViewerModal from "@/components/ReportViewerModal";
import SupabaseSetupModal from "@/components/SupabaseSetupModal";
import { Report, CustomizationSettings, SystemStatus } from "@/types";
import {
  getLiveReports,
  getLiveReportById,
  deleteLiveReport,
  getSystemStatus,
  API_BASE_URL,
} from "@/lib/supabase";

const DEFAULT_SETTINGS: CustomizationSettings = {
  depth: "standard",
  sources: ["News", "Research Papers", "Company Sites", "Reports"],
  timeRange: "1y",
  focus: ["Competitors", "Market Trends", "Opportunities", "Risks"],
  format: "full",
};

const EXAMPLE_QUERIES = [
  "EV charging in India",
  "Generative AI startups",
  "Digital payments in Southeast Asia",
];

export default function App({
  initialTab = "home",
}: {
  initialTab?: "home" | "history";
} = {}) {
  const [currentTab, setCurrentTab] = useState<"home" | "history">(initialTab);
  const [query, setQuery] = useState("");
  const settings = DEFAULT_SETTINGS;

  // Pipeline state
  const [isSearching, setIsSearching] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [statusMsg, setStatusMsg] = useState("Pipeline Ready");
  const [completedReportId, setCompletedReportId] = useState<string | null>(null);
  const [completedPdfUrl, setCompletedPdfUrl] = useState<string | null>(null);

  // Modals & viewer
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportViewerTab, setReportViewerTab] = useState<"dossier" | "chat">("dossier");

  // Live Supabase reports & system status
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);

  useEffect(() => {
    fetchReports();
    checkStatus();
  }, []);

  const fetchReports = async () => {
    setIsLoadingReports(true);
    try {
      setReports(await getLiveReports());
    } catch (err) {
      console.error("Failed to fetch live reports:", err);
    } finally {
      setIsLoadingReports(false);
    }
  };

  const checkStatus = async () => {
    try {
      setSystemStatus(await getSystemStatus());
    } catch (err) {
      console.warn("Failed to check status:", err);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm("Are you sure you want to delete this report from Supabase?")) return;
    const ok = await deleteLiveReport(reportId);
    if (ok) {
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      if (selectedReport?.id === reportId) setSelectedReport(null);
    }
  };

  const handleStartResearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim() || isSearching) return;

    setIsSearching(true);
    setCurrentStep(0);
    setCompletedReportId(null);
    setCompletedPdfUrl(null);
    setStatusMsg("Initializing multi-agent pipeline...");

    try {
      const res = await fetch(`${API_BASE_URL}/api/research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: query.trim(),
          depth: settings.depth,
          focus: settings.focus,
        }),
      });

      const data = await res.json();
      if (!data.task_id) throw new Error("No task ID returned");

      const eventSource = new EventSource(`${API_BASE_URL}/api/research/stream/${data.task_id}`);

      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          const msg = parsed.status;

          if (msg.startsWith("COMPLETE|")) {
            const parts = msg.split("|");
            const filename = parts[1];
            const taskId = parts[2] || data.task_id;

            setCurrentStep(3);
            setIsSearching(false);
            setCompletedReportId(taskId);
            setCompletedPdfUrl(`${API_BASE_URL}/api/reports/${filename}`);
            setStatusMsg("Research Complete & Synced to Supabase!");
            eventSource.close();
            fetchReports();
          } else if (msg.startsWith("ERROR|")) {
            setIsSearching(false);
            setStatusMsg(`Error: ${msg.split("|")[1]}`);
            eventSource.close();
          } else {
            setStatusMsg(msg);
            if (msg.includes("Analyst Agent") || msg.includes("Analyst")) {
              setCurrentStep(1);
            } else if (msg.includes("Writer Agent") || msg.includes("Writer")) {
              setCurrentStep(2);
            } else if (msg.includes("Researcher Agent") || msg.includes("Researcher")) {
              setCurrentStep(0);
            } else if (msg.includes("Supabase") || msg.includes("Complete") || msg.includes("Finalizing")) {
              setCurrentStep(3);
            }
          }
        } catch (err) {
          console.error("SSE parse error:", err);
        }
      };

      eventSource.onerror = () => {
        setIsSearching(false);
        setStatusMsg("Connection lost to research server.");
        eventSource.close();
      };
    } catch (error) {
      setIsSearching(false);
      setStatusMsg("Failed to start research. Make sure backend is running on port 8000.");
      console.error(error);
    }
  };

  const openCompleted = async (tab: "dossier" | "chat") => {
    if (!completedReportId) return;
    const rep = await getLiveReportById(completedReportId);
    setSelectedReport(
      rep ?? {
        id: completedReportId,
        topic: query,
        pdf_url: completedPdfUrl || undefined,
        created_at: new Date().toISOString(),
        depth: settings.depth,
        focus: settings.focus,
      }
    );
    setReportViewerTab(tab);
  };

  const recentReports = reports.slice(0, 3);

  return (
    <div className="relative min-h-screen flex flex-col bg-background text-foreground overflow-x-hidden">
      {/* One quiet backdrop: a faint cool light at the top edge */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[420px] bg-[radial-gradient(ellipse_70%_100%_at_50%_0%,rgba(56,189,248,0.07),transparent_70%)]"
      />

      <Navbar
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        reportCount={reports.length}
        supabaseConnected={systemStatus?.supabase?.connected || false}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
      />

      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col">
        <AnimatePresence mode="wait">
          {/* HOME */}
          {currentTab === "home" && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-3xl mx-auto pt-4 sm:pt-10 pb-10 flex flex-col gap-8"
            >
              {/* Heading */}
              <div className="flex flex-col items-center text-center space-y-6">
                <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight leading-[1.1] text-balance">
                  What market do you want to understand?
                </h1>
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl">
                  Three AI agents research live sources, verify the facts, and write a cited PDF
                  dossier. Then ask follow-up questions about it.
                </p>
              </div>

              {/* Query + examples */}
              <div className="space-y-4">
                <form onSubmit={handleStartResearch}>
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-card pl-4 pr-2 py-2 shadow-sm transition-colors focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/10">
                    <Search className="w-[18px] h-[18px] shrink-0 text-muted-foreground" />
                    <input
                      type="text"
                      aria-label="Research topic"
                      placeholder="Describe a market, company, or sector"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      disabled={isSearching}
                      className="flex-1 min-w-0 bg-transparent py-2 text-base text-foreground placeholder:text-slate-500 outline-none disabled:opacity-60"
                    />
                    <button
                      type="submit"
                      disabled={!query.trim() || isSearching}
                      className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-sky-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:bg-border disabled:text-slate-500 cursor-pointer"
                    >
                      {isSearching ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="hidden sm:inline">Researching</span>
                        </>
                      ) : (
                        <>
                          <span className="hidden sm:inline">Start research</span>
                          <ArrowRight className="w-4 h-4 sm:hidden" />
                        </>
                      )}
                    </button>
                  </div>
                </form>

                <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2">
                  <span className="text-sm text-slate-500">Try:</span>
                  {EXAMPLE_QUERIES.map((q) => (
                    <button
                      key={q}
                      type="button"
                      disabled={isSearching}
                      onClick={() => setQuery(q)}
                      className="rounded-full border border-border px-3 py-1 text-sm text-muted-foreground transition-colors hover:border-slate-600 hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pipeline status */}
              <LiveAgentTracker
                isSearching={isSearching}
                currentStep={currentStep}
                statusMsg={statusMsg}
                completedReportId={completedReportId}
                completedPdfUrl={completedPdfUrl}
                onOpenReport={() => openCompleted("dossier")}
                onOpenChat={() => openCompleted("chat")}
                onReset={() => {
                  setCompletedReportId(null);
                  setCompletedPdfUrl(null);
                  setStatusMsg("Pipeline Ready");
                  setCurrentStep(0);
                }}
              />

              {/* Recent dossiers */}
              {recentReports.length > 0 && (
                <section aria-labelledby="recent-heading" className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <h2 id="recent-heading" className="text-sm font-medium text-slate-300">
                      Recent dossiers
                    </h2>
                    <button
                      type="button"
                      onClick={() => setCurrentTab("history")}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      View all
                    </button>
                  </div>
                  <ul className="divide-y divide-border rounded-xl border border-border bg-card/50">
                    {recentReports.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReport(r);
                            setReportViewerTab("dossier");
                          }}
                          className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/60 cursor-pointer first:rounded-t-xl last:rounded-b-xl"
                        >
                          <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
                          <span className="flex-1 min-w-0 truncate text-sm text-foreground">
                            {r.topic}
                          </span>
                          <span className="shrink-0 text-xs text-slate-500">
                            {new Date(r.created_at).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </span>
                          <ChevronRight className="w-4 h-4 shrink-0 text-slate-600 transition-colors group-hover:text-slate-300" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </motion.div>
          )}

          {/* HISTORY */}
          {currentTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="w-full"
            >
              <HistoryView
                reports={reports}
                isLoading={isLoadingReports}
                onRefresh={fetchReports}
                onSelectReport={(report, tab) => {
                  setSelectedReport(report);
                  setReportViewerTab(tab || "dossier");
                }}
                onDeleteReport={handleDeleteReport}
                onNavigateHome={() => setCurrentTab("home")}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <ReportViewerModal
        report={selectedReport}
        isOpen={Boolean(selectedReport)}
        onClose={() => setSelectedReport(null)}
        onDelete={handleDeleteReport}
        initialTab={reportViewerTab}
      />

      <SupabaseSetupModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        status={systemStatus?.supabase}
      />
    </div>
  );
}
