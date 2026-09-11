/* ==========================================
   DRIP QUEEN MD DASHBOARD
   FRONTEND JAVASCRIPT
========================================== */

"use strict";

const FEATURE_ALIASES = {
    antilink: "antiLink",
    antidelete: "antiDelete",
    autoreact: "autoReact",
    autoreply: "autoReply",
    autotyping: "autoTyping",
    autorecording: "autoRecording",
    autoread: "autoRead",
    alwaysonline: "alwaysOnline",
    autostatus: "autoStatusView",
    autostatusview: "autoStatusView",
    antivall: "antiCall",
    anticall: "antiCall",
    autobio: "autoBio",
    autoview: "autoView"
};

let apiOnline = false;

const PAGE_META = {
    home: ["Dashboard", "Overview and live bot status"],
    pairing: ["Connect WhatsApp", "Generate a secure WhatsApp pairing code"],
    sessions: ["Connected Users", "Manage connected WhatsApp sessions"],
    autofeatures: ["Auto Features", "Control automated bot features"],
    commands: ["Commands", "Browse commands loaded from the Commands folder"],
    settings: ["Settings", "Configure your bot" ]
};

/* ==========================================
   API REQUEST HELPER
========================================== */

async function apiRequest(url, options = {}, timeoutMs = 10000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                Accept: "application/json",
                ...(options.headers || {})
            }
        });

        const text = await response.text();
        let data = {};

        try {
            data = text ? JSON.parse(text) : {};
        } catch {
            data = { error: text || `HTTP ${response.status}` };
        }

        if (!response.ok) {
            throw new Error(
                data.error ||
                data.message ||
                `Request failed (${response.status})`
            );
        }

        apiOnline = true;
        return data;
    } catch (error) {
        if (error.name === "AbortError") {
            throw new Error("API request timed out");
        }
        apiOnline = false;
        throw error;
    } finally {
        clearTimeout(timer);
    }
}

/* ==========================================
   LOAD BOT STATUS
========================================== */

async function loadStatus() {
    try {
        const data = await apiRequest("/api/status");

        updateElement("botName", data.botName);
        updateElement("botVersion", data.version);
        updateElement("botMode", data.mode);
        updateElement("botStatus", data.status);

        updateElement("settingBotName", data.botName);
        updateElement("settingVersion", data.version);
        updateElement("settingCreator", data.creator);
        updateElement("settingMode", data.mode);

        if (data.uptime !== undefined) {
            updateElement("uptime", formatUptime(data.uptime));
            updateElement("serverUptime", formatUptime(data.uptime));
        }

        if (data.sessions !== undefined) {
            updateElement("sessionCount", data.sessions);
            updateElement("totalUsers", data.sessions);
            updateElement("activeSessions", data.sessions);
        }

        if (data.commands !== undefined) {
            updateElement("commandCount", data.commands);
            updateElement("totalCommands", data.commands);
        }

        setServerStatus(true, data.status || "online");
        updateElement("pairingServerStatus", "Ready");
        updateElement("activeSessions", data.sessions ?? 0);
    } catch (error) {
        console.error("[STATUS ERROR]", error.message);
        setServerStatus(false, "offline");
        updateElement("pairingServerStatus", "Offline");
    }
}

/* ==========================================
   LOAD SESSIONS
========================================== */

async function loadSessions() {
    try {
        const data = await apiRequest("/api/sessions");
        const sessions = Array.isArray(data.sessions) ? data.sessions : [];
        const container = document.getElementById("sessionsList");

        if (!container) return;

        container.innerHTML = "";

        if (!sessions.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <span>No active sessions</span>
                </div>
            `;
            return;
        }

        for (const session of sessions) {
            const item = document.createElement("div");
            item.className = "session-item";

            const userId = String(
                session.userId ||
                session.id ||
                session.phoneNumber ||
                ""
            );

            item.innerHTML = `
                <div class="session-info">
                    <strong>${escapeHTML(userId)}</strong>
                    <span>${session.connected ? "Connected" : "Offline"}</span>
                </div>
                <button class="delete-session" type="button">
                    Delete
                </button>
            `;

            item.querySelector("button").addEventListener(
                "click",
                () => deleteSession(userId)
            );

            container.appendChild(item);
        }
    } catch (error) {
        console.error("[SESSIONS ERROR]", error.message);
        const container = document.getElementById("sessionsList");
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <span>Unable to load sessions</span>
                </div>
            `;
        }
    }
}

/* ==========================================
   DELETE SESSION
========================================== */

async function deleteSession(userId) {
    if (!userId) return;

    if (!confirm(`Delete session ${userId}?`)) {
        return;
    }

    try {
        await apiRequest(
            `/api/sessions/${encodeURIComponent(userId)}`,
            { method: "DELETE" }
        );

        await loadSessions();
        showToast("Session removed successfully", "success");
    } catch (error) {
        showToast(error.message, "error");
    }
}

/* ==========================================
   GENERATE PAIRING CODE
========================================== */

async function generatePairingCode() {
    const input = document.getElementById("phoneNumber");
    const result = document.getElementById("pairingResult");
    const pairCode = document.getElementById("pairCode");

    if (!input) return;

    const phoneNumber = input.value.trim();

    if (!phoneNumber) {
        showToast("Enter your WhatsApp number with country code", "error");
        input.focus();
        return;
    }

    const button = document.getElementById("generatePairBtn");

    try {
        if (button) {
            button.disabled = true;
            button.dataset.originalText = button.textContent;
            button.textContent = "Generating...";
        }
        const errorBox = document.getElementById("pairingError");
        if (errorBox) {
            errorBox.classList.add("hidden");
            errorBox.textContent = "";
        }
        if (result) result.textContent = "Generating pairing code...";
        if (pairCode) {
            pairCode.textContent = "--------";
            pairCode.style.display = "";
        }

        const data = await apiRequest(
            "/api/pair",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ phoneNumber })
            },
            30000
        );

        const code = data.pairingCode || data.code || data.pairCode;

        if (!code) {
            throw new Error("Server did not return a pairing code");
        }

        if (pairCode) pairCode.textContent = formatPairingCode(code);
        const resultBox = document.getElementById("pairingResult");
        if (resultBox) resultBox.classList.remove("hidden");
        if (result) {
            result.textContent =
                "Open WhatsApp → Linked devices → Link a device → Link with phone number";
        }

        showToast("Pairing code generated", "success");
        await loadSessions();
    } catch (error) {
        if (result) result.textContent = `Error: ${error.message}`;
        if (pairCode) pairCode.textContent = "--------";
        const errorBox = document.getElementById("pairingError");
        if (errorBox) {
            errorBox.textContent = error.message;
            errorBox.classList.remove("hidden");
        }
        showToast(error.message, "error");
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = button.dataset.originalText || "Generate Pair Code";
        }
    }
}

function formatPairingCode(code) {
    const clean = String(code).replace(/[^A-Za-z0-9]/g, "");
    if (clean.length === 8) {
        return `${clean.slice(0, 4)}-${clean.slice(4)}`;
    }
    return code;
}

/* ==========================================
   LOAD COMMANDS
========================================== */

async function loadCommands() {
    try {
        const data = await apiRequest("/api/commands");
        const commands = Array.isArray(data.commands) ? data.commands : [];
        const container = document.getElementById("commandsList");

        if (!container) return;

        container.innerHTML = "";

        if (!commands.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <span>No commands loaded</span>
                </div>
            `;
            return;
        }

        for (const command of commands) {
            const item = document.createElement("div");
            item.className = "command-item";

            item.innerHTML = `
                <strong>${escapeHTML(command.name)}</strong>
                <span>${escapeHTML(command.category || "General")}</span>
                <p>${escapeHTML(command.description || "No description available.")}</p>
            `;

            container.appendChild(item);
        }

        updateElement("commandCount", commands.length);
    } catch (error) {
        console.error("[COMMANDS ERROR]", error.message);
    }
}

/* ==========================================
   LOAD FEATURES
========================================== */

async function loadFeatures() {
    try {
        const data = await apiRequest("/api/features");
        const features = data.features || {};

        document.querySelectorAll("[data-feature], [data-setting]").forEach(
            element => {
                const rawName =
                    element.dataset.feature ||
                    element.dataset.setting;

                const featureName = normalizeFeatureName(rawName);

                if (
                    featureName &&
                    element.type === "checkbox"
                ) {
                    element.checked = features[featureName] === true;
                }
            }
        );
    } catch (error) {
        console.error("[FEATURE LOAD ERROR]", error.message);
    }
}

/* ==========================================
   UPDATE FEATURE
========================================== */

async function updateFeature(featureName, enabled, element = null) {
    const normalized = normalizeFeatureName(featureName);

    if (!normalized) {
        showToast("Unknown feature", "error");
        return false;
    }

    try {
        await apiRequest(
            `/api/features/${encodeURIComponent(normalized)}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    enabled: Boolean(enabled)
                })
            }
        );

        showToast(
            `${prettyFeatureName(normalized)} ${enabled ? "enabled" : "disabled"}`,
            "success"
        );

        return true;
    } catch (error) {
        if (element) element.checked = !enabled;
        showToast(error.message, "error");
        return false;
    }
}

/* ==========================================
   FEATURE EVENT LISTENERS
========================================== */

function initializeFeatureControls() {
    const controls = document.querySelectorAll(
        "[data-feature], [data-setting]"
    );

    for (const checkbox of controls) {
        if (checkbox.dataset.featureBound === "true") continue;
        checkbox.dataset.featureBound = "true";

        checkbox.addEventListener("change", async event => {
            const rawName =
                event.target.dataset.feature ||
                event.target.dataset.setting;

            await updateFeature(
                rawName,
                event.target.checked,
                event.target
            );
        });
    }
}

/* ==========================================
   SETTINGS
========================================== */

async function loadSettings() {
    try {
        const data = await apiRequest("/api/settings");
        const settings = data.settings || {};

        updateElement("settingBotName", settings.botName);
        updateElement("settingPrefix", settings.prefix);
        updateElement("settingCreator", settings.creator);
        updateElement("settingMode", settings.mode);
        updateElement("settingVersion", settings.version || "");

        const botNameInput = document.getElementById("botNameInput");
        const prefixInput = document.getElementById("prefixInput");
        const modeInput = document.getElementById("modeInput");

        if (botNameInput) botNameInput.value = settings.botName || "";
        if (prefixInput) prefixInput.value = settings.prefix || "";
        if (modeInput) modeInput.value = settings.mode || "";
    } catch (error) {
        console.error("[SETTINGS LOAD ERROR]", error.message);
    }
}

async function saveSettings() {
    const botNameInput = document.getElementById("botNameInput");
    const prefixInput = document.getElementById("prefixInput");
    const modeInput = document.getElementById("modeInput");

    const payload = {};

    if (botNameInput) payload.botName = botNameInput.value.trim();
    if (prefixInput) payload.prefix = prefixInput.value.trim();
    if (modeInput) payload.mode = modeInput.value.trim().toUpperCase();

    try {
        const data = await apiRequest(
            "/api/settings",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            }
        );

        const settings = data.settings || {};
        updateElement("settingBotName", settings.botName);
        updateElement("settingPrefix", settings.prefix);
        updateElement("settingMode", settings.mode);

        showToast("Settings saved successfully", "success");
    } catch (error) {
        showToast(error.message, "error");
    }
}

function initializeCommandSearch() {
    const input = document.getElementById("commandSearch");
    const list = document.getElementById("commandsList");
    if (!input || !list) return;

    input.addEventListener("input", () => {
        const query = input.value.trim().toLowerCase();
        list.querySelectorAll(".command-item").forEach(item => {
            item.style.display = item.textContent.toLowerCase().includes(query) ? "" : "none";
        });
    });
}

function initializeSettingsControls() {
    const form = document.getElementById("settingsForm");

    if (form) {
        form.addEventListener("submit", event => {
            event.preventDefault();
            saveSettings();
        });
    }
}

/* ==========================================
   NAVIGATION / UI COMPATIBILITY
========================================== */

function initializeNavigation() {
    const navItems = document.querySelectorAll("[data-page]");
    const pages = document.querySelectorAll(".page");

    for (const item of navItems) {
        item.addEventListener("click", () => {
            const target = item.dataset.page;
            const meta = PAGE_META[target];
            if (meta) {
                updateElement("pageTitle", meta[0]);
                updateElement("pageSubtitle", meta[1]);
            }

            navItems.forEach(nav => nav.classList.remove("active"));
            item.classList.add("active");

            pages.forEach(page => {
                page.classList.toggle("active-page", page.id === target);
            });

            const sidebar = document.querySelector(".sidebar");
            if (sidebar) sidebar.classList.remove("show");
            if (target === "commands") loadCommands();
            if (target === "sessions") loadSessions();
            if (target === "autofeatures") loadFeatures();
            if (target === "settings") loadSettings();
        });
    }

    document.querySelectorAll("[data-go]").forEach(button => {
        button.addEventListener("click", () => {
            const target = button.dataset.go;
            const nav = document.querySelector(`[data-page="${target}"]`);
            if (nav) nav.click();
        });
    });
}

function initializeMobileMenu() {
    const toggle = document.querySelector(".menu-toggle");
    const sidebar = document.querySelector(".sidebar");

    if (!toggle || !sidebar) return;

    toggle.addEventListener("click", () => {
        sidebar.classList.toggle("show");
    });
}

function initializeButtons() {
    const pairingForm = document.getElementById("pairingForm");

    if (pairingForm) {
        pairingForm.addEventListener("submit", event => {
            event.preventDefault();
            generatePairingCode();
        });
    }

    const refreshButton = document.getElementById("refreshBtn");
    if (refreshButton) {
        refreshButton.addEventListener("click", refreshDashboard);
    }

    const refreshSessionsButton = document.getElementById("refreshSessionsBtn");
    if (refreshSessionsButton) {
        refreshSessionsButton.addEventListener("click", loadSessions);
    }

    const copyPairButton = document.getElementById("copyPairCode");
    if (copyPairButton) {
        copyPairButton.addEventListener("click", async () => {
            const code = document.getElementById("pairCode")?.textContent?.trim();
            if (!code || /^[-\s]+$/.test(code)) {
                showToast("Generate a pairing code first", "error");
                return;
            }
            try {
                await navigator.clipboard.writeText(code.replace(/[^A-Za-z0-9]/g, ""));
                showToast("Pairing code copied", "success");
            } catch {
                showToast("Could not copy automatically. Select the code and copy it.", "error");
            }
        });
    }

    document.querySelectorAll("[data-action='refresh']").forEach(button => {
        button.addEventListener("click", refreshDashboard);
    });

    document.querySelectorAll("[data-action='save-settings']").forEach(button => {
        button.addEventListener("click", saveSettings);
    });
}

async function refreshDashboard() {
    await Promise.allSettled([
        loadStatus(),
        loadSessions(),
        loadCommands(),
        loadFeatures(),
        loadSettings()
    ]);

    showToast("Dashboard refreshed", "success");
}

/* ==========================================
   STARTUP
========================================== */

document.addEventListener("DOMContentLoaded", () => {
    initializeNavigation();
    initializeMobileMenu();
    initializeButtons();
    initializeFeatureControls();
    initializeSettingsControls();
    initializeCommandSearch();

    // Never block the UI on an API call.
    refreshDashboard().catch(error => {
        console.error("[DASHBOARD INIT ERROR]", error);
    });

    // Hide/remove loading overlay after a short maximum delay.
    setTimeout(() => {
        showDashboard();
    }, 1200);

    setInterval(() => {
        loadStatus().catch(() => {});
        loadSessions().catch(() => {});
    }, 10000);
});

/* ==========================================
   HELPERS
========================================== */

function normalizeFeatureName(name) {
    if (!name) return null;

    const raw = String(name).trim();

    if (!raw) return null;

    if (Object.prototype.hasOwnProperty.call(FEATURE_ALIASES, raw.toLowerCase())) {
        return FEATURE_ALIASES[raw.toLowerCase()];
    }

    return raw;
}

function prettyFeatureName(name) {
    return String(name)
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, char => char.toUpperCase());
}

function formatUptime(seconds) {
    const value = Number(seconds);
    if (!Number.isFinite(value)) return "—";

    const days = Math.floor(value / 86400);
    const hours = Math.floor((value % 86400) / 3600);
    const minutes = Math.floor((value % 3600) / 60);

    if (days) return `${days}d ${hours}h`;
    if (hours) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent =
            value === undefined || value === null || value === ""
                ? "—"
                : value;
    }
}

function setServerStatus(online, status) {
    const dot = document.querySelector(".status-dot");
    const label = document.querySelector(".server-status span:last-child");

    if (dot) {
        dot.classList.toggle("online", online);
        dot.classList.toggle("offline", !online);
    }

    if (label) {
        label.textContent = online
            ? `Server ${status}`
            : "Server offline";
    }
}

function showDashboard() {
    const loading = document.getElementById("loadingScreen");
    const app = document.getElementById("app");

    if (loading) {
        loading.style.opacity = "0";
        setTimeout(() => {
            loading.style.display = "none";
        }, 350);
    }

    if (app) {
        app.classList.remove("hidden");
        app.style.display = "";
    }
}

function showToast(message, type = "info") {
    const existing = document.querySelector(".dq-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.className = `dq-toast ${type}`;
    toast.textContent = String(message);

    Object.assign(toast.style, {
        position: "fixed",
        right: "20px",
        bottom: "20px",
        zIndex: "99999",
        padding: "12px 16px",
        borderRadius: "12px",
        background: "rgba(18,18,30,.96)",
        color: "#fff",
        border: "1px solid rgba(255,255,255,.12)",
        boxShadow: "0 15px 40px rgba(0,0,0,.35)",
        maxWidth: "340px",
        fontSize: "13px"
    });

    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 3500);
}

function escapeHTML(value) {
    const div = document.createElement("div");
    div.textContent = value ?? "";
    return div.innerHTML;
}
