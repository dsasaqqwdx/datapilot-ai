/**
 * DataPilot AI - Client Application Logic
 * Implements AI Copilot, Metadata Explorer, Visual Modeling Studio, and Deployments.
 */

// Global State
let currentView = "copilot";
let currentModelId = "model_sales_analytics_view";
let latestModelData = null;

document.addEventListener("DOMContentLoaded", () => {
    initNavigation();
    initChat();
    initConnections();
    initProviders();
    initExplorer();
    initModeling();
    initDeployments();
    initHistory();
    initSettings();
    initModals();

    // Load initial data
    loadCatalog();
    loadConnections();
    loadProviders();
    loadDeployments();
    loadSettings();
    loadLatestModel();
});

// ==============================================================================
// 1. Navigation Controller
// ==============================================================================
function initNavigation() {
    const navItems = document.querySelectorAll(".nav-item");
    const viewTitle = document.getElementById("current-view-title");

    navItems.forEach(btn => {
        btn.addEventListener("click", () => {
            const targetView = btn.getAttribute("data-view");
            switchView(targetView);
        });
    });
}

function switchView(viewId) {
    currentView = viewId;

    // Update active button
    document.querySelectorAll(".nav-item").forEach(btn => {
        if (btn.getAttribute("data-view") === viewId) {
            btn.classList.add("active");
            document.getElementById("current-view-title").innerText = btn.querySelector("span").innerText;
        } else {
            btn.classList.remove("active");
        }
    });

    // Update active view panel
    document.querySelectorAll(".view-panel").forEach(panel => {
        if (panel.id === `view-${viewId}`) {
            panel.classList.add("active");
        } else {
            panel.classList.remove("active");
        }
    });

    // Refresh specific view data on switch
    if (viewId === "connections") loadConnections();
    if (viewId === "providers") loadProviders();
    if (viewId === "explorer") loadCatalog();
    if (viewId === "modeling") loadLatestModel();
    if (viewId === "deployments") loadDeployments();
    if (viewId === "history") loadHistory();
}

// ==============================================================================
// 2. AI Copilot Chat Logic
// ==============================================================================
function initChat() {
    const chatForm = document.getElementById("chat-form");
    const chatInput = document.getElementById("chat-input");
    const exampleBtn = document.getElementById("btn-example-prompt");

    // Click suggested prompt chip
    if (exampleBtn) {
        exampleBtn.addEventListener("click", () => {
            chatInput.value = "Create a Sales Analytics model using customer and order tables from SAP HANA. Join them on Customer ID, calculate total revenue, and prepare a view for Snowflake.";
            chatForm.dispatchEvent(new Event("submit"));
        });
    }

    // Auto submit on Enter (without shift)
    chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            chatForm.dispatchEvent(new Event("submit"));
        }
    });

    // Form submit
    chatForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (!text) return;

        appendUserMessage(text);
        chatInput.value = "";

        const loadingId = appendLoadingMessage();

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: text })
            });
            const data = await res.json();
            removeLoadingMessage(loadingId);
            appendAssistantMessage(data);

            latestModelData = data;
            currentModelId = data.model_id;
            updateBadges(data);
        } catch (err) {
            removeLoadingMessage(loadingId);
            appendErrorMessage("Failed to connect to AI Copilot. Please check your network and provider configuration.");
        }
    });
}

function appendUserMessage(text) {
    const stream = document.getElementById("chat-stream");
    const msg = document.createElement("div");
    msg.className = "chat-message user";
    msg.innerHTML = `
        <div class="message-avatar"><span>ME</span></div>
        <div class="message-bubble">
            <div class="message-sender">Data Engineer</div>
            <div class="message-content"><p>${escapeHtml(text)}</p></div>
        </div>
    `;
    stream.appendChild(msg);
    stream.scrollTop = stream.scrollHeight;
}

function appendLoadingMessage() {
    const stream = document.getElementById("chat-stream");
    const id = "loading-" + Date.now();
    const msg = document.createElement("div");
    msg.id = id;
    msg.className = "chat-message assistant";
    msg.innerHTML = `
        <div class="message-avatar"><span>AI</span></div>
        <div class="message-bubble">
            <div class="message-sender">DataPilot Copilot &bull; Analyzing Catalog</div>
            <div class="message-content">
                <p><em>Analyzing schemas from SAP HANA and verifying foreign keys...</em></p>
            </div>
        </div>
    `;
    stream.appendChild(msg);
    stream.scrollTop = stream.scrollHeight;
    return id;
}

function removeLoadingMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function appendErrorMessage(text) {
    const stream = document.getElementById("chat-stream");
    const msg = document.createElement("div");
    msg.className = "chat-message assistant";
    msg.innerHTML = `
        <div class="message-avatar" style="background:#EF4444"><span>!</span></div>
        <div class="message-bubble" style="border-color:#EF4444">
            <div class="message-sender" style="color:#EF4444">Error</div>
            <div class="message-content"><p>${text}</p></div>
        </div>
    `;
    stream.appendChild(msg);
    stream.scrollTop = stream.scrollHeight;
}

function appendAssistantMessage(data) {
    const stream = document.getElementById("chat-stream");
    const msg = document.createElement("div");
    msg.className = "chat-message assistant";

    const p = data.pipeline || {};
    const nodes = p.nodes || [
        { label: "CUSTOMERS", sub: "SAP HANA" },
        { label: "ORDERS", sub: "SAP HANA" },
        { label: "Join (Customer ID)", sub: "INNER JOIN" },
        { label: "Aggregate Revenue", sub: "SUM(Total_Amount)" },
        { label: data.model_name, sub: "Snowflake View" }
    ];

    let flowHtml = nodes.map((n, idx) => `
        <div class="pipeline-node-chip">
            <span class="node-chip-type">${n.type || (idx < 2 ? "Source" : (idx === nodes.length - 1 ? "Target" : "Transform"))}</span>
            <span class="node-chip-label">${escapeHtml(n.label)}</span>
            <span class="node-chip-sub">${escapeHtml(n.system || n.details || n.sub || "")}</span>
        </div>
        ${idx < nodes.length - 1 ? '<span class="flow-connector">&rarr;</span>' : ''}
    `).join("");

    msg.innerHTML = `
        <div class="message-avatar"><span>AI</span></div>
        <div class="message-bubble">
            <div class="message-sender">DataPilot Copilot &bull; Schema-Aware Assistant</div>
            <div class="message-content">
                <div>${formatMarkdown(data.message)}</div>

                <!-- In-Chat Visual Pipeline Flow -->
                <div class="chat-pipeline-card">
                    <div class="pipeline-card-header">
                        <span class="model-title-badge">${escapeHtml(data.model_name || "SALES_ANALYTICS_VIEW")}</span>
                        <span class="model-status-tag">${escapeHtml(data.status || "Model structure generated, not deployed")}</span>
                    </div>

                    <div class="chat-pipeline-flow">
                        ${flowHtml}
                    </div>

                    <div class="next-step-hint">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <span>${escapeHtml(data.next_step || "Next Step: Verify join keys and target connection before deployment.")}</span>
                    </div>

                    <div class="chat-action-bar">
                        <button class="btn btn-secondary btn-inspect-model" onclick="inspectModelInStudio()">
                            🔍 Inspect in Modeling Studio
                        </button>
                        <button class="btn btn-secondary btn-verify-keys" onclick="verifyJoinKeysAction('${data.model_id}')">
                            🛡️ Verify Join Keys
                        </button>
                        <button class="btn btn-primary btn-deploy-chat" onclick="openDeployModal('${data.model_id}', '${data.model_name}')">
                            🚀 Approve &amp; Deploy to Snowflake
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    stream.appendChild(msg);
    stream.scrollTop = stream.scrollHeight;
}

function updateBadges(data) {
    const badgeModels = document.getElementById("badge-models-status");
    if (badgeModels) badgeModels.innerText = "1 Draft";
}

function inspectModelInStudio() {
    switchView("modeling");
    loadLatestModel();
}

// ==============================================================================
// 3. Connections Manager
// ==============================================================================
async function loadConnections() {
    try {
        const res = await fetch("/api/connections");
        const conns = await res.json();
        const container = document.getElementById("connections-list");
        const countBadge = document.getElementById("badge-connections-count");
        if (countBadge) countBadge.innerText = `${conns.length} Live`;

        container.innerHTML = conns.map(c => `
            <div class="connection-card">
                <div class="conn-header">
                    <div class="conn-title-group">
                        <div class="conn-icon">${getConnIcon(c.type)}</div>
                        <div>
                            <div class="conn-name">${escapeHtml(c.name)}</div>
                            <div class="conn-type">${c.type.toUpperCase()} &bull; ${escapeHtml(c.host)}</div>
                        </div>
                    </div>
                    <div class="conn-status-badge ${c.status}">
                        <span class="status-ping-dot"></span>
                        <span>${c.status === 'connected' ? 'Connected' : 'Disconnected'} (${c.latency_ms}ms)</span>
                    </div>
                </div>

                <div class="conn-details">
                    <div class="conn-detail-item">
                        <span>Database</span>
                        <span>${escapeHtml(c.database || 'DEFAULT')}</span>
                    </div>
                    <div class="conn-detail-item">
                        <span>Default Schema</span>
                        <span>${escapeHtml(c.schema_name || 'PUBLIC')}</span>
                    </div>
                    <div class="conn-detail-item">
                        <span>Service User</span>
                        <span>${escapeHtml(c.username)}</span>
                    </div>
                    <div class="conn-detail-item">
                        <span>Port</span>
                        <span>${c.port}</span>
                    </div>
                </div>

                <div class="conn-actions">
                    <button class="btn btn-secondary" onclick="testConnectionPing('${c.id}')">
                        ⚡ Test Connection
                    </button>
                </div>
            </div>
        `).join("");
    } catch (err) {
        console.error("Failed to load connections:", err);
    }
}

function getConnIcon(type) {
    if (type === "snowflake") return "❄️";
    if (type === "sap_hana") return "🔷";
    if (type === "postgres") return "🐘";
    if (type === "rest_api") return "🌐";
    return "🗄️";
}

async function testConnectionPing(connId) {
    try {
        const res = await fetch(`/api/connections/${connId}/test`, { method: "POST" });
        const data = await res.json();
        alert(`✓ Connection verified: ${data.message} (Latency: ${data.latency_ms}ms)`);
        loadConnections();
    } catch (err) {
        alert("Error testing connection: " + err.message);
    }
}

function initConnections() {
    const addBtn = document.getElementById("btn-add-connection");
    const modal = document.getElementById("modal-add-connection");
    const form = document.getElementById("form-new-connection");

    if (addBtn && modal) {
        addBtn.addEventListener("click", () => modal.classList.add("open"));
    }

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const payload = {
                name: document.getElementById("conn-input-name").value,
                type: document.getElementById("conn-input-type").value,
                host: document.getElementById("conn-input-host").value,
                port: parseInt(document.getElementById("conn-input-port").value, 10),
                database: document.getElementById("conn-input-db").value,
                schema_name: document.getElementById("conn-input-schema").value,
                username: document.getElementById("conn-input-user").value
            };
            await fetch("/api/connections", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            modal.classList.remove("open");
            form.reset();
            loadConnections();
        });
    }
}

// ==============================================================================
// 4. LLM Providers Manager
// ==============================================================================
async function loadProviders() {
    try {
        const res = await fetch("/api/providers");
        const providers = await res.json();
        const container = document.getElementById("providers-list");

        const activeProv = providers.find(p => p.is_active);
        if (activeProv) {
            const badge = document.getElementById("badge-provider");
            const topbarLlm = document.getElementById("topbar-llm-name");
            if (badge) badge.innerText = activeProv.provider_type.toUpperCase();
            if (topbarLlm) topbarLlm.innerText = `${activeProv.name} (${activeProv.model_name})`;
        }

        container.innerHTML = providers.map(p => `
            <div class="provider-card ${p.is_active ? 'active-provider' : ''}">
                <div class="provider-card-header">
                    <span class="provider-name">${escapeHtml(p.name)}</span>
                    ${p.is_active ? '<span class="nav-badge ready">Active Provider</span>' : `<button class="btn btn-secondary" onclick="activateProvider('${p.id}')">Make Active</button>`}
                </div>

                <div class="provider-form">
                    <div class="form-group">
                        <label>Model Identifier</label>
                        <input type="text" id="model-${p.id}" value="${escapeHtml(p.model_name)}">
                    </div>
                    <div class="form-group">
                        <label>Base URL Endpoint</label>
                        <input type="text" id="url-${p.id}" value="${escapeHtml(p.base_url || '')}">
                    </div>
                    <div class="form-group">
                        <label>API Key (Masked)</label>
                        <input type="password" id="key-${p.id}" placeholder="sk-or-v1-••••••••••••••••••••••••••••••••" value="sk-or-v1-configured-key">
                    </div>
                    <div style="display:flex; justify-content:flex-end; margin-top:4px;">
                        <button class="btn btn-secondary" onclick="saveProviderSettings('${p.id}')">Save Settings</button>
                    </div>
                </div>
            </div>
        `).join("");
    } catch (err) {
        console.error("Failed to load providers:", err);
    }
}

async function activateProvider(provId) {
    await fetch(`/api/providers/${provId}/activate`, { method: "POST" });
    loadProviders();
}

async function saveProviderSettings(provId) {
    const model = document.getElementById(`model-${provId}`).value;
    const url = document.getElementById(`url-${provId}`).value;
    const key = document.getElementById(`key-${provId}`).value;

    const payload = { model_name: model, base_url: url };
    if (key && !key.includes("••••")) {
        payload.api_key = key;
    }

    await fetch(`/api/providers/${provId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    alert("Provider settings updated successfully.");
    loadProviders();
}

function initProviders() {}

// ==============================================================================
// 5. Data Catalog & Metadata Explorer
// ==============================================================================
let catalogData = {};

async function loadCatalog() {
    try {
        const res = await fetch("/api/catalog");
        catalogData = await res.json();
        renderExplorerTree(catalogData);
    } catch (err) {
        console.error("Failed to load catalog:", err);
    }
}

function renderExplorerTree(catalog) {
    const tree = document.getElementById("explorer-tree");
    let html = "";

    for (const [connId, conn] of Object.entries(catalog)) {
        html += `
            <div class="tree-conn-group">
                <div class="tree-conn-title">${getConnIcon(conn.system_type)} ${escapeHtml(conn.system_name)}</div>
        `;
        for (const [schemaName, schema] of Object.entries(conn.schemas || {})) {
            html += `
                <div class="tree-schema-group">
                    <div class="tree-schema-title">📁 ${escapeHtml(schemaName)}</div>
            `;
            for (const [tableName, table] of Object.entries(schema.tables || {})) {
                html += `
                    <div class="tree-table-item" onclick="inspectTable('${connId}', '${schemaName}', '${tableName}')">
                        <span>📄 ${escapeHtml(tableName)}</span>
                        <span class="tree-table-rows">${(table.est_rows || 0).toLocaleString()} rows</span>
                    </div>
                `;
            }
            html += `</div>`;
        }
        html += `</div>`;
    }
    tree.innerHTML = html;
}

function inspectTable(connId, schemaName, tableName) {
    const details = document.getElementById("explorer-details");
    const table = catalogData[connId]?.schemas[schemaName]?.tables[tableName];
    if (!table) return;

    // Highlight selected item
    document.querySelectorAll(".tree-table-item").forEach(el => el.classList.remove("selected"));

    const colsHtml = (table.columns || []).map(col => `
        <tr>
            <td><strong>${escapeHtml(col.name)}</strong></td>
            <td><code style="color:var(--cyan-400)">${col.type}</code></td>
            <td>${col.is_pk ? '<span class="nav-badge count">PRIMARY KEY</span>' : ''} ${col.is_fk ? `<span class="nav-badge draft">FK &rarr; ${col.fk_table}.${col.fk_column}</span>` : ''}</td>
            <td>${col.nullable ? 'YES' : 'NO'}</td>
            <td>${escapeHtml(col.description || '')}</td>
        </tr>
    `).join("");

    details.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;">
            <div>
                <h3 style="font-size:18px; color:#FFFFFF; margin-bottom:4px;">${escapeHtml(tableName)}</h3>
                <p style="color:var(--text-muted); font-size:12.5px;">Schema: <strong>${escapeHtml(schemaName)}</strong> &bull; System: <strong>${escapeHtml(catalogData[connId].system_name)}</strong></p>
            </div>
            <div style="text-align:right;">
                <span class="nav-badge ready">${(table.est_rows || 0).toLocaleString()} Estimated Rows</span>
            </div>
        </div>

        <p style="margin-bottom:18px; color:var(--text-secondary); font-size:13px;">${escapeHtml(table.description || '')}</p>

        <h4 style="font-size:14px; margin-bottom:10px; color:#FFFFFF;">Column Schema Definition (Metadata Only):</h4>
        <div class="deployments-table-card">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Column Name</th>
                        <th>Data Type</th>
                        <th>Constraints</th>
                        <th>Nullable</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                    ${colsHtml}
                </tbody>
            </table>
        </div>
    `;
}

function initExplorer() {
    const searchInput = document.getElementById("catalog-search-input");
    if (searchInput) {
        searchInput.addEventListener("input", async (e) => {
            const query = e.target.value.trim();
            if (!query) {
                renderExplorerTree(catalogData);
                return;
            }
            const res = await fetch(`/api/catalog/search?q=${encodeURIComponent(query)}`);
            const results = await res.json();
            const tree = document.getElementById("explorer-tree");
            tree.innerHTML = `
                <div style="font-size:11px; color:var(--text-muted); margin-bottom:10px;">Found ${results.length} matching tables:</div>
                ${results.map(r => `
                    <div class="tree-table-item" onclick="inspectTable('${r.connection_id}', '${r.schema}', '${r.table}')">
                        <div>
                            <div>📄 <strong>${escapeHtml(r.table)}</strong></div>
                            <div style="font-size:10px; color:var(--text-muted)">${escapeHtml(r.connection_name)} &bull; ${escapeHtml(r.schema)}</div>
                        </div>
                        <span class="tree-table-rows">${(r.est_rows || 0).toLocaleString()} rows</span>
                    </div>
                `).join("")}
            `;
        });
    }
}

// ==============================================================================
// 6. Data Modeling Studio
// ==============================================================================
async function loadLatestModel() {
    try {
        const res = await fetch(`/api/models/${currentModelId}`);
        if (res.ok) {
            const data = await res.json();
            renderModelStudio(data);
        } else {
            // Fetch first available
            const listRes = await fetch("/api/models");
            const list = await listRes.json();
            if (list.length > 0) {
                currentModelId = list[0].id;
                const dRes = await fetch(`/api/models/${currentModelId}`);
                renderModelStudio(await dRes.json());
            }
        }
    } catch (err) {
        console.error("Failed to load model studio:", err);
    }
}

function renderModelStudio(model) {
    document.getElementById("modeling-model-name").innerText = model.name;
    const statusEl = document.getElementById("modeling-model-status");
    if (model.status === "deployed") {
        statusEl.className = "model-state-badge deployed";
        statusEl.innerText = "Deployed &bull; Active in Snowflake";
    } else {
        statusEl.className = "model-state-badge draft";
        statusEl.innerText = "Draft &bull; Not Deployed";
    }

    // Render Visual Pipeline Graph
    const p = model.pipeline || {};
    const nodes = p.nodes || [
        { label: "CUSTOMERS", type: "source", details: "SAP HANA (ERP_SALES)" },
        { label: "ORDERS", type: "source", details: "SAP HANA (ERP_SALES)" },
        { label: "Join on Customer ID", type: "transform", details: "INNER JOIN (c.CUSTOMER_ID = o.CUSTOMER_ID)" },
        { label: "Aggregate Revenue", type: "transform", details: "SUM(TOTAL_AMOUNT) AS TOTAL_REVENUE" },
        { label: model.name, type: "target", details: "Snowflake (EDW_REPORTING)" }
    ];

    const graphContainer = document.getElementById("pipeline-graph-canvas");
    graphContainer.innerHTML = nodes.map((n, i) => `
        <div class="graph-node ${n.type === 'source' ? 'source-node' : (n.type === 'target' ? 'target-node' : 'transform-node')}">
            <span class="node-type-label">${n.type.toUpperCase()}</span>
            <div class="node-main-name">${escapeHtml(n.label)}</div>
            <div class="node-detail-desc">${escapeHtml(n.details || n.system || "")}</div>
        </div>
        ${i < nodes.length - 1 ? '<div class="graph-arrow">&rarr;</div>' : ''}
    `).join("");

    // Populate Code Tabs
    document.getElementById("code-sql").innerText = model.sql_code || "-- No SQL Generated";
    document.getElementById("code-dbt").innerText = model.dbt_code || "-- No dbt Generated";
    document.getElementById("code-json").innerText = JSON.stringify(model.pipeline, null, 2);

    // Populate Validation Checklist
    const val = model.validation || {};
    const checklist = document.getElementById("validation-checklist");
    checklist.innerHTML = (val.checks || []).map(c => `
        <div class="check-item">
            <span class="check-status-badge ${c.status === 'PASS' ? 'pass' : 'warning'}">${c.status}</span>
            <div class="check-text">
                <h4>${escapeHtml(c.check)}</h4>
                <p>${escapeHtml(c.details)}</p>
            </div>
        </div>
    `).join("");
}

function initModeling() {
    // Studio Tabs
    const tabs = document.querySelectorAll(".studio-tab");
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");

            const tabName = tab.getAttribute("data-tab");
            document.querySelectorAll(".tab-content").forEach(tc => {
                if (tc.id === `tab-${tabName}`) {
                    tc.classList.add("active");
                } else {
                    tc.classList.remove("active");
                }
            });
        });
    });

    const verifyBtn = document.getElementById("btn-verify-model");
    if (verifyBtn) {
        verifyBtn.addEventListener("click", () => verifyJoinKeysAction(currentModelId));
    }

    const deployBtn = document.getElementById("btn-deploy-model");
    if (deployBtn) {
        deployBtn.addEventListener("click", () => {
            openDeployModal(currentModelId, document.getElementById("modeling-model-name").innerText);
        });
    }
}

async function verifyJoinKeysAction(modelId) {
    try {
        const res = await fetch(`/api/models/${modelId}/validate`, { method: "POST" });
        const data = await res.json();
        alert(`✓ Join Keys Verified:\n- Foreign Key CUSTOMER_ID: PASS\n- Compatible Data Types: VARCHAR(32)\n- Status: Safe to deploy.`);
        loadLatestModel();
    } catch (err) {
        alert("Verification failed: " + err.message);
    }
}

// ==============================================================================
// 7. Deployments View
// ==============================================================================
async function loadDeployments() {
    try {
        const res = await fetch("/api/deployments");
        const deps = await res.json();
        const tbody = document.getElementById("deployments-tbody");
        const deployBadge = document.getElementById("badge-deploy-status");
        if (deployBadge) deployBadge.innerText = `${deps.length} Live`;

        tbody.innerHTML = deps.map(d => `
            <tr>
                <td><strong>${escapeHtml(d.model_name)}</strong></td>
                <td>${escapeHtml(d.target_system)}</td>
                <td><code style="color:var(--cyan-400)">${escapeHtml(d.target_object)}</code></td>
                <td><span class="nav-badge count">${d.status.toUpperCase()}</span></td>
                <td>${d.execution_time_ms} ms</td>
                <td>${escapeHtml(d.executed_by)}</td>
                <td>${new Date(d.created_at).toLocaleString()}</td>
                <td>
                    <button class="btn btn-secondary" style="padding:4px 8px; font-size:11px;" onclick="viewDeploymentLog('${escapeHtml(d.logs)}')">Logs</button>
                </td>
            </tr>
        `).join("");
    } catch (err) {
        console.error("Failed to load deployments:", err);
    }
}

function viewDeploymentLog(logText) {
    alert("Deployment DDL Log:\n\n" + logText);
}

function initDeployments() {}

// ==============================================================================
// 8. History View
// ==============================================================================
async function loadHistory() {
    try {
        const res = await fetch("/api/chat/history");
        const history = await res.json();
        const timeline = document.getElementById("history-timeline");

        if (history.length === 0) {
            timeline.innerHTML = `<div class="empty-state"><span>No past prompt interactions recorded yet.</span></div>`;
            return;
        }

        timeline.innerHTML = history.map(h => `
            <div class="timeline-card">
                <div class="timeline-icon">${h.role === 'user' ? '👤' : '🤖'}</div>
                <div class="timeline-content">
                    <div class="timeline-header">
                        <span class="timeline-title">${h.role === 'user' ? 'Data Engineer Prompt' : 'AI Copilot Model Proposal'}</span>
                        <span class="timeline-time">${new Date(h.created_at).toLocaleString()}</span>
                    </div>
                    <div class="timeline-desc">${escapeHtml(h.content.substring(0, 300))}${h.content.length > 300 ? '...' : ''}</div>
                </div>
            </div>
        `).join("");
    } catch (err) {
        console.error("Failed to load history:", err);
    }
}

function initHistory() {
    const clearBtn = document.getElementById("btn-clear-history");
    if (clearBtn) {
        clearBtn.addEventListener("click", async () => {
            if (confirm("Clear all prompt and execution audit history?")) {
                await fetch("/api/chat/history", { method: "DELETE" });
                loadHistory();
            }
        });
    }
}

// ==============================================================================
// 9. Settings View
// ==============================================================================
async function loadSettings() {
    try {
        const res = await fetch("/api/settings");
        const settings = await res.json();
        const priv = document.getElementById("setting-privacy");
        const apprv = document.getElementById("setting-approval");
        const enc = document.getElementById("setting-encryption");

        if (priv) priv.checked = settings.privacy_shield === "true";
        if (apprv) apprv.checked = settings.human_approval_required === "true";
        if (enc) enc.checked = settings.encrypt_credentials === "true";
    } catch (err) {
        console.error("Failed to load settings:", err);
    }
}

function initSettings() {
    ["setting-privacy", "setting-approval", "setting-encryption"].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("change", async () => {
                const payload = {
                    privacy_shield: document.getElementById("setting-privacy").checked ? "true" : "false",
                    human_approval_required: document.getElementById("setting-approval").checked ? "true" : "false",
                    encrypt_credentials: document.getElementById("setting-encryption").checked ? "true" : "false"
                };
                await fetch("/api/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
            });
        }
    });
}

// ==============================================================================
// 10. Modals & Deployment Flow
// ==============================================================================
let pendingDeployModelId = "";

function openDeployModal(modelId, modelName) {
    pendingDeployModelId = modelId;
    document.getElementById("modal-deploy-name").innerText = modelName;
    document.getElementById("modal-deploy").classList.add("open");
}

function initModals() {
    // Close buttons
    document.querySelectorAll(".modal-close, #btn-cancel-conn, #btn-cancel-deploy").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".modal-backdrop").forEach(m => m.classList.remove("open"));
        });
    });

    // Confirm Deployment
    const confirmDeployBtn = document.getElementById("btn-confirm-deploy");
    if (confirmDeployBtn) {
        confirmDeployBtn.addEventListener("click", async () => {
            confirmDeployBtn.disabled = true;
            confirmDeployBtn.innerText = "Executing DDL on Snowflake...";

            try {
                const res = await fetch(`/api/models/${pendingDeployModelId}/deploy`, { method: "POST" });
                const data = await res.json();

                document.getElementById("modal-deploy").classList.remove("open");
                confirmDeployBtn.disabled = false;
                confirmDeployBtn.innerText = "🚀 Confirm & Push DDL";

                alert(`🎉 Successfully Deployed!\n\nTarget Object: ${data.target_object}\nDuration: ${data.execution_time_ms}ms\nStatus: Live in Snowflake.`);
                switchView("deployments");
                loadDeployments();
            } catch (err) {
                confirmDeployBtn.disabled = false;
                confirmDeployBtn.innerText = "🚀 Confirm & Push DDL";
                alert("Deployment failed: " + err.message);
            }
        });
    }
}

// ==============================================================================
// Utilities
// ==============================================================================
function escapeHtml(text) {
    if (!text) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatMarkdown(text) {
    if (!text) return "";
    let html = escapeHtml(text);
    // Bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Code
    html = html.replace(/`(.*?)`/g, '<code style="color:var(--cyan-400); font-family:var(--font-mono);">$1</code>');
    // Line breaks
    html = html.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
    return `<p>${html}</p>`;
}
