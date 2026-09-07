const fs = require("fs-extra");
const path = require("path");

const {
    makeWASocket,
    useMultiFileAuthState,
    Browsers,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const P = require("pino");
const { Boom } = require("@hapi/boom");

const config = require("../config");
const { cleanPhoneNumber, sleep } = require("./functions");
const database = require("./database");

// ==========================================
// ACTIVE CONNECTIONS
// ==========================================

const activeSessions = new Map();
const connectingSessions = new Set();
const reconnectAttempts = new Map();

// ==========================================
// VALIDATE PHONE NUMBER
// ==========================================

function validatePhoneNumber(number) {
    const cleaned = cleanPhoneNumber(number);

    if (!cleaned) {
        return {
            valid: false,
            number: null,
            error: "Phone number is required."
        };
    }

    if (cleaned.length < 7 || cleaned.length > 15) {
        return {
            valid: false,
            number: cleaned,
            error: "Invalid phone number. Use country code without +."
        };
    }

    return {
        valid: true,
        number: cleaned,
        error: null
    };
}

// ==========================================
// GET SESSION PATH
// ==========================================

function getSessionPath(userId) {
    const safeUserId = String(userId).replace(/[^0-9]/g, "");

    return path.join(
        config.SESSIONS_PATH,
        `user-${safeUserId}`
    );
}

// ==========================================
// CHECK IF SESSION EXISTS
// ==========================================

function sessionExists(userId) {
    try {
        const sessionPath = getSessionPath(userId);

        if (!fs.existsSync(sessionPath)) {
            return false;
        }

        const credsFile = path.join(sessionPath, "creds.json");

        return fs.existsSync(credsFile);
    } catch {
        return false;
    }
}

// ==========================================
// GET ACTIVE SESSION
// ==========================================

function getSession(userId) {
    return activeSessions.get(String(userId)) || null;
}

// ==========================================
// GET ALL ACTIVE SESSIONS
// ==========================================

function getActiveSessions() {
    return Array.from(activeSessions.entries()).map(
        ([userId, session]) => ({
            userId,
            connected: Boolean(session?.sock?.user)
        })
    );
}

// ==========================================
// CREATE WHATSAPP CONNECTION
// ==========================================

async function createSession(userId, options = {}) {
    const userKey = String(userId);

    if (connectingSessions.has(userKey)) {
        return {
            success: false,
            error: "Connection is already being created for this user."
        };
    }

    if (activeSessions.has(userKey)) {
        return {
            success: true,
            message: "Session is already active.",
            sock: activeSessions.get(userKey).sock
        };
    }

    const validation = validatePhoneNumber(userId);

    if (!validation.valid) {
        return {
            success: false,
            error: validation.error
        };
    }

    connectingSessions.add(userKey);

    try {
        fs.ensureDirSync(config.SESSIONS_PATH);

        const sessionPath = getSessionPath(userId);

        fs.ensureDirSync(sessionPath);

        const { state, saveCreds } =
            await useMultiFileAuthState(sessionPath);

        let version;

        try {
            const latest = await fetchLatestBaileysVersion();
            version = latest.version;
        } catch (error) {
            console.warn(
                "[SESSION] Could not fetch latest WhatsApp version. Using default."
            );
        }

        const sock = makeWASocket({
            version,
            auth: state,
            logger: P({
                level: "silent"
            }),
            browser: Browsers.macOS("DRIP QUEEN MD"),
            printQRInTerminal: false,
            markOnlineOnConnect: false,
            syncFullHistory: false,
            generateHighQualityLinkPreview: false
        });

        // Save credentials
        sock.ev.on("creds.update", saveCreds);

        // Store session
        activeSessions.set(userKey, {
            sock,
            userId: userKey,
            sessionPath,
            createdAt: new Date().toISOString()
        });

        // Connection events
        sock.ev.on(
            "connection.update",
            async (update) => {
                try {
                    const {
                        connection,
                        lastDisconnect
                    } = update;

                    // ==========================================
                    // CONNECTED
                    // ==========================================

                    if (connection === "open") {
                        console.log(
                            `[SESSION CONNECTED] ${userKey}`
                        );

                        reconnectAttempts.delete(userKey);

                        database.updateUser(userKey, {
                            connected: true,
                            lastConnected: new Date().toISOString()
                        });
                    }

                    // ==========================================
                    // DISCONNECTED
                    // ==========================================

                    if (connection === "close") {
                        const statusCode =
                            new Boom(
                                lastDisconnect?.error
                            )?.output?.statusCode;

                        const shouldReconnect =
                            statusCode !== DisconnectReason.loggedOut;

                        console.log(
                            `[SESSION CLOSED] ${userKey} | Reason: ${statusCode || "Unknown"}`
                        );

                        activeSessions.delete(userKey);

                        // Logged out completely
                        if (
                            statusCode === DisconnectReason.loggedOut
                        ) {
                            console.log(
                                `[SESSION LOGGED OUT] ${userKey}`
                            );

                            database.updateUser(userKey, {
                                connected: false,
                                loggedOut: true
                            });

                            return;
                        }

                        // Auto reconnect
                        if (
                            shouldReconnect &&
                            config.AUTO_RECONNECT
                        ) {
                            const attempts =
                                reconnectAttempts.get(userKey) || 0;

                            if (
                                attempts >=
                                config.MAX_RECONNECT_ATTEMPTS
                            ) {
                                console.log(
                                    `[SESSION] Max reconnect attempts reached for ${userKey}`
                                );

                                return;
                            }

                            reconnectAttempts.set(
                                userKey,
                                attempts + 1
                            );

                            const delay =
                                config.RECONNECT_DELAY *
                                (attempts + 1);

                            console.log(
                                `[SESSION RECONNECT] ${userKey} in ${delay}ms`
                            );

                            await sleep(delay);

                            createSession(userKey).catch(
                                error => {
                                    console.error(
                                        `[RECONNECT ERROR] ${userKey}:`,
                                        error.message
                                    );
                                }
                            );
                        }
                    }

                } catch (error) {
                    console.error(
                        `[CONNECTION EVENT ERROR] ${userKey}:`,
                        error.message
                    );
                }
            }
        );

        // ==========================================
        // REQUEST PAIRING CODE
        // ==========================================

        let pairingCode = null;

        const requestPairingCode =
            options.requestPairingCode !== false;

        if (
            requestPairingCode &&
            config.PAIRING_CODE_ONLY &&
            !sock.authState?.creds?.registered &&
            !state.creds.registered
        ) {
            try {
                await sleep(1000);

                pairingCode =
                    await sock.requestPairingCode(
                        validation.number
                    );

                console.log(
                    `[PAIRING CODE GENERATED] ${userKey}`
                );

            } catch (error) {
                console.error(
                    `[PAIRING ERROR] ${userKey}:`,
                    error.message
                );
            }
        }

        return {
            success: true,
            sock,
            pairingCode,
            sessionPath
        };

    } catch (error) {
        console.error(
            `[SESSION ERROR] ${userKey}:`,
            error.message
        );

        activeSessions.delete(userKey);

        return {
            success: false,
            error: error.message
        };

    } finally {
        connectingSessions.delete(userKey);
    }
}

// ==========================================
// REQUEST NEW PAIRING CODE
// ==========================================

async function requestPairingCode(userId) {
    const validation = validatePhoneNumber(userId);

    if (!validation.valid) {
        return {
            success: false,
            error: validation.error
        };
    }

    const existing = getSession(validation.number);

    if (existing?.sock) {
        try {
            const code =
                await existing.sock.requestPairingCode(
                    validation.number
                );

            return {
                success: true,
                pairingCode: code
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    return createSession(
        validation.number,
        {
            requestPairingCode: true
        }
    );
}

// ==========================================
// REMOVE SESSION
// ==========================================

async function removeSession(userId) {
    const userKey = String(userId);

    try {
        const session = activeSessions.get(userKey);

        if (session?.sock) {
            try {
                session.sock.ev.removeAllListeners();
                session.sock.ws?.close();
            } catch {}
        }

        activeSessions.delete(userKey);
        connectingSessions.delete(userKey);
        reconnectAttempts.delete(userKey);

        const sessionPath = getSessionPath(userKey);

        if (fs.existsSync(sessionPath)) {
            await fs.remove(sessionPath);
        }

        database.updateUser(userKey, {
            connected: false,
            loggedOut: true,
            removedAt: new Date().toISOString()
        });

        return {
            success: true,
            message: "Session removed successfully."
        };

    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// ==========================================
// RESTORE SAVED SESSIONS
// ==========================================

async function restoreSessions() {
    try {
        fs.ensureDirSync(config.SESSIONS_PATH);

        const folders = fs.readdirSync(
            config.SESSIONS_PATH,
            {
                withFileTypes: true
            }
        );

        const sessionFolders = folders.filter(
            folder =>
                folder.isDirectory() &&
                folder.name.startsWith("user-")
        );

        console.log(
            `[SESSION RESTORE] Found ${sessionFolders.length} saved session(s).`
        );

        for (const folder of sessionFolders) {
            try {
                const userId = folder.name.replace(
                    "user-",
                    ""
                );

                if (!sessionExists(userId)) {
                    continue;
                }

                console.log(
                    `[SESSION RESTORE] Restoring ${userId}`
                );

                await createSession(
                    userId,
                    {
                        requestPairingCode: false
                    }
                );

                // Prevent too many simultaneous connections
                await sleep(1500);

            } catch (error) {
                console.error(
                    `[SESSION RESTORE ERROR] ${folder.name}:`,
                    error.message
                );
            }
        }

        return true;

    } catch (error) {
        console.error(
            "[SESSION RESTORE ERROR]",
            error.message
        );

        return false;
    }
}

// ==========================================
// SESSION STATISTICS
// ==========================================

function getSessionStats() {
    return {
        active: activeSessions.size,
        connecting: connectingSessions.size,
        reconnecting: reconnectAttempts.size
    };
}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
validatePhoneNumber,

getSessionPath,
sessionExists,

// Session access
getSession,
getActiveSessions,

// Session creation
createSession,
requestPairingCode,

// Session management
removeSession,
restoreSessions,

// Statistics
getSessionStats

};