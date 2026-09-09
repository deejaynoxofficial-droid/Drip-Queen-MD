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

async function loadBaileys() {
    if (!baileysModule) {
        baileysModule = await import("@whiskeysockets/baileys");
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
   RESTORE SINGLE SESSION
========================================== */

async function connectSession(userId) {

    const {
        default: makeWASocket,
        useMultiFileAuthState,
        DisconnectReason,
        fetchLatestBaileysVersion,
        makeCacheableSignalKeyStore
    } = await loadBaileys();

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


        /*
           Clear pending reconnect timer.
        */

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


        /*
           Check saved credentials.
        */

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


        /*
           Ensure authenticated session.
        */

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
                                level:
                                    "silent"
                            })
                        )

                },


                logger:
                    pino({
                        level:
                            "silent"
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
           Save active socket.
        */

        activeSessions.set(
            userId,
            sock
        );


        /*
           Save credentials updates.
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
                       Do not reconnect
                       logged-out sessions.
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

                        /*
                           Prevent multiple
                           reconnect timers.
                        */

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


        /* ==========================================
           HANDLE INCOMING MESSAGES
        ========================================== */

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
                        "[MESSAGE HANDLER ERROR]",
                        error.message
                    );

                }

            }

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
               Ignore messages sent by bot.
            */

            if (
                msg.key?.fromMe
            ) {

                continue;

            }


            const remoteJid =
                msg.key?.remoteJid;


            /*
               Ignore invalid chats.
            */

            if (!remoteJid) {

                continue;

            }


            /*
               Ignore WhatsApp status.
            */

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


            /*
               Run auto features.
            */

            await handleAutoFeatures(

                sock,

                msg,

                text

            );


            /*
               Run commands only when
               message contains text.
            */

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


        /*
           Ignore normal messages.
        */

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


        /*
           Find command.
        */

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


        let command =
            commandLoader.getCommand?.(
                commandName
            );


        if (
            !command &&
            typeof commandLoader.loadCommands ===
            "function"
        ) {

            await commandLoader.loadCommands();

            command =
                commandLoader.getCommand?.(
                    commandName
                );

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


        /*
           Execute command.
        */

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
            !commandName
        ) {

            return null;

        }


        /*
           Search loaded commands.
        */

        let command =
            commandLoader.getCommand(
                commandName
            );


        /*
           Reload commands if missing.
        */

        if (!command) {

            await commandLoader.loadCommands();


            command =
                commandLoader.getCommand(
                    commandName
                );

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
   SESSION STATS
========================================== */

function getSessionStats() {
    return {
        active: activeSessions.size,
        connecting: connectingSessions.size,
        total: activeSessions.size + connectingSessions.size
    };
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


    /*
       Stop reconnect timers.
    */

    for (
        const timer
        of reconnectTimers.values()
    ) {

        clearTimeout(
            timer
        );

    }


    reconnectTimers.clear();


    /*
       Close active sockets.
    */

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
   EXPORT
========================================== */

module.exports = {

    connectSession,

    createSession:
        connectSession,


    restoreSessions,

    initializeSessions:
        restoreSessions,

    loadSessions:
        restoreSessions,


    getSessions,

    getSessionStats,

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