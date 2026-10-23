-- Supabase Schema for Autonomous Market Researcher
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)

-- 1. Create the `reports` table
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

-- 2. Create the `messages` table (tied to each report ID)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

-- 3. Create indexes for quick lookup & ordering
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_report_id_created_at ON public.messages(report_id, created_at ASC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 5. Policies for public / anonymous access (Allows full frontend & backend sync)
DROP POLICY IF EXISTS "Allow public read access to reports" ON public.reports;
DROP POLICY IF EXISTS "Allow public insert access to reports" ON public.reports;
DROP POLICY IF EXISTS "Allow public update access to reports" ON public.reports;
DROP POLICY IF EXISTS "Allow public delete access to reports" ON public.reports;

DROP POLICY IF EXISTS "Allow public read access to messages" ON public.messages;
DROP POLICY IF EXISTS "Allow public insert access to messages" ON public.messages;
DROP POLICY IF EXISTS "Allow public delete access to messages" ON public.messages;

CREATE POLICY "Allow public read access to reports"
    ON public.reports FOR SELECT
    USING (true);

CREATE POLICY "Allow public insert access to reports"
    ON public.reports FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow public update access to reports"
    ON public.reports FOR UPDATE
    USING (true);

CREATE POLICY "Allow public delete access to reports"
    ON public.reports FOR DELETE
    USING (true);

CREATE POLICY "Allow public read access to messages"
    ON public.messages FOR SELECT
    USING (true);

CREATE POLICY "Allow public insert access to messages"
    ON public.messages FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow public delete access to messages"
    ON public.messages FOR DELETE
    USING (true);
