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
let makeCacheableSignalKeyStore;

async function loadBaileys() {
    if (!baileysModule) {
        baileysModule = await import("@whiskeysockets/baileys");
        ({
            default: makeWASocket,
            useMultiFileAuthState,
            DisconnectReason,
            fetchLatestBaileysVersion,
            makeCacheableSignalKeyStore
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

    try {

        if (!sock?.user?.id) {
            return false;
        }

        const markerPath =
            getWelcomeMarkerPath(userId);

        if (fs.existsSync(markerPath)) {
            return false;
        }

        const creatorNames =
            config.CREATORS ||
            "NOX STAR.B & NOX STAR TECH";

        const channel =
            config.BOT_CHANNEL ||
            "https://whatsapp.com/channel/0029VbDUfO8IN9iiXeuLYT1y";

        const prefix =
            config.PREFIX || ".";

        /*
         * The welcome card is sent with a real image instead of a
         * plain-text-only message.  Replace public/bot.png to change
         * the artwork without touching the JavaScript.
         */
        const configuredImage =
            config.BOT_IMAGE_PATH ||
            path.join(config.PUBLIC_PATH, "bot.png");

        const imagePath =
            path.isAbsolute(configuredImage)
                ? configuredImage
                : path.join(config.ROOT_DIR, configuredImage);

        const caption = `
╭━━━━━━━━━━━━━━━━━━━━━━╮
┃   👑 *DRIP QUEEN MD* 👑
┃      *WHATSAPP BOT*
╰━━━━━━━━━━━━━━━━━━━━━━╯

╭─〔 ✨ CONNECTION SUCCESSFUL 〕─╮
│
│  🎉 *WELCOME, YOUR BOT IS READY!*
│
│  Your WhatsApp account has been
│  successfully paired and connected.
│
╰──────────────────────────────╯

╭─〔 🤖 BOT INFORMATION 〕─╮
│
│  ▸ *Bot:* DRIP QUEEN MD
│  ▸ *Creators:* ${creatorNames}
│  ▸ *Prefix:* ${prefix}
│  ▸ *Mode:* ${String(config.MODE || "public").toUpperCase()}
│
╰──────────────────────────╯

╭─〔 🚀 QUICK START 〕─╮
│
│  📋 Type *${prefix}menu* to open the
│     full command menu.
│
│  ⚡ Fast • Powerful • Multi-Device
│  🔐 Secure session • Public mode
│
╰──────────────────────╯

╭─〔 📢 OFFICIAL CHANNEL 〕─╮
│
│  🔗 *Follow DRIP QUEEN MD*
│  ${channel}
│
│  🔔 Get updates, new features,
│     commands & announcements.
│
╰────────────────────────────╯

╭━━━━━━━━━━━━━━━━━━━━━━╮
┃  ⭐ *POWERED BY NOX STAR TECH* ⭐
┃  💚 *Stay Connected • We Are Family*
╰━━━━━━━━━━━━━━━━━━━━━━╯`;

        const messageContent = {
            caption,
            mimetype: "image/png"
        };

        if (fs.existsSync(imagePath)) {

            messageContent.image =
                fs.readFileSync(imagePath);

            await sock.sendMessage(
                sock.user.id,
                messageContent
            );

            console.log(
                `[WELCOME] Image welcome card sent to ${userId}`
            );

        } else {

            // Safe fallback if the custom welcome image is missing.
            await sock.sendMessage(
                sock.user.id,
                { text: caption }
            );

            console.warn(
                `[WELCOME] Image not found at ${imagePath}; sent text fallback.`
            );
        }

        fs.mkdirSync(
            path.dirname(markerPath),
            { recursive: true }
        );

        fs.writeFileSync(
            markerPath,
            JSON.stringify({
                sentAt: new Date().toISOString(),
                version: config.BOT_VERSION || "1.0.0"
            }),
            "utf8"
        );

        return true;

    } catch (error) {

        console.error(
            `[WELCOME ERROR] ${userId}:`,
            error.message
        );

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

    let message =
        msg?.message;


    if (!message) {

        return "";

    }


    // WhatsApp may wrap text inside ephemeral/view-once containers.
    message =
        message.ephemeralMessage?.message ||
        message.viewOnceMessage?.message ||
        message.viewOnceMessageV2?.message ||
        message.viewOnceMessageV2Extension?.message ||
        message;


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
    fs.mkdirSync(sessionPath, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    if (state.creds.registered) {
        connectingSessions.delete(userId);
        throw new Error("This number already has saved WhatsApp credentials.");
    }

    const { version } = await fetchLatestBaileysVersion();

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
        browser: [config.BOT_NAME || "DRIP QUEEN MD", "Chrome", "1.0.0"],
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

    for (let attempt = 1; attempt <= 5; attempt++) {
        try {
            await new Promise(resolve => setTimeout(resolve, attempt === 1 ? 1200 : 1000));
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