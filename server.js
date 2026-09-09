/* ==========================================
   DRIP QUEEN MD - DASHBOARD SERVER
   CREATED BY NOX STAR TECH
========================================== */

require("dotenv").config();


/* ==========================================
   IMPORTS
========================================== */

const express = require("express");

const path = require("path");

const fs = require("fs");


const config = require(
    "./config"
);


const {
    generatePairingCode,

    getSessions,

    disconnectSession

} = require(
    "./lib/whatsapp"
);


/* ==========================================
   EXPRESS APP
========================================== */

const app = express();


/* ==========================================
   GLOBAL BOT STATUS
========================================== */

global.botStatus =
    global.botStatus ||
    "starting";


global.autoFeatures =
    global.autoFeatures ||
    {

        antilink: false,

        antidelete: false,

        autoreact: false,

        autoreply: false,

        autotyping: false,

        autorecording: false,

        welcome: false,

        goodbye: false

    };


/* ==========================================
   MIDDLEWARE
========================================== */

app.use(
    express.json()
);


app.use(
    express.urlencoded({

        extended: true

    })
);


/* ==========================================
   STATIC DASHBOARD
========================================== */

app.use(

    express.static(

        path.join(
            __dirname,
            "public"
        )

    )

);


/* ==========================================
   START TIME
========================================== */

const startTime =
    Date.now();


/* ==========================================
   HELPER - FORMAT UPTIME
========================================== */

function formatUptime() {

    const seconds =
        Math.floor(

            (
                Date.now() -
                startTime
            ) / 1000

        );


    const days =
        Math.floor(
            seconds / 86400
        );


    const hours =
        Math.floor(
            (
                seconds % 86400
            ) / 3600
        );


    const minutes =
        Math.floor(
            (
                seconds % 3600
            ) / 60
        );


    const remainingSeconds =
        seconds % 60;


    if (days > 0) {

        return `${days}d ${hours}h`;

    }


    if (hours > 0) {

        return `${hours}h ${minutes}m`;

    }


    if (minutes > 0) {

        return `${minutes}m ${remainingSeconds}s`;

    }


    return `${remainingSeconds}s`;

}


/* ==========================================
   HELPER - GET COMMANDS
========================================== */

function getCommands() {

    const commandsPath =
        config.COMMANDS_PATH;


    const commands = [];


    try {

        if (
            !fs.existsSync(
                commandsPath
            )
        ) {

            return commands;

        }


        const files =
            fs.readdirSync(
                commandsPath
            );


        files.forEach(
            file => {

                if (
                    !file.endsWith(".js")
                ) {

                    return;

                }


                const commandName =
                    file.replace(
                        ".js",
                        ""
                    );


                commands.push({

                    name:
                        commandName,

                    description:
                        "DRIP QUEEN MD command",

                    file

                });

            }
        );

    }

    catch (error) {

        console.error(
            "Command Scan Error:",
            error.message
        );

    }


    return commands;

}


/* ==========================================
   HOME ROUTE
========================================== */

app.get(

    "/",

    (
        req,
        res
    ) => {

        res.sendFile(

            path.join(

                __dirname,

                "public",

                "index.html"

            )

        );

    }

);


/* ==========================================
   API - SERVER STATUS
========================================== */

app.get(

    "/api/status",

    (
        req,
        res
    ) => {

        const sessions =
            getSessions();


        res.json({

            success: true,


            status:

                global.botStatus ===
                "online"

                    ? "online"

                    : "offline",


            bot:

                config.BOT_NAME,


            version:

                config.BOT_VERSION,


            users:

                sessions.length,


            commands:

                getCommands().length,


            uptime:

                formatUptime(),


            timestamp:

                Date.now()

        });

    }

);


/* ==========================================
   API - GENERATE PAIRING CODE
========================================== */

app.post(

    "/api/pair",

    async (
        req,
        res
    ) => {

        try {

            let {

                number

            } = req.body;


            /* ==============================
               VALIDATE NUMBER
            ============================== */

            if (!number) {

                return res.status(400).json({

                    success: false,

                    message:
                        "WhatsApp number is required."

                });

            }


            /*
               Remove spaces, + and symbols.
            */

            number =
                String(number)
                    .replace(/\D/g, "");


            if (
                number.length < 8
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Please enter a valid number with country code."

                });

            }


            console.log(
                `🔑 Pairing request: ${number}`
            );


            /* ==============================
               GENERATE CODE
            ============================== */

            const result =
                await generatePairingCode(
                    number
                );


            return res.json({

                success: true,

                message:
                    "Pairing code generated successfully.",

                number:
                    result.number,

                code:
                    result.code

            });

        }

        catch (error) {

            console.error(
                "Pairing API Error:",
                error.message
            );


            return res.status(500).json({

                success: false,

                message:

                    error.message ||

                    "Failed to generate pairing code."

            });

        }

    }

);


/* ==========================================
   API - GET ALL SESSIONS
========================================== */

app.get(

    "/api/sessions",

    (
        req,
        res
    ) => {

        try {

            const sessions =
                getSessions();


            res.json({

                success: true,

                total:
                    sessions.length,

                sessions

            });

        }

        catch (error) {

            res.status(500).json({

                success: false,

                message:
                    "Failed to load sessions."

            });

        }

    }

);


/* ==========================================
   API - DISCONNECT SESSION
========================================== */

app.delete(

    "/api/sessions/:number",

    async (
        req,
        res
    ) => {

        try {

            const number =
                String(
                    req.params.number
                )
                    .replace(/\D/g, "");


            if (!number) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid session number."

                });

            }


            console.log(
                `🔌 Disconnecting: ${number}`
            );


            await disconnectSession(
                number
            );


            return res.json({

                success: true,

                message:
                    "Session disconnected successfully."

            });

        }

        catch (error) {

            console.error(
                "Disconnect Error:",
                error.message
            );


            return res.status(500).json({

                success: false,

                message:

                    error.message ||

                    "Failed to disconnect session."

            });

        }

    }

);


/* ==========================================
   API - GET COMMANDS
========================================== */

app.get(

    "/api/commands",

    (
        req,
        res
    ) => {

        try {

            const commands =
                getCommands();


            res.json({

                success: true,

                total:
                    commands.length,

                commands

            });

        }

        catch (error) {

            res.status(500).json({

                success: false,

                commands: []

            });

        }

    }

);


/* ==========================================
   API - GET AUTO FEATURES
========================================== */

app.get(

    "/api/features",

    (
        req,
        res
    ) => {

        res.json({

            success: true,

            features:
                global.autoFeatures

        });

    }

);


/* ==========================================
   API - UPDATE AUTO FEATURE
========================================== */

app.post(

    "/api/features",

    (
        req,
        res
    ) => {

        try {

            const {

                feature,

                enabled

            } = req.body;


            if (!feature) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Feature name is required."

                });

            }


            /*
               Check if feature exists.
            */

            if (

                !Object.prototype.hasOwnProperty.call(

                    global.autoFeatures,

                    feature

                )

            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid feature."

                });

            }


            global.autoFeatures[
                feature
            ] =
                Boolean(enabled);


            console.log(

                `⚡ Feature Updated: ${feature} = ${enabled}`

            );


            return res.json({

                success: true,

                feature,

                enabled:
                    global.autoFeatures[
                        feature
                    ]

            });

        }

        catch (error) {

            return res.status(500).json({

                success: false,

                message:
                    "Failed to update feature."

            });

        }

    }

);


/* ==========================================
   API - SETTINGS
========================================== */

app.get(

    "/api/settings",

    (
        req,
        res
    ) => {

        res.json({

            success: true,


            bot: {

                name:
                    config.BOT_NAME,

                version:
                    config.BOT_VERSION,

                creator:
                    config.CREATOR,

                creatorName:
                    config.CREATOR_NAME,

                prefix:
                    config.PREFIX,

                mode:
                    config.MODE

            },


            system: {

                node:
                    process.version,

                platform:
                    process.platform,

                database:

                    fs.existsSync(
                        config.DATABASE_PATH
                    )

                        ? "Connected"

                        : "Not Found",


                dashboard:
                    "Active"

            }

        });

    }

);


/* ==========================================
   API - SERVER INFORMATION
========================================== */

app.get(

    "/api/info",

    (
        req,
        res
    ) => {

        const sessions =
            getSessions();


        res.json({

            success: true,


            server: {

                status:
                    global.botStatus,

                uptime:
                    formatUptime(),

                users:
                    sessions.length,

                port:
                    config.PORT

            },


            bot: {

                name:
                    config.BOT_NAME,

                version:
                    config.BOT_VERSION

            }

        });

    }

);


/* ==========================================
   404 API HANDLER
========================================== */

app.use(

    "/api",

    (
        req,
        res
    ) => {

        res.status(404).json({

            success: false,

            message:
                "API endpoint not found."

        });

    }

);


/* ==========================================
   START SERVER
========================================== */

function startServer() {

    return new Promise(

        resolve => {

            app.listen(

                config.PORT,

                config.HOST,

                () => {

                    console.log("");

                    console.log(
                        "══════════════════════════════════════"
                    );

                    console.log(
                        `👑 ${config.BOT_NAME}`
                    );

                    console.log(
                        "🌐 Dashboard Server Started"
                    );

                    console.log(
                        `📡 Host: ${config.HOST}`
                    );

                    console.log(
                        `🔌 Port: ${config.PORT}`
                    );

                    console.log(
                        `🔗 http://localhost:${config.PORT}`
                    );

                    console.log(
                        "══════════════════════════════════════"
                    );

                    console.log("");


                    global.botStatus =
                        "online";


                    resolve(
                        app
                    );

                }

            );

        }

    );

}


/* ==========================================
   EXPORT
========================================== */

module.exports = {

    app,

    startServer

};