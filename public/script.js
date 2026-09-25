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
    autostatus: "autoStatus",
    autostatusview: "autoStatus",
    antivall: "antiCall",
    anticall: "antiCall",
    autobio: "autoBio",
    autoview: "autoView"
};

let apiOnline = false;

const PAGE_META = {
    home: ["Dashboard", "Overview and live bot status"],
    pairing: ["Connect WhatsApp", "Generate a secure WhatsApp pairing code"],
    autofeatures: ["Settings", "Manage bot settings for a connected WhatsApp user"],
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
   ADMIN AUTHENTICATION
========================================== */

function getAdminToken() {
    return sessionStorage.getItem("dripQueenAdminToken") || "";
}

function clearAdminToken() {
    sessionStorage.removeItem("dripQueenAdminToken");
}

async function adminRequest(url, options = {}, timeoutMs = 10000) {
    const token = getAdminToken();

    if (!token) {
        throw new Error("Admin login required");
    }

    return apiRequest(
        url,
        {
            ...options,
            headers: {
                Authorization: `Bearer ${token}`,
                ...(options.headers || {})
            }
        },
        timeoutMs
    );
}

async function adminLogin(name, password) {
    const data = await apiRequest(
        "/api/admin/login",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, password })
        }
    );

    if (!data.token) {
        throw new Error("Admin token was not returned");
    }

    sessionStorage.setItem("dripQueenAdminToken", data.token);
    return data;
}

async function loadAdminSessions() {
    const container = document.getElementById("adminSessionsList");
    if (!container) return;

    try {
        const data = await adminRequest("/api/admin/sessions");
        const sessions = Array.isArray(data.sessions)
            ? data.sessions
            : [];

        updateElement("adminTotalUsers", sessions.length);
        updateElement(
            "adminOnlineUsers",
            sessions.filter(session => session.connected).length
        );

        container.innerHTML = "";

        if (!sessions.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <span>📱</span>
                    <h3>No connected or saved users</h3>
                    <p>New users will appear here after pairing.</p>
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

            const status = session.connected
                ? "Connected"
                : "Saved / Offline";

            item.innerHTML = `
                <div class="session-info">
                    <strong>${escapeHTML(userId)}</strong>
                    <span class="${session.connected ? "session-online" : "session-offline"}">
                        ${status}
                    </span>
                </div>
                <button class="delete-session" type="button">
                    Remove
                </button>
            `;

            item.querySelector("button").addEventListener(
                "click",
                () => adminDeleteSession(userId)
            );

            container.appendChild(item);
        }
    } catch (error) {
        console.error("[ADMIN SESSIONS ERROR]", error.message);

        if (error.message === "Admin authentication required") {
            clearAdminToken();
            showAdminLogin();
        }

        container.innerHTML = `
            <div class="empty-state">
                <span>⚠️</span>
                <h3>Unable to load connected devices</h3>
                <p>${escapeHTML(error.message)}</p>
            </div>
        `;
    }
}

async function adminDeleteSession(userId) {
    if (!userId) return;

    if (!confirm(
        `Remove connected user ${userId}? This deletes the saved session credentials.`
    )) {
        return;
    }

    try {
        await adminRequest(
            `/api/admin/sessions/${encodeURIComponent(userId)}`,
            { method: "DELETE" }
        );

        await loadAdminSessions();
        await loadStatus();
        showToast("Connected user removed", "success");
    } catch (error) {
        if (error.message === "Admin authentication required") {
            clearAdminToken();
            showAdminLogin();
        }
        showToast(error.message, "error");
    }
}

function showAdminLogin() {
    const loginCard = document.getElementById("adminLoginCard");
    const panel = document.getElementById("adminPanel");

    if (loginCard) loginCard.classList.remove("hidden");
    if (panel) panel.classList.add("hidden");
}

function showAdminPanel() {
    const loginCard = document.getElementById("adminLoginCard");
    const panel = document.getElementById("adminPanel");

    if (loginCard) loginCard.classList.add("hidden");
    if (panel) panel.classList.remove("hidden");

    loadAdminSessions().catch(() => {});
}

async function initializeAdmin() {
    const token = getAdminToken();

    if (!token) {
        showAdminLogin();
        return;
    }

    try {
        await adminRequest("/api/admin/me");
        showAdminPanel();
    } catch {
        clearAdminToken();
        showAdminLogin();
    }
}

/* ==========================================
   GENERATE PAIRING CODE
========================================== */

async function generatePairingCode() {
    const input = document.getElementById("phoneNumber");
    const result = document.getElementById("pairingResult");
    const pairCode = document.getElementById("pairCode");
    const pairingStatus = document.getElementById("pairingStatus");

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
        if (result) result.classList.remove("hidden");
        if (pairingStatus) pairingStatus.textContent = "Generating pairing code...";
        if (pairCode) {
            pairCode.value = "";
            pairCode.placeholder = "Generating pairing code...";
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

        if (pairCode) {
            pairCode.value = formatPairingCode(code);
            pairCode.placeholder = "";
        }
        const resultBox = document.getElementById("pairingResult");
        if (resultBox) resultBox.classList.remove("hidden");
        if (pairingStatus) {
            pairingStatus.textContent =
                "Open WhatsApp → Linked devices → Link a device → Link with phone number";
        }

        showToast("Pairing code generated", "success");
    } catch (error) {
        if (pairingStatus) pairingStatus.textContent = `Error: ${error.message}`;
        if (pairCode) {
            pairCode.value = "";
            pairCode.placeholder = "No pairing code generated";
        }
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
   CONNECTED USER SETTINGS
========================================== */

const USER_FEATURE_LABELS = {
    autoRead: ["📖", "Auto Read", "Automatically mark incoming messages as read."],
    autoTyping: ["⌨️", "Auto Typing", "Show typing presence automatically."],
    autoRecording: ["🎙️", "Auto Recording", "Show recording presence automatically."],
    alwaysOnline: ["🟢", "Always Online", "Keep the connected bot presence available."],
    autoReact: ["❤️", "Auto React", "Automatically react to incoming messages."],
    autoStatus: ["📡", "Auto Status", "Handle status automation according to the bot settings."],
    autoReply: ["💬", "Auto Reply", "Automatically reply to configured messages."],
    antiDelete: ["🗑️", "Anti Delete", "Handle deleted messages when supported."],
    antiLink: ["🔗", "Anti Link", "Detect and manage unwanted links."],
    antiCall: ["📵", "Anti Call", "Control incoming call handling."],
    welcome: ["👋", "Welcome", "Send welcome messages for new group members."],
    goodbye: ["🚪", "Goodbye", "Send goodbye messages when members leave."],
    autoBio: ["📝", "Auto Bio", "Manage the automatic profile bio feature."],
    autoView: ["👁️", "Auto View", "Automatically view supported incoming media/status content."]
};

const USER_PROTECTION_LABELS = {
    antispam: ["🚫", "Anti Spam", "Reduce repeated/spam activity in this group."],
    antiflood: ["🌊", "Anti Flood", "Reduce message flooding in this group."],
    antibot: ["🤖", "Anti Bot", "Apply the configured anti-bot protection."],
    antimention: ["🔕", "Anti Mention", "Control unwanted mass mentions."],
    antitag: ["🏷️", "Anti Tag", "Control unwanted tagging activity."],
    antinsfw: ["🔞", "Anti NSFW", "Apply the configured NSFW protection. "]
};

function getUserSettingsToken() {
    return sessionStorage.getItem("dripQueenUserSettingsToken") || "";
}

function clearUserSettingsToken() {
    sessionStorage.removeItem("dripQueenUserSettingsToken");
}

async function userSettingsRequest(url, options = {}, timeoutMs = 10000) {
    const token = getUserSettingsToken();
    if (!token) throw new Error("Connected-user login required");
    return apiRequest(url, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            ...(options.headers || {})
        }
    }, timeoutMs);
}

function normalizeSettingsPhone(value) {
    return String(value || "").replace(/\D/g, "");
}

async function connectedUserLogin(phoneNumber, password) {
    const data = await apiRequest("/api/user/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, password })
    });
    if (!data.token) throw new Error("Dashboard token was not returned");
    sessionStorage.setItem("dripQueenUserSettingsToken", data.token);
    sessionStorage.setItem("dripQueenUserSettingsNumber", data.userId || phoneNumber);
    return data;
}

function showUserSettingsLogin() {
    document.getElementById("userSettingsLoginCard")?.classList.remove("hidden");
    document.getElementById("userSettingsPanel")?.classList.add("hidden");
}

function showUserSettingsPanel() {
    document.getElementById("userSettingsLoginCard")?.classList.add("hidden");
    document.getElementById("userSettingsPanel")?.classList.remove("hidden");
}

function renderUserFeatureCards(features = {}) {
    const grid = document.getElementById("userAutoFeaturesGrid");
    if (!grid) return;
    grid.innerHTML = Object.entries(USER_FEATURE_LABELS).map(([key, info]) => `
        <div class="feature-card">
            <div class="feature-info">
                <div class="feature-icon">${info[0]}</div>
                <div><h3>${escapeHTML(info[1])}</h3><p>${escapeHTML(info[2])}</p></div>
            </div>
            <label class="switch">
                <input type="checkbox" data-user-feature="${escapeHTML(key)}" ${features[key] === true ? "checked" : ""}>
                <span class="slider"></span>
            </label>
        </div>
    `).join("");

    grid.querySelectorAll("[data-user-feature]").forEach(input => {
        input.addEventListener("change", async event => {
            const key = event.target.dataset.userFeature;
            try {
                await userSettingsRequest("/api/user/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ features: { [key]: event.target.checked } })
                });
                showToast(`${USER_FEATURE_LABELS[key]?.[1] || key} ${event.target.checked ? "enabled" : "disabled"}`, "success");
            } catch (error) {
                event.target.checked = !event.target.checked;
                showToast(error.message, "error");
            }
        });
    });
}

async function loadUserSettings() {
    const data = await userSettingsRequest("/api/user/settings");
    const bot = data.bot || {};
    const userId = data.userId || sessionStorage.getItem("dripQueenUserSettingsNumber") || "";

    updateElement("userSettingsIdentity", userId);
    updateElement("userSettingNumber", userId);
    updateElement("userSettingBotName", bot.botName || bot.name || "DRIP QUEEN MD");
    updateElement("userSettingVersion", bot.version || "1.0.0");
    updateElement("userSettingCreator", bot.creator || "NOX STAR TECH");

    const prefix = document.getElementById("userSettingPrefix");
    const mode = document.getElementById("userSettingMode");
    if (prefix) prefix.value = bot.prefix || ".";
    if (mode) mode.value = String(bot.mode || "public").toLowerCase();

    renderUserFeatureCards(data.features || {});
    await loadUserGroups();
}

async function loadUserGroups() {
    const select = document.getElementById("userSettingsGroup");
    if (!select) return;
    try {
        const data = await userSettingsRequest("/api/user/groups");
        const groups = Array.isArray(data.groups) ? data.groups : [];
        select.innerHTML = `<option value="">Select a group</option>` + groups.map(group =>
            `<option value="${escapeHTML(group.id)}">${escapeHTML(group.subject)} (${group.participants})</option>`
        ).join("");
        if (groups.length) await loadUserProtection(groups[0].id);
        else document.getElementById("userProtectionGrid").innerHTML = "";
    } catch (error) {
        select.innerHTML = `<option value="">Unable to load groups</option>`;
        const message = document.getElementById("userProtectionMessage");
        if (message) message.textContent = error.message;
    }
}

async function loadUserProtection(groupId) {
    const grid = document.getElementById("userProtectionGrid");
    const message = document.getElementById("userProtectionMessage");
    if (!grid || !groupId) return;
    try {
        const data = await userSettingsRequest(`/api/user/groups/${encodeURIComponent(groupId)}/protection`);
        const protection = data.protection || {};
        grid.innerHTML = Object.entries(USER_PROTECTION_LABELS).map(([key, info]) => {
            const enabled = protection[key] === true;
            return `
            <div class="feature-card protection-card">
                <div class="feature-info">
                    <div class="feature-icon">${info[0]}</div>
                    <div>
                        <h3>${escapeHTML(info[1])}</h3>
                        <p>${escapeHTML(info[2])}</p>
                        <div class="protection-status" data-protection-status="${escapeHTML(key)}">${enabled ? "🟢 Active" : "🔴 Deactivated"}</div>
                    </div>
                </div>
                <div class="protection-actions">
                    <button type="button" class="protection-action in ${enabled ? "active" : ""}" data-protection-key="${escapeHTML(key)}" data-protection-value="true">IN</button>
                    <button type="button" class="protection-action out ${!enabled ? "active" : ""}" data-protection-key="${escapeHTML(key)}" data-protection-value="false">OUT</button>
                </div>
            </div>`;
        }).join("");
        if (message) message.textContent = "Protection settings loaded. Use IN to activate or OUT to deactivate. Only group admins can change them.";

        grid.querySelectorAll("[data-protection-key]").forEach(button => {
            button.addEventListener("click", async event => {
                const clicked = event.currentTarget;
                const key = clicked.dataset.protectionKey;
                const enabled = clicked.dataset.protectionValue === "true";
                const buttons = grid.querySelectorAll(`[data-protection-key="${CSS.escape(key)}"]`);
                buttons.forEach(item => item.disabled = true);
                try {
                    await userSettingsRequest(`/api/user/groups/${encodeURIComponent(groupId)}/protection`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ key, enabled })
                    });
                    buttons.forEach(item => {
                        item.disabled = false;
                        item.classList.toggle("active", item.dataset.protectionValue === String(enabled));
                    });
                    const status = grid.querySelector(`[data-protection-status="${CSS.escape(key)}"]`);
                    if (status) status.textContent = enabled ? "🟢 Active" : "🔴 Deactivated";
                    showToast(`${USER_PROTECTION_LABELS[key]?.[1] || key} ${enabled ? "activated" : "deactivated"}`, "success");
                } catch (error) {
                    buttons.forEach(item => item.disabled = false);
                    showToast(error.message, "error");
                }
            });
        });
    } catch (error) {
        grid.innerHTML = "";
        if (message) message.textContent = error.message;
    }
}

async function initializeConnectedUserSettings() {
    const token = getUserSettingsToken();
    const storedNumber = sessionStorage.getItem("dripQueenUserSettingsNumber") || "";
    const phone = document.getElementById("userSettingsPhone");
    if (phone && storedNumber) phone.value = storedNumber;

    if (!token) {
        showUserSettingsLogin();
        return;
    }

    try {
        await userSettingsRequest("/api/user/me");
        showUserSettingsPanel();
        await loadUserSettings();
    } catch {
        clearUserSettingsToken();
        showUserSettingsLogin();
    }
}

function initializeConnectedUserSettingsControls() {
    const loginForm = document.getElementById("userSettingsLoginForm");
    if (loginForm && loginForm.dataset.bound !== "true") {
        loginForm.dataset.bound = "true";
        loginForm.addEventListener("submit", async event => {
            event.preventDefault();
            const phone = normalizeSettingsPhone(document.getElementById("userSettingsPhone")?.value);
            const passwordInput = document.getElementById("userSettingsPassword");
            const password = passwordInput?.value || "";
            const errorBox = document.getElementById("userSettingsLoginError");
            if (errorBox) { errorBox.classList.add("hidden"); errorBox.textContent = ""; }
            try {
                await connectedUserLogin(phone, password);
                if (passwordInput) passwordInput.value = "";
                showUserSettingsPanel();
                await loadUserSettings();
                showToast("Connected-user settings unlocked", "success");
            } catch (error) {
                clearUserSettingsToken();
                if (errorBox) { errorBox.textContent = error.message; errorBox.classList.remove("hidden"); }
                // Never expose or auto-fill the real password after a failed login.
                if (passwordInput) passwordInput.value = "";
            }
        });
    }

    const configForm = document.getElementById("userSettingsConfigForm");
    if (configForm && configForm.dataset.bound !== "true") {
        configForm.dataset.bound = "true";
        configForm.addEventListener("submit", async event => {
            event.preventDefault();
            const prefix = document.getElementById("userSettingPrefix")?.value.trim();
            const mode = document.getElementById("userSettingMode")?.value.toLowerCase();
            try {
                await userSettingsRequest("/api/user/settings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ prefix, mode })
                });
                showToast("Configuration saved", "success");
                await loadUserSettings();
            } catch (error) {
                showToast(error.message, "error");
            }
        });
    }

    const logoutButton = document.getElementById("userSettingsLogout");
    if (logoutButton && logoutButton.dataset.bound !== "true") {
        logoutButton.dataset.bound = "true";
        logoutButton.addEventListener("click", () => {
            clearUserSettingsToken();
            sessionStorage.removeItem("dripQueenUserSettingsNumber");
            showUserSettingsLogin();
            showToast("Settings locked", "success");
        });
    }

    const refreshGroups = document.getElementById("refreshUserGroups");
    if (refreshGroups && refreshGroups.dataset.bound !== "true") {
        refreshGroups.dataset.bound = "true";
        refreshGroups.addEventListener("click", () => loadUserGroups());
    }

    const groupSelect = document.getElementById("userSettingsGroup");
    if (groupSelect && groupSelect.dataset.bound !== "true") {
        groupSelect.dataset.bound = "true";
        groupSelect.addEventListener("change", event => loadUserProtection(event.target.value));
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
            if (target === "admin") initializeAdmin();
            if (target === "commands") loadCommands();
                if (target === "autofeatures") { initializeConnectedUserSettingsControls(); initializeConnectedUserSettings(); }
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
    const adminLoginForm = document.getElementById("adminLoginForm");

    if (adminLoginForm) {
        adminLoginForm.addEventListener("submit", async event => {
            event.preventDefault();

            const name = document.getElementById("adminName")?.value.trim();
            const password = document.getElementById("adminPassword")?.value || "";
            const errorBox = document.getElementById("adminLoginError");
            const button = adminLoginForm.querySelector("button[type='submit']");

            if (errorBox) {
                errorBox.classList.add("hidden");
                errorBox.textContent = "";
            }

            try {
                if (button) {
                    button.disabled = true;
                    button.textContent = "Authenticating...";
                }

                await adminLogin(name, password);
                showAdminPanel();
                showToast("Admin dashboard opened", "success");
            } catch (error) {
                if (errorBox) {
                    errorBox.textContent = error.message;
                    errorBox.classList.remove("hidden");
                }
                showToast(error.message, "error");
            } finally {
                if (button) {
                    button.disabled = false;
                    button.textContent = "🔐 Open Admin Dashboard";
                }
            }
        });
    }

    const adminRefreshButton = document.getElementById("adminRefreshBtn");
    if (adminRefreshButton) {
        adminRefreshButton.addEventListener("click", () => {
            loadAdminSessions();
            loadStatus();
        });
    }

    const adminLogoutButton = document.getElementById("adminLogoutBtn");
    if (adminLogoutButton) {
        adminLogoutButton.addEventListener("click", () => {
            clearAdminToken();
            showAdminLogin();
            showToast("Admin logged out", "success");
        });
    }

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

    const copyPairButton = document.getElementById("copyPairCode");
    if (copyPairButton) {
        copyPairButton.addEventListener("click", async () => {
            const code = document.getElementById("pairCode")?.value?.trim();
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
        button.addEventListener("click", () => refreshDashboard(true));
    });

    document.querySelectorAll("[data-action='save-settings']").forEach(button => {
        button.addEventListener("click", saveSettings);
    });
}

async function refreshDashboard(showMessage = false) {
    const results = await Promise.allSettled([
        loadStatus(),
        loadCommands()
    ]);

    const failed = results.filter(result => result.status === "rejected");
    if (failed.length) console.warn(`[DASHBOARD] ${failed.length} API request(s) failed`);

    if (showMessage) {
        showToast(
            failed.length ? "Dashboard refreshed with API warnings" : "Dashboard refreshed",
            failed.length ? "error" : "success"
        );
    }
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
    initializeConnectedUserSettingsControls();
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
