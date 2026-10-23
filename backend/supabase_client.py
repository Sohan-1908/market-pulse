import os
import json
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

# Optional Supabase import
try:
    from supabase import create_client, Client
    HAS_SUPABASE_LIB = True
except ImportError:
    HAS_SUPABASE_LIB = False
    Client = None

LOCAL_DB_FILE = os.path.join(os.path.dirname(__file__), "reports", "local_reports.json")


def _get_env_val(keys: List[str]) -> Optional[str]:
    for k in keys:
        v = os.getenv(k)
        if v and v.strip() and not v.startswith("your_"):
            return v.strip()
    return None


def get_supabase_client() -> Optional[Any]:
    if not HAS_SUPABASE_LIB:
        return None

    url = _get_env_val(["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"])
    key = _get_env_val(["SUPABASE_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"])

    if not url or not key:
        return None

    try:
        return create_client(url, key)
    except Exception as e:
        print(f"[Supabase] Failed to initialize client: {e}")
        return None


def get_connection_status() -> Dict[str, Any]:
    url = _get_env_val(["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"])
    key = _get_env_val(["SUPABASE_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ANON_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"])
    
    configured = bool(url and key)
    if not configured:
        return {
            "configured": False,
            "connected": False,
            "message": "Supabase environment variables (SUPABASE_URL, SUPABASE_KEY) not found.",
            "url": None
        }

    client = get_supabase_client()
    if not client:
        return {
            "configured": True,
            "connected": False,
            "message": "Failed to create Supabase client with provided credentials.",
            "url": url
        }

    try:
        # Quick ping query
        res = client.table("reports").select("id").limit(1).execute()
        return {
            "configured": True,
            "connected": True,
            "message": "Connected to Supabase live database.",
            "url": url
        }
    except Exception as e:
        return {
            "configured": True,
            "connected": False,
            "message": f"Connection error: {str(e)}",
            "url": url
        }


# --- Local JSON Fallback Store Helper (Ensures app never crashes if Supabase is offline) ---

def _load_local_db() -> Dict[str, Any]:
    if os.path.exists(LOCAL_DB_FILE):
        try:
            with open(LOCAL_DB_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"reports": [], "messages": []}


def _save_local_db(data: Dict[str, Any]):
    os.makedirs(os.path.dirname(LOCAL_DB_FILE), exist_ok=True)
    with open(LOCAL_DB_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)


# --- Reports CRUD ---

def save_report_record(report_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Saves a report to Supabase (and mirrors locally).
    report_data must contain: id, topic, markdown_content, pdf_path, pdf_url, depth, focus, created_at
    """
    client = get_supabase_client()
    saved_to_supabase = False
    supabase_err = None

    if client:
        try:
            client.table("reports").upsert(report_data).execute()
            saved_to_supabase = True
            print(f"[Supabase] Saved report {report_data['id']} successfully.")
        except Exception as e:
            supabase_err = str(e)
            print(f"[Supabase] Error saving report: {e}")

    # Mirror locally
    local_data = _load_local_db()
    existing_idx = next((i for i, r in enumerate(local_data["reports"]) if r.get("id") == report_data["id"]), -1)
    if existing_idx >= 0:
        local_data["reports"][existing_idx] = report_data
    else:
        local_data["reports"].insert(0, report_data)
    _save_local_db(local_data)

    return {
        "success": True,
        "saved_to_supabase": saved_to_supabase,
        "error": supabase_err,
        "report": report_data
    }


def fetch_all_reports() -> List[Dict[str, Any]]:
    client = get_supabase_client()
    if client:
        try:
            res = client.table("reports").select("*").order("created_at", desc=True).execute()
            if res.data is not None:
                return res.data
        except Exception as e:
            print(f"[Supabase] Error fetching reports: {e}")

    # Fallback to local
    local_data = _load_local_db()
    return local_data.get("reports", [])


def fetch_report(report_id: str) -> Optional[Dict[str, Any]]:
    client = get_supabase_client()
    if client:
        try:
            res = client.table("reports").select("*").eq("id", report_id).limit(1).execute()
            if res.data:
                return res.data[0]
        except Exception as e:
            print(f"[Supabase] Error fetching report {report_id}: {e}")

    local_data = _load_local_db()
    for r in local_data.get("reports", []):
        if r.get("id") == report_id:
            return r
    return None


def delete_report_record(report_id: str) -> bool:
    client = get_supabase_client()
    deleted = False

    if client:
        try:
            client.table("reports").delete().eq("id", report_id).execute()
            deleted = True
            print(f"[Supabase] Deleted report {report_id}.")
        except Exception as e:
            print(f"[Supabase] Error deleting report {report_id}: {e}")

    # Also clean local store
    local_data = _load_local_db()
    local_data["reports"] = [r for r in local_data["reports"] if r.get("id") != report_id]
    local_data["messages"] = [m for m in local_data["messages"] if m.get("report_id") != report_id]
    _save_local_db(local_data)

    # Delete local PDF if exists
    pdf_path = os.path.join(os.path.dirname(__file__), "reports", f"{report_id}.pdf")
    if os.path.exists(pdf_path):
        try:
            os.remove(pdf_path)
        except Exception:
            pass

    return deleted or True


# --- Messages CRUD ---

def fetch_messages_for_report(report_id: str) -> List[Dict[str, Any]]:
    client = get_supabase_client()
    if client:
        try:
            res = client.table("messages").select("*").eq("report_id", report_id).order("created_at", desc=False).execute()
            if res.data is not None:
                return res.data
        except Exception as e:
            print(f"[Supabase] Error fetching messages for {report_id}: {e}")

    local_data = _load_local_db()
    return [m for m in local_data.get("messages", []) if m.get("report_id") == report_id]


def save_message_record(report_id: str, role: str, content: str) -> Dict[str, Any]:
    msg = {
        "report_id": report_id,
        "role": role,
        "content": content,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    client = get_supabase_client()
    if client:
        try:
            res = client.table("messages").insert(msg).execute()
            if res.data:
                msg = res.data[0]
                print(f"[Supabase] Saved message for report {report_id}.")
        except Exception as e:
            print(f"[Supabase] Error saving message: {e}")

    # Mirror locally
    local_data = _load_local_db()
    local_data["messages"].append(msg)
    _save_local_db(local_data)

    return msg
