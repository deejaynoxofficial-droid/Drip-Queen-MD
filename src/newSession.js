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
let areJidsSameUser;

async function loadBaileys() {
    if (!baileysModule) {
        try {
            baileysModule = await import("@whiskeysockets/baileys");
        } catch (error) {
            console.error("[BAILEYS LOAD ERROR] @whiskeysockets/baileys is not installed or could not be loaded.");
            console.error("[BAILEYS LOAD ERROR] Run the Render build again after ensuring package.json uses a published Baileys version.");
            throw error;
        }
        ({
            default: makeWASocket,
            useMultiFileAuthState,
            DisconnectReason,
            fetchLatestBaileysVersion,
            fetchLatestWaWebVersion,
            makeCacheableSignalKeyStore,
            Browsers,
            jidNormalizedUser,
            areJidsSameUser
        } = baileysModule);
    }
    return baileysModule;
}

const pino = require("pino");

const config = require("../config");
const { ensureUserDashboardPassword } = require("../lib/dashboardAuth");

// Numeric menu reply sessions (e.g. reply "1" after .menu)
let menuSessionStore = null;
try {
    menuSessionStore = require("./menuSession");
} catch (error) {
    console.warn("[MENU] menuSession module unavailable:", error.message);
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


const welcomeTimers = new Map();
const channelPromotionTimers = new Map();

function scheduleChannelPromotion(userId, sock, target, delayMs = 30000) {
    if (!userId || !sock || !target) return;

    if (channelPromotionTimers.has(userId)) {
        console.log(`[CHANNEL PROMOTION] Already scheduled for ${userId}`);
        return;
    }

    console.log(`[CHANNEL PROMOTION] Scheduling for ${userId} in ${delayMs}ms`);

    const timer = setTimeout(async () => {
        channelPromotionTimers.delete(userId);

        try {
            const markerPath = getWelcomeMarkerPath(userId);
            let marker = {};

            try {
                if (fs.existsSync(markerPath)) {
                    marker = JSON.parse(fs.readFileSync(markerPath, "utf8")) || {};
                }
            } catch {}

            if (marker.channelPromotionSentAt) {
                console.log(`[CHANNEL PROMOTION] Already sent for ${userId}`);
                return;
            }

            const channel = config.BOT_CHANNEL || "https://whatsapp.com/channel/0029VbDUfO8IN9iiXeuLYT1y";
            const botImage = config.BOT_IMAGE_PATH || path.join(config.PUBLIC_PATH, "bot.png");
            const thumbnailPath = path.isAbsolute(botImage)
                ? botImage
                : path.join(config.ROOT_DIR, botImage);

            const caption = `╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃       📢 DRIP QUEEN CHANNEL   ┃
┃                              ┃
┃   👑 Stay connected with     ┃
┃      DRIP QUEEN MD           ┃
┃                              ┃
┃   ✨ New updates              ┃
┃   ⚡ Features & releases     ┃
┃   📣 Official announcements  ┃
┃                              ┃
┃   👉 Follow the official     ┃
┃      WhatsApp Channel       ┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

            const message = {
                text: `${caption}\n\n${channel}`,
                contextInfo: {
                    externalAdReply: {
                        title: "👑 DRIP QUEEN MD — Official Channel",
                        body: "Updates • Features • Announcements",
                        mediaType: 1,
                        renderLargerThumbnail: true,
                        showAdAttribution: false,
                        sourceUrl: channel,
                    }
                }
            };

            if (fs.existsSync(thumbnailPath)) {
                message.contextInfo.externalAdReply.thumbnail = fs.readFileSync(thumbnailPath);
            }

            await sock.sendMessage(target, message);

            marker.channelPromotionSentAt = new Date().toISOString();
            marker.channelPromotionVersion = "channel-promotion-v1";
            fs.mkdirSync(path.dirname(markerPath), { recursive: true });
            fs.writeFileSync(markerPath, JSON.stringify(marker, null, 2), "utf8");

            console.log(`[CHANNEL PROMOTION] Sent successfully to ${target} for ${userId}`);
        } catch (error) {
            console.error(`[CHANNEL PROMOTION ERROR] ${userId}:`, error.stack || error.message);
        }
    }, delayMs);

    channelPromotionTimers.set(userId, timer);
}

function scheduleWelcomeMessage(userId, sock) {
    if (!userId || !sock) return;
    if (welcomeTimers.has(userId)) {
        console.log(`[WELCOME] Already scheduled for ${userId}`);
        return;
    }

    console.log(`[WELCOME TRIGGER] Scheduling welcome for ${userId} in 3500ms`);
    const timer = setTimeout(async () => {
        welcomeTimers.delete(userId);
        console.log(`[WELCOME TRIGGER] Running welcome for ${userId}`);
        await sendWelcomeMessage(userId, sock);
    }, 3500);
    welcomeTimers.set(userId, timer);
}

async function sendWelcomeMessage(userId, sock) {

    const WELCOME_VERSION = "welcome-v2-audio";

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

        if (marker?.version === WELCOME_VERSION) {
            console.log(`[WELCOME] Already sent for ${userId}`);

            const existingTarget = (() => {
                try {
                    const normalized = jidNormalizedUser(sock.user.id);
                    return normalized || sock.user.id;
                } catch {
                    return sock.user.id;
                }
            })();

            if (!marker.channelPromotionSentAt) {
                scheduleChannelPromotion(userId, sock, existingTarget, 30000);
            }

            return false;
        }

        const creatorNames = config.CREATORS || "NOX STAR.B & NOX STAR TECH";
        const channel = config.BOT_CHANNEL || "https://whatsapp.com/channel/0029VbDUfO8IN9iiXeuLYT1y";
        const prefix = config.PREFIX || ".";
        const displayName = String(
            sock.user?.name ||
            sock.user?.verifiedName ||
            userId ||
            "there"
        ).trim().replace(/\s+/g, " ").slice(0, 32) || "there";

        const configuredImage = config.BOT_IMAGE_PATH || path.join(config.PUBLIC_PATH, "bot.png");
        const imagePath = path.isAbsolute(configuredImage)
            ? configuredImage
            : path.join(config.ROOT_DIR, configuredImage);

        const audioPath = path.join(config.ROOT_DIR, "assets", "audio", "welcome.ogg");

        console.log(`[WELCOME] Build welcome-v2-audio | image=${imagePath} exists=${fs.existsSync(imagePath)} | audio=${audioPath} exists=${fs.existsSync(audioPath)}`);

        const caption = `╭━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╮
┃        👑 DRIP QUEEN MD      ┃
┃                              ┃
┃      ✨ Welcome, ${displayName}!
┃                              ┃
┃   🤖 Your WhatsApp bot is   ┃
┃      now connected.          ┃
┃                              ┃
┃   ⚡ Mode    : Public        ┃
┃   🔹 Prefix  : ${prefix}             ┃
┃   📦 Version : 1             ┃
┃                              ┃
┃   💎 Type ${prefix}menu to explore ┃
┃                              ┃
┃   📢 Official Channel        ┃
┃   ${channel}
┃                              ┃
┃       👑 ${creatorNames}      ┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`;

        const targets = [];
        const addTarget = value => {
            if (!value || typeof value !== "string") return;
            try {
                const normalized = jidNormalizedUser(value);
                if (normalized && !targets.includes(normalized)) targets.push(normalized);
            } catch {}
            if (!targets.includes(value)) targets.push(value);
        };

        addTarget(sock.user.id);
        addTarget(sock.user.lid);

        const phone = String(userId || "").replace(/\D/g, "");
        if (phone) addTarget(`${phone}@s.whatsapp.net`);

        console.log(`[WELCOME TARGETS] ${userId}: ${targets.join(", ")}`);

        await new Promise(resolve => setTimeout(resolve, 500));

        let sent = false;
        let lastError = null;

        for (let attempt = 1; attempt <= 3 && !sent; attempt++) {
            for (const target of targets) {
                try {
                    if (fs.existsSync(imagePath)) {
                        await sock.sendMessage(target, {
                            image: fs.readFileSync(imagePath),
                            caption
                        });
                    } else {
                        await sock.sendMessage(target, { text: caption });
                    }

                    // Send a separate voice/audio welcome immediately after the text/image card.
                    if (!fs.existsSync(audioPath)) {
                        throw new Error(`Welcome audio file missing: ${audioPath}`);
                    }

                    await sock.sendMessage(target, {
                        audio: fs.readFileSync(audioPath),
                        mimetype: "audio/ogg; codecs=opus",
                        ptt: false
                    });
                    console.log(`[WELCOME AUDIO] Sent successfully to ${target} for ${userId}`);

                    // Keep the existing welcome image/text and audio unchanged.
                    // The official channel promotion is sent separately 30 seconds
                    // after the welcome + audio have both been delivered.
                    scheduleChannelPromotion(userId, sock, target, 30000);

                    sent = true;
                    console.log(`[WELCOME] Sent successfully to ${target} for ${userId}`);
                    break;
                } catch (error) {
                    lastError = error;
                    console.warn(`[WELCOME] Send failed to ${target} (attempt ${attempt}): ${error.message}`);
                }
            }

            if (!sent && attempt < 3) {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        if (!sent) {
            throw lastError || new Error("Unable to deliver welcome message to paired account.");
        }

        fs.mkdirSync(path.dirname(markerPath), { recursive: true });
        fs.writeFileSync(markerPath, JSON.stringify({
            sentAt: new Date().toISOString(),
            version: WELCOME_VERSION,
            botVersion: "1.0.0"
        }, null, 2), "utf8");

        return true;

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

                    try {
                        ensureUserDashboardPassword(userId);
                    } catch (authError) {
                        console.error(`[DASHBOARD PASSWORD] ${userId}:`, authError.message);
                    }

                    console.log(
                        `[SESSION CONNECTED] ${userId}`
                    );


                    scheduleWelcomeMessage(
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
                            `[SESSION] ${userId} logged out; clearing local auth state`
                        );

                        const loggedOutPath = path.join(
                            config.SESSIONS_PATH,
                            userId
                        );

                        try {
                            if (fs.existsSync(loggedOutPath)) {
                                fs.rmSync(loggedOutPath, {
                                    recursive: true,
                                    force: true
                                });
                            }
                        } catch (cleanupError) {
                            console.error(
                                `[SESSION CLEANUP ERROR] ${userId}:`,
                                cleanupError.message
                            );
                        }

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

    const messages = messageUpdate?.messages || [];

    console.log(`[UPSERT] ${userId} type=${messageUpdate?.type || "unknown"} count=${messages.length}`);


    for (
        const msg
        of messages
    ) {

        try {

            if (!msg?.message) {

                continue;

            }


            /*
               FROM-ME / SELF-MESSAGE SUPPORT
               --------------------------------
               A command typed by the linked WhatsApp account is a legitimate
               command source. Older builds tried to prove that a fromMe
               message was the bot's self-chat by resolving LID <-> phone JIDs.
               That extra gate is fragile because WhatsApp can expose a self
               message as @lid, @s.whatsapp.net, or with an alternate JID.

               IMPORTANT: Baileys already marks the message with key.fromMe.
               For command processing we trust that flag and do not reject the
               command merely because a LID mapping is temporarily unavailable.
               This fixes the case where other users can run commands but the
               paired account itself is silently ignored.
            */
            const isFromMeMessage = Boolean(msg.key?.fromMe);

            if (isFromMeMessage) {
                const allowFromMe = config.PROCESS_FROM_ME !== false;

                if (!allowFromMe) {
                    console.log(`[FROM-ME IGNORED] ${userId} PROCESS_FROM_ME=false`);
                    continue;
                }

                const remoteJid = String(msg.key?.remoteJid || "").trim();
                const remoteJidAlt = String(msg.key?.remoteJidAlt || "").trim();

                console.log(
                    `[FROM-ME ACCEPTED] ${userId} remote=${remoteJid || "-"} alt=${remoteJidAlt || "-"} ` +
                    `own=${sock.user?.id || "-"} ownLid=${sock.user?.lid || "-"}`
                );
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


            if (!msg.key?.fromMe) {
                await handleAutoFeatures(
                    sock,
                    msg,
                    text
                );
            }


            if (text) {

                // A numeric reply belongs to an active .menu session.
                // Handle it before normal command parsing because "1" has
                // no command prefix.
                const handledMenuReply =
                    await handleNumericMenuReply(
                        sock,
                        userId,
                        msg,
                        text
                    );

                if (!handledMenuReply) {
                    await handleCommand(
                        sock,
                        userId,
                        msg,
                        text
                    );
                }

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
   HANDLE NUMERIC MENU REPLIES
========================================== */

async function handleNumericMenuReply(sock, userId, msg, text) {
    try {
        if (!menuSessionStore) return false;

        const value = String(text || "").trim();
        if (!/^\d{1,2}$/.test(value)) return false;

        const chatId = msg?.key?.remoteJid;
        if (!chatId) return false;

        // Menu sessions are stored by chat JID, which is stable for both
        // normal chats and the linked account's self-chat/LID chat.
        const session = menuSessionStore.getMenuSession(chatId);
        if (!session || session.type !== "main-menu") return false;

        const number = Number(value);
        const categories = Array.isArray(session.categories)
            ? session.categories
            : [];

        if (number < 1 || number > categories.length) {
            await sock.sendMessage(chatId, {
                text: `❌ Invalid menu number. Please reply with 1-${categories.length}.`
            }, { quoted: msg });
            return true;
        }

        const selectedCategory = String(categories[number - 1]);

        // Numeric replies are only for the main .menu. Once a category is
        // selected, remove the session so numbers inside that category do
        // not trigger another menu automatically.
        menuSessionStore.removeMenuSession(chatId);

        const menuCommand = await findCommand("menu");
        if (!menuCommand) {
            throw new Error("Menu command is not loaded");
        }

        const isFromMe = Boolean(msg.key?.fromMe);
        const sender = isFromMe
            ? (sock.user?.id || sock.user?.lid || msg.key?.participant || chatId || userId)
            : (msg.key?.participant || chatId || userId);

        const context = {
            sock,
            conn: sock,
            client: sock,
            wa: sock,
            msg,
            message: msg,
            m: msg,
            args: [String(number)],
            text: value,
            body: value,
            commandName: "menu",
            command: menuCommand.name,
            prefix: config.PREFIX || ".",
            prefixes: Array.isArray(config.PREFIXES) ? config.PREFIXES : [config.PREFIX || "."],
            sender,
            senderJid: isFromMe ? (msg.key?.participant || chatId || sender) : sender,
            from: chatId,
            chat: chatId,
            chatId,
            jid: chatId,
            userId,
            pushName: msg.pushName || msg.key?.pushName || "User",
            isGroup: chatId.endsWith("@g.us"),
            isFromMe,
            isOwner: isFromMe,
            selectedCategory,
            menuSession: session,
            quoted: msg.message?.extendedTextMessage?.contextInfo?.quotedMessage || null,
            quotedMessage: msg.message?.extendedTextMessage?.contextInfo?.quotedMessage || null,
            reply: async (message, options = {}) => {
                const content = typeof message === "string" ? { text: message } : message;
                return sock.sendMessage(chatId, content, { quoted: msg, ...options });
            },
            sendMessage: async (content, options = {}) => {
                return sock.sendMessage(chatId, content, { quoted: msg, ...options });
            },
            sendText: async message => {
                return sock.sendMessage(chatId, { text: String(message) }, { quoted: msg });
            },
            react: async emoji => sock.sendMessage(chatId, {
                react: { text: String(emoji), key: msg.key }
            }),
            sendReaction: async emoji => sock.sendMessage(chatId, {
                react: { text: String(emoji), key: msg.key }
            })
        };

        console.log(`[MENU REPLY] ${userId} chat=${chatId} number=${number} -> ${selectedCategory}`);

        if (typeof menuCommand.execute === "function") {
            await menuCommand.execute(context);
        } else if (typeof menuCommand.run === "function") {
            await menuCommand.run(context);
        } else if (typeof menuCommand.handler === "function") {
            await menuCommand.handler(context);
        } else {
            throw new Error("Menu command has no execution function");
        }

        return true;
    } catch (error) {
        console.error("[MENU REPLY ERROR]", error.stack || error.message);
        try {
            const chatId = msg?.key?.remoteJid;
            if (chatId) {
                await sock.sendMessage(chatId, {
                    text: `❌ Menu error: ${error.message}`
                }, { quoted: msg });
            }
        } catch (replyError) {
            console.error("[MENU REPLY ERROR SEND FAILED]", replyError.message);
        }
        return true;
    }
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
        const configuredPrefixes = Array.isArray(config.PREFIXES)
            ? config.PREFIXES
            : [config.PREFIX || "."];

        const prefixes = [...new Set(
            configuredPrefixes
                .map(p => String(p || "").trim())
                .filter(Boolean)
                .sort((a, b) => b.length - a.length)
        )];

        const normalizedText = String(text || "")
            .replace(/[\u200B-\u200D\uFEFF]/g, "")
            .trim();

        if (!normalizedText) return false;

        const prefix = prefixes.find(p => normalizedText.startsWith(p));
        if (!prefix) return false;

        const body = normalizedText.slice(prefix.length).trim();
        if (!body) return false;

        const parts = body.split(/\s+/);
        commandName = String(parts.shift() || "").toLowerCase();
        const args = parts;
        if (!commandName) return false;

        const chatId = msg?.key?.remoteJid;
        if (!chatId) return false;

        console.log(`[COMMAND DETECTED] ${userId} -> ${prefix}${commandName} | chat=${chatId} | fromMe=${Boolean(msg.key?.fromMe)}`);

        if (!commandLoader) {
            throw new Error("Command loader is unavailable");
        }

        if (!commandLoader.isLoaded?.()) {
            console.log("[COMMANDS] Registry empty; loading commands now...");
            await commandLoader.loadCommands();
        }

        const command = await findCommand(commandName);
        if (!command) {
            console.log(`[COMMAND] Unknown: ${commandName} | loaded=${commandLoader.getCommandCount?.() || 0}`);
            return false;
        }

        const isFromMe = Boolean(msg.key?.fromMe);

        // For self-chat/fromMe messages, WhatsApp may expose the chat JID as
        // our LID instead of our phone-number JID. Commands that perform
        // owner/admin checks need the actual account identity, not the chat
        // address. Prefer the authenticated account JID for fromMe messages.
        const sender = isFromMe
            ? (sock.user?.id || sock.user?.lid || msg.key?.participant || msg.key?.remoteJid || userId)
            : (msg.key?.participant || msg.key?.remoteJid || userId);

        const senderJid = isFromMe
            ? (msg.key?.participant || msg.key?.remoteJid || sender)
            : sender;

        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;

        const context = {
            sock,
            conn: sock,
            client: sock,
            wa: sock,
            msg,
            message: msg,
            m: msg,
            args,
            text: normalizedText,
            body,
            commandName,
            command: command.name,
            prefix,
            prefixes,
            sender,
            senderJid,
            from: chatId,
            chat: chatId,
            chatId,
            jid: chatId,
            userId,
            pushName: msg.pushName || msg.key?.pushName || "User",
            isGroup: chatId.endsWith("@g.us"),
            isFromMe,
            // A command typed by the authenticated account itself is always
            // treated as an owner-originated command. This is deliberately
            // limited to fromMe messages; ordinary users still go through
            // the normal command-specific permission checks.
            isOwner: isFromMe,
            quoted,
            quotedMessage: quoted,

            reply: async (message, options = {}) => {
                const content = typeof message === "string" ? { text: message } : message;
                return sock.sendMessage(chatId, content, { quoted: msg, ...options });
            },

            sendMessage: async (content, options = {}) => {
                return sock.sendMessage(chatId, content, { quoted: msg, ...options });
            },

            sendText: async message => {
                return sock.sendMessage(chatId, { text: String(message) }, { quoted: msg });
            },

            react: async emoji => {
                return sock.sendMessage(chatId, {
                    react: { text: String(emoji), key: msg.key }
                });
            },

            sendReaction: async emoji => {
                return sock.sendMessage(chatId, {
                    react: { text: String(emoji), key: msg.key }
                });
            }
        };

        console.log(`[COMMAND] Executing ${prefix}${commandName} (${command.name})`);

        // Use the command loader's own executor so execute/run/handler commands
        // all follow one consistent path.
        if (typeof commandLoader.executeCommand === "function") {
            const result = await commandLoader.executeCommand(commandName, context);
            if (!result?.success) {
                throw new Error(result?.error || `Command "${command.name}" failed`);
            }
        } else {
            const executor =
                typeof command.execute === "function" ? command.execute :
                typeof command.run === "function" ? command.run :
                typeof command.handler === "function" ? command.handler : null;

            if (!executor) throw new Error(`Command "${command.name}" has no execution function`);
            await executor(context);
        }

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
   GET ACTIVE SESSION SOCKET
========================================== */

function getSessionSocket(userId) {
    const normalized = String(userId || "").replace(/\D/g, "");
    return normalized ? (activeSessions.get(normalized) || null) : null;
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
   RESET SESSION FOR FRESH PAIRING
   Removes only local auth state and closes the
   current socket. It does NOT call sock.logout(),
   which avoids asking WhatsApp to invalidate a
   session that is already broken.
========================================== */

async function resetSession(userId) {
    if (!userId) return false;

    userId = String(userId).trim();
    if (!userId) return false;

    clearReconnectTimer(userId);
    pairingRequests.delete(userId);
    connectingSessions.delete(userId);

    const sock = activeSessions.get(userId);
    activeSessions.delete(userId);

    if (sock) {
        try {
            sock.ev?.removeAllListeners?.("connection.update");
            sock.ev?.removeAllListeners?.("messages.upsert");
            sock.ws?.close();
        } catch {}
    }

    const sessionPath = path.join(config.SESSIONS_PATH, userId);

    if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, {
            recursive: true,
            force: true
        });
    }

    console.log(`[SESSION RESET] ${userId}`);
    return true;
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

    console.log(`[BUILD] Drip Queen MD pairing-v2 + welcome-v2-audio loaded for ${userId}`);

    /*
       IMPORTANT: keep a persistent connection.update listener on the
       temporary pairing socket. The old V17 build only listened long enough
       to request the pairing code. After WhatsApp accepted the code, there
       was no persistent listener to promote the socket to an authenticated
       session or reconnect it after WhatsApp's restartRequired transition.
    */
    sock.ev.on("connection.update", async update => {
        const { connection, lastDisconnect } = update || {};

        if (connection === "connecting") {
            console.log(`[PAIRING CONNECTING] ${userId}`);
            return;
        }

        if (connection === "open") {
            connectingSessions.delete(userId);
            pairingRequests.delete(userId);
            clearReconnectTimer(userId);

            activeSessions.set(userId, sock);
            registerSession(userId, sock);

            console.log(`[PAIRING CONNECTED] ${userId}`);

            // Give WhatsApp a short moment to finish account initialization
            // before sending the welcome card/audio.
            scheduleWelcomeMessage(userId, sock);
            return;
        }

        if (connection === "close") {
            connectingSessions.delete(userId);
            activeSessions.delete(userId);

            const statusCode =
                lastDisconnect?.error?.output?.statusCode;

            console.log(
                `[PAIRING CLOSED] ${userId}: statusCode=${statusCode || "unknown"}`
            );

            if (statusCode === DisconnectReason.loggedOut) {
                pairingRequests.delete(userId);
                clearReconnectTimer(userId);

                const loggedOutPath = path.join(
                    config.SESSIONS_PATH,
                    userId
                );

                try {
                    if (fs.existsSync(loggedOutPath)) {
                        fs.rmSync(loggedOutPath, {
                            recursive: true,
                            force: true
                        });
                    }
                } catch (cleanupError) {
                    console.error(
                        `[PAIRING CLEANUP ERROR] ${userId}:`,
                        cleanupError.message
                    );
                }

                return;
            }

            // WhatsApp commonly closes the initial pairing socket with
            // restartRequired (515) after the phone accepts the code. The
            // credentials are saved by creds.update, so rebuild the normal
            // authenticated session from disk.
            if (config.AUTO_RECONNECT && !reconnectTimers.has(userId)) {
                const delay =
                    statusCode === DisconnectReason.restartRequired
                        ? 1000
                        : (Number(config.RECONNECT_DELAY) || 5000);

                console.log(
                    `[PAIRING RECONNECT] ${userId} in ${delay}ms`
                );

                const timer = setTimeout(async () => {
                    reconnectTimers.delete(userId);
                    pairingRequests.delete(userId);

                    try {
                        await connectSession(userId);
                    } catch (error) {
                        console.error(
                            `[PAIRING RECONNECT ERROR] ${userId}:`,
                            error.stack || error.message
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

    getSessionSocket,

    getActiveSessions:
        getSessions,


    removeSession,

    resetSession,

    deleteSession:
        removeSession,

    resetSessionForPairing:
        resetSession,


    shutdown,


    handleMessages,

    handleCommand,


    getMessageText,

    handleAutoFeatures

};