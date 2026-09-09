/* ==========================================
   DRIP QUEEN MD DASHBOARD
   Frontend JavaScript
   CREATED BY NOX STAR TECH
========================================== */

"use strict";


/* ==========================================
   API ENDPOINTS
========================================== */

const API = {

    status: "/api/status",

    sessions: "/api/sessions",

    pair: "/api/pair",

    commands: "/api/commands",

    settings: "/api/settings",

    features: "/api/features"

};


/* ==========================================
   GLOBAL VARIABLES
========================================== */

const loadingScreen =
    document.getElementById("loadingScreen");

const app =
    document.getElementById("app");

const sidebar =
    document.getElementById("sidebar");

const menuToggle =
    document.getElementById("menuToggle");

const navItems =
    document.querySelectorAll(".nav-item");

const pages =
    document.querySelectorAll(".page");

const refreshBtn =
    document.getElementById("refreshBtn");

const toast =
    document.getElementById("toast");

let allCommands = [];

let featureListenersInitialized = false;


/* ==========================================
   DASHBOARD INITIALIZATION
========================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "[DRIP QUEEN MD] Initializing Dashboard..."
        );


        /* Initialize UI */

        initializeNavigation();

        initializeMobileMenu();

        initializeButtons();

        initializeQuickActions();

        initializeRefreshSessions();


        /* Load backend data without blocking UI */

        loadDashboard();


        /* ======================================
           FORCE LOADING SCREEN TO CLOSE
           AFTER EXACTLY 5 SECONDS
        ====================================== */

        setTimeout(() => {

            showDashboard();

        }, 5000);

    }
);


/* ==========================================
   SHOW DASHBOARD
========================================== */

function showDashboard() {

    console.log(
        "[DRIP QUEEN MD] Opening Dashboard..."
    );


    if (app) {

        app.classList.remove("hidden");

        app.style.display = "";

        app.style.opacity = "1";

    }


    if (loadingScreen) {

        loadingScreen.style.opacity = "0";

        loadingScreen.style.pointerEvents =
            "none";


        setTimeout(() => {

            loadingScreen.style.display =
                "none";

        }, 500);

    }


    document.body.classList.add(
        "dashboard-loaded"
    );

}


/* ==========================================
   LOAD DASHBOARD DATA
========================================== */

async function loadDashboard() {

    const tasks = [

        loadStatus(),

        loadSessions(),

        loadCommands(),

        loadFeatures(),

        loadSettings()

    ];


    try {

        await Promise.allSettled(tasks);

    } catch (error) {

        console.error(
            "[DASHBOARD ERROR]",
            error
        );

    }

}


/* ==========================================
   NAVIGATION
========================================== */

function initializeNavigation() {

    navItems.forEach(item => {

        item.addEventListener(
            "click",
            () => {

                const pageName =
                    item.dataset.page;

                if (!pageName) return;

                switchPage(pageName);

            }
        );

    });

}


/* ==========================================
   SWITCH PAGE
========================================== */

function switchPage(pageName) {

    pages.forEach(page => {

        page.classList.remove(
            "active-page"
        );

    });


    navItems.forEach(item => {

        item.classList.remove(
            "active"
        );

    });


    const targetPage =
        document.getElementById(pageName);


    const targetNav =
        document.querySelector(
            `[data-page="${pageName}"]`
        );


    if (!targetPage) {

        console.warn(
            `[NAVIGATION] Page not found: ${pageName}`
        );

        return;

    }


    targetPage.classList.add(
        "active-page"
    );


    if (targetNav) {

        targetNav.classList.add(
            "active"
        );

    }


    updatePageTitle(pageName);


    if (sidebar) {

        sidebar.classList.remove(
            "show"
        );

    }


    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });


    /* Refresh specific pages */

    if (pageName === "sessions") {

        loadSessions();

    }


    if (pageName === "commands") {

        loadCommands();

    }

}


/* ==========================================
   PAGE TITLES
========================================== */

function updatePageTitle(pageName) {

    const pageTitle =
        document.getElementById("pageTitle");

    const pageSubtitle =
        document.getElementById("pageSubtitle");


    const pageData = {

        home: {

            title: "Dashboard",

            subtitle:
                "Welcome to DRIP QUEEN MD"

        },

        pairing: {

            title: "Connect WhatsApp",

            subtitle:
                "Generate a secure pairing code"

        },

        sessions: {

            title: "Connected Users",

            subtitle:
                "Manage WhatsApp sessions"

        },

        autofeatures: {

            title: "Auto Features",

            subtitle:
                "Configure automation settings"

        },

        commands: {

            title: "Bot Commands",

            subtitle:
                "Explore available commands"

        },

        settings: {

            title: "Settings",

            subtitle:
                "Bot and system configuration"

        }

    };


    const data =
        pageData[pageName];


    if (!data) return;


    if (pageTitle) {

        pageTitle.textContent =
            data.title;

    }


    if (pageSubtitle) {

        pageSubtitle.textContent =
            data.subtitle;

    }

}


/* ==========================================
   QUICK ACTIONS
========================================== */

function initializeQuickActions() {

    const buttons =
        document.querySelectorAll(
            "[data-go]"
        );


    buttons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const pageName =
                    button.dataset.go;

                if (!pageName) return;

                switchPage(pageName);

            }
        );

    });

}


/* ==========================================
   MOBILE SIDEBAR
========================================== */

function initializeMobileMenu() {

    if (!menuToggle || !sidebar) return;


    menuToggle.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            sidebar.classList.toggle(
                "show"
            );

        }
    );


    document.addEventListener(
        "click",
        event => {

            if (
                window.innerWidth <= 850 &&
                sidebar.classList.contains("show")
            ) {

                const clickedSidebar =
                    sidebar.contains(event.target);


                const clickedMenu =
                    menuToggle.contains(event.target);


                if (
                    !clickedSidebar &&
                    !clickedMenu
                ) {

                    sidebar.classList.remove(
                        "show"
                    );

                }

            }

        }
    );

}


/* ==========================================
   BUTTON INITIALIZATION
========================================== */

function initializeButtons() {

    initializeRefreshButton();

    initializePairingButton();

    initializeCopyButton();

    initializeCommandSearch();

    initializeFeatureSwitches();

}


/* ==========================================
   REFRESH DASHBOARD
========================================== */

function initializeRefreshButton() {

    if (!refreshBtn) return;


    refreshBtn.addEventListener(
        "click",
        async () => {

            refreshBtn.style.pointerEvents =
                "none";


            refreshBtn.style.opacity =
                "0.6";


            refreshBtn.style.transform =
                "rotate(360deg)";


            await loadDashboard();


            showToast(
                "Dashboard refreshed successfully"
            );


            setTimeout(() => {

                refreshBtn.style.pointerEvents =
                    "auto";


                refreshBtn.style.opacity =
                    "1";


                refreshBtn.style.transform =
                    "";

            }, 500);

        }
    );

}


/* ==========================================
   SERVER STATUS
========================================== */

async function loadStatus() {

    try {

        const response =
            await fetch(API.status);


        if (!response.ok) {

            throw new Error(
                "Failed to fetch server status"
            );

        }


        const data =
            await response.json();


        updateStatusUI(data);

    } catch (error) {

        console.error(
            "[STATUS ERROR]",
            error
        );

        updateOfflineStatus();

    }

}


/* ==========================================
   UPDATE STATUS UI
========================================== */

function updateStatusUI(data) {

    const statusDot =
        document.getElementById(
            "statusDot"
        );


    const statusText =
        document.getElementById(
            "serverStatusText"
        );


    const pairingStatus =
        document.getElementById(
            "pairingServerStatus"
        );


    const online =
        data.status === "online" ||
        data.status === true ||
        data.online === true;


    if (online) {

        if (statusText) {

            statusText.textContent =
                "Server Online";

        }


        if (statusDot) {

            statusDot.className =
                "status-dot online";

        }


        if (pairingStatus) {

            pairingStatus.textContent =
                "🟢 Online";

        }


        updateText(
            "botStatus",
            "Online"
        );

    } else {

        updateOfflineStatus();

    }


    updateText(
        "serverUptime",
        formatUptime(
            data.uptime || 0
        )
    );


    updateText(
        "settingBotName",
        data.botName ||
        "DRIP QUEEN MD"
    );


    updateText(
        "settingVersion",
        data.version ||
        "1.0.0"
    );


    updateText(
        "settingMode",
        (
            data.mode ||
            "public"
        ).toUpperCase()
    );

}


/* ==========================================
   OFFLINE STATUS
========================================== */

function updateOfflineStatus() {

    const statusDot =
        document.getElementById(
            "statusDot"
        );


    const statusText =
        document.getElementById(
            "serverStatusText"
        );


    const pairingStatus =
        document.getElementById(
            "pairingServerStatus"
        );


    if (statusDot) {

        statusDot.className =
            "status-dot offline";

    }


    if (statusText) {

        statusText.textContent =
            "Server Offline";

    }


    if (pairingStatus) {

        pairingStatus.textContent =
            "🔴 Offline";

    }


    updateText(
        "botStatus",
        "Offline"
    );

}


/* ==========================================
   LOAD SESSIONS
========================================== */

async function loadSessions() {

    const sessionsList =
        document.getElementById(
            "sessionsList"
        );


    if (!sessionsList) return;


    try {

        const response =
            await fetch(API.sessions);


        if (!response.ok) {

            throw new Error(
                "Failed to fetch sessions"
            );

        }


        const data =
            await response.json();


        const sessions =
            Array.isArray(data)
                ? data
                : (
                    data.sessions || []
                );


        updateText(
            "activeSessions",
            sessions.length
        );


        updateText(
            "totalUsers",
            sessions.length
        );


        if (!sessions.length) {

            sessionsList.innerHTML = `

                <div class="empty-state">

                    <span>📱</span>

                    <h3>
                        No Active WhatsApp Sessions
                    </h3>

                    <p>
                        Connect a WhatsApp account
                        using the Pairing page.
                    </p>

                </div>

            `;

            return;

        }


        sessionsList.innerHTML =
            sessions.map(session => {

                const userId =
                    session.userId ||
                    session.id ||
                    session.number ||
                    "Unknown User";


                const connected =
                    session.connected !== false;


                return `

                    <div class="session-item">

                        <div class="session-user">

                            <div class="session-avatar">
                                📱
                            </div>

                            <div>

                                <strong>
                                    ${escapeHTML(userId)}
                                </strong>

                                <small>
                                    ${
                                        connected
                                            ? "🟢 Connected"
                                            : "🟡 Connecting"
                                    }
                                </small>

                            </div>

                        </div>

                        <div class="session-actions">

                            <button
                                class="session-btn disconnect"
                                onclick="removeSession('${escapeAttribute(userId)}')"
                            >
                                Disconnect
                            </button>

                        </div>

                    </div>

                `;

            }).join("");


    } catch (error) {

        console.error(
            "[SESSIONS ERROR]",
            error
        );


        sessionsList.innerHTML = `

            <div class="empty-state">

                <span>⚠️</span>

                <h3>
                    Failed to load sessions
                </h3>

            </div>

        `;

    }

}


/* ==========================================
   REFRESH SESSIONS BUTTON
========================================== */

function initializeRefreshSessions() {

    const button =
        document.getElementById(
            "refreshSessionsBtn"
        );


    if (!button) return;


    button.addEventListener(
        "click",
        async () => {

            button.disabled = true;

            button.textContent =
                "Loading...";


            await loadSessions();


            button.disabled = false;

            button.innerHTML =
                "↻ Refresh";

        }
    );

}


/* ==========================================
   REMOVE SESSION
========================================== */

async function removeSession(userId) {

    const confirmed =
        confirm(
            "Disconnect this WhatsApp session?"
        );


    if (!confirmed) return;


    try {

        const response =
            await fetch(

                `/api/sessions/${encodeURIComponent(userId)}`,

                {
                    method: "DELETE"
                }

            );


        if (!response.ok) {

            throw new Error(
                "Failed to disconnect session"
            );

        }


        showToast(
            "Session disconnected successfully"
        );


        await loadSessions();

    } catch (error) {

        console.error(
            "[REMOVE SESSION ERROR]",
            error
        );


        showToast(
            "Failed to disconnect session",
            "error"
        );

    }

}


/* ==========================================
   PAIRING SYSTEM
========================================== */

function initializePairingButton() {

    const pairingForm =
        document.getElementById(
            "pairingForm"
        );


    const generateBtn =
        document.getElementById(
            "generatePairBtn"
        );


    const phoneInput =
        document.getElementById(
            "phoneNumber"
        );


    if (
        !pairingForm ||
        !generateBtn ||
        !phoneInput
    ) {

        return;

    }


    pairingForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const phoneNumber =
                phoneInput.value
                    .replace(/\D/g, "")
                    .trim();


            if (!phoneNumber) {

                showPairingError(
                    "Please enter your WhatsApp number."
                );

                return;

            }


            if (
                phoneNumber.length < 8 ||
                phoneNumber.length > 16
            ) {

                showPairingError(
                    "Enter a valid number with country code."
                );

                return;

            }


            hidePairingError();

            hidePairingResult();


            generateBtn.disabled = true;

            generateBtn.innerHTML =
                "⏳ Generating Pair Code...";


            try {

                const response =
                    await fetch(
                        API.pair,
                        {

                            method: "POST",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body:
                                JSON.stringify({

                                    phoneNumber

                                })

                        }
                    );


                let data;


                try {

                    data =
                        await response.json();

                } catch {

                    throw new Error(
                        "Invalid server response"
                    );

                }


                if (!response.ok) {

                    throw new Error(
                        data.error ||
                        data.message ||
                        "Failed to generate pairing code"
                    );

                }


                const code =
                    data.code ||
                    data.pairingCode ||
                    data.pairCode;


                if (!code) {

                    throw new Error(
                        "Pairing code was not received."
                    );

                }


                showPairingCode(code);


                showToast(
                    "Pairing code generated successfully"
                );


            } catch (error) {

                console.error(
                    "[PAIRING ERROR]",
                    error
                );


                showPairingError(
                    error.message ||
                    "Unable to generate pairing code."
                );

            } finally {

                generateBtn.disabled = false;

                generateBtn.innerHTML = `

                    <span>🔑</span>

                    Generate Pair Code

                `;

            }

        }
    );

}


/* ==========================================
   SHOW PAIRING CODE
========================================== */

function showPairingCode(code) {

    const pairingResult =
        document.getElementById(
            "pairingResult"
        );


    const pairCode =
        document.getElementById(
            "pairCode"
        );


    if (pairCode) {

        pairCode.textContent =
            String(code);

    }


    if (pairingResult) {

        pairingResult.classList.remove(
            "hidden"
        );


        pairingResult.scrollIntoView({

            behavior: "smooth",

            block: "center"

        });

    }

}


/* ==========================================
   HIDE PAIRING RESULT
========================================== */

function hidePairingResult() {

    const result =
        document.getElementById(
            "pairingResult"
        );


    if (result) {

        result.classList.add(
            "hidden"
        );

    }

}


/* ==========================================
   PAIRING ERROR
========================================== */

function showPairingError(message) {

    const errorBox =
        document.getElementById(
            "pairingError"
        );


    if (!errorBox) return;


    errorBox.textContent =
        message;


    errorBox.classList.remove(
        "hidden"
    );

}


function hidePairingError() {

    const errorBox =
        document.getElementById(
            "pairingError"
        );


    if (!errorBox) return;


    errorBox.textContent =
        "";


    errorBox.classList.add(
        "hidden"
    );

}


/* ==========================================
   COPY PAIRING CODE
========================================== */

function initializeCopyButton() {

    const copyBtn =
        document.getElementById(
            "copyPairCode"
        );


    const pairCode =
        document.getElementById(
            "pairCode"
        );


    if (!copyBtn || !pairCode) return;


    copyBtn.addEventListener(
        "click",
        async () => {

            const code =
                pairCode.textContent.trim();


            if (
                !code ||
                code === "---- ----"
            ) {

                showToast(
                    "No pairing code available",
                    "error"
                );

                return;

            }


            try {

                await navigator.clipboard.writeText(
                    code
                );


                copyBtn.innerHTML =
                    "✓ Copied";


                showToast(
                    "Pairing code copied"
                );


                setTimeout(() => {

                    copyBtn.innerHTML =
                        "📋 Copy Code";

                }, 2000);


            } catch (error) {

                showToast(
                    "Failed to copy code",
                    "error"
                );

            }

        }
    );

}


/* ==========================================
   LOAD COMMANDS
========================================== */

async function loadCommands() {

    const commandsList =
        document.getElementById(
            "commandsList"
        );


    if (!commandsList) return;


    try {

        const response =
            await fetch(API.commands);


        if (!response.ok) {

            throw new Error(
                "Failed to load commands"
            );

        }


        const data =
            await response.json();


        allCommands =
            Array.isArray(data)
                ? data
                : (
                    data.commands || []
                );


        updateText(
            "totalCommands",
            allCommands.length
        );


        renderCommands(
            allCommands
        );


    } catch (error) {

        console.error(
            "[COMMAND ERROR]",
            error
        );


        commandsList.innerHTML = `

            <div class="empty-state">

                <span>⚠️</span>

                <h3>
                    Failed to load commands
                </h3>

            </div>

        `;

    }

}


/* ==========================================
   RENDER COMMANDS
========================================== */

function renderCommands(commands) {

    const commandsList =
        document.getElementById(
            "commandsList"
        );


    if (!commandsList) return;


    if (!commands.length) {

        commandsList.innerHTML = `

            <div class="empty-state">

                <span>⌨️</span>

                <h3>
                    No commands found
                </h3>

            </div>

        `;

        return;

    }


    commandsList.innerHTML =
        commands.map(command => {

            const name =
                command.name ||
                command.command ||
                "Unknown";


            const description =
                command.description ||
                "No description available.";


            const category =
                command.category ||
                "General";


            return `

                <div class="command-card">

                    <div class="command-name">
                        .${escapeHTML(name)}
                    </div>

                    <div class="command-description">

                        <strong>
                            ${escapeHTML(category)}
                        </strong>

                        <br>

                        ${escapeHTML(description)}

                    </div>

                </div>

            `;

        }).join("");

}


/* ==========================================
   COMMAND SEARCH
========================================== */

function initializeCommandSearch() {

    const searchInput =
        document.getElementById(
            "commandSearch"
        );


    if (!searchInput) return;


    searchInput.addEventListener(
        "input",
        event => {

            const query =
                event.target.value
                    .toLowerCase()
                    .trim();


            const filtered =
                allCommands.filter(command => {

                    const text =
                        `${command.name || ""}
                         ${command.command || ""}
                         ${command.category || ""}
                         ${command.description || ""}`
                            .toLowerCase();


                    return text.includes(
                        query
                    );

                });


            renderCommands(
                filtered
            );

        }
    );

}


/* ==========================================
   LOAD AUTO FEATURES
========================================== */

async function loadFeatures() {

    try {

        const response =
            await fetch(API.features);


        if (!response.ok) return;


        const data =
            await response.json();


        const features =
            data.features || data;


        document
            .querySelectorAll(
                "[data-setting]"
            )
            .forEach(toggle => {

                const name =
                    toggle.dataset.setting;


                if (
                    Object.prototype.hasOwnProperty.call(
                        features,
                        name
                    )
                ) {

                    toggle.checked =
                        Boolean(
                            features[name]
                        );

                }

            });


    } catch (error) {

        console.error(
            "[FEATURE ERROR]",
            error
        );

    }

}


/* ==========================================
   FEATURE SWITCHES
========================================== */

function initializeFeatureSwitches() {

    if (featureListenersInitialized) return;


    const switches =
        document.querySelectorAll(
            "[data-setting]"
        );


    switches.forEach(toggle => {

        toggle.addEventListener(
            "change",
            async () => {

                const featureName =
                    toggle.dataset.setting;


                const enabled =
                    toggle.checked;


                try {

                    const response =
                        await fetch(
                            `${API.features}/${featureName}`,
                            {

                                method: "POST",

                                headers: {

                                    "Content-Type":
                                        "application/json"

                                },

                                body:
                                    JSON.stringify({

                                        enabled

                                    })

                            }
                        );


                    if (!response.ok) {

                        throw new Error(
                            "Feature update failed"
                        );

                    }


                    showToast(

                        `${featureName} ${
                            enabled
                                ? "enabled"
                                : "disabled"
                        }`

                    );


                } catch (error) {

                    toggle.checked =
                        !enabled;


                    showToast(
                        "Failed to update feature",
                        "error"
                    );

                }

            }
        );

    });


    featureListenersInitialized =
        true;

}


/* ==========================================
   LOAD SETTINGS
========================================== */

async function loadSettings() {

    try {

        const response =
            await fetch(API.settings);


        if (!response.ok) return;


        const data =
            await response.json();


        updateText(
            "settingBotName",
            data.botName ||
            data.BOT_NAME ||
            "DRIP QUEEN MD"
        );


        updateText(
            "settingVersion",
            data.version ||
            data.BOT_VERSION ||
            "1.0.0"
        );


        updateText(
            "settingCreator",
            data.creator ||
            data.CREATOR ||
            "NOX STAR TECH"
        );


        updateText(
            "settingPrefix",
            data.prefix ||
            data.PREFIX ||
            "."
        );


        updateText(
            "settingMode",
            (
                data.mode ||
                data.MODE ||
                "public"
            ).toUpperCase()
        );


        updateText(
            "nodeVersion",
            data.nodeVersion ||
            data.node ||
            "Node.js"
        );


        updateText(
            "platform",
            data.platform ||
            navigator.platform
        );


        updateText(
            "databaseStatus",
            data.database ||
            "🟢 Connected"
        );


    } catch (error) {

        console.error(
            "[SETTINGS ERROR]",
            error
        );

    }

}


/* ==========================================
   HELPER: UPDATE TEXT
========================================== */

function updateText(id, value) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent =
            value;

    }

}


/* ==========================================
   HELPER: FORMAT UPTIME
========================================== */

function formatUptime(seconds) {

    seconds =
        Math.floor(
            Number(seconds) || 0
        );


    const days =
        Math.floor(
            seconds / 86400
        );


    const hours =
        Math.floor(
            (seconds % 86400) / 3600
        );


    const minutes =
        Math.floor(
            (seconds % 3600) / 60
        );


    if (days > 0) {

        return `${days}d ${hours}h`;

    }


    if (hours > 0) {

        return `${hours}h ${minutes}m`;

    }


    if (minutes > 0) {

        return `${minutes}m`;

    }


    return `${seconds}s`;

}


/* ==========================================
   ESCAPE HTML
========================================== */

function escapeHTML(value) {

    return String(value)

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");

}


function escapeAttribute(value) {

    return escapeHTML(value)

        .replace(/`/g, "&#096;");

}


/* ==========================================
   TOAST NOTIFICATION
========================================== */

function showToast(
    message,
    type = "success"
) {

    if (!toast) {

        console.log(
            `[${type}] ${message}`
        );

        return;

    }


    const toastMessage =
        document.getElementById(
            "toastMessage"
        );


    if (toastMessage) {

        toastMessage.textContent =
            message;

    } else {

        toast.textContent =
            message;

    }


    toast.classList.remove(
        "show",
        "error"
    );


    if (type === "error") {

        toast.classList.add(
            "error"
        );

    }


    setTimeout(() => {

        toast.classList.add(
            "show"
        );

    }, 50);


    setTimeout(() => {

        toast.classList.remove(
            "show"
        );

    }, 3500);

}


/* ==========================================
   GLOBAL FUNCTIONS
========================================== */

window.removeSession =
    removeSession;

window.switchPage =
    switchPage;

window.showToast =
    showToast;
