# Market Pulse 📈

> **Autonomous SaaS Market Research Platform powered by Multi-Agent AI Workflows, Real-Time Web Scraping, and Automated PDF Generation.**

[![Live Demo](https://img.shields.io/badge/Live_Demo-Vercel-000000?style=for-the-badge&logo=vercel)](https://market-pulse-sohan-1908s-projects.vercel.app/)
[![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi)](https://market-pulse-pnhl.onrender.com)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

---

## 🚀 Overview

**Market Pulse** is an autonomous AI agent platform that automates deep-dive industry and competitor research.

Instead of manually searching through dozens of websites, collecting information, analyzing competitors, and writing a report, Market Pulse uses a team of specialized AI agents to automate the entire research workflow.

Users simply enter a market or industry query. The system then:

1. Searches the web for relevant and up-to-date information.
2. Extracts useful information from online sources.
3. Assigns research tasks to specialized AI agents.
4. Cross-examines and analyzes collected information.
5. Generates a comprehensive research report.
6. Includes cited sources for verification.
7. Converts the final report into a downloadable PDF.
8. Persists reports and metadata in Supabase for future access.

### Example

A user could enter:

> **"Analyze the Indian Electric Vehicle market and compare the major competitors."**

Market Pulse can then research:

- Market size
- Market growth
- Major competitors
- Market share
- Industry trends
- Opportunities
- Risks
- Recent developments
- Competitive landscape

and produce a structured research dossier.

---

## ✨ Key Features

### 🤖 Multi-Agent AI Orchestration

Market Pulse uses multiple specialized AI agents instead of relying on a single agent for the complete workflow.

The current architecture includes:

- **Senior Market Researcher** — searches for relevant information and gathers sources.
- **Market Analyst** — analyzes collected information, identifies trends, comparisons, opportunities, and risks.
- **Report Writer** — converts the research and analysis into a structured professional report.

The agents work together through **CrewAI** to create an end-to-end autonomous research workflow.

---

### 🌐 Live Web Research

Market Pulse is designed to retrieve current information from the web instead of relying only on the LLM's existing knowledge.

The system uses:

- DuckDuckGo Search
- Playwright
- Web extraction tools

This allows the research workflow to discover and extract information from relevant online sources.

---

### 📡 Real-Time Progress Streaming

Market Pulse uses **Server-Sent Events (SSE)** to stream backend progress to the frontend.

Instead of showing only:

```text
Generating report...
```

the user can receive step-by-step updates such as:

```text
Research started...

Searching for market information...

Collecting sources...

Senior Researcher completed...

Market Analyst started...

Analyzing competitors...

Report Writer started...

Generating final report...

Generating PDF...

Report completed!
```

This makes the application feel like a real autonomous AI workflow.

---

### 📄 Automated PDF Reports

After completing the research and analysis workflow, Market Pulse generates a structured PDF dossier.

The generated report can contain:

- Executive Summary
- Market Overview
- Market Size
- Market Trends
- Competitive Analysis
- Opportunities
- Risks
- Future Outlook
- References / Sources

The final report can be downloaded by the user.

---

### 🗄️ Database Persistence

Market Pulse uses **Supabase PostgreSQL** to persist generated research reports and related metadata.

This allows the application to maintain research history instead of treating every research request as a temporary session.

Potentially stored information includes:

- Research queries
- Generated reports
- Report metadata
- Sources
- Creation timestamps
- Research status

---

## 🏗️ System Architecture

The overall workflow can be represented as:

```text
                         USER
                           │
                           ▼
                ┌────────────────────┐
                │    Next.js UI      │
                │      Vercel        │
                └─────────┬──────────┘
                          │
                    API / SSE
                          │
                          ▼
                ┌────────────────────┐
                │      FastAPI       │
                │      Backend       │
                │      Render        │
                └─────────┬──────────┘
                          │
                          ▼
                ┌────────────────────┐
                │       CrewAI       │
                │  Agent Orchestration│
                └─────────┬──────────┘
                          │
              ┌───────────┼───────────┐
              │           │           │
              ▼           ▼           ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │Researcher│ │ Analyst  │ │  Writer  │
        │  Agent   │ │  Agent   │ │  Agent   │
        └────┬─────┘ └────┬─────┘ └────┬─────┘
             │            │            │
             └────────────┼────────────┘
                          │
                          ▼
                ┌────────────────────┐
                │ Web Search /       │
                │ Playwright         │
                └─────────┬──────────┘
                          │
                          ▼
                    INTERNET / WEB
                          │
                          ▼
                ┌────────────────────┐
                │   LLM via Groq     │
                └─────────┬──────────┘
                          │
                          ▼
                 Final Research Report
                     │            │
                     ▼            ▼
                  PDF Report   Supabase
```

---

## 🔄 Research Workflow

The complete research pipeline follows these major stages:

### Step 1 — User Query

The user enters a research question such as:

```text
Analyze the Indian EV market and its major competitors.
```

---

### Step 2 — Research Agent

The Senior Market Researcher searches the web and collects relevant information.

```text
User Query
    ↓
Search
    ↓
Relevant Websites
    ↓
Extract Information
    ↓
Research Dataset
```

---

### Step 3 — Analysis Agent

The Market Analyst processes the collected information.

The analyst can identify:

- Market trends
- Growth patterns
- Competitor differences
- Opportunities
- Risks
- Important statistics
- Strategic insights

---

### Step 4 — Writing Agent

The Report Writer transforms the research and analysis into a structured report.

```text
Raw Research
     +
Analysis
     ↓
Report Writer
     ↓
Structured Report
```

---

### Step 5 — PDF Generation

The final report is formatted into a downloadable PDF document.

```text
Research + Analysis
        ↓
Final Report
        ↓
PDF Generation
        ↓
Downloadable Dossier
```

---

### Step 6 — Persistence

The generated report and relevant metadata are persisted using Supabase.

```text
Research
   ↓
Report
   ↓
Supabase
   ↓
Research History
```

---

# 🛠️ Tech Stack

## Frontend

| Technology | Purpose |
|---|---|
| **Next.js 14** | Frontend framework |
| **App Router** | Next.js application routing |
| **TypeScript** | Frontend programming language |
| **Tailwind CSS** | Styling |
| **shadcn/ui** | UI components |
| **Vercel** | Frontend deployment |

---

## Backend

| Technology | Purpose |
|---|---|
| **Python 3.11** | Backend programming language |
| **FastAPI** | REST API and backend framework |
| **CrewAI** | Multi-agent orchestration |
| **LangChain** | LLM/application tooling |
| **LiteLLM** | LLM provider abstraction |
| **Groq API** | LLM inference |
| **Playwright** | Browser automation and web extraction |
| **DuckDuckGo Search** | Web search |
| **Supabase** | Database and persistence |
| **Render** | Backend deployment |

---

## 🤖 AI Models

The application is configured to work with LLMs served through the Groq API.

Example models include:

```text
llama-3.3-70b-versatile
openai/gpt-oss-120b
```

The model can be configured through the backend environment variables.

---

# 📁 Project Structure

A typical project structure is:

```text
market-pulse/
│
├── frontend/
│   │
│   ├── app/
│   ├── components/
│   ├── public/
│   ├── lib/
│   ├── package.json
│   ├── tsconfig.json
│   └── ...
│
├── backend/
│   │
│   ├── agents/
│   ├── tools/
│   ├── main.py
│   ├── requirements.txt
│   └── ...
│
├── .gitignore
├── README.md
└── LICENSE
```

> The exact folder structure may vary depending on the implementation.

---

# ⚙️ Environment Variables

## Backend

Create a `.env` file inside the backend directory:

```text
backend/.env
```

Add:

```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile

SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

### Environment Variable Description

| Variable | Description |
|---|---|
| `GROQ_API_KEY` | API key used to access the Groq LLM API |
| `GROQ_MODEL` | LLM model used by the application |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_KEY` | Supabase API key |

---

## Frontend

Create:

```text
frontend/.env.local
```

Add:

```env
NEXT_PUBLIC_API_URL=https://market-pulse-pnhl.onrender.com
```

For local backend development:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

# 🔐 Security

Never commit secret API keys to GitHub.

Your `.gitignore` should include:

```text
.env
.env.local
.env.*.local
```

Do not commit files containing:

```text
GROQ_API_KEY
SUPABASE_KEY
```

Instead, configure these variables through the environment-variable settings of your deployment platforms.

---

# 🏃 Local Development

## Prerequisites

Make sure you have installed:

- Python 3.11+
- Node.js 18+
- npm
- Git

---

# 1. Clone the Repository

```bash
git clone <your-repository-url>
cd market-pulse
```

---

# 2. Backend Setup

Navigate to the backend:

```bash
cd backend
```

Create a virtual environment:

```bash
python -m venv venv
```

### Windows

```bash
venv\Scripts\activate
```

### macOS / Linux

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Install Playwright Chromium:

```bash
playwright install chromium
```

Start the FastAPI server:

```bash
uvicorn main:app --reload --port 8000
```

The backend should now be available at:

```text
http://localhost:8000
```

---

# 3. Frontend Setup

Open another terminal.

Navigate to the frontend:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The frontend should now be available at:

```text
http://localhost:3000
```

---

# 🌐 Deployment

## Frontend — Vercel

The Next.js frontend is deployed using Vercel.

Live frontend:

https://market-pulse-sohan-1908s-projects.vercel.app/

---

## Backend — Render

The FastAPI backend is deployed using Render.

Backend:

https://market-pulse-pnhl.onrender.com

---

## 🔗 Production Architecture

```text
                         Internet
                            │
                            ▼
                   ┌─────────────────┐
                   │     Vercel      │
                   │  Next.js App    │
                   └────────┬────────┘
                            │
                            │ API / SSE
                            ▼
                   ┌─────────────────┐
                   │     Render      │
                   │    FastAPI      │
                   └────────┬────────┘
                            │
             ┌──────────────┼──────────────┐
             │              │              │
             ▼              ▼              ▼
          CrewAI          Groq         Supabase
             │
             ▼
        Web Research
             │
             ▼
        Playwright /
      DuckDuckGo Search
```

---

# 📊 Example Use Cases

Market Pulse can potentially be used for:

### 📈 Market Research

```text
Analyze the global AI market.
```

### 🏢 Competitor Research

```text
Compare OpenAI, Anthropic, Google and Meta in generative AI.
```

### 🚗 Industry Analysis

```text
Analyze the Indian electric vehicle market.
```

### 💻 Technology Research

```text
Analyze the current RAG and agentic AI market.
```

### 📊 Startup Research

```text
Analyze the Indian SaaS startup ecosystem.
```

### 🔍 Competitive Intelligence

```text
Compare the top companies in the cybersecurity industry.
```

---

# 💡 Why Market Pulse?

Traditional market research often requires manually:

```text
Search
  ↓
Open websites
  ↓
Collect data
  ↓
Read reports
  ↓
Compare competitors
  ↓
Analyze trends
  ↓
Write report
  ↓
Create PDF
```

Market Pulse aims to automate this workflow:

```text
Research Query
      ↓
Multi-Agent Research
      ↓
Web Data Collection
      ↓
Analysis
      ↓
Report Generation
      ↓
PDF
      ↓
Database
```

This reduces repetitive research work and provides a structured way to generate market intelligence.

---

# 🧠 Agent Roles

## Senior Market Researcher

### Responsibility

- Understand the research query
- Search for relevant sources
- Collect information
- Identify useful data
- Gather supporting evidence

### Output

A collection of relevant research findings and sources.

---

## Market Analyst

### Responsibility

- Analyze collected information
- Identify trends
- Compare competitors
- Extract important insights
- Identify opportunities and risks

### Output

Structured analysis and market insights.

---

## Report Writer

### Responsibility

- Organize research and analysis
- Create a coherent narrative
- Structure the final report
- Include relevant sources
- Produce professional report content

### Output

A complete research dossier ready for PDF generation.

---

# 📡 SSE Workflow

The backend can stream research progress to the frontend using Server-Sent Events.

Conceptually:

```text
Backend
   │
   ├── Research started
   │
   ├── Searching web
   │
   ├── Sources collected
   │
   ├── Researcher completed
   │
   ├── Analyst started
   │
   ├── Analysis completed
   │
   ├── Writer started
   │
   ├── Report generated
   │
   └── PDF generated
          │
          ▼
       Frontend
```

This provides a real-time view of the autonomous workflow.

---

# 📄 Report Structure

A generated report can follow a structure such as:

```text
MARKET PULSE
Market Research Dossier

1. Executive Summary

2. Market Overview

3. Market Size and Growth

4. Industry Trends

5. Major Players

6. Competitive Analysis

7. Opportunities

8. Risks and Challenges

9. Future Outlook

10. Key Insights

11. Sources
```

---

# 🔮 Future Improvements

Potential future enhancements include:

- User authentication
- Multiple research templates
- More specialized agents
- Advanced source verification
- Citation validation
- Improved competitor comparison
- Interactive charts
- Market dashboards
- Historical market tracking
- Scheduled research
- Email report delivery
- Research report versioning
- More LLM providers
- Cost tracking
- Agent performance monitoring
- Advanced PDF customization
- Source credibility scoring
- Fact-checking agent
- Dedicated financial-data agent
- Dedicated news-research agent

---

# 🧪 Development Notes

Market Pulse is designed as an AI-powered research automation platform.

The system combines:

```text
Generative AI
      +
Multi-Agent Systems
      +
Web Search
      +
Web Extraction
      +
Real-Time Streaming
      +
Database Persistence
      +
Automated Document Generation
```

This combination enables the platform to perform research tasks that would traditionally require significant manual effort.

---

# 📜 License

This project is licensed under the MIT License.

See the `LICENSE` file for more information.

---

# 👨‍💻 Author

**Sohan Agamamidi**

B.Tech — Mathematics and Computing  
Rajiv Gandhi Institute of Petroleum Technology (RGIPT)

---

# ⭐ Project

If you find this project useful, consider giving the repository a ⭐ on GitHub.

---
