"use client";

import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import {
  X,
  Download,
  Send,
  Sparkles,
  FileText,
  MessageSquare,
  Clock,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  Bot,
  User,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Report, ChatMessage } from "@/types";
import { getLiveMessages, sendLiveMessage, API_BASE_URL } from "@/lib/supabase";

interface ReportViewerModalProps {
  report: Report | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (reportId: string) => void;
  initialTab?: "dossier" | "chat";
}

export default function ReportViewerModal({
  report,
  isOpen,
  onClose,
  onDelete,
  initialTab = "dossier",
}: ReportViewerModalProps) {
  const [activeTab, setActiveTab] = useState<"dossier" | "chat">(initialTab);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [copiedMd, setCopiedMd] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync initial tab
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  // Load live messages from Supabase when report changes or modal opens
  useEffect(() => {
    if (!report?.id || !isOpen) return;

    let isMounted = true;
    async function loadChat() {
      setIsLoadingMessages(true);
      try {
        const msgs = await getLiveMessages(report!.id);
        if (isMounted) {
          setMessages(msgs);
        }
      } catch (err) {
        console.error("Error loading chat messages:", err);
      } finally {
        if (isMounted) setIsLoadingMessages(false);
      }
    }

    loadChat();
    return () => {
      isMounted = false;
    };
  }, [report?.id, isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (activeTab === "chat") {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab]);

  if (!isOpen || !report) return null;

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || isSending) return;

    const query = inputMessage.trim();
    setInputMessage("");
    setIsSending(true);

    // Optimistically add user message
    const tempUserMsg: ChatMessage = {
      report_id: report.id,
      role: "user",
      content: query,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await sendLiveMessage(report.id, query);
      if (res.assistant_message) {
        setMessages((prev) => [...prev, res.assistant_message!]);
      } else {
        // Fallback refetch to ensure database sync
        const liveMsgs = await getLiveMessages(report.id);
        setMessages(liveMsgs);
      }
    } catch (err) {
      console.error("Error sending chat message:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyMarkdown = () => {
    if (report.markdown_content) {
      navigator.clipboard.writeText(report.markdown_content);
      setCopiedMd(true);
      setTimeout(() => setCopiedMd(false), 2000);
    }
  };

  const pdfUrl = report.pdf_url || `${API_BASE_URL}/api/reports/${report.id}.pdf`;

  const formattedDate = report.created_at
    ? new Date(report.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Recently generated";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-[#090A0F]/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[92vh] bg-[#121826] border border-[#1E293B] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#CBD5E1]">
        
        {/* Modal Top Header */}
        <div className="p-4 sm:p-6 border-b border-[#1E293B] bg-[#151C2C] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <Badge className="bg-[#151C2C] text-[#94A3B8] border border-[#1E293B] font-medium capitalize text-[11px]">
                {report.depth || "standard"} depth
              </Badge>
              <span className="text-xs text-[#64748B] flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3 text-[#475569]" /> {formattedDate}
              </span>
              <span className="text-[10px] text-emerald-400 bg-[#121826] px-2 py-0.5 rounded-full border border-emerald-500/25 font-mono">
                Supabase Synced
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-[#F8FAFC] truncate">
              {report.topic}
            </h2>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(pdfUrl, "_blank")}
              className="bg-[#151C2C] border-[#1E293B] text-[#94A3B8] hover:bg-[#1A2236] hover:text-[#F8FAFC] rounded-xl text-xs h-9"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" /> PDF
            </Button>

            {onDelete && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDelete(report.id)}
                className="border-[#1E293B] text-[#475569] hover:text-rose-400 hover:bg-rose-500/10 rounded-xl text-xs h-9"
                title="Delete Report"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-[#475569] hover:text-[#F8FAFC] hover:bg-[#1A2236] rounded-xl transition-colors ml-1 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher Header */}
        <div className="px-6 py-2.5 bg-[#0D1117] border-b border-[#1E293B] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("dossier")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "dossier"
                  ? "bg-[#151C2C] text-[#F8FAFC] border border-[#1E293B]"
                  : "text-[#64748B] hover:text-[#94A3B8] hover:bg-[#151C2C]/50"
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-[#38BDF8]" /> Report Dossier
            </button>

            <button
              onClick={() => setActiveTab("chat")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "chat"
                  ? "bg-[#151C2C] text-[#F8FAFC] border border-[#1E293B]"
                  : "text-[#64748B] hover:text-[#94A3B8] hover:bg-[#151C2C]/50"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#94A3B8]" /> Ask the Researcher
              {messages.length > 0 && (
                <span className="text-[10px] bg-[#1E293B] px-1.5 py-0.2 rounded-full font-mono text-[#94A3B8]">
                  {messages.length}
                </span>
              )}
            </button>
          </div>

          {activeTab === "dossier" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopyMarkdown}
              className="text-xs text-[#475569] hover:text-[#F8FAFC] hover:bg-[#151C2C] h-8"
            >
              {copiedMd ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" /> Copied Markdown
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1" /> Copy Markdown
                </>
              )}
            </Button>
          )}
        </div>

        {/* Body Area */}
        <div className="flex-1 overflow-hidden relative">
          {/* TAB 1: Report Markdown Content */}
          {activeTab === "dossier" && (
            <ScrollArea className="h-full p-6 sm:p-10">
              <div className="max-w-4xl mx-auto pb-16 prose prose-invert max-w-none">
                {report.markdown_content ? (
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => (
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] mt-4 mb-4 pb-2 border-b border-[#1E293B]">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="text-xl sm:text-2xl font-bold text-[#F8FAFC] mt-6 mb-3">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="text-lg font-semibold text-[#CBD5E1] mt-5 mb-2">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-[#94A3B8] text-sm leading-relaxed mb-4">
                          {children}
                        </p>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc pl-5 space-y-1.5 mb-4 text-[#94A3B8] text-sm">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal pl-5 space-y-1.5 mb-4 text-[#94A3B8] text-sm">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => (
                        <li className="leading-relaxed">{children}</li>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-[#38BDF8]/40 pl-4 py-1 italic bg-[#151C2C] my-4 text-[#94A3B8] rounded-r">
                          {children}
                        </blockquote>
                      ),
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-6 rounded-xl border border-[#1E293B]">
                          <table className="min-w-full divide-y divide-[#1E293B] text-xs text-left">
                            {children}
                          </table>
                        </div>
                      ),
                      th: ({ children }) => (
                        <th className="px-4 py-3 bg-[#151C2C] font-semibold text-[#F8FAFC]">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="px-4 py-3 border-t border-[#1E293B] text-[#94A3B8]">
                          {children}
                        </td>
                      ),
                      a: ({ href, children }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#38BDF8] hover:text-[#7DD3FC] underline inline-flex items-center gap-0.5"
                        >
                          {children} <ExternalLink className="w-3 h-3 inline ml-0.5" />
                        </a>
                      ),
                    }}
                  >
                    {report.markdown_content}
                  </ReactMarkdown>
                ) : (
                  <div className="text-center py-20 text-[#64748B]">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-[#334155]" />
                    <p className="text-base font-semibold">Report text is being prepared or available as PDF.</p>
                    <Button
                      onClick={() => window.open(pdfUrl, "_blank")}
                      className="mt-4 bg-[#38BDF8] text-[#0B0F17] rounded-xl"
                    >
                      <Download className="w-4 h-4 mr-2" /> Download PDF Report
                    </Button>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {/* TAB 2: Ask the Researcher Chat (Real Supabase persistence) */}
          {activeTab === "chat" && (
            <div className="h-full flex flex-col">
              <ScrollArea className="flex-1 p-4 sm:p-6">
                <div className="max-w-3xl mx-auto space-y-4 pb-4">
                  
                  {/* Empty Chat State - No mock messages */}
                  {messages.length === 0 && !isLoadingMessages && (
                    <div className="p-8 my-8 text-center rounded-2xl border border-[#1E293B] bg-[#151C2C] max-w-lg mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-[#121826] border border-[#1E293B] flex items-center justify-center text-[#38BDF8] mx-auto mb-3">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-[#F8FAFC] mb-1">
                        Ask the Market Researcher
                      </h3>
                      <p className="text-xs text-[#64748B] leading-relaxed mb-4">
                        Pose questions about competitors, financial forecasts, or specific claims in this report.
                        Responses are grounded strictly in the compiled research data.
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {[
                          "What are the top 3 market risks identified?",
                          "Who are the main competitor companies listed?",
                          "What are the key gaps or missing data points?",
                        ].map((prompt, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              setInputMessage(prompt);
                            }}
                            className="text-xs bg-[#121826] hover:bg-[#1A2236] text-[#94A3B8] px-3 py-1.5 rounded-lg border border-[#1E293B] text-left transition-colors"
                          >
                            &ldquo;{prompt}&rdquo;
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {isLoadingMessages && (
                    <div className="flex items-center justify-center py-12 text-[#64748B] gap-2 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin text-[#38BDF8]" />
                      Loading verified conversation history from Supabase...
                    </div>
                  )}

                  {/* Message Stream */}
                  {messages.map((msg, idx) => {
                    const isUser = msg.role === "user";
                    return (
                      <div
                        key={idx}
                        className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                            isUser
                              ? "bg-[#1E293B] text-[#CBD5E1]"
                              : "bg-[#38BDF8] text-[#0B0F17]"
                          }`}
                        >
                          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        </div>

                        <div
                          className={`max-w-[82%] rounded-2xl p-4 text-sm leading-relaxed ${
                            isUser
                              ? "bg-[#1E293B] text-[#F8FAFC] rounded-tr-none"
                              : "bg-[#151C2C] border border-[#1E293B] text-[#CBD5E1] rounded-tl-none prose prose-invert prose-sm max-w-none"
                          }`}
                        >
                          {isUser ? (
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          ) : (
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          )}

                          {msg.created_at && (
                            <div
                              className={`text-[10px] mt-2 font-mono ${
                                isUser ? "text-[#64748B] text-right" : "text-[#475569]"
                              }`}
                            >
                              {new Date(msg.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Sending Indicator */}
                  {isSending && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#38BDF8] text-[#0B0F17] flex items-center justify-center shrink-0 mt-1">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div className="bg-[#151C2C] border border-[#1E293B] rounded-2xl rounded-tl-none p-4 text-sm text-[#64748B] flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-[#38BDF8]" />
                        <span>Analyzing report findings & compiling response...</span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Chat Input Bar */}
              <div className="p-4 bg-[#151C2C] border-t border-[#1E293B]">
                <form
                  onSubmit={handleSendMessage}
                  className="max-w-3xl mx-auto relative flex items-center"
                >
                  <Input
                    placeholder="Ask a question about this research dossier..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    disabled={isSending}
                    className="bg-[#121826] border-[#1E293B] text-[#F8FAFC] pr-14 h-12 rounded-xl focus-visible:ring-[#38BDF8]/30 placeholder:text-[#475569] text-sm"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!inputMessage.trim() || isSending}
                    className="absolute right-1.5 top-1.5 bottom-1.5 h-9 w-9 bg-[#38BDF8] hover:bg-[#7DD3FC] rounded-lg text-[#0B0F17] disabled:opacity-50 transition-all"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
