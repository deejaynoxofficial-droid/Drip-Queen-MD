/* ==========================================
   DRIP QUEEN MD - WHATSAPP CONNECTION
   CREATED BY NOX STAR TECH
========================================== */

require("dotenv").config();


/* ==========================================
   IMPORTS
========================================== */

const fs = require("fs");
const path = require("path");
const pino = require("pino");


let baileysModule = null;

async function loadBaileys() {
    if (!baileysModule) {
        baileysModule = await import("@whiskeysockets/baileys");
    }
    return baileysModule;
}


const config = require(
    "../config"
);


/* ==========================================
   GLOBAL CONNECTION STORAGE
========================================== */

global.botConnections =
    global.botConnections ||
    new Map();


global.pairingRequests =
    global.pairingRequests ||
    new Map();


/* ==========================================
   CREATE SESSION DIRECTORY
========================================== */

function getSessionPath(number) {

    const cleanNumber =
        String(number)
            .replace(/\D/g, "");


    return path.join(

        config.SESSIONS_PATH,

        cleanNumber

    );

}


/* ==========================================
   CREATE WHATSAPP CONNECTION
========================================== */

async function createConnection(number) {

    const {
        default: makeWASocket,
        useMultiFileAuthState,
        DisconnectReason,
        fetchLatestBaileysVersion,
        makeCacheableSignalKeyStore
    } = await loadBaileys();

    const cleanNumber =
        String(number)
            .replace(/\D/g, "");


    if (!cleanNumber) {

        throw new Error(
            "Invalid WhatsApp number."
        );

    }


    /*
       Prevent duplicate connections.
    */

    if (
        global.botConnections.has(
            cleanNumber
        )
    ) {

        const existing =
            global.botConnections.get(
                cleanNumber
            );


        if (
            existing?.socket
        ) {

            return existing;

        }

    }


    const sessionPath =
        getSessionPath(
            cleanNumber
        );


    /*
       Create session folder.
    */

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


    /* ==========================================
       BAILEYS AUTH STATE
    ========================================== */

    const {

        state,

        saveCreds

    } = await useMultiFileAuthState(
        sessionPath
    );


    /* ==========================================
       BAILEYS VERSION
    ========================================== */

    const {

        version

    } = await fetchLatestBaileysVersion();


    /* ==========================================
       CREATE SOCKET
    ========================================== */

    const socket =
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


            printQRInTerminal:
                false,


            browser:

                [
                    config.BOT_NAME,

                    "Chrome",

                    "1.0.0"
                ],


            logger:

                pino({
                    level: "silent"
                }),

/*
            Generate high quality connection
            behavior.
*/

            markOnlineOnConnect:
                false,


            syncFullHistory:
                false


        });


    /* ==========================================
       CONNECTION OBJECT
    ========================================== */

    const connection = {

        number:
            cleanNumber,

        socket,

        status:
            "connecting",

        connectedAt:
            null,

        sessionPath

    };


    global.botConnections.set(

        cleanNumber,

        connection

    );


    /* ==========================================
       SAVE CREDENTIALS
    ========================================== */

    socket.ev.on(

        "creds.update",

        saveCreds

    );


    /* ==========================================
       CONNECTION STATUS
    ========================================== */

    socket.ev.on(

        "connection.update",

        async update => {

            const {

                connection:
                    connectionStatus,

                lastDisconnect

            } = update;


            /* ======================================
               CONNECTED
            ====================================== */

            if (
                connectionStatus ===
                "open"
            ) {

                connection.status =
                    "connected";


                connection.connectedAt =
                    Date.now();


                global.botConnections.set(

                    cleanNumber,

                    connection

                );


                console.log(
                    `✅ WhatsApp Connected: ${cleanNumber}`
                );


                /*
                   Update global bot status.
                */

                global.botStatus =
                    "online";

            }


            /* ======================================
               CONNECTING
            ====================================== */

            if (
                connectionStatus ===
                "connecting"
            ) {

                connection.status =
                    "connecting";

            }


            /* ======================================
               CONNECTION CLOSED
            ====================================== */

            if (
                connectionStatus ===
                "close"
            ) {

                connection.status =
                    "disconnected";


                let statusCode;


                try {

                    statusCode =
                        lastDisconnect
                            ?.error
                            ?.output
                            ?.statusCode;

                }

                catch {

                    statusCode =
                        0;

                }


                /*
                   Check logout.
                */

                const loggedOut =

                    statusCode ===
                    DisconnectReason.loggedOut;


                if (loggedOut) {

                    console.log(
                        `❌ Session Logged Out: ${cleanNumber}`
                    );


                    global.botConnections.delete(
                        cleanNumber
                    );


                    return;

                }


                /*
                   Auto reconnect.
                */

                if (
                    config.AUTO_RECONNECT
                ) {

                    console.log(
                        `🔄 Reconnecting: ${cleanNumber}`
                    );


                    setTimeout(

                        () => {

                            createConnection(
                                cleanNumber
                            )

                                .catch(
                                    error => {

                                        console.error(
                                            "Reconnect Error:",
                                            error.message
                                        );

                                    }
                                );

                        },

                        config.RECONNECT_DELAY

                    );

                }

            }

        }

    );


    return connection;

}


/* ==========================================
   GENERATE PAIRING CODE
========================================== */

async function generatePairingCode(number) {

    const cleanNumber =
        String(number)
            .replace(/\D/g, "");


    if (
        cleanNumber.length < 8
    ) {

        throw new Error(
            "Please enter a valid WhatsApp number with country code."
        );

    }


    console.log(
        `🔑 Generating pairing code for ${cleanNumber}`
    );


    /*
       Create WhatsApp connection.
    */

    const connection =
        await createConnection(
            cleanNumber
        );


    const socket =
        connection.socket;


    /*
       Wait briefly for socket initialization.
    */

    await new Promise(
        resolve =>

            setTimeout(
                resolve,
                1500
            )
    );


    /*
       Check whether already registered.
    */

    const registered =
        await socket.onWhatsApp(
            `${cleanNumber}@s.whatsapp.net`
        );


    if (
        !registered ||
        !registered[0]?.exists
    ) {

        throw new Error(
            "This WhatsApp number is not registered."
        );

    }


    /*
       Request pairing code.
    */

    const pairingCode =
        await socket.requestPairingCode(
            cleanNumber
        );


    /*
       Store pairing request.
    */

    global.pairingRequests.set(

        cleanNumber,

        {

            code:
                pairingCode,

            createdAt:
                Date.now(),

            status:
                "pending"

        }

    );


    console.log(
        `🔐 Pairing Code Generated: ${cleanNumber}`
    );


    return {

        number:
            cleanNumber,

        code:
            pairingCode

    };

}


/* ==========================================
   DISCONNECT SESSION
========================================== */

async function disconnectSession(number) {

    const cleanNumber =
        String(number)
            .replace(/\D/g, "");


    const connection =
        global.botConnections.get(
            cleanNumber
        );


    if (!connection) {

        throw new Error(
            "Session not found."
        );

    }


    try {

        await connection.socket.logout();

    }

    catch (error) {

        console.error(
            "Logout Error:",
            error.message
        );

    }


    global.botConnections.delete(
        cleanNumber
    );


    return true;

}


/* ==========================================
   GET ALL SESSIONS
========================================== */

function getSessions() {

    const sessions = [];


    global.botConnections.forEach(

        (
            connection,
            number
        ) => {

            sessions.push({

                number,

                status:
                    connection.status,

                connectedAt:
                    connection.connectedAt

            });

        }

    );


    return sessions;

}


/* ==========================================
   CHECK SESSION
========================================== */

function getSession(number) {

    const cleanNumber =
        String(number)
            .replace(/\D/g, "");


    return (
        global.botConnections.get(
            cleanNumber
        ) || null
    );

}


/* ==========================================
   EXPORT
========================================== */

module.exports = {

    createConnection,

    generatePairingCode,

    disconnectSession,

    getSessions,

    getSession,

    getSessionPath

};