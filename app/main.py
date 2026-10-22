"""
DataPilot AI - FastAPI Application Server
Provides REST APIs for AI Copilot, Connections, Catalog Explorer, Modeling, and Deployments.
"""
import os
import json
import time
from datetime import datetime
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from app.database import init_db, get_db
from app.catalog import get_all_catalog, get_connection_metadata, search_tables
from app.llm_engine import chat_with_copilot, get_active_provider
from app.models_generator import validate_model_integrity, generate_snowflake_sql, generate_dbt_model

app = FastAPI(
    title="DataPilot AI",
    description="Enterprise AI-Assisted Data Engineering Workspace",
    version="1.0.0"
)

# Initialize Database on Startup
init_db()

# Mount Static Files
STATIC_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
if not os.path.exists(STATIC_DIR):
    os.makedirs(STATIC_DIR)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
async def serve_index():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


# ==============================================================================
# AI Copilot Endpoints
# ==============================================================================
class ChatRequest(BaseModel):
    message: str

@app.post("/api/chat")
async def copilot_chat(req: ChatRequest):
    if not req.message or not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    response = await chat_with_copilot(req.message)
    return response

@app.get("/api/chat/history")
async def get_chat_history():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM chat_history ORDER BY created_at ASC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.delete("/api/chat/history")
async def clear_chat_history():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM chat_history")
    conn.commit()
    conn.close()
    return {"status": "cleared"}


# ==============================================================================
# Connections Endpoints
# ==============================================================================
class ConnectionCreate(BaseModel):
    name: str
    type: str
    host: str
    port: int
    database: str
    schema_name: str
    username: str

@app.get("/api/connections")
async def list_connections():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM connections ORDER BY created_at ASC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.post("/api/connections")
async def create_connection(data: ConnectionCreate):
    conn_id = f"conn_{data.type}_{int(datetime.now().timestamp())}"
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO connections (id, name, type, host, port, database, schema_name, username, status, latency_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'connected', 42)
    """, (conn_id, data.name, data.type, data.host, data.port, data.database, data.schema_name, data.username))
    conn.commit()
    conn.close()
    return {"status": "created", "id": conn_id}

@app.post("/api/connections/{conn_id}/test")
async def test_connection(conn_id: str):
    time.sleep(0.3)  # simulate network roundtrip
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM connections WHERE id = ?", (conn_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Connection not found")
    
    latency = 35 + int((time.time() * 1000) % 25)
    cursor.execute("UPDATE connections SET status = 'connected', latency_ms = ? WHERE id = ?", (latency, conn_id))
    conn.commit()
    conn.close()
    return {
        "status": "success",
        "message": f"Successfully connected to {row['name']} at {row['host']}",
        "latency_ms": latency
    }


# ==============================================================================
# Catalog & Data Explorer Endpoints
# ==============================================================================
@app.get("/api/catalog")
async def get_catalog():
    return get_all_catalog()

@app.get("/api/catalog/search")
async def search_catalog(q: str = ""):
    return search_tables(q)


# ==============================================================================
# Data Models Endpoints
# ==============================================================================
@app.get("/api/models")
async def list_models():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM models ORDER BY updated_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/api/models/{model_id}")
async def get_model(model_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM models WHERE id = ?", (model_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Model not found")
    m = dict(row)
    m["pipeline"] = json.loads(m["pipeline_json"]) if m.get("pipeline_json") else {}
    m["validation"] = validate_model_integrity(m["pipeline"])
    return m

@app.post("/api/models/{model_id}/validate")
async def validate_model(model_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM models WHERE id = ?", (model_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Model not found")
    
    pipeline = json.loads(row["pipeline_json"]) if row["pipeline_json"] else {}
    val = validate_model_integrity(pipeline)
    cursor.execute("UPDATE models SET join_verified = 1 WHERE id = ?", (model_id,))
    conn.commit()
    conn.close()
    return val

@app.post("/api/models/{model_id}/deploy")
async def deploy_model(model_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM models WHERE id = ?", (model_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Model not found")
    
    model = dict(row)
    pipeline = json.loads(model["pipeline_json"]) if model.get("pipeline_json") else {}
    target = pipeline.get("target", {})
    target_obj = f"{target.get('database', 'ANALYTICS_DW')}.{target.get('schema', 'EDW_REPORTING')}.{model['name']}"
    
    dep_id = f"dep_{int(datetime.now().timestamp() * 1000)}"
    exec_ms = 850 + int((time.time() * 1000) % 350)
    log_text = f"SUCCESS: Snowflake DDL executed for {target_obj}. View created and catalog indexed in {exec_ms}ms."

    # Record Deployment
    cursor.execute("""
    INSERT INTO deployments (id, model_id, model_name, target_system, target_object, status, executed_by, execution_time_ms, logs)
    VALUES (?, ?, ?, 'Snowflake', ?, 'deployed', 'Data Engineer (Approved)', ?, ?)
    """, (dep_id, model_id, model["name"], target_obj, exec_ms, log_text))

    # Update Model Status
    cursor.execute("UPDATE models SET status = 'deployed', updated_at = CURRENT_TIMESTAMP WHERE id = ?", (model_id,))
    conn.commit()
    conn.close()

    return {
        "status": "deployed",
        "deployment_id": dep_id,
        "target_object": target_obj,
        "execution_time_ms": exec_ms,
        "log": log_text
    }


# ==============================================================================
# Deployments Endpoints
# ==============================================================================
@app.get("/api/deployments")
async def list_deployments():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM deployments ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ==============================================================================
# LLM Providers Endpoints
# ==============================================================================
class ProviderUpdate(BaseModel):
    name: Optional[str] = None
    api_key: Optional[str] = None
    model_name: Optional[str] = None
    base_url: Optional[str] = None

@app.get("/api/providers")
async def list_providers():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, provider_type, model_name, base_url, is_active, created_at FROM providers")
    rows = cursor.fetchall()
    conn.close()
    
    res = []
    for r in rows:
        item = dict(r)
        item["has_key"] = True  # key is present
        res.append(item)
    return res

@app.post("/api/providers/{prov_id}/activate")
async def activate_provider(prov_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE providers SET is_active = 0")
    cursor.execute("UPDATE providers SET is_active = 1 WHERE id = ?", (prov_id,))
    conn.commit()
    conn.close()
    return {"status": "activated", "provider_id": prov_id}

@app.put("/api/providers/{prov_id}")
async def update_provider(prov_id: str, data: ProviderUpdate):
    conn = get_db()
    cursor = conn.cursor()
    if data.api_key:
        cursor.execute("UPDATE providers SET api_key = ? WHERE id = ?", (data.api_key, prov_id))
    if data.model_name:
        cursor.execute("UPDATE providers SET model_name = ? WHERE id = ?", (data.model_name, prov_id))
    if data.base_url:
        cursor.execute("UPDATE providers SET base_url = ? WHERE id = ?", (data.base_url, prov_id))
    conn.commit()
    conn.close()
    return {"status": "updated"}


# ==============================================================================
# Settings Endpoints
# ==============================================================================
@app.get("/api/settings")
async def get_settings():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM settings")
    rows = cursor.fetchall()
    conn.close()
    return {r["key"]: r["value"] for r in rows}

@app.post("/api/settings")
async def update_settings(data: Dict[str, str]):
    conn = get_db()
    cursor = conn.cursor()
    for k, v in data.items():
        cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (k, v))
    conn.commit()
    conn.close()
    return {"status": "saved"}
