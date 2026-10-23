# Market Pulse 📈

> Autonomous SaaS Market Research Platform powered by Multi-Agent AI Workflows, Real-Time Web Scraping, and Automated PDF Generation.

[![Live Demo](https://img.shields.io/badge/Live_Demo-Vercel-000000?style=for-the-badge&logo=vercel)](https://market-pulse-sohan-1908s-projects.vercel.app/)
[![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi)](https://market-pulse-pnhl.onrender.com)
[![License](https://img.shields.io/badge/License-MIT-blue.style=for-the-badge)](LICENSE)

---

## 🚀 Overview

**Market Pulse** is an autonomous AI agent platform that automates deep-dive industry and competitor research. Users enter any market query, and a team of specialized AI agents collaboratively scrap live web data, cross-examine sources, draft comprehensive reports, and generate cited PDF dossiers—persisted live to a database.

---

## ✨ Features

- **Multi-Agent Orchestration**: Powered by CrewAI, deploying dedicated Senior Market Researcher, Analyst, and Writer agents.
- **Live Web Scraping**: Integrates real-time search and web extraction tools (Playwright / DuckDuckGo) for up-to-date data.
- **Server-Sent Events (SSE)**: Streams step-by-step progress and agent thinking directly to the frontend.
- **PDF Report Generation**: Formats research dossiers into downloadable PDF documents with cited sources.
- **Database Persistence**: Stores all generated reports, metadata, and history seamlessly in Supabase.

---

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS, Shadcn UI
- **Language**: TypeScript
- **Deployment**: Vercel

### Backend
- **Framework**: FastAPI (Python 3.11)
- **Agentic Framework**: CrewAI, LangChain, LiteLLM
- **LLM Provider**: Groq API (`llama-3.3-70b-versatile` / `openai/gpt-oss-120b`)
- **Web Extraction**: Playwright, DuckDuckGo Search
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Render

---

## ⚙️ Environment Variables Setup

### Backend (`/backend/.env`)
```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
