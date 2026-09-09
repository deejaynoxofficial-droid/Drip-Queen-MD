/* ==========================================
   DRIP QUEEN MD DASHBOARD
   FRONTEND JAVASCRIPT
========================================== */


/* ==========================================
   API REQUEST HELPER
========================================== */

async function apiRequest(
    url,
    options = {}
) {

    const response =
        await fetch(
            url,
            options
        );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            data.error ||
            "Request failed"
        );

    }


    return data;

}


/* ==========================================
   LOAD BOT STATUS
========================================== */

async function loadStatus() {

    try {

        const data =
            await apiRequest(
                "/api/status"
            );


        updateElement(
            "botName",
            data.botName
        );


        updateElement(
            "botVersion",
            data.version
        );


        updateElement(
            "botMode",
            data.mode
        );


        updateElement(
            "botStatus",
            data.status
        );


    } catch (error) {

        console.error(
            "[STATUS ERROR]",
            error.message
        );

    }

}


/* ==========================================
   LOAD SESSIONS
========================================== */

async function loadSessions() {

    try {

        const data =
            await apiRequest(
                "/api/sessions"
            );


        const container =
            document.getElementById(
                "sessionsList"
            );


        if (!container) {

            return;

        }


        container.innerHTML = "";


        if (
            !data.sessions ||
            data.sessions.length === 0
        ) {

            container.innerHTML =
                `
                <div class="empty-state">
                    No active sessions
                </div>
                `;


            return;

        }


        for (
            const session
            of data.sessions
        ) {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "session-item";


            item.innerHTML =
                `
                <div class="session-info">
                    <strong>
                        ${escapeHTML(session.userId)}
                    </strong>

                    <span>
                        ${session.connected ? "Connected" : "Offline"}
                    </span>
                </div>

                <button
                    class="delete-session"
                    onclick="deleteSession('${escapeAttribute(session.userId)}')"
                >
                    Delete
                </button>
                `;


            container.appendChild(
                item
            );

        }


    } catch (error) {

        console.error(
            "[SESSIONS ERROR]",
            error.message
        );

    }

}


/* ==========================================
   DELETE SESSION
========================================== */

async function deleteSession(
    userId
) {

    if (
        !confirm(
            `Delete session ${userId}?`
        )
    ) {

        return;

    }


    try {

        await apiRequest(

            `/api/sessions/${encodeURIComponent(userId)}`,

            {
                method:
                    "DELETE"
            }

        );


        await loadSessions();


    } catch (error) {

        alert(
            error.message
        );

    }

}


/* ==========================================
   GENERATE PAIRING CODE
========================================== */

async function generatePairingCode() {

    const input =
        document.getElementById(
            "phoneNumber"
        );


    const result =
        document.getElementById(
            "pairingResult"
        );


    if (!input) {

        return;

    }


    const phoneNumber =
        input.value.trim();


    if (!phoneNumber) {

        alert(
            "Enter your WhatsApp number"
        );


        return;

    }


    try {

        if (result) {

            result.textContent =
                "Generating pairing code...";

        }


        const data =
            await apiRequest(

                "/api/pair",

                {

                    method:
                        "POST",

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


        if (result) {

            result.textContent =
                `Pairing Code: ${data.pairingCode}`;

        }


    } catch (error) {

        if (result) {

            result.textContent =
                `Error: ${error.message}`;

        }

    }

}


/* ==========================================
   LOAD COMMANDS
========================================== */

async function loadCommands() {

    try {

        const data =
            await apiRequest(
                "/api/commands"
            );


        const container =
            document.getElementById(
                "commandsList"
            );


        if (!container) {

            return;

        }


        container.innerHTML = "";


        for (
            const command
            of data.commands
        ) {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "command-item";


            item.innerHTML =
                `
                <strong>
                    ${escapeHTML(command.name)}
                </strong>

                <span>
                    ${escapeHTML(command.category)}
                </span>

                <p>
                    ${escapeHTML(command.description)}
                </p>
                `;


            container.appendChild(
                item
            );

        }


    } catch (error) {

        console.error(
            "[COMMANDS ERROR]",
            error.message
        );

    }

}


/* ==========================================
   LOAD FEATURES
========================================== */

async function loadFeatures() {

    try {

        const data =
            await apiRequest(
                "/api/features"
            );


        const features =
            data.features || {};


        for (
            const [
                feature,
                enabled
            ]
            of Object.entries(features)
        ) {

            const element =
                document.getElementById(
                    feature
                );


            if (
                element &&
                element.type === "checkbox"
            ) {

                element.checked =
                    enabled === true;

            }

        }


    } catch (error) {

        console.error(
            "[FEATURE LOAD ERROR]",
            error.message
        );

    }

}


/* ==========================================
   UPDATE FEATURE
========================================== */

async function updateFeature(
    featureName,
    enabled
) {

    try {

        await apiRequest(

            `/api/features/${encodeURIComponent(featureName)}`,

            {

                method:
                    "POST",

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


        console.log(
            `[FEATURE UPDATED] ${featureName}: ${enabled}`
        );


    } catch (error) {

        console.error(
            "[FEATURE UPDATE ERROR]",
            error.message
        );


        alert(
            error.message
        );

    }

}


/* ==========================================
   FEATURE EVENT LISTENERS
========================================== */

function initializeFeatureControls() {

    const checkboxes =
        document.querySelectorAll(
            "[data-feature]"
        );


    for (
        const checkbox
        of checkboxes
    ) {

        checkbox.addEventListener(

            "change",

            async event => {

                const featureName =
                    event.target.dataset.feature;


                await updateFeature(

                    featureName,

                    event.target.checked

                );

            }

        );

    }

}


/* ==========================================
   UPDATE HTML ELEMENT
========================================== */

function updateElement(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent =
            value ?? "";

    }

}


/* ==========================================
   ESCAPE HTML
========================================== */

function escapeHTML(value) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        value ?? "";


    return div.innerHTML;

}


/* ==========================================
   ESCAPE ATTRIBUTE
========================================== */

function escapeAttribute(value) {

    return String(value ?? "")
        .replace(/'/g, "\\'")
        .replace(/"/g, "&quot;");

}


/* ==========================================
   INITIALIZE DASHBOARD
========================================== */

/*document.addEventListener(

    "DOMContentLoaded",

    async () => {

        console.log(
            "[DASHBOARD] Initializing..."
        );


        initializeFeatureControls();


        await Promise.all([

            loadStatus(),

            loadSessions(),

            loadCommands(),

            loadFeatures()

        ]);*/

// ==========================================
// DASHBOARD AUTO-LOADING DISABLED
// ==========================================

console.log("[DASHBOARD] Auto-loading disabled.");
        /*
           Refresh status and sessions.
        */

        setInterval(

            () => {

                loadStatus();

                loadSessions();

            },

            10000

        );

    }

);
