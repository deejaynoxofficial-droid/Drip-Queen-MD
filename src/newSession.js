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
let jidNormalizedUser;

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


/* Prevent concurrent pairing-code requests for the same number. */
const pairingRequests = new Set();


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
   WELCOME MESSAGE
========================================== */

function getWelcomeMarkerPath(userId) {

    return path.join(
        config.SESSIONS_PATH,
        String(userId),
        ".welcome-sent"
    );
}


async function sendWelcomeMessage(userId, sock) {

    const WELCOME_VERSION = "welcome-v2";

    try {

        if (!sock?.user?.id) {
            console.warn(`[WELCOME] No bot JID available for ${userId}`);
            return false;
        }

        const markerPath = getWelcomeMarkerPath(userId);
        let marker = null;

        try {
            if (fs.existsSync(markerPath)) {
                marker = JSON.parse(fs.readFileSync(markerPath, "utf8"));
            }
        } catch {}

        // Do not resend the same welcome forever, but allow this redesigned
        // welcome card to appear once for existing sessions.
        if (marker?.version === WELCOME_VERSION) {
            return false;
        }

        const creatorNames = config.CREATORS || "NOX STAR.B & NOX STAR TECH";
        const channel = config.BOT_CHANNEL || "https://whatsapp.com/channel/0029VbDUfO8IN9iiXeuLYT1y";
        const prefix = config.PREFIX || ".";

        const configuredImage = config.BOT_IMAGE_PATH || path.join(config.PUBLIC_PATH, "bot.png");
        const imagePath = path.isAbsolute(configuredImage)
            ? configuredImage
            : path.join(config.ROOT_DIR, configuredImage);

        const caption = `╭━━━〔 👑 DRIP QUEEN MD 〕━━━╮
┃ ✨ Welcome, @user
┃
┃ 🤖 Bot   : DRIP QUEEN MD
┃ ⚡ Mode  : Public
┃ 🔹 Prefix: ${prefix}
┃
┃ 💎 Type ${prefix}menu to explore
┃ 📢 Channel:
┃ ${channel}
┃
┃ 👑 NOX STAR.B
┃ 🛠️ NOX STAR TECH
╰━━━━━━━━━━━━━━━━━╯`;

        let target = sock.user.id;
        try {
            if (typeof jidNormalizedUser === "function") {
                target = jidNormalizedUser(sock.user.id);
            }
        } catch {}

        let sent = false;

        // Wait briefly after connection open so the paired account is ready
        // to accept an outbound message.
        await new Promise(resolve => setTimeout(resolve, 1200));

        if (fs.existsSync(imagePath)) {
            try {
                await sock.sendMessage(target, {
                    image: fs.readFileSync(imagePath),
                    caption
                });
                sent = true;
                console.log(`[WELCOME] Image welcome card sent to ${userId}`);
            } catch (imageError) {
                console.warn(`[WELCOME] Image send failed for ${userId}: ${imageError.message}`);
            }
        } else {
            console.warn(`[WELCOME] Image not found at ${imagePath}`);
        }

        // Always have a working fallback if image delivery fails.
        if (!sent) {
            await sock.sendMessage(target, { text: caption });
            sent = true;
            console.log(`[WELCOME] Text welcome sent to ${userId}`);
        }

        if (sent) {
            fs.mkdirSync(path.dirname(markerPath), { recursive: true });
            fs.writeFileSync(markerPath, JSON.stringify({
                sentAt: new Date().toISOString(),
                version: WELCOME_VERSION,
                botVersion: config.BOT_VERSION || "1.0.0"
            }, null, 2), "utf8");
        }

        return sent;

    } catch (error) {
        console.error(`[WELCOME ERROR] ${userId}:`, error.stack || error.message);
        return false;
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


        let version;

        try {
            const latest = await fetchLatestWaWebVersion();
            version = latest?.version;

            if (!Array.isArray(version) || version.length !== 3) {
                throw new Error("Invalid live WhatsApp Web version");
            }

            console.log(`[SESSION] WA Web version: ${version.join(".")}`);
        } catch (versionError) {
            const fallback = await fetchLatestBaileysVersion();
            version = fallback.version;
            console.warn(`[SESSION] Live WA Web version unavailable; using Baileys fallback: ${version.join(".")}`);
        }


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

                // IMPORTANT: use a canonical WhatsApp browser identity.
                // Custom browser[0] labels can produce dead pairing codes.
                browser: Browsers.macOS("Chrome"),

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

            async update => {

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


                    await sendWelcomeMessage(
                        userId,
                        sock
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


            /*
               Allow commands from the bot account's own
               self-chat, but never process the bot's outgoing
               messages in other chats. This makes .menu/.ping
               work from a linked device as well.
            */
            if (msg.key?.fromMe) {

                const ownJid =
                    String(sock.user?.id || "").split(":")[0];

                const remoteBase =
                    String(msg.key?.remoteJid || "").split(":")[0];

                if (
                    !ownJid ||
                    !remoteBase ||
                    !remoteBase.startsWith(ownJid.split("@")[0])
                ) {
                    continue;
                }

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

            console.log(`[MESSAGE EVENT] ${userId} type=${messageUpdate?.type || "unknown"} jid=${remoteJid} fromMe=${Boolean(msg.key?.fromMe)}`);


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

    try {
        let message = msg?.message;
        if (!message) return "";

        // Unwrap nested WhatsApp message containers.
        const unwrapKeys = [
            "ephemeralMessage",
            "viewOnceMessage",
            "viewOnceMessageV2",
            "viewOnceMessageV2Extension",
            "documentWithCaptionMessage",
            "editedMessage"
        ];

        let changed = true;
        while (message && changed) {
            changed = false;
            for (const key of unwrapKeys) {
                if (message?.[key]?.message) {
                    message = message[key].message;
                    changed = true;
                    break;
                }
            }
        }

        const candidates = [
            message?.conversation,
            message?.extendedTextMessage?.text,
            message?.imageMessage?.caption,
            message?.videoMessage?.caption,
            message?.documentMessage?.caption,
            message?.buttonsResponseMessage?.selectedButtonId,
            message?.listResponseMessage?.singleSelectReply?.selectedRowId,
            message?.templateButtonReplyMessage?.selectedId,
            message?.templateButtonReplyMessage?.selectedDisplayText,
            message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson
        ];

        for (const value of candidates) {
            if (typeof value === "string" && value.trim()) {
                return value.trim();
            }
        }

    } catch (error) {
        console.error("[TEXT EXTRACTION ERROR]", error.message);
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

    let commandName = "unknown";

    try {
        const prefix = String(config.PREFIX || ".");
        const normalizedText = String(text || "")
            .replace(/[\u200B-\u200D\uFEFF]/g, "")
            .trim();

        if (!normalizedText || !normalizedText.startsWith(prefix)) {
            return false;
        }

        const body = normalizedText.slice(prefix.length).trim();
        if (!body) return false;

        const parts = body.split(/\s+/);
        commandName = String(parts.shift() || "").toLowerCase();
        const args = parts;
        if (!commandName) return false;

        if (!commandLoader) {
            throw new Error("Command loader is unavailable");
        }

        // Load once if startup did not populate the registry.
        if (!commandLoader.isLoaded?.()) {
            await commandLoader.loadCommands();
        }

        const command = await findCommand(commandName);
        if (!command) {
            console.log(`[COMMAND] Unknown: ${commandName} | loaded=${commandLoader.getCommandCount?.() || 0}`);
            return false;
        }

        const chatId = msg?.key?.remoteJid;
        if (!chatId) return false;

        console.log(`[COMMAND] Executing ${prefix}${commandName} for ${userId}`);

        const context = {
            sock,
            client: sock,
            msg,
            message: msg,
            m: msg,
            args,
            text: normalizedText,
            body,
            commandName,
            command: command.name,
            prefix,
            sender: msg.key?.participant || chatId,
            from: chatId,
            chatId,
            jid: chatId,
            userId,
            pushName: msg.pushName || "User",
            isGroup: chatId.endsWith("@g.us"),
            isFromMe: Boolean(msg.key?.fromMe),

            reply: async (message, options = {}) => {
                const content = typeof message === "string"
                    ? { text: message }
                    : message;
                return sock.sendMessage(chatId, content, { quoted: msg, ...options });
            },

            sendMessage: async (content, options = {}) => {
                return sock.sendMessage(chatId, content, { quoted: msg, ...options });
            },

            react: async emoji => {
                return sock.sendMessage(chatId, {
                    react: { text: String(emoji), key: msg.key }
                });
            },

            sendText: async message => {
                return sock.sendMessage(chatId, { text: String(message) }, { quoted: msg });
            }
        };

        let executor = null;
        if (typeof command.execute === "function") executor = command.execute;
        else if (typeof command.run === "function") executor = command.run;
        else if (typeof command.handler === "function") executor = command.handler;

        if (!executor) {
            throw new Error(`Command "${command.name}" has no execution function`);
        }

        await executor(context);
        console.log(`[COMMAND] Completed ${prefix}${commandName}`);
        return true;

    } catch (error) {
        console.error(`[COMMAND ERROR] ${commandName}:`, error.stack || error.message);

        try {
            const chatId = msg?.key?.remoteJid;
            if (chatId) {
                await sock.sendMessage(chatId, {
                    text: `❌ ${config.BOT_NAME || "DRIP QUEEN MD"}\nCommand: ${config.PREFIX || "."}${commandName}\nError: ${error.message}`
                }, { quoted: msg });
            }
        } catch (replyError) {
            console.error("[COMMAND ERROR REPLY FAILED]", replyError.message);
        }

        return false;
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

function waitForPairingSocketReady(sock, timeoutMs = 15000) {
    if (!sock) return Promise.reject(new Error("Pairing socket was not created."));

    return new Promise((resolve, reject) => {
        let settled = false;
        const finish = (fn, value) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            try { sock.ev.off("connection.update", onUpdate); } catch {}
            fn(value);
        };

        const onUpdate = update => {
            if (update?.connection === "open" || update?.qr) {
                finish(resolve);
                return;
            }

            if (update?.connection === "close") {
                const code = update?.lastDisconnect?.error?.output?.statusCode;
                finish(reject, new Error(`Pairing socket closed before code request (status ${code || "unknown"})`));
            }
        };

        const timer = setTimeout(() => {
            finish(resolve);
        }, timeoutMs);

        sock.ev.on("connection.update", onUpdate);
    });
}

async function generatePairingCode(phoneNumber) {
    await loadBaileys();

    const userId = String(phoneNumber || "").replace(/\D/g, "");

    if (userId.length < 8 || userId.length > 16) {
        throw new Error("Enter a valid phone number with country code.");
    }

    if (activeSessions.has(userId)) {
        throw new Error("This number already has an active session.");
    }

    if (pairingRequests.has(userId)) {
        throw new Error("A pairing request is already in progress for this number. Wait for the current code to expire or restart the pairing attempt.");
    }

    pairingRequests.add(userId);
    clearReconnectTimer(userId);
    connectingSessions.add(userId);

    const sessionPath = path.join(config.SESSIONS_PATH, userId);
    fs.mkdirSync(sessionPath, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    if (state.creds.registered) {
        connectingSessions.delete(userId);
        throw new Error("This number already has saved WhatsApp credentials.");
    }

    let version;

    try {
        const latest = await fetchLatestWaWebVersion();
        version = latest?.version;

        if (!Array.isArray(version) || version.length !== 3) {
            throw new Error("Invalid live WhatsApp Web version");
        }

        console.log(`[PAIRING] WA Web version: ${version.join(".")}`);
    } catch (versionError) {
        const fallback = await fetchLatestBaileysVersion();
        version = fallback.version;
        console.warn(`[PAIRING] Live WA Web version unavailable; using Baileys fallback: ${version.join(".")}`);
    }

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
        // Canonical browser identity required for reliable pairing-code linking.
        browser: Browsers.macOS("Chrome"),
        printQRInTerminal: false,
        markOnlineOnConnect: true,
        syncFullHistory: false,
        generateHighQualityLinkPreview: true
    });

    activeSessions.set(userId, sock);
    sock.ev.on("creds.update", saveCreds);
    attachSessionHandlers(userId, sock);

    sock.ev.on("connection.update", async update => {
        const { connection, lastDisconnect } = update;

        if (connection === "open") {
            connectingSessions.delete(userId);
            pairingRequests.delete(userId);
            registerSession(userId, sock);
            console.log(`[PAIRING] ${userId} connected successfully`);

            await sendWelcomeMessage(userId, sock);
            return;
        }

        if (connection === "close") {
            activeSessions.delete(userId);
            connectingSessions.delete(userId);

            const statusCode =
                lastDisconnect?.error?.output?.statusCode;

            console.log(
                `[PAIRING CLOSED] ${userId}: statusCode=${statusCode || "unknown"}`
            );

            if (statusCode === DisconnectReason.loggedOut) {
                clearReconnectTimer(userId);
                return;
            }

            // 515 / restartRequired is expected immediately after
            // WhatsApp accepts a pairing code. Keep the saved creds
            // and rebuild the socket instead of treating pairing as failed.
            if (config.AUTO_RECONNECT && !reconnectTimers.has(userId)) {
                const delay =
                    statusCode === DisconnectReason.restartRequired
                        ? 1500
                        : (Number(config.RECONNECT_DELAY) || 5000);

                console.log(
                    `[PAIRING RECONNECT] ${userId} in ${delay}ms`
                );

                const timer = setTimeout(async () => {
                    reconnectTimers.delete(userId);

                    try {
                        await connectSession(userId);
                    } catch (error) {
                        console.error(
                            `[PAIRING RECONNECT ERROR] ${userId}:`,
                            error.message
                        );
                    }
                }, delay);

                reconnectTimers.set(userId, timer);
            }
        }
    });

    // Baileys may need a short moment to initialize on slower hosts.
    // Retry a few times instead of returning a false pairing failure.
    let lastError = null;

    try {
        await waitForPairingSocketReady(sock, 15000);
    } catch (readyError) {
        console.warn(`[PAIRING] Socket readiness warning for ${userId}: ${readyError.message}`);
    }

    for (let attempt = 1; attempt <= 5; attempt++) {
        try {
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

    connectingSessions.delete(userId);
    pairingRequests.delete(userId);

    try {
        sock.ws?.close();
    } catch {}

    // Do not delete the auth directory here. If WhatsApp accepted the
    // pairing, the credentials may already be valid and the reconnect
    // handler must be allowed to resume the session.
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