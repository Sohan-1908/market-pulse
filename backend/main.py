from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
import threading
import queue
from datetime import datetime, timezone
import uuid
import os
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import List, Optional

load_dotenv()

from agents import create_crew
from pdf_generator import markdown_to_pdf
from supabase_client import (
    save_report_record,
    fetch_all_reports,
    fetch_report,
    delete_report_record,
    fetch_messages_for_report,
    save_message_record,
    get_connection_status,
)

# Optional OpenAI client pointing to Groq for chat interactions
from openai import OpenAI

app = FastAPI(title="Autonomous Market Researcher API")

# Allow CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ResearchRequest(BaseModel):
    topic: str
    depth: str = "standard"
    focus: List[str] = ["Competitors", "Market Trends", "Opportunities", "Risks"]


class ChatMessageRequest(BaseModel):
    content: str


# In-memory queue to pass SSE messages from agents to FastAPI
task_queues = {}


def run_crew_in_thread(task_id: str, req: ResearchRequest):
    q = task_queues.get(task_id)
    if not q:
        return
    
    def callback(message):
        q.put(message)
        
    try:
        callback("Initializing multi-agent pipeline...")
        crew = create_crew(req.topic, req.depth, req.focus, step_callback=callback)
        callback("Researcher Agent is scraping live web sources...")
        result = crew.kickoff()
        
        callback("Writer Agent completed the report. Compiling PDF...")
        os.makedirs("reports", exist_ok=True)
        pdf_path = f"reports/{task_id}.pdf"
        
        # CrewAI returns a CrewOutput, we need the raw string
        final_markdown = str(result.raw if hasattr(result, 'raw') else result)
        markdown_to_pdf(final_markdown, pdf_path)
        
        # Save record directly to Supabase
        callback("Syncing report with Supabase database...")
        report_data = {
            "id": task_id,
            "topic": req.topic,
            "markdown_content": final_markdown,
            "pdf_path": pdf_path,
            "pdf_url": f"http://127.0.0.1:8000/api/reports/{task_id}.pdf",
            "depth": req.depth,
            "focus": req.focus,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        save_report_record(report_data)
        
        callback(f"COMPLETE|{task_id}.pdf|{task_id}")
    except Exception as e:
        callback(f"ERROR|{str(e)}")


@app.get("/api/status")
async def get_system_status():
    """Returns connectivity status of Supabase and LLM service."""
    supabase_stat = get_connection_status()
    groq_key_set = bool(os.getenv("GROQ_API_KEY"))
    return {
        "supabase": supabase_stat,
        "groq_configured": groq_key_set,
        "api_ready": True
    }


@app.post("/api/research")
async def start_research(req: ResearchRequest):
    task_id = str(uuid.uuid4())
    task_queues[task_id] = queue.Queue()
    
    # Run Crew in background thread since it is blocking
    thread = threading.Thread(target=run_crew_in_thread, args=(task_id, req))
    thread.daemon = True
    thread.start()
    
    return {"task_id": task_id}


@app.get("/api/research/stream/{task_id}")
async def stream_research(task_id: str):
    q = task_queues.get(task_id)
    if not q:
        return {"error": "Task not found"}

    async def event_generator():
        while True:
            try:
                # Fast poll wrapped in to_thread so it doesn't block the event loop
                msg = await asyncio.to_thread(q.get, True, 1.0)
                yield f"data: {json.dumps({'status': msg})}\n\n"
                if msg.startswith("COMPLETE|") or msg.startswith("ERROR|"):
                    break
            except queue.Empty:
                continue

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.get("/api/reports")
async def list_reports():
    """Fetches live reports list from Supabase."""
    reports = fetch_all_reports()
    return {"reports": reports}


@app.get("/api/reports/{identifier}")
async def get_report_or_file(identifier: str):
    """
    If identifier ends in .pdf, serve the PDF file.
    Otherwise, return the report record with markdown content.
    """
    if identifier.endswith(".pdf"):
        file_path = f"reports/{identifier}"
        if os.path.exists(file_path):
            return FileResponse(file_path, media_type="application/pdf", filename=identifier)
        raise HTTPException(status_code=404, detail="PDF report not found")

    report = fetch_report(identifier)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@app.delete("/api/reports/{report_id}")
async def delete_report(report_id: str):
    """Deletes a report and associated messages from Supabase."""
    success = delete_report_record(report_id)
    return {"success": success, "deleted_id": report_id}


@app.get("/api/reports/{report_id}/messages")
async def get_report_messages(report_id: str):
    """Fetches chat messages tied to a report from Supabase."""
    messages = fetch_messages_for_report(report_id)
    return {"messages": messages}


@app.post("/api/reports/{report_id}/messages")
async def post_report_message(report_id: str, req: ChatMessageRequest):
    """
    Saves a user question to Supabase, generates an AI response
    grounded in the report's markdown content using Groq LLM,
    and saves the assistant response to Supabase.
    """
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="Message content cannot be empty")

    report = fetch_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # 1. Save user message to Supabase
    user_msg = save_message_record(report_id, "user", req.content.strip())

    # 2. Generate grounded response using Groq LLM
    assistant_content = ""
    groq_key = os.getenv("GROQ_API_KEY")
    if groq_key:
        try:
            client = OpenAI(
                base_url="https://api.groq.com/openai/v1",
                api_key=groq_key
            )
            report_topic = report.get("topic", "Market Research")
            report_markdown = report.get("markdown_content", "No content available.")

            system_prompt = (
                f"You are the Senior Lead Market Researcher who authored the intelligence dossier on '{report_topic}'.\n"
                f"Your task is to answer the user's questions accurately, concisely, and professionally.\n"
                f"Base your answers strictly on the facts, citations, and data inside the following report.\n"
                f"If the information is not present in the report, state clearly that it was not covered.\n"
                f"\n--- REPORT CONTENT ---\n{report_markdown[:12000]}\n--- END OF REPORT ---"
            )

            # Get recent messages for context
            existing_msgs = fetch_messages_for_report(report_id)
            conversation_history = [
                {"role": m.get("role", "user"), "content": m.get("content", "")}
                for m in existing_msgs[-6:]  # Last 6 messages for context
            ]

            response = client.chat.completions.create(
                model=os.getenv("GROQ_MODEL", "openai/gpt-oss-120b"),
                messages=[
                    {"role": "system", "content": system_prompt},
                    *conversation_history
                ],
                temperature=0.3,
                max_tokens=1000
            )
            assistant_content = response.choices[0].message.content
        except Exception as e:
            print(f"[Chat LLM Error] {e}")
            assistant_content = (
                f"I encountered an error querying the model: {str(e)}. "
                "However, your query has been logged to the database."
            )
    else:
        assistant_content = (
            "Groq API key is not configured in the backend environment. "
            "Please configure GROQ_API_KEY in backend/.env to enable live AI responses."
        )

    # 3. Save assistant message to Supabase
    asst_msg = save_message_record(report_id, "assistant", assistant_content)

    return {
        "user_message": user_msg,
        "assistant_message": asst_msg
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
