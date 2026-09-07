/* ==========================================
   DRIP QUEEN MD DASHBOARD
   Frontend JavaScript
   Creator: NOX STAR TECH
========================================== */

"use strict";


/* ==========================================
   GLOBAL VARIABLES
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
   DOM ELEMENTS
========================================== */

const loadingScreen =
    document.getElementById("loadingScreen");

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


/* ==========================================
   INITIALIZE DASHBOARD
========================================== */

document.addEventListener("DOMContentLoaded", async () => {

    initializeNavigation();

    initializeMobileMenu();

    initializeButtons();

    await loadDashboard();

    setTimeout(() => {

        if (loadingScreen) {
            loadingScreen.style.opacity = "0";

            setTimeout(() => {
                loadingScreen.style.display = "none";
            }, 400);
        }

    }, 800);

});


/* ==========================================
   LOAD DASHBOARD
========================================== */

async function loadDashboard() {

    try {

        await Promise.all([
            loadStatus(),
            loadSessions(),
            loadCommands(),
            loadFeatures()
        ]);

    } catch (error) {

        console.error(
            "[DASHBOARD ERROR]",
            error
        );

    }

}


/* ==========================================
   NAVIGATION SYSTEM
========================================== */

function initializeNavigation() {

    navItems.forEach(item => {

        item.addEventListener("click", () => {

            const pageName =
                item.dataset.page;

            if (!pageName) return;

            switchPage(pageName);

        });

    });

}


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


    if (targetPage) {

        targetPage.classList.add(
            "active-page"
        );

    }


    if (targetNav) {

        targetNav.classList.add(
            "active"
        );

    }


    if (sidebar) {

        sidebar.classList.remove(
            "show"
        );

    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* ==========================================
   MOBILE MENU
========================================== */

function initializeMobileMenu() {

    if (!menuToggle || !sidebar) return;


    menuToggle.addEventListener("click", () => {

        sidebar.classList.toggle("show");

    });


    document.addEventListener("click", event => {

        const clickedSidebar =
            sidebar.contains(event.target);

        const clickedMenu =
            menuToggle.contains(event.target);


        if (
            !clickedSidebar &&
            !clickedMenu &&
            window.innerWidth <= 768
        ) {

            sidebar.classList.remove("show");

        }

    });

}


/* ==========================================
   BUTTON INITIALIZATION
========================================== */

function initializeButtons() {

    if (refreshBtn) {

        refreshBtn.addEventListener(
            "click",
            async () => {

                refreshBtn.style.pointerEvents =
                    "none";

                refreshBtn.style.opacity =
                    "0.6";

                await loadDashboard();

                showToast(
                    "Dashboard refreshed successfully"
                );

                setTimeout(() => {

                    refreshBtn.style.pointerEvents =
                        "auto";

                    refreshBtn.style.opacity =
                        "1";

                }, 500);

            }
        );

    }


    initializePairingButton();

    initializeCopyButton();

    initializeCommandSearch();

}


/* ==========================================
   LOAD SERVER STATUS
========================================== */

async function loadStatus() {

    try {

        const response =
            await fetch(API.status);

        if (!response.ok) {

            throw new Error(
                "Failed to fetch status"
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


function updateStatusUI(data) {

    const serverStatus =
        document.getElementById("serverStatus");

    const statusText =
        document.getElementById("statusText");

    const statusDot =
        document.getElementById("statusDot");


    if (data.status === "online") {

        if (statusText) {

            statusText.textContent =
                "Server Online";

        }

        if (statusDot) {

            statusDot.className =
                "status-dot online";

        }

    } else {

        if (statusText) {

            statusText.textContent =
                "Server Offline";

        }

        if (statusDot) {

            statusDot.className =
                "status-dot offline";

        }

    }


    updateText(
        "botName",
        data.botName || "DRIP QUEEN MD"
    );


    updateText(
        "botVersion",
        data.version || "1.0.0"
    );


    updateText(
        "modeValue",
        data.mode || "public"
    );


    updateText(
        "uptimeValue",
        formatUptime(data.uptime || 0)
    );


    if (serverStatus) {

        serverStatus.classList.remove(
            "hidden"
        );

    }

}


function updateOfflineStatus() {

    const statusText =
        document.getElementById("statusText");

    const statusDot =
        document.getElementById("statusDot");


    if (statusText) {

        statusText.textContent =
            "Server Offline";

    }


    if (statusDot) {

        statusDot.className =
            "status-dot offline";

    }

}


/* ==========================================
   LOAD SESSIONS
========================================== */

async function loadSessions() {

    const sessionsList =
        document.getElementById("sessionsList");


    if (!sessionsList) return;


    try {

        const response =
            await fetch(API.sessions);

        const data =
            await response.json();


        const sessions =
            data.sessions || [];


        updateText(
            "activeSessions",
            sessions.length
        );


        updateText(
            "totalSessions",
            sessions.length
        );


        if (sessions.length === 0) {

            sessionsList.innerHTML = `
                <div class="empty-state">
                    <span>📱</span>
                    <h3>No Active WhatsApp Sessions</h3>
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
                    "Unknown";

                const connected =
                    session.connected === true;


                return `
                    <div class="session-card">

                        <div class="session-user">

                            <div class="session-avatar">
                                📱
                            </div>

                            <div>

                                <h3>
                                    ${escapeHTML(userId)}
                                </h3>

                                <p>
                                    WhatsApp Session
                                </p>

                                <span
                                    class="session-status"
                                >
                                    ${
                                        connected
                                            ? "● Connected"
                                            : "● Connecting"
                                    }
                                </span>

                            </div>

                        </div>

                        <button
                            class="remove-session-btn"
                            onclick="removeSession('${escapeAttribute(userId)}')"
                        >
                            Remove
                        </button>

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
   REMOVE SESSION
========================================== */

async function removeSession(userId) {

    const confirmed =
        confirm(
            "Remove this WhatsApp session?"
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


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                "Failed to remove session"
            );

        }


        showToast(
            "Session removed successfully"
        );


        await loadSessions();

    } catch (error) {

        console.error(
            "[REMOVE SESSION ERROR]",
            error
        );


        showToast(
            error.message ||
            "Failed to remove session",
            "error"
        );

    }

}


/* ==========================================
   PAIRING CODE SYSTEM
========================================== */

function initializePairingButton() {

    const generateBtn =
        document.getElementById("generatePairBtn");

    const phoneInput =
        document.getElementById("phoneNumber");


    if (!generateBtn) return;


    generateBtn.addEventListener(
        "click",
        async () => {

            const phoneNumber =
                phoneInput
                    ? phoneInput.value.trim()
                    : "";


            if (!phoneNumber) {

                showPairingError(
                    "Please enter your WhatsApp number."
                );

                return;

            }


            const cleanNumber =
                phoneNumber.replace(
                    /[^0-9]/g,
                    ""
                );


            if (cleanNumber.length < 8) {

                showPairingError(
                    "Please enter a valid phone number with country code."
                );

                return;

            }


            generateBtn.disabled = true;

            generateBtn.textContent =
                "Generating Pair Code...";


            hidePairingError();


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
                                    phoneNumber:
                                        cleanNumber
                                })
                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    throw new Error(
                        data.error ||
                        "Failed to generate pairing code"
                    );

                }


                showPairingCode(
                    data.code ||
                    data.pairingCode
                );


                showToast(
                    "Pairing code generated successfully"
                );


                await loadSessions();

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

                generateBtn.textContent =
                    "🔑 Generate Pair Code";

            }

        }
    );

}


function showPairingCode(code) {

    const pairingResult =
        document.getElementById("pairingResult");

    const pairCode =
        document.getElementById("pairCode");


    if (pairCode) {

        pairCode.textContent =
            code || "NOT AVAILABLE";

    }


    if (pairingResult) {

        pairingResult.classList.remove(
            "hidden"
        );

    }

}


function showPairingError(message) {

    const errorBox =
        document.getElementById("pairingError");


    if (!errorBox) {

        showToast(message, "error");

        return;

    }


    errorBox.textContent = message;

    errorBox.classList.remove("hidden");

}


function hidePairingError() {

    const errorBox =
        document.getElementById("pairingError");

    if (errorBox) {

        errorBox.classList.add("hidden");

    }

}


/* ==========================================
   COPY PAIRING CODE
========================================== */

function initializeCopyButton() {

    const copyBtn =
        document.getElementById("copyPairCode");

    const pairCode =
        document.getElementById("pairCode");


    if (!copyBtn || !pairCode) return;


    copyBtn.addEventListener(
        "click",
        async () => {

            const code =
                pairCode.textContent.trim();


            if (
                !code ||
                code === "NOT AVAILABLE"
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


                copyBtn.textContent =
                    "✓ Copied";


                showToast(
                    "Pairing code copied"
                );


                setTimeout(() => {

                    copyBtn.textContent =
                        "Copy Code";

                }, 2000);

            } catch (error) {

                console.error(
                    "[COPY ERROR]",
                    error
                );

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

let allCommands = [];


async function loadCommands() {

    const commandsGrid =
        document.getElementById("commandsGrid");


    if (!commandsGrid) return;


    try {

        const response =
            await fetch(API.commands);

        const data =
            await response.json();


        allCommands =
            data.commands || [];


        updateText(
            "commandsCount",
            allCommands.length
        );


        renderCommands(allCommands);

    } catch (error) {

        console.error(
            "[COMMANDS ERROR]",
            error
        );


        commandsGrid.innerHTML = `
            <div class="empty-state">

                <span>⚠️</span>

                <h3>
                    Failed to load commands
                </h3>

            </div>
        `;

    }

}


function renderCommands(commands) {

    const commandsGrid =
        document.getElementById("commandsGrid");


    if (!commandsGrid) return;


    if (!commands.length) {

        commandsGrid.innerHTML = `
            <div class="empty-state">

                <span>⌨️</span>

                <h3>
                    No commands found
                </h3>

            </div>
        `;

        return;

    }


    commandsGrid.innerHTML =
        commands.map(command => {

            const name =
                command.name ||
                command.command ||
                "Unknown";


            const category =
                command.category ||
                "General";


            const description =
                command.description ||
                "No description available.";


            return `
                <div class="command-card">

                    <div class="command-name">
                        .${escapeHTML(name)}
                    </div>

                    <div class="command-category">
                        ${escapeHTML(category)}
                    </div>

                    <div class="command-description">
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
        document.getElementById("commandSearch");


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

                    const name =
                        (
                            command.name ||
                            command.command ||
                            ""
                        )
                        .toLowerCase();


                    const category =
                        (
                            command.category ||
                            ""
                        )
                        .toLowerCase();


                    const description =
                        (
                            command.description ||
                            ""
                        )
                        .toLowerCase();


                    return (
                        name.includes(query) ||
                        category.includes(query) ||
                        description.includes(query)
                    );

                });


            renderCommands(filtered);

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
            data.features ||
            data;


        Object.keys(features).forEach(
            featureName => {

                const checkbox =
                    document.querySelector(
                        `[data-feature="${featureName}"]`
                    );


                if (checkbox) {

                    checkbox.checked =
                        Boolean(
                            features[featureName]
                        );

                }

            }
        );


        initializeFeatureSwitches();

    } catch (error) {

        console.error(
            "[FEATURES ERROR]",
            error
        );

    }

}


/* ==========================================
   AUTO FEATURE SWITCHES
========================================== */

let featureListenersInitialized = false;


function initializeFeatureSwitches() {

    if (featureListenersInitialized) return;


    const featureSwitches =
        document.querySelectorAll(
            "[data-feature]"
        );


    featureSwitches.forEach(toggle => {

        toggle.addEventListener(
            "change",
            async () => {

                const featureName =
                    toggle.dataset.feature;

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
                            "Failed to update feature"
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

                    console.error(
                        "[FEATURE UPDATE ERROR]",
                        error
                    );


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


    featureListenersInitialized = true;

}


/* ==========================================
   HELPER: UPDATE TEXT
========================================== */

function updateText(id, value) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent = value;

    }

}


/* ==========================================
   HELPER: FORMAT UPTIME
========================================== */

function formatUptime(seconds) {

    seconds =
        Math.floor(Number(seconds) || 0);


    const days =
        Math.floor(seconds / 86400);

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


    return `${minutes}m`;

}


/* ==========================================
   HELPER: ESCAPE HTML
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
            `[${type.toUpperCase()}]`,
            message
        );

        return;

    }


    toast.textContent = message;


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
   MAKE FUNCTIONS GLOBAL
========================================== */

window.removeSession =
    removeSession;

window.switchPage =
    switchPage;

window.showToast =
    showToast;