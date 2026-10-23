export interface Report {
  id: string;
  topic: string;
  markdown_content?: string;
  pdf_path?: string;
  pdf_url?: string;
  depth?: string;
  focus?: string[];
  created_at: string;
}

export interface ChatMessage {
  id?: string;
  report_id: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

export interface CustomizationSettings {
  depth: "quick" | "standard" | "deep";
  sources: string[];
  timeRange: string;
  focus: string[];
  format: string;
}

export interface SystemStatus {
  supabase: {
    configured: boolean;
    connected: boolean;
    message: string;
    url: string | null;
  };
  groq_configured: boolean;
  api_ready: boolean;
}
