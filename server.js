/* ==========================================
   DRIP QUEEN MD - SERVER
   CREATED BY NOX STAR TECH
========================================== */

require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");

const config = require("./config");


/* ==========================================
   CREATE EXPRESS APP
========================================== */

const app = express();


/* ==========================================
   GLOBAL VARIABLES
========================================== */

const startTime = Date.now();


/*
   WhatsApp connections will be stored here.

   This allows the dashboard to communicate
   with the bot system.
*/

global.botConnections =
    global.botConnections || new Map();


/* ==========================================
   MIDDLEWARE
========================================== */

app.use(
    express.json({
        limit: "50mb"
    })
);


app.use(
    express.urlencoded({
        extended: true,
        limit: "50mb"
    })
);


/* ==========================================
   CORS HEADERS
========================================== */

app.use((req, res, next) => {

    res.header(
        "Access-Control-Allow-Origin",
        "*"
    );

    res.header(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
    );

    res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
    );

    next();

});


/* ==========================================
   STATIC DASHBOARD FILES
========================================== */

const publicPath =
    path.join(
        __dirname,
        "public"
    );


app.use(
    express.static(publicPath)
);


/* ==========================================
   HEALTH CHECK
========================================== */

app.get(
    "/health",
    (req, res) => {

        res.status(200).json({

            status:
                "online",

            bot:
                config.BOT_NAME,

            version:
                config.BOT_VERSION,

            uptime:
                Math.floor(
                    (Date.now() - startTime) / 1000
                ),

            timestamp:
                new Date().toISOString()

        });

    }
);


/* ==========================================
   API STATUS
========================================== */

app.get(
    "/api/status",
    (req, res) => {

        const uptime =
            Math.floor(
                (Date.now() - startTime) / 1000
            );


        res.json({

            success:
                true,

            server:
                "online",

            botStatus:
                global.botStatus ||
                "starting",

            botName:
                config.BOT_NAME,

            version:
                config.BOT_VERSION,

            mode:
                config.MODE,

            prefix:
                config.PREFIX,

            uptime,

            connectedUsers:
                global.botConnections.size ||

                0,

            timestamp:
                Date.now()

        });

    }
);


/* ==========================================
   API BOT INFORMATION
========================================== */

app.get(
    "/api/info",
    (req, res) => {

        res.json({

            success:
                true,

            data: {

                botName:
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
                    config.MODE,

                nodeVersion:
                    process.version,

                platform:
                    process.platform

            }

        });

    }
);


/* ==========================================
   API SESSIONS
========================================== */

app.get(
    "/api/sessions",
    (req, res) => {

        const sessions = [];


        global.botConnections.forEach(
            (connection, number) => {

                sessions.push({

                    number,

                    status:

                        connection.status ||
                        "connected",

                    connectedAt:

                        connection.connectedAt ||
                        Date.now()

                });

            }
        );


        res.json({

            success:
                true,

            total:
                sessions.length,

            sessions

        });

    }
);


/* ==========================================
   API COMMANDS
========================================== */

app.get(
    "/api/commands",
    (req, res) => {

        const commandsPath =
            config.COMMANDS_PATH;


        const commands = [];


        try {

            if (
                fs.existsSync(
                    commandsPath
                )
            ) {

                const files =
                    fs.readdirSync(
                        commandsPath
                    );


                files
                    .filter(
                        file =>
                            file.endsWith(".js")
                    )
                    .forEach(
                        file => {

                            const name =
                                file
                                    .replace(
                                        ".js",
                                        ""
                                    );


                            commands.push({

                                name,

                                description:
                                    "DRIP QUEEN MD command"

                            });

                        }
                    );

            }

        }

        catch (error) {

            console.error(
                "Command API Error:",
                error.message
            );

        }


        res.json({

            success:
                true,

            total:
                commands.length,

            commands

        });

    }
);


/* ==========================================
   API AUTO FEATURES
========================================== */

app.get(
    "/api/features",
    (req, res) => {

        const defaultFeatures = {

            antilink:
                false,

            antidelete:
                false,

            autoreact:
                false,

            autoreply:
                false,

            autotyping:
                false,

            autorecording:
                false,

            welcome:
                false,

            goodbye:
                false

        };


        res.json({

            success:
                true,

            features:

                global.autoFeatures ||
                defaultFeatures

        });

    }
);


/* ==========================================
   UPDATE AUTO FEATURES
========================================== */

app.post(
    "/api/features",
    (req, res) => {

        const {

            setting,

            value

        } = req.body;


        if (!setting) {

            return res.status(400).json({

                success:
                    false,

                message:
                    "Feature setting is required."

            });

        }


        global.autoFeatures =
            global.autoFeatures || {};


        global.autoFeatures[
            setting
        ] = Boolean(value);


        console.log(
            `⚡ Feature Updated: ${setting} = ${value}`
        );


        res.json({

            success:
                true,

            message:
                `${setting} updated successfully.`,

            features:
                global.autoFeatures

        });

    }
);


/* ==========================================
   PAIRING PLACEHOLDER ROUTE

   The real pairing logic will be connected
   to Baileys in the next step.
========================================== */

app.post(
    "/api/pair",
    async (req, res) => {

        const {

            number

        } = req.body;


        if (!number) {

            return res.status(400).json({

                success:
                    false,

                message:
                    "WhatsApp number is required."

            });

        }


        const cleanNumber =
            String(number)
                .replace(/\D/g, "");


        if (
            cleanNumber.length < 8
        ) {

            return res.status(400).json({

                success:
                    false,

                message:
                    "Please enter a valid WhatsApp number with country code."

            });

        }


        /*
           Real Baileys pairing code
           will replace this section.
        */


        res.status(501).json({

            success:
                false,

            message:
                "Pairing system is being initialized. Connect the Baileys pairing handler next."

        });

    }
);


/* ==========================================
   DASHBOARD FALLBACK
========================================== */

app.get(
    "*",
    (req, res) => {

        const indexFile =
            path.join(
                publicPath,
                "index.html"
            );


        if (
            fs.existsSync(
                indexFile
            )
        ) {

            return res.sendFile(
                indexFile
            );

        }


        res.status(404).json({

            success:
                false,

            message:
                "Dashboard files not found."

        });

    }
);


/* ==========================================
   START SERVER FUNCTION
========================================== */

function startServer() {

    return new Promise(
        resolve => {

            const server =
                app.listen(

                    config.PORT,

                    config.HOST,

                    () => {

                        console.log("");

                        console.log(
                            "╔══════════════════════════════════════╗"
                        );

                        console.log(
                            `║ 👑 ${config.BOT_NAME}`
                        );

                        console.log(
                            "╠══════════════════════════════════════╣"
                        );

                        console.log(
                            `║ 🌐 Dashboard: http://localhost:${config.PORT}`
                        );

                        console.log(
                            `║ 🚀 Server Status: ONLINE`
                        );

                        console.log(
                            "╚══════════════════════════════════════╝"
                        );

                        console.log("");

                        resolve(server);

                    }

                );


            server.on(
                "error",

                error => {

                    console.error(
                        "❌ Server Error:",
                        error.message
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

    startServer,

    startTime

};