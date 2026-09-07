const fs = require("fs");
const path = require("path");

const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} = require("@whiskeysockets/baileys");

const pino = require("pino");

const config = require("../config");
const sessionManager = require("./session");


/* ==========================================
   PENDING PAIRING SESSIONS
========================================== */

const pendingSessions = new Map();


/* ==========================================
   NORMALIZE PHONE NUMBER
========================================== */

function normalizePhoneNumber(phoneNumber) {

    if (!phoneNumber) {

        return "";

    }

    return String(phoneNumber)
        .replace(/[^0-9]/g, "")
        .trim();

}


/* ==========================================
   CREATE NEW WHATSAPP SESSION
========================================== */

async function createNewSession(phoneNumber) {

    let sock = null;

    phoneNumber =
        normalizePhoneNumber(phoneNumber);


    try {

        if (!phoneNumber) {

            throw new Error(
                "Phone number is required"
            );

        }


        if (phoneNumber.length < 8) {

            throw new Error(
                "Invalid phone number"
            );

        }


        /* ======================================
           PREVENT DUPLICATE PAIRING REQUESTS
        ====================================== */

        const existingSession =
            pendingSessions.get(phoneNumber);


        if (existingSession) {

            if (existingSession.pairingCode) {

                return {

                    success: true,

                    phoneNumber,

                    pairingCode:
                        existingSession.pairingCode,

                    code:
                        existingSession.pairingCode

                };

            }

        }


        /* ======================================
           CREATE SESSION DIRECTORY
        ====================================== */

        const sessionPath =
            path.join(
                config.SESSIONS_PATH,
                phoneNumber
            );


        if (
            !fs.existsSync(
                sessionPath
            )
        ) {

            fs.mkdirSync(
                sessionPath,
                {
                    recursive: true
                }
            );

        }


        console.log(
            `[NEW SESSION] Creating pairing session for ${phoneNumber}`
        );


        /* ======================================
           LOAD BAILEYS VERSION
        ====================================== */

        const {
            version
        } =
            await fetchLatestBaileysVersion();


        /* ======================================
           LOAD AUTH STATE
        ====================================== */

        const {
            state,
            saveCreds
        } =
            await useMultiFileAuthState(
                sessionPath
            );


        /* ======================================
           CHECK EXISTING SESSION
        ====================================== */

        if (state.creds.registered) {

            throw new Error(
                "This WhatsApp number is already registered"
            );

        }


        /* ======================================
           CREATE WHATSAPP SOCKET
        ====================================== */

        sock =
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
                    "WHATSAPP BOT",

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


        /* ======================================
           SAVE CREDENTIAL UPDATES
        ====================================== */

        sock.ev.on(
            "creds.update",
            saveCreds
        );


        /* ======================================
           CREATE TEMPORARY PENDING ENTRY
        ====================================== */

        pendingSessions.set(
            phoneNumber,
            {

                sock,

                pairingCode:
                    null,

                sessionPath,

                createdAt:
                    Date.now(),

                completed:
                    false

            }
        );


        /* ======================================
           REQUEST PAIRING CODE
        ====================================== */

        let pairingCode =
            await sock.requestPairingCode(
                phoneNumber
            );


        pairingCode =
            formatPairingCode(
                pairingCode
            );


        const pendingSession =
            pendingSessions.get(
                phoneNumber
            );


        if (pendingSession) {

            pendingSession.pairingCode =
                pairingCode;

        }


        console.log(
            `[PAIRING CODE] ${phoneNumber}: ${pairingCode}`
        );


        /* ======================================
           CONNECTION EVENTS
        ====================================== */

        sock.ev.on(
            "connection.update",

            async update => {

                try {

                    const {

                        connection,

                        lastDisconnect

                    } = update;


                    /* ------------------------------
                       CONNECTING
                    ------------------------------ */

                    if (
                        connection ===
                        "connecting"
                    ) {

                        console.log(
                            `[PAIRING] Connecting ${phoneNumber}...`
                        );

                    }


                    /* ------------------------------
                       SUCCESSFULLY CONNECTED
                    ------------------------------ */

                    if (
                        connection ===
                        "open"
                    ) {

                        console.log(
                            `[SESSION CONNECTED] ${phoneNumber}`
                        );


                        const session =
                            pendingSessions.get(
                                phoneNumber
                            );


                        if (
                            session?.completed
                        ) {

                            return;

                        }


                        if (session) {

                            session.completed =
                                true;

                        }


                        /*
                           Remove pairing state.
                        */

                        pendingSessions.delete(
                            phoneNumber
                        );


                        console.log(
                            `[SESSION READY] ${phoneNumber}`
                        );


                        /*
                           The currently connected socket is valid,
                           but session.js manages restored/reconnected
                           sessions.

                           We attach message handling immediately
                           so commands work without waiting for restart.
                        */

                        if (
                            typeof sessionManager.handleMessages ===
                            "function"
                        ) {

                            sock.ev.on(

                                "messages.upsert",

                                async messageUpdate => {

                                    try {

                                        await sessionManager.handleMessages(

                                            sock,

                                            phoneNumber,

                                            messageUpdate

                                        );

                                    } catch (error) {

                                        console.error(
                                            `[NEW SESSION MESSAGE ERROR] ${phoneNumber}:`,
                                            error.message
                                        );

                                    }

                                }

                            );

                        }


                        console.log(
                            `[BOT ACTIVE] Commands enabled for ${phoneNumber}`
                        );


                        return;

                    }


                    /* ------------------------------
                       CONNECTION CLOSED
                    ------------------------------ */

                    if (
                        connection ===
                        "close"
                    ) {

                        const statusCode =
                            lastDisconnect
                                ?.error
                                ?.output
                                ?.statusCode;


                        console.log(
                            `[PAIRING SESSION CLOSED] ${phoneNumber}`
                        );


                        const session =
                            pendingSessions.get(
                                phoneNumber
                            );


                        pendingSessions.delete(
                            phoneNumber
                        );


                        /*
                           If authentication was completed,
                           credentials remain saved and
                           session.js can restore it later.
                        */

                        if (
                            state.creds.registered
                        ) {

                            console.log(
                                `[SESSION SAVED] ${phoneNumber}`
                            );

                            return;

                        }


                        /*
                           Remove incomplete session folder
                           if pairing failed before authentication.
                        */

                        if (
                            !session?.completed &&
                            fs.existsSync(sessionPath)
                        ) {

                            console.log(
                                `[PAIRING CLOSED] ${phoneNumber}`
                            );

                        }


                        if (statusCode) {

                            console.log(
                                `[PAIRING STATUS] ${phoneNumber}: ${statusCode}`
                            );

                        }

                    }

                } catch (error) {

                    console.error(
                        `[PAIRING CONNECTION ERROR] ${phoneNumber}:`,
                        error.message
                    );

                }

            }

        );


        /* ======================================
           RETURN PAIRING INFORMATION
        ====================================== */

        return {

            success:
                true,

            phoneNumber,

            pairingCode,

            code:
                pairingCode

        };


    } catch (error) {

        console.error(
            `[NEW SESSION ERROR] ${phoneNumber}:`,
            error.message
        );


        /* ======================================
           CLEAN FAILED SOCKET
        ====================================== */

        pendingSessions.delete(
            phoneNumber
        );


        if (sock) {

            try {

                sock.ws?.close();

            } catch (closeError) {}

        }


        throw error;

    }

}


/* ==========================================
   FORMAT PAIRING CODE
========================================== */

function formatPairingCode(code) {

    if (!code) {

        return null;

    }


    const cleanCode =
        String(code)
            .replace(/\s/g, "");


    /*
       WhatsApp pairing codes are usually
       returned as 8 characters.
    */

    if (
        cleanCode.length === 8
    ) {

        return (

            cleanCode.slice(0, 4) +

            "-" +

            cleanCode.slice(4)

        );

    }


    return cleanCode;

}


/* ==========================================
   GET PENDING SESSION
========================================== */

function getPendingSession(phoneNumber) {

    phoneNumber =
        normalizePhoneNumber(
            phoneNumber
        );


    return pendingSessions.get(
        phoneNumber
    ) || null;

}


/* ==========================================
   GET ALL PENDING SESSIONS
========================================== */

function getPendingSessions() {

    const sessions = [];


    for (
        const [
            phoneNumber,
            data
        ]
        of pendingSessions.entries()
    ) {

        sessions.push({

            phoneNumber,

            pairingCode:
                data.pairingCode,

            createdAt:
                data.createdAt

        });

    }


    return sessions;

}


/* ==========================================
   CANCEL PENDING SESSION
========================================== */

async function cancelPendingSession(
    phoneNumber
) {

    phoneNumber =
        normalizePhoneNumber(
            phoneNumber
        );


    const session =
        pendingSessions.get(
            phoneNumber
        );


    if (!session) {

        return false;

    }


    try {

        if (session.sock) {

            try {

                session.sock.ws?.close();

            } catch (error) {}

        }

    } finally {

        pendingSessions.delete(
            phoneNumber
        );

    }


    return true;

}


/* ==========================================
   CLEAN EXPIRED PENDING SESSIONS
========================================== */

function cleanExpiredSessions() {

    const MAX_AGE =
        10 * 60 * 1000;


    const now =
        Date.now();


    for (
        const [
            phoneNumber,
            session
        ]
        of pendingSessions.entries()
    ) {

        if (

            now - session.createdAt >
            MAX_AGE

        ) {

            console.log(
                `[PAIRING EXPIRED] ${phoneNumber}`
            );


            try {

                session.sock?.ws?.close();

            } catch (error) {}


            pendingSessions.delete(
                phoneNumber
            );

        }

    }

}


/* ==========================================
   AUTOMATIC CLEANUP
========================================== */

const cleanupInterval =
    setInterval(

        cleanExpiredSessions,

        5 * 60 * 1000

    );


/*
   Prevent this interval from keeping
   the Node.js process alive by itself.
*/

if (
    typeof cleanupInterval.unref ===
    "function"
) {

    cleanupInterval.unref();

}


/* ==========================================
   SHUTDOWN PENDING SESSIONS
========================================== */

async function shutdown() {

    for (
        const session
        of pendingSessions.values()
    ) {

        try {

            session.sock?.ws?.close();

        } catch (error) {}

    }


    pendingSessions.clear();


    clearInterval(
        cleanupInterval
    );

}


/* ==========================================
   EXPORT MODULE
========================================== */

module.exports = {

    createNewSession,


    startNewSession:
        createNewSession,


    createSession:
        createNewSession,


    generatePairingCode:
        createNewSession,


    formatPairingCode,


    getPendingSession,


    getPendingSessions,


    cancelPendingSession,


    cleanExpiredSessions,


    shutdown

};