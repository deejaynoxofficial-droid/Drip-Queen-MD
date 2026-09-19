const fs = require("fs");
const path = require("path");

let commandLoader;

try {

    commandLoader =
        require("./commandLoader");

} catch (error) {

    console.error(
        "[COMMAND LOADER ERROR]",
        error.message
    );

    commandLoader = null;

}


let baileysModule = null;
let makeWASocket;
let useMultiFileAuthState;
let DisconnectReason;
let fetchLatestBaileysVersion;
let fetchLatestWaWebVersion;
let makeCacheableSignalKeyStore;
let Browsers;

async function loadBaileys() {
    if (!baileysModule) {
        baileysModule = await import("@whiskeysockets/baileys");
        ({
            default: makeWASocket,
            useMultiFileAuthState,
            DisconnectReason,
            fetchLatestBaileysVersion,
            fetchLatestWaWebVersion,
            makeCacheableSignalKeyStore,
            Browsers
        } = baileysModule);
    }
    return baileysModule;
}

const pino = require("pino");

const config = require("../config");

/* ==========================================
   LIVE WHATSAPP WEB VERSION + CANONICAL BROWSER
========================================== */

const DEFAULT_WA_WEB_VERSION = [2, 3000, 1043857760];

async function getWhatsAppWebVersion() {
    const raw = String(process.env.WA_WEB_VERSION || "").trim();

    if (raw) {
        const parsed = raw.split(/[.,\s-]+/).map(Number);
        if (parsed.length === 3 && parsed.every(Number.isInteger)) {
            console.log(`[PAIRING] Using WA_WEB_VERSION override: ${parsed.join(".")}`);
            return parsed;
        }
    }

    if (typeof fetchLatestWaWebVersion === "function") {
        try {
            const result = await fetchLatestWaWebVersion();
            if (result?.version?.length === 3 && result?.isLatest !== false) {
                console.log(`[PAIRING] Live WhatsApp Web version: ${result.version.join(".")}`);
                return result.version;
            }
        } catch (error) {
            console.warn(`[PAIRING] Live WA version lookup failed: ${error.message}`);
        }
    }

    if (typeof fetchLatestBaileysVersion === "function") {
        try {
            const result = await fetchLatestBaileysVersion();
            if (result?.version?.length === 3 && result?.isLatest) {
                console.log(`[PAIRING] Baileys version fallback: ${result.version.join(".")}`);
                return result.version;
            }
        } catch (error) {
            console.warn(`[PAIRING] Baileys version lookup failed: ${error.message}`);
        }
    }

    console.warn(`[PAIRING] Using fallback WA Web version: ${DEFAULT_WA_WEB_VERSION.join(".")}`);
    return DEFAULT_WA_WEB_VERSION;
}

function getPairingBrowser() {
    return Browsers?.macOS ? Browsers.macOS("Chrome") : ["Mac OS", "Chrome", "1.0.0"];
}


/* ==========================================
   ACTIVE SESSIONS
========================================== */

const activeSessions = new Map();


/* ==========================================
   RECONNECT TIMERS
========================================== */

const reconnectTimers = new Map();


/* ==========================================
   CONNECTING SESSIONS
========================================== */

const connectingSessions = new Set();


/* ==========================================
   SAFE SETTINGS LOADER
========================================== */

function getFeatureSettings() {

    try {

        const settingsPath =
            config.SETTINGS_DB;


        if (
            !settingsPath ||
            !fs.existsSync(settingsPath)
        ) {

            return {};

        }


        const content =
            fs.readFileSync(
                settingsPath,
                "utf8"
            );


        if (!content.trim()) {

            return {};

        }


        const settings =
            JSON.parse(content);


        return settings.features || {};


    } catch (error) {

        console.error(
            "[SETTINGS READ ERROR]",
            error.message
        );

        return {};

    }

}


/* ==========================================
   CLEAR RECONNECT TIMER
========================================== */

function clearReconnectTimer(userId) {

    const timer =
        reconnectTimers.get(userId);


    if (timer) {

        clearTimeout(timer);

        reconnectTimers.delete(userId);

    }

}


/* ==========================================
   ATTACH SESSION HANDLERS
========================================== */

function attachSessionHandlers(
    userId,
    sock
) {

    if (
        !userId ||
        !sock
    ) {

        return;

    }


    /*
       Prevent duplicate handlers.
    */

    if (sock.__dripQueenHandlersAttached) {

        return;

    }


    sock.__dripQueenHandlersAttached =
        true;


    sock.ev.on(

        "messages.upsert",

        async messageUpdate => {

            try {

                await handleMessages(

                    sock,

                    userId,

                    messageUpdate

                );

            } catch (error) {

                console.error(
                    `[MESSAGE HANDLER ERROR] ${userId}:`,
                    error.message
                );

            }

        }

    );

}


/* ==========================================
   REGISTER EXTERNAL SESSION
========================================== */

function registerSession(
    userId,
    sock
) {

    if (
        !userId ||
        !sock
    ) {

        return false;

    }


    userId =
        String(userId).trim();


    clearReconnectTimer(
        userId
    );


    connectingSessions.delete(
        userId
    );


    activeSessions.set(
        userId,
        sock
    );


    console.log(
        `[SESSION REGISTERED] ${userId}`
    );


    return true;

}


/* ==========================================
   RESTORE SINGLE SESSION
========================================== */

async function connectSession(userId) {

    await loadBaileys();

    try {

        if (!userId) {

            throw new Error(
                "Session user ID is required"
            );

        }


        userId =
            String(userId).trim();


        /*
           Prevent duplicate active connections.
        */

        if (
            activeSessions.has(userId)
        ) {

            return activeSessions.get(userId);

        }


        /*
           Prevent multiple simultaneous
           connection attempts.
        */

        if (
            connectingSessions.has(userId)
        ) {

            console.log(
                `[SESSION] ${userId} is already connecting`
            );

            return null;

        }


        connectingSessions.add(userId);


        clearReconnectTimer(userId);


        const sessionPath =
            path.join(
                config.SESSIONS_PATH,
                userId
            );


        const credsPath =
            path.join(
                sessionPath,
                "creds.json"
            );


        if (
            !fs.existsSync(credsPath)
        ) {

            throw new Error(
                `No saved credentials found for ${userId}`
            );

        }


        console.log(
            `[SESSION] Connecting ${userId}...`
        );


        const {
            version
        } = await fetchLatestBaileysVersion();


        const {
            state,
            saveCreds
        } = await useMultiFileAuthState(
            sessionPath
        );


        if (
            !state.creds.registered
        ) {

            throw new Error(
                `${userId} is not authenticated yet`
            );

        }


        const sock =
            makeWASocket({

                version,

                auth: {

                    creds:
                        state.creds,

                    keys:
                        makeCacheableSignalKeyStore(
                            state.keys,
                            pino({
                                level: "silent"
                            })
                        )

                },

                logger:
                    pino({
                        level: "silent"
                    }),

                browser: [

                    config.BOT_NAME ||
                    "DRIP QUEEN MD",

                    "Chrome",

                    "1.0.0"

                ],

                printQRInTerminal:
                    false,

                markOnlineOnConnect:
                    true,

                syncFullHistory:
                    false,

                generateHighQualityLinkPreview:
                    true

            });


        /*
           Register socket.
        */

        registerSession(
            userId,
            sock
        );


        /*
           Save credentials.
        */

        sock.ev.on(
            "creds.update",
            saveCreds
        );


        /* ==========================================
           CONNECTION EVENTS
        ========================================== */

        sock.ev.on(

            "connection.update",

            update => {

                const {

                    connection,
                    lastDisconnect

                } = update;


                if (
                    connection ===
                    "connecting"
                ) {

                    console.log(
                        `[SESSION] ${userId} connecting...`
                    );

                }


                if (
                    connection ===
                    "open"
                ) {

                    connectingSessions.delete(
                        userId
                    );


                    clearReconnectTimer(
                        userId
                    );


                    registerSession(
                        userId,
                        sock
                    );


                    console.log(
                        `[SESSION CONNECTED] ${userId}`
                    );


                    return;

                }


                if (
                    connection ===
                    "close"
                ) {

                    connectingSessions.delete(
                        userId
                    );


                    activeSessions.delete(
                        userId
                    );


                    let statusCode;


                    try {

                        statusCode =
                            lastDisconnect
                                ?.error
                                ?.output
                                ?.statusCode;

                    } catch (error) {

                        statusCode =
                            undefined;

                    }


                    console.log(
                        `[SESSION CLOSED] ${userId}`
                    );


                    /*
                       Do not reconnect logged-out sessions.
                    */

                    if (
                        statusCode ===
                        DisconnectReason.loggedOut
                    ) {

                        clearReconnectTimer(
                            userId
                        );


                        console.log(
                            `[SESSION] ${userId} logged out`
                        );


                        return;

                    }


                    /*
                       Auto reconnect.
                    */

                    if (
                        config.AUTO_RECONNECT
                    ) {

                        if (
                            reconnectTimers.has(
                                userId
                            )
                        ) {

                            return;

                        }


                        const delay =
                            Number(
                                config.RECONNECT_DELAY
                            ) || 5000;


                        console.log(
                            `[RECONNECT] ${userId} in ${delay}ms`
                        );


                        const timer =
                            setTimeout(

                                async () => {

                                    reconnectTimers.delete(
                                        userId
                                    );


                                    try {

                                        await connectSession(
                                            userId
                                        );

                                    } catch (error) {

                                        console.error(
                                            `[RECONNECT ERROR] ${userId}:`,
                                            error.message
                                        );

                                    }

                                },

                                delay

                            );


                        reconnectTimers.set(
                            userId,
                            timer
                        );

                    }

                }

            }

        );


        /*
           Attach incoming message handler.
        */

        attachSessionHandlers(
            userId,
            sock
        );


        return sock;


    } catch (error) {

        activeSessions.delete(
            userId
        );


        connectingSessions.delete(
            userId
        );


        console.error(
            `[SESSION ERROR] ${userId}:`,
            error.message
        );


        throw error;

    }

}


/* ==========================================
   HANDLE INCOMING MESSAGES
========================================== */

async function handleMessages(
    sock,
    userId,
    messageUpdate
) {

    const messages =
        messageUpdate?.messages || [];


    for (
        const msg
        of messages
    ) {

        try {

            if (!msg?.message) {

                continue;

            }


            if (
                msg.key?.fromMe
            ) {

                continue;

            }


            const remoteJid =
                msg.key?.remoteJid;


            if (!remoteJid) {

                continue;

            }


            if (
                remoteJid ===
                "status@broadcast"
            ) {

                continue;

            }


            const text =
                getMessageText(msg);


            console.log(
                `[MESSAGE] ${userId}: ${text || "[MEDIA MESSAGE]"}`
            );


            await handleAutoFeatures(

                sock,
                msg,
                text

            );


            if (text) {

                await handleCommand(

                    sock,
                    userId,
                    msg,
                    text

                );

            }


        } catch (error) {

            console.error(
                "[MESSAGE PROCESS ERROR]",
                error.message
            );

        }

    }

}


/* ==========================================
   EXTRACT MESSAGE TEXT
========================================== */

function getMessageText(msg) {

    const message =
        msg?.message;


    if (!message) {

        return "";

    }


    if (
        typeof message.conversation ===
        "string"
    ) {

        return message.conversation;

    }


    if (
        typeof message.extendedTextMessage?.text ===
        "string"
    ) {

        return message.extendedTextMessage.text;

    }


    if (
        typeof message.imageMessage?.caption ===
        "string"
    ) {

        return message.imageMessage.caption;

    }


    if (
        typeof message.videoMessage?.caption ===
        "string"
    ) {

        return message.videoMessage.caption;

    }


    if (
        typeof message.documentMessage?.caption ===
        "string"
    ) {

        return message.documentMessage.caption;

    }


    return "";

}


/* ==========================================
   HANDLE COMMANDS
========================================== */

async function handleCommand(
    sock,
    userId,
    msg,
    text
) {

    try {

        const prefix =
            config.PREFIX || ".";


        if (
            !text.startsWith(prefix)
        ) {

            return;

        }


        const body =
            text
                .slice(prefix.length)
                .trim();


        if (!body) {

            return;

        }


        const args =
            body.split(/\s+/);


        const commandName =
            args
                .shift()
                ?.toLowerCase();


        if (!commandName) {

            return;

        }


        const command =
            await findCommand(
                commandName
            );


        if (!command) {

            console.log(
                `[COMMAND] Unknown: ${commandName}`
            );

            return;

        }


        console.log(
            `[COMMAND] Executing: ${commandName}`
        );


        const context = {

            sock,

            msg,

            args,

            text,

            commandName,

            prefix,

            sender:

                msg.key?.participant ||

                msg.key?.remoteJid,


            from:
                msg.key?.remoteJid,


            isGroup:

                msg.key?.remoteJid
                    ?.endsWith(
                        "@g.us"
                    ) || false,


            userId,


            reply:

                async message => {

                    return await sock.sendMessage(

                        msg.key.remoteJid,

                        {
                            text:
                                String(message)
                        },

                        {
                            quoted:
                                msg
                        }

                    );

                }

        };


        if (
            typeof command.execute ===
            "function"
        ) {

            await command.execute(
                context
            );

        }

        else if (
            typeof command.run ===
            "function"
        ) {

            await command.run(
                context
            );

        }

        else if (
            typeof command.handler ===
            "function"
        ) {

            await command.handler(
                context
            );

        }

        else {

            console.log(
                `[COMMAND ERROR] ${commandName} has no execution function`
            );

        }


    } catch (error) {

        console.error(
            "[COMMAND HANDLER ERROR]",
            error.message
        );

    }

}


/* ==========================================
   FIND COMMAND
========================================== */

async function findCommand(
    commandName
) {

    try {

        if (
            !commandName ||
            !commandLoader
        ) {

            return null;

        }


        let command = null;


        if (
            typeof commandLoader.getCommand ===
            "function"
        ) {

            command =
                commandLoader.getCommand(
                    commandName
                );

        }


        if (
            !command &&
            typeof commandLoader.loadCommands ===
            "function"
        ) {

            await commandLoader.loadCommands();


            if (
                typeof commandLoader.getCommand ===
                "function"
            ) {

                command =
                    commandLoader.getCommand(
                        commandName
                    );

            }

        }


        return command || null;


    } catch (error) {

        console.error(
            "[FIND COMMAND ERROR]",
            error.message
        );

        return null;

    }

}


/* ==========================================
   AUTO FEATURES
========================================== */

async function handleAutoFeatures(
    sock,
    msg,
    text
) {

    try {

        const features =
            getFeatureSettings();


        const chatId =
            msg.key?.remoteJid;


        if (!chatId) {

            return;

        }


        /*
           AUTO READ
        */

        if (
            features.autoRead === true
        ) {

            try {

                await sock.readMessages([
                    msg.key
                ]);

            } catch (error) {}

        }


        /*
           AUTO TYPING
        */

        if (
            features.autoTyping === true
        ) {

            try {

                await sock.sendPresenceUpdate(
                    "composing",
                    chatId
                );


                setTimeout(
                    () => {

                        sock
                            .sendPresenceUpdate(
                                "paused",
                                chatId
                            )
                            .catch(
                                () => {}
                            );

                    },

                    1500
                );

            } catch (error) {}

        }


        /*
           AUTO RECORDING
        */

        if (
            features.autoRecording === true
        ) {

            try {

                await sock.sendPresenceUpdate(
                    "recording",
                    chatId
                );


                setTimeout(
                    () => {

                        sock
                            .sendPresenceUpdate(
                                "paused",
                                chatId
                            )
                            .catch(
                                () => {}
                            );

                    },

                    1500
                );

            } catch (error) {}

        }


        /*
           ALWAYS ONLINE
        */

        if (
            features.alwaysOnline === true
        ) {

            try {

                await sock.sendPresenceUpdate(
                    "available"
                );

            } catch (error) {}

        }


        /*
           AUTO REACT
        */

        if (
            features.autoReact === true
        ) {

            try {

                const emojis = [

                    "❤️",
                    "🔥",
                    "✨",
                    "💯",
                    "😍"

                ];


                const emoji =
                    emojis[
                        Math.floor(
                            Math.random() *
                            emojis.length
                        )
                    ];


                await sock.sendMessage(

                    chatId,

                    {

                        react: {

                            text:
                                emoji,

                            key:
                                msg.key

                        }

                    }

                );

            } catch (error) {}

        }


    } catch (error) {

        console.error(
            "[AUTO FEATURE ERROR]",
            error.message
        );

    }

}


/* ==========================================
   RESTORE ALL SESSIONS
========================================== */

async function restoreSessions() {

    try {

        if (
            !fs.existsSync(
                config.SESSIONS_PATH
            )
        ) {

            return [];

        }


        const folders =
            fs.readdirSync(

                config.SESSIONS_PATH,

                {
                    withFileTypes:
                        true
                }

            );


        const restored = [];


        for (
            const folder
            of folders
        ) {

            if (
                !folder.isDirectory()
            ) {

                continue;

            }


            const userId =
                folder.name;


            if (
                userId === ".gitkeep"
            ) {

                continue;

            }


            const credsPath =
                path.join(

                    config.SESSIONS_PATH,

                    userId,

                    "creds.json"

                );


            if (
                !fs.existsSync(
                    credsPath
                )
            ) {

                continue;

            }


            try {

                await connectSession(
                    userId
                );


                restored.push(
                    userId
                );


            } catch (error) {

                console.log(
                    `[RESTORE FAILED] ${userId}: ${error.message}`
                );

            }

        }


        console.log(
            `[SESSIONS] Restored ${restored.length} session(s)`
        );


        return restored;


    } catch (error) {

        console.error(
            "[RESTORE SESSIONS ERROR]",
            error.message
        );


        return [];

    }

}


/* ==========================================
   GET ACTIVE SESSIONS
========================================== */

function getSessions() {

    const sessions = [];


    for (
        const [
            userId,
            sock
        ]
        of activeSessions.entries()
    ) {

        sessions.push({

            userId,

            id:
                userId,

            connected:
                !!sock

        });

    }


    return sessions;

}


/* ==========================================
   REMOVE SESSION
========================================== */

async function removeSession(
    userId
) {

    try {

        if (!userId) {

            return false;

        }


        userId =
            String(userId).trim();


        clearReconnectTimer(
            userId
        );


        connectingSessions.delete(
            userId
        );


        const sock =
            activeSessions.get(
                userId
            );


        if (sock) {

            try {

                await sock.logout();

            } catch (error) {

                try {

                    sock.ws?.close();

                } catch (closeError) {}

            }


            activeSessions.delete(
                userId
            );

        }


        const sessionPath =
            path.join(

                config.SESSIONS_PATH,

                userId

            );


        if (
            fs.existsSync(
                sessionPath
            )
        ) {

            fs.rmSync(

                sessionPath,

                {

                    recursive:
                        true,

                    force:
                        true

                }

            );

        }


        console.log(
            `[SESSION REMOVED] ${userId}`
        );


        return true;


    } catch (error) {

        console.error(
            "[REMOVE SESSION ERROR]",
            error.message
        );


        throw error;

    }

}


/* ==========================================
   SHUTDOWN
========================================== */

async function shutdown() {

    console.log(
        "[SESSIONS] Closing all connections..."
    );


    for (
        const timer
        of reconnectTimers.values()
    ) {

        clearTimeout(
            timer
        );

    }


    reconnectTimers.clear();


    for (
        const [
            userId,
            sock
        ]
        of activeSessions.entries()
    ) {

        try {

            sock.ws?.close();

        } catch (error) {

            console.log(
                `[SHUTDOWN ERROR] ${userId}: ${error.message}`
            );

        }

    }


    activeSessions.clear();

    connectingSessions.clear();

}


/* ==========================================
   GENERATE PAIRING CODE
========================================== */

async function generatePairingCode(phoneNumber) {
    await loadBaileys();

    const userId = String(phoneNumber || "").replace(/\D/g, "");

    if (userId.length < 8 || userId.length > 16) {
        throw new Error("Enter a valid phone number with country code.");
    }

    if (activeSessions.has(userId)) {
        throw new Error("This number already has an active session.");
    }

    clearReconnectTimer(userId);
    connectingSessions.add(userId);

    const sessionPath = path.join(config.SESSIONS_PATH, userId);

    // Remove incomplete unregistered pairing state so a failed attempt cannot
    // contaminate the next pairing-code request.
    if (fs.existsSync(sessionPath)) {
        try {
            const existing = await useMultiFileAuthState(sessionPath);
            if (existing.state.creds.registered) {
                connectingSessions.delete(userId);
                throw new Error("This number already has saved WhatsApp credentials.");
            }
        } catch (error) {
            if (error.message.includes("already has saved WhatsApp credentials")) throw error;
        }
        fs.rmSync(sessionPath, { recursive: true, force: true });
    }
    fs.mkdirSync(sessionPath, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const version = await getWhatsAppWebVersion();

    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(
                state.keys,
                pino({ level: "silent" })
            )
        },
        logger: pino({ level: "silent" }),
        browser: getPairingBrowser(),
        printQRInTerminal: false,
        markOnlineOnConnect: true,
        syncFullHistory: false,
        generateHighQualityLinkPreview: true
    });

    activeSessions.set(userId, sock);
    sock.ev.on("creds.update", saveCreds);
    attachSessionHandlers(userId, sock);

    sock.ev.on("connection.update", update => {
        const { connection, lastDisconnect, isNewLogin } = update;

        if (isNewLogin) console.log(`[PAIRING] ${userId} new login accepted by WhatsApp.`);

        if (connection === "open") {
            connectingSessions.delete(userId);
            console.log(`[PAIRING] ${userId} connected successfully`);
            return;
        }

        if (connection === "close") {
            activeSessions.delete(userId);
            connectingSessions.delete(userId);

            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const message = lastDisconnect?.error?.message || "unknown";
            console.error(`[PAIRING] ${userId} connection closed: status=${statusCode || "unknown"} message=${message}`);
            if (statusCode === DisconnectReason.loggedOut) {
                clearReconnectTimer(userId);
            }
        }
    });

    // Baileys may need a short moment to initialize on slower hosts.
    // Retry a few times instead of returning a false pairing failure.
    let lastError = null;

    for (let attempt = 1; attempt <= 5; attempt++) {
        try {
            await new Promise(resolve => setTimeout(resolve, attempt === 1 ? 2000 : 1500));
            if (activeSessions.get(userId) !== sock || sock.ws?.isClosed || sock.ws?.isClosing) {
                throw new Error("WhatsApp socket closed before pairing code request.");
            }
            const code = await sock.requestPairingCode(userId);
            const cleanCode = String(code || "").replace(/[^A-Za-z0-9]/g, "");

            if (!cleanCode) {
                throw new Error("WhatsApp returned an empty pairing code.");
            }

            console.log(`[PAIRING] Code generated for ${userId}`);
            return { number: userId, code: cleanCode };
        } catch (error) {
            lastError = error;
            console.warn(`[PAIRING] Attempt ${attempt}/5 failed for ${userId}: ${error.message}`);
        }
    }

    activeSessions.delete(userId);
    connectingSessions.delete(userId);

    try {
        sock.ws?.close();
    } catch {}

    throw lastError || new Error("Unable to generate WhatsApp pairing code.");
}

/* ==========================================
   EXPORT
========================================== */

module.exports = {

    connectSession,

    generatePairingCode,

    createSession:
        connectSession,


    registerSession,


    attachSessionHandlers,


    restoreSessions,

    initializeSessions:
        restoreSessions,

    loadSessions:
        restoreSessions,


    getSessions,

    getActiveSessions:
        getSessions,


    removeSession,

    deleteSession:
        removeSession,


    shutdown,


    handleMessages,

    handleCommand,


    getMessageText,

    handleAutoFeatures

};