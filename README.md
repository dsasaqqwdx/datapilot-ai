# DataPilot AI — AI-Assisted Data Engineering Workspace

> **Design Concept Implementation**: An intelligent workspace where data engineers describe their analytical requirements in plain English, and the AI inspects enterprise metadata catalogs, proposes validated visual data models, generates Snowflake SQL & dbt code, verifies join key integrity, and enables safe one-click deployment.

---

## 🌟 The 5 Core Architecture Pillars

### 1. LLM Provider Layer (Connect Any LLM)
- Standardized provider abstraction supporting **OpenRouter**, **OpenAI**, **Anthropic Claude**, **Google Gemini**, and **Local Ollama**.
- Pre-configured with OpenRouter to utilize models like `openai/gpt-4o-mini`, `meta-llama/llama-3.3-70b-instruct`, and `deepseek/deepseek-chat`.
- Masked API key storage and active provider switching from the UI.

### 2. Connector Layer (Connect Any Database / API)
- Pre-connected live sources:
  - 🔷 **SAP HANA ERP**: `ERP_SALES` schema with `CUSTOMERS`, `ORDERS`, `ORDER_ITEMS`, and `PRODUCTS`.
  - ❄️ **Snowflake Analytics DW**: `ANALYTICS_DW.EDW_REPORTING` target warehouse.
  - 🐘 **PostgreSQL**: `CORE_APP` production operational database.
  - 🌐 **Stripe REST API**: OpenAPI schema collection for billing.
- Interactive connection testing with real ping roundtrip latency computation.

### 3. Metadata Layer (The Core — Zero Row Data Access)
- **Data Privacy Shield**: Only schema metadata (tables, column names, data types, primary & foreign keys, estimated row counts) is analyzed.
- **Customer row data NEVER leaves your network or reaches external LLMs**.

### 4. AI Copilot Layer
- Interactive conversational assistant powered by enterprise schema context.
- Translates natural language prompts into visual pipeline graphs:
  - `[SAP HANA: Customers]` + `[SAP HANA: Orders]` &rarr; `[Join on Customer ID]` &rarr; `[Aggregate Revenue]` &rarr; `[Snowflake: SALES_ANALYTICS_VIEW]`
- Emits model status: **`"Model structure generated, not deployed"`**.
- Guides the data engineer on the exact next step: verifying join keys and target connection.

### 5. Modeling Studio & Human-in-the-Loop Deployment
- **Visual Pipeline Flow Graph**: Clickable nodes displaying transformation logic.
- **Snowflake SQL DDL Generator**: Generates clean, optimized `CREATE OR REPLACE VIEW` statements with Common Table Expressions (CTEs).
- **dbt Model Generator**: Generates modular dbt SQL with `{{ config(materialized='view') }}` and `{{ source(...) }}` references.
- **Join Key Integrity Checklist**: Verifies that join keys (`CUSTOMER_ID`) exist, types match (`VARCHAR(32)`), and checks for fanout risks.
- **Deployment & Audit**: Approved models push DDL to the target warehouse and log execution timestamps, logs, and rollback options.

---

## 🚀 How to Run and Test

### 1. Activate the Virtual Environment

Open a terminal in `d:\Thanuja_demo_projects+\datapilot_pro`:

**PowerShell:**
```powershell
.\venv\Scripts\Activate.ps1
```

**Command Prompt:**
```cmd
.\venv\Scripts\activate.bat
```

*(Dependencies are already installed. If needed: `pip install -r requirements.txt`)*

---

### 2. Start the Server

Run the application launcher:

```powershell
python run.py
```

You will see:
```text
=================================================================
   DataPilot AI - Enterprise Data Engineering Studio
   AI-Assisted Modeling, Metadata Harvesting & Snowflake Deploy
=================================================================

[+] Server running at: http://127.0.0.1:8000
[+] API Documentation at: http://127.0.0.1:8000/docs
[+] Press Ctrl+C to stop the server.
```

---

### 3. Open in Your Web Browser

Open your browser and navigate to:
👉 **[http://127.0.0.1:8000](http://127.0.0.1:8000)**

---

### 4. Walkthrough the Demo Workflow

1. **AI Copilot Tab**:
   - Click the suggested prompt chip at the top:
     > *“Create a Sales Analytics model using customer and order tables from SAP HANA. Join them on Customer ID, calculate total revenue, and prepare a view for Snowflake.”*
   - Watch DataPilot AI analyze the schemas and return:
     - The natural language breakdown.
     - The visual pipeline flow: `CUSTOMERS → ORDERS → Join on Customer ID → Aggregate Revenue → SALES_ANALYTICS_VIEW`.
     - Status: **`Model structure generated, not deployed`**.
     - Next step recommendation.
2. **Click "Inspect in Modeling Studio"**:
   - See the interactive visual pipeline diagram.
   - Switch between **Snowflake SQL View DDL**, **dbt Model Code**, and **Join Key & Integrity Checklist**.
3. **Click "Verify Join Keys"**:
   - Validates that `CUSTOMER_ID` exists in both tables, data types match (`VARCHAR(32)`), and no fanout risks exist.
4. **Click "Approve & Deploy to Snowflake"**:
   - Prompts for human-in-the-loop confirmation.
   - Pushes DDL and redirects to the **Deployments** tab showing execution logs and runtime.
5. **Explore Other Sidebar Modules**:
   - **Connections**: Test live ping latencies for SAP HANA and Snowflake.
   - **LLM Providers**: View your active OpenRouter configuration.
   - **Data Explorer**: Browse schemas, tables, and column metadata without accessing row data.
   - **History**: Review prompt history and audit trail.
   - **Settings**: Toggle Privacy Shield and Human-in-the-Loop policies.
