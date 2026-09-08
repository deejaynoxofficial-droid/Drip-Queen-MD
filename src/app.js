/* ==========================================
   DRIP QUEEN MD
   Main Application Server
   Creator: NOX STAR TECH
========================================== */

"use strict";


/* ==========================================
   MODULES
========================================== */

const express = require("express");
const path = require("path");
const fs = require("fs");


/* ==========================================
   CONFIG
========================================== */

const config = require("../config");


/* ==========================================
   BOT MODULES
========================================== */

const commandLoader =
    require("./commandLoader");


const sessionManager =
    require("./session");


const newSession =
    require("./newSession");


/* ==========================================
   EXPRESS APP
========================================== */

const app = express();


/* ==========================================
   START TIME
========================================== */

const startTime =
    Date.now();


/* ==========================================
   ENSURE REQUIRED DIRECTORIES
========================================== */

function ensureDirectories() {

    const directories = [

        config.COMMANDS_PATH,

        config.SESSIONS_PATH,

        config.DATABASE_PATH,

        config.TEMP_PATH,

        config.LOGS_PATH

    ];


    for (
        const directory
        of directories
    ) {

        try {

            if (
                !fs.existsSync(
                    directory
                )
            ) {

                fs.mkdirSync(
                    directory,
                    {
                        recursive:
                            true
                    }
                );


                console.log(
                    `[DIRECTORY CREATED] ${directory}`
                );

            }

        } catch (error) {

            console.error(
                `[DIRECTORY ERROR] ${directory}:`,
                error.message
            );

        }

    }

}


/* ==========================================
   ENSURE DATABASE FILES
========================================== */

function ensureDatabaseFiles() {

    try {

        /*
           USERS DATABASE
        */

        if (
            !fs.existsSync(
                config.USERS_DB
            )
        ) {

            fs.writeFileSync(

                config.USERS_DB,

                JSON.stringify(
                    {},
                    null,
                    4
                )

            );


            console.log(
                "[DATABASE] users.json created"
            );

        }


        /*
           SETTINGS DATABASE
        */

        if (
            !fs.existsSync(
                config.SETTINGS_DB
            )
        ) {

            const defaultSettings = {

                features: {

                    autoRead:
                        false,

                    autoTyping:
                        false,

                    autoRecording:
                        false,

                    alwaysOnline:
                        false,

                    autoReact:
                        false

                }

            };


            fs.writeFileSync(

                config.SETTINGS_DB,

                JSON.stringify(
                    defaultSettings,
                    null,
                    4
                )

            );


            console.log(
                "[DATABASE] settings.json created"
            );

        }

    } catch (error) {

        console.error(
            "[DATABASE INITIALIZATION ERROR]",
            error.message
        );

    }

}


/* ==========================================
   EXPRESS MIDDLEWARE
========================================== */

app.use(
    express.json({
        limit:
            "10mb"
    })
);


app.use(
    express.urlencoded({

        extended:
            true,

        limit:
            "10mb"

    })
);


/* ==========================================
   STATIC FILES
========================================== */

/*
   Expected structure:

   public/
       index.html
       css/
       js/
       images/
*/


const publicPath =
    path.join(
        config.ROOT_DIR,
        "public"
    );


if (
    fs.existsSync(
        publicPath
    )
) {

    app.use(
        express.static(
            publicPath
        )
    );

}

else {

    console.warn(
        `[WARNING] Public folder not found: ${publicPath}`
    );

}


/* ==========================================
   HOME ROUTE
========================================== */

app.get(
    "/",

    (req, res) => {

        const indexPath =
            path.join(
                publicPath,
                "index.html"
            );


        if (
            fs.existsSync(
                indexPath
            )
        ) {

            return res.sendFile(
                indexPath
            );

        }


        return res.status(404).json({

            success:
                false,

            error:
                "Dashboard index.html not found"

        });

    }

);


/* ==========================================
   API STATUS
========================================== */

app.get(
    "/api/status",

    (req, res) => {

        const sessions =
            sessionManager.getSessions();


        res.json({

            success:
                true,

            status:
                "online",


            botName:
                config.BOT_NAME,


            version:
                config.BOT_VERSION,


            creator:
                config.CREATOR,


            mode:
                config.MODE,


            uptime:
                Math.floor(
                    (
                        Date.now() -
                        startTime
                    ) / 1000
                ),


            activeSessions:
                sessions.length,


            timestamp:
                new Date()
                    .toISOString()

        });

    }

);


/* ==========================================
   GET ACTIVE SESSIONS
========================================== */

app.get(
    "/api/sessions",

    (req, res) => {

        try {

            const sessions =
                sessionManager.getSessions();


            res.json({

                success:
                    true,

                sessions,

                count:
                    sessions.length

            });

        } catch (error) {

            console.error(
                "[GET SESSIONS ERROR]",
                error.message
            );


            res.status(500).json({

                success:
                    false,

                error:
                    "Failed to load sessions"

            });

        }

    }

);


/* ==========================================
   REMOVE SESSION
========================================== */

app.delete(
    "/api/sessions/:userId",

    async (req, res) => {

        try {

            const userId =
                req.params.userId;


            if (!userId) {

                return res.status(400).json({

                    success:
                        false,

                    error:
                        "Session user ID is required"

                });

            }


            const removed =
                await sessionManager.removeSession(
                    userId
                );


            if (!removed) {

                return res.status(404).json({

                    success:
                        false,

                    error:
                        "Session not found"

                });

            }


            return res.json({

                success:
                    true,

                message:
                    "Session removed successfully"

            });

        } catch (error) {

            console.error(
                "[REMOVE SESSION API ERROR]",
                error.message
            );


            return res.status(500).json({

                success:
                    false,

                error:
                    error.message

            });

        }

    }

);


/* ==========================================
   CREATE PAIRING SESSION
========================================== */

app.post(
    "/api/pair",

    async (req, res) => {

        try {

            const phoneNumber =
                req.body?.phoneNumber;


            if (!phoneNumber) {

                return res.status(400).json({

                    success:
                        false,

                    error:
                        "Phone number is required"

                });

            }


            console.log(
                `[API PAIR REQUEST] ${phoneNumber}`
            );


            const result =
                await newSession.createNewSession(
                    phoneNumber
                );


            return res.json({

                success:
                    true,

                phoneNumber:
                    result.phoneNumber,

                pairingCode:
                    result.pairingCode,

                code:
                    result.code

            });

        } catch (error) {

            console.error(
                "[PAIRING API ERROR]",
                error.message
            );


            return res.status(500).json({

                success:
                    false,

                error:
                    error.message ||
                    "Failed to generate pairing code"

            });

        }

    }

);


/* ==========================================
   GET COMMANDS
========================================== */

app.get(
    "/api/commands",

    (req, res) => {

        try {

            const commands =
                commandLoader.getCommands();


            const categories =
                commandLoader.getCategories();


            res.json({

                success:
                    true,

                commands,

                count:
                    commands.length,

                categories

            });

        } catch (error) {

            console.error(
                "[COMMANDS API ERROR]",
                error.message
            );


            res.status(500).json({

                success:
                    false,

                error:
                    "Failed to load commands"

            });

        }

    }

);


/* ==========================================
   RELOAD COMMANDS
========================================== */

app.post(
    "/api/commands/reload",

    async (req, res) => {

        try {

            const commands =
                await commandLoader.reloadCommands();


            res.json({

                success:
                    true,

                message:
                    "Commands reloaded successfully",

                count:
                    commands.length

            });

        } catch (error) {

            console.error(
                "[COMMAND RELOAD ERROR]",
                error.message
            );


            res.status(500).json({

                success:
                    false,

                error:
                    error.message

            });

        }

    }

);


/* ==========================================
   GET SETTINGS
========================================== */

app.get(
    "/api/settings",

    (req, res) => {

        try {

            if (
                !fs.existsSync(
                    config.SETTINGS_DB
                )
            ) {

                return res.json({

                    success:
                        true,

                    settings:
                        {}

                });

            }


            const content =
                fs.readFileSync(

                    config.SETTINGS_DB,

                    "utf8"

                );


            const settings =
                content.trim()

                    ? JSON.parse(
                        content
                    )

                    : {};


            res.json({

                success:
                    true,

                settings

            });

        } catch (error) {

            console.error(
                "[GET SETTINGS ERROR]",
                error.message
            );


            res.status(500).json({

                success:
                    false,

                error:
                    "Failed to load settings"

            });

        }

    }

);


/* ==========================================
   UPDATE SETTINGS
========================================== */

app.post(
    "/api/settings",

    (req, res) => {

        try {

            const currentSettings =
                readSettings();


            const newSettings = {

                ...currentSettings,

                ...req.body

            };


            saveSettings(
                newSettings
            );


            res.json({

                success:
                    true,

                settings:
                    newSettings

            });

        } catch (error) {

            console.error(
                "[UPDATE SETTINGS ERROR]",
                error.message
            );


            res.status(500).json({

                success:
                    false,

                error:
                    "Failed to update settings"

            });

        }

    }

);


/* ==========================================
   GET AUTO FEATURES
========================================== */

app.get(
    "/api/features",

    (req, res) => {

        try {

            const settings =
                readSettings();


            res.json({

                success:
                    true,

                features:
                    settings.features || {}

            });

        } catch (error) {

            console.error(
                "[GET FEATURES ERROR]",
                error.message
            );


            res.status(500).json({

                success:
                    false,

                error:
                    "Failed to load features"

            });

        }

    }

);


/* ==========================================
   UPDATE SINGLE FEATURE
========================================== */

app.post(
    "/api/features/:featureName",

    (req, res) => {

        try {

            const featureName =
                req.params.featureName;


            const enabled =
                Boolean(
                    req.body?.enabled
                );


            if (!featureName) {

                return res.status(400).json({

                    success:
                        false,

                    error:
                        "Feature name is required"

                });

            }


            const settings =
                readSettings();


            if (
                !settings.features ||
                typeof settings.features !==
                "object"
            ) {

                settings.features = {};

            }


            settings.features[
                featureName
            ] = enabled;


            saveSettings(
                settings
            );


            console.log(
                `[FEATURE UPDATED] ${featureName}: ${enabled}`
            );


            return res.json({

                success:
                    true,

                feature:
                    featureName,

                enabled

            });

        } catch (error) {

            console.error(
                "[UPDATE FEATURE ERROR]",
                error.message
            );


            return res.status(500).json({

                success:
                    false,

                error:
                    "Failed to update feature"

            });

        }

    }

);


/* ==========================================
   READ SETTINGS HELPER
========================================== */

function readSettings() {

    try {

        if (
            !fs.existsSync(
                config.SETTINGS_DB
            )
        ) {

            return {

                features: {}

            };

        }


        const content =
            fs.readFileSync(

                config.SETTINGS_DB,

                "utf8"

            );


        if (
            !content.trim()
        ) {

            return {

                features: {}

            };

        }


        return JSON.parse(
            content
        );

    } catch (error) {

        console.error(
            "[READ SETTINGS ERROR]",
            error.message
        );


        return {

            features: {}

        };

    }

}


/* ==========================================
   SAVE SETTINGS HELPER
========================================== */

function saveSettings(settings) {

    fs.writeFileSync(

        config.SETTINGS_DB,

        JSON.stringify(

            settings,

            null,

            4

        )

    );

}


/* ==========================================
   HEALTH CHECK
========================================== */

app.get(
    "/health",

    (req, res) => {

        res.status(200).json({

            status:
                "ok",

            bot:
                config.BOT_NAME,

            uptime:
                Math.floor(
                    process.uptime()
                )

        });

    }

);


/* ==========================================
   API 404 HANDLER
========================================== */

app.use(
    "/api",

    (req, res) => {

        res.status(404).json({

            success:
                false,

            error:
                "API endpoint not found"

        });

    }

);


/* ==========================================
   START APPLICATION
========================================== */

async function startApplication() {

    try {

        console.log(
            ""
        );


        console.log(
            "=========================================="
        );


        console.log(
            `   ${config.BOT_NAME}`
        );


        console.log(
            `   Version: ${config.BOT_VERSION}`
        );


        console.log(
            `   Creator: ${config.CREATOR}`
        );


        console.log(
            "=========================================="
        );


        /*
           Create directories.
        */

        ensureDirectories();


        /*
           Create database files.
        */

        ensureDatabaseFiles();


        /*
           Load commands.
        */

        console.log(
            "[STARTUP] Loading commands..."
        );


        await commandLoader.loadCommands();


        /*
           Restore saved sessions.
        */

        console.log(
            "[STARTUP] Restoring WhatsApp sessions..."
        );


        await sessionManager.restoreSessions();


        /*
           Start server.
        */

        const server =
            app.listen(

                config.PORT,

                config.HOST,

                () => {

                    console.log(
                        ""
                    );


                    console.log(
                        "=========================================="
                    );


                    console.log(
                        `[SERVER ONLINE] http://${config.HOST}:${config.PORT}`
                    );


                    console.log(
                        `[DASHBOARD] Port ${config.PORT}`
                    );


                    console.log(
                        `[MODE] ${config.MODE}`
                    );


                    console.log(
                        "=========================================="
                    );


                    console.log(
                        ""
                    );

                }

            );


        /*
           Server error handling.
        */

        server.on(
            "error",

            error => {

                console.error(
                    "[SERVER ERROR]",
                    error.message
                );

            }

        );


        return server;


    } catch (error) {

        console.error(
            "[STARTUP ERROR]",
            error
        );


        process.exit(
            1
        );

    }

}


/* ==========================================
   GRACEFUL SHUTDOWN
========================================== */

async function gracefulShutdown(
    signal
) {

    console.log(
        ""
    );


    console.log(
        `[SHUTDOWN] ${signal} received`
    );


    try {

        await sessionManager.shutdown();


        console.log(
            "[SHUTDOWN] All sessions closed"
        );


    } catch (error) {

        console.error(
            "[SHUTDOWN ERROR]",
            error.message
        );

    }


    process.exit(
        0
    );

}


process.on(

    "SIGINT",

    () => {

        gracefulShutdown(
            "SIGINT"
        );

    }

);


process.on(

    "SIGTERM",

    () => {

        gracefulShutdown(
            "SIGTERM"
        );

    }

);


/* ==========================================
   UNHANDLED ERRORS
========================================== */

process.on(

    "unhandledRejection",

    error => {

        console.error(
            "[UNHANDLED REJECTION]",
            error
        );

    }

);


process.on(

    "uncaughtException",

    error => {

        console.error(
            "[UNCAUGHT EXCEPTION]",
            error
        );

    }

);


/* ==========================================
   START ONLY WHEN RUN DIRECTLY
========================================== */

if (
    require.main === module
) {

    startApplication();

}


/* ==========================================
   EXPORT
========================================== */

module.exports = {

    app,

    startApplication,

    readSettings,

    saveSettings

};
