import sqlite3
import json
import os
from datetime import datetime
from typing import Dict, Any, List, Optional

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "datapilot.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes tables and seeds initial connections, providers, and settings."""
    conn = get_db()
    cursor = conn.cursor()

    # 1. Connections Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS connections (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        host TEXT NOT NULL,
        port INTEGER,
        database TEXT,
        schema_name TEXT,
        username TEXT,
        status TEXT DEFAULT 'connected',
        latency_ms INTEGER DEFAULT 45,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 2. Data Models Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS models (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        source_conn TEXT,
        target_conn TEXT,
        pipeline_json TEXT,
        sql_code TEXT,
        dbt_code TEXT,
        status TEXT DEFAULT 'draft',
        join_verified INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 3. Deployments Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS deployments (
        id TEXT PRIMARY KEY,
        model_id TEXT,
        model_name TEXT,
        target_system TEXT,
        target_object TEXT,
        status TEXT,
        executed_by TEXT,
        execution_time_ms INTEGER,
        logs TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 4. LLM Providers Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS providers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        provider_type TEXT NOT NULL,
        api_key TEXT,
        model_name TEXT NOT NULL,
        base_url TEXT,
        is_active INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 5. Chat History Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chat_history (
        id TEXT PRIMARY KEY,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 6. Settings Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )
    """)

    # Seed default settings
    default_settings = {
        "privacy_shield": "true",
        "human_approval_required": "true",
        "encrypt_credentials": "true",
        "default_target_warehouse": "Snowflake (EDW_REPORTING)",
        "max_query_preview_rows": "100"
    }
    for k, v in default_settings.items():
        cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (k, v))

    # Seed initial connections if empty
    cursor.execute("SELECT COUNT(*) FROM connections")
    if cursor.fetchone()[0] == 0:
        initial_connections = [
            ("conn_sap_hana", "SAP HANA ERP", "sap_hana", "hana-prod-cluster.internal.corp", 39015, "HDB", "ERP_SALES", "SAP_ETL_SVC", "connected", 38),
            ("conn_snowflake", "Snowflake Analytics DW", "snowflake", "xy12345.us-east-1.snowflakecomputing.com", 443, "ANALYTICS_DW", "EDW_REPORTING", "DATAPILOT_SVC", "connected", 52),
            ("conn_postgres", "PostgreSQL Core App", "postgres", "postgres-primary.rds.amazonaws.com", 5432, "app_production", "CORE_APP", "app_readonly", "connected", 24),
            ("conn_stripe_api", "Stripe Billing REST API", "rest_api", "api.stripe.com/v1", 443, "REST", "BILLING_V1", "STRIPE_KEY_BEARER", "connected", 110)
        ]
        cursor.executemany("""
        INSERT INTO connections (id, name, type, host, port, database, schema_name, username, status, latency_ms)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, initial_connections)

    # Seed initial LLM providers if empty
    cursor.execute("SELECT COUNT(*) FROM providers")
    if cursor.fetchone()[0] == 0:
        # Check if user had an OpenRouter key in parent/environment
        env_openrouter = os.getenv("OPENROUTER_API_KEY", "")
        initial_providers = [
            ("prov_openrouter", "OpenRouter (Recommended)", "openrouter", env_openrouter or "sk-or-v1-configured", "openai/gpt-4o-mini", "https://openrouter.ai/api/v1", 1),
            ("prov_openai", "OpenAI Direct", "openai", "", "gpt-4o", "https://api.openai.com/v1", 0),
            ("prov_anthropic", "Anthropic Claude", "anthropic", "", "claude-3-5-sonnet-20241022", "https://api.anthropic.com/v1", 0),
            ("prov_gemini", "Google Gemini", "gemini", "", "gemini-1.5-flash", "https://generativelanguage.googleapis.com/v1beta", 0),
            ("prov_ollama", "Local Ollama", "ollama", "", "llama3.2:latest", "http://localhost:11434/v1", 0)
        ]
        cursor.executemany("""
        INSERT INTO providers (id, name, provider_type, api_key, model_name, base_url, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, initial_providers)

    # Seed initial past deployment if empty
    cursor.execute("SELECT COUNT(*) FROM deployments")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
        INSERT INTO deployments (id, model_id, model_name, target_system, target_object, status, executed_by, execution_time_ms, logs)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            "dep_prev_001",
            "model_cust_churn",
            "CUSTOMER_CHURN_PREDICTION_FEATURES",
            "Snowflake",
            "ANALYTICS_DW.EDW_REPORTING.CUSTOMER_CHURN_PREDICTION_FEATURES",
            "deployed",
            "Lead Data Engineer",
            1240,
            "SUCCESS: Created view ANALYTICS_DW.EDW_REPORTING.CUSTOMER_CHURN_PREDICTION_FEATURES in 1.24s. 0 compilation errors."
        ))

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
