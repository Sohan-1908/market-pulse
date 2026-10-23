import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Report, ChatMessage, SystemStatus } from "@/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes("your-project") &&
  !supabaseAnonKey.includes("your-supabase")
);

// Fallback dummy URL so createClient doesn't throw during SSR if env is empty
export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? supabaseUrl : "https://placeholder-domain-offline.supabase.co",
  isSupabaseConfigured ? supabaseAnonKey : "placeholder-anon-key"
);

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

/**
 * Fetch reports directly from backend API (which proxies & queries Supabase)
 * or fallback to direct client if backend is not reachable.
 */
export async function getLiveReports(): Promise<Report[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/reports`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      return data.reports || [];
    }
  } catch (err) {
    console.warn("Backend /api/reports unreachable, trying direct Supabase client:", err);
  }

  // Direct Supabase fallback
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) {
        return data as Report[];
      }
    } catch (e) {
      console.error("Direct Supabase error:", e);
    }
  }

  return [];
}

/**
 * Fetch single report by ID
 */
export async function getLiveReportById(id: string): Promise<Report | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/reports/${id}`, { cache: "no-store" });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Backend /api/reports/:id unreachable, trying direct Supabase client:", err);
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .eq("id", id)
        .single();
      if (!error && data) {
        return data as Report;
      }
    } catch (e) {
      console.error("Direct Supabase error:", e);
    }
  }

  return null;
}

/**
 * Delete a report from Supabase
 */
export async function deleteLiveReport(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/reports/${id}`, { method: "DELETE" });
    if (res.ok) return true;
  } catch (err) {
    console.warn("Backend delete failed, trying direct Supabase:", err);
  }

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from("reports").delete().eq("id", id);
      return !error;
    } catch (e) {
      console.error("Direct Supabase delete error:", e);
    }
  }

  return false;
}

/**
 * Fetch chat messages for a specific report
 */
export async function getLiveMessages(reportId: string): Promise<ChatMessage[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/reports/${reportId}/messages`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      return data.messages || [];
    }
  } catch (err) {
    console.warn("Backend /messages unreachable, trying direct Supabase client:", err);
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("report_id", reportId)
        .order("created_at", { ascending: true });
      if (!error && data) {
        return data as ChatMessage[];
      }
    } catch (e) {
      console.error("Direct Supabase error fetching messages:", e);
    }
  }

  return [];
}

/**
 * Send a chat question about a report. Backend persists to Supabase and generates AI response.
 */
export async function sendLiveMessage(
  reportId: string,
  content: string
): Promise<{ user_message?: ChatMessage; assistant_message?: ChatMessage }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/reports/${reportId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.error("Failed to post message to backend API:", err);
  }

  // If backend unreachable but Supabase configured directly, record user message
  if (isSupabaseConfigured) {
    const fallbackUserMsg: ChatMessage = {
      report_id: reportId,
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };
    await supabase.from("messages").insert(fallbackUserMsg);

    const fallbackAiMsg: ChatMessage = {
      report_id: reportId,
      role: "assistant",
      content: "Backend server is currently offline. Please ensure the Python FastAPI backend is running on port 8000 to receive AI researcher replies.",
      created_at: new Date().toISOString(),
    };
    await supabase.from("messages").insert(fallbackAiMsg);

    return { user_message: fallbackUserMsg, assistant_message: fallbackAiMsg };
  }

  return {};
}

/**
 * Fetch system status (Supabase connectivity & Groq status)
 */
export async function getSystemStatus(): Promise<SystemStatus | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/status`, { cache: "no-store" });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn("Could not fetch /api/status:", e);
  }
  return null;
}
