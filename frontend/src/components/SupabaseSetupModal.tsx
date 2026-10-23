"use client";

import { useState } from "react";
import { Check, Copy, Database, ExternalLink, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SupabaseSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  status?: {
    configured: boolean;
    connected: boolean;
    message: string;
    url: string | null;
  } | null;
}

const SQL_SCHEMA = `-- 1. Create the reports table
CREATE TABLE IF NOT EXISTS public.reports (
    id TEXT PRIMARY KEY,
    topic TEXT NOT NULL,
    markdown_content TEXT,
    pdf_path TEXT,
    pdf_url TEXT,
    depth TEXT DEFAULT 'standard',
    focus TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- 2. Create the messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_report_id_created_at ON public.messages(report_id, created_at ASC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 5. Permissive policies for full sync
CREATE POLICY "Allow public read access to reports" ON public.reports FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to reports" ON public.reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to reports" ON public.reports FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to reports" ON public.reports FOR DELETE USING (true);

CREATE POLICY "Allow public read access to messages" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to messages" ON public.messages FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete access to messages" ON public.messages FOR DELETE USING (true);`;

export default function SupabaseSetupModal({ isOpen, onClose, status }: SupabaseSetupModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(SQL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#090A0F]/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#121826] border border-[#1E293B] rounded-2xl shadow-2xl p-6 sm:p-8 text-[#CBD5E1] max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#475569] hover:text-[#F8FAFC] p-1.5 rounded-lg hover:bg-[#1A2236] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#151C2C] border border-[#1E293B] flex items-center justify-center text-[#38BDF8]">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#F8FAFC]">
              Supabase Live Data Connection
            </h2>
            <p className="text-xs text-[#64748B]">Zero dummy data: all reports and chat messages sync directly.</p>
          </div>
        </div>

        {/* Current Connection Status */}
        <div className="mb-6 p-4 rounded-xl border border-[#1E293B] bg-[#151C2C] flex items-center justify-between">
          <div>
            <div className="text-xs text-[#64748B] font-medium uppercase tracking-wider mb-1">Status</div>
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  status?.connected ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                }`}
              />
              <span className="text-sm font-semibold text-[#F8FAFC]">
                {status?.connected ? "Connected to Supabase" : status?.configured ? "Configured (Testing)" : "Credentials Pending"}
              </span>
            </div>
            {status?.message && (
              <p className="text-xs text-[#64748B] mt-1">{status.message}</p>
            )}
          </div>
          {status?.url && (
            <div className="text-xs font-mono bg-[#0D1117] px-2 py-1 rounded text-[#94A3B8] border border-[#1E293B]">
              {status.url}
            </div>
          )}
        </div>

        {/* 3 Steps Guide */}
        <div className="space-y-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-[#151C2C] text-[#38BDF8] border border-[#1E293B] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              1
            </span>
            <div>
              <p className="text-sm font-semibold text-[#F8FAFC]">Run SQL Migration in Supabase</p>
              <p className="text-xs text-[#64748B]">
                Go to your Supabase Dashboard &gt; <strong>SQL Editor</strong> &gt; Click <strong>New Query</strong>, paste the schema below, and click <strong>Run</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-[#151C2C] text-[#38BDF8] border border-[#1E293B] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              2
            </span>
            <div>
              <p className="text-sm font-semibold text-[#F8FAFC]">Add Credentials to Environment</p>
              <p className="text-xs text-[#64748B]">
                Add your Supabase URL & Service Key to <code className="text-[#94A3B8]">backend/.env</code>:
              </p>
              <div className="mt-1 bg-[#0D1117] p-2 rounded-lg font-mono text-[11px] text-[#94A3B8] border border-[#1E293B]">
                SUPABASE_URL=https://your-project.supabase.co<br />
                SUPABASE_KEY=eyJhbGciOi...
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-[#151C2C] text-[#38BDF8] border border-[#1E293B] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              3
            </span>
            <div>
              <p className="text-sm font-semibold text-[#F8FAFC]">Live Data Synchronization</p>
              <p className="text-xs text-[#64748B]">
                Once saved, all market reports and interactive researcher chats will automatically persist live!
              </p>
            </div>
          </div>
        </div>

        {/* SQL Code Box */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
              SQL Schema (<code className="text-[#94A3B8]">reports</code> & <code className="text-[#94A3B8]">messages</code>)
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              className="h-8 text-xs border-[#1E293B] bg-[#151C2C] hover:bg-[#1A2236] text-[#94A3B8]"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400 mr-1.5" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy SQL
                </>
              )}
            </Button>
          </div>
          <pre className="bg-[#0D1117] p-3 rounded-xl border border-[#1E293B] text-[11px] font-mono text-[#94A3B8] overflow-x-auto max-h-48 leading-relaxed">
            {SQL_SCHEMA}
          </pre>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-[#1E293B]">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-[#1E293B] bg-[#151C2C] text-[#94A3B8] hover:bg-[#1A2236] rounded-xl"
          >
            Close
          </Button>
          <Button
            onClick={() => window.open("https://supabase.com/dashboard", "_blank")}
            className="bg-[#38BDF8] hover:bg-[#7DD3FC] text-[#0B0F17] rounded-xl"
          >
            Open Supabase Dashboard <ExternalLink className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
