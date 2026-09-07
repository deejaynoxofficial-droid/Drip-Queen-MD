const express = require("express");
const path = require("path");
const fs = require("fs");

const config = require("../config");


/* ==========================================
   SAFE MODULE LOADER
========================================== */

function safeRequire(modulePath) {

    try {

        return require(modulePath);

    } catch (error) {

        console.log(
            `[DASHBOARD] Could not load ${modulePath}:`,
            error.message
        );

        return null;

    }

}


/* ==========================================
   LOAD PROJECT MODULES
========================================== */

const sessionManager =
    safeRequire("./session");

const newSession =
    safeRequire("./newSession");

const commandLoader =
    safeRequire("./commandLoader");


/* ==========================================
   DEFAULT FEATURES
========================================== */

const DEFAULT_FEATURES = {

    autoRead: false,

    autoTyping: false,

    autoRecording: false,

    autoReact: false,

    autoStatusView: false,

    autoReply: false,

    antiDelete: false,

    antiLink: false,

    antiCall: false,

    welcome: false,

    goodbye: false,

    autoBio: false,

    alwaysOnline: false

};


/* ==========================================
   CREATE DASHBOARD
========================================== */

function createDashboard(app) {

    if (!app) {

        app = express();

    }


    /* ======================================
       EXPRESS MIDDLEWARE
    ====================================== */

    app.use(
        express.json({
            limit: "1mb"
        })
    );


    app.use(
        express.urlencoded({
            extended: true
        })
    );


    /* ======================================
       SERVE PUBLIC FILES
    ====================================== */

    app.use(
        express.static(
            path.join(
                config.ROOT_DIR,
                "public"
            )
        )
    );


    /* ======================================
       HOME PAGE
    ====================================== */

    app.get(
        "/",

        (req, res) => {

            const indexPath =
                path.join(
                    config.ROOT_DIR,
                    "public",
                    "index.html"
                );


            if (
                !fs.existsSync(indexPath)
            ) {

                return res.status(404).send(
                    "Dashboard index.html not found"
                );

            }


            res.sendFile(
                indexPath
            );

        }

    );


    /* ======================================
       API STATUS
    ====================================== */

    app.get(
        "/api/status",

        (req, res) => {

            const sessions =
                sessionManager?.getSessions
                    ? sessionManager.getSessions()
                    : [];


            res.json({

                success: true,

                status:
                    global.DRIP_QUEEN_MD?.status ||
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
                    process.uptime(),

                sessions:
                    sessions.length,

                commands:
                    commandLoader?.getCommandCount
                        ? commandLoader.getCommandCount()
                        : 0,

                timestamp:
                    Date.now()

            });

        }

    );


    /* ======================================
       API SESSIONS
    ====================================== */

    app.get(
        "/api/sessions",

        async (req, res) => {

            try {

                const sessions =
                    await getSessions();


                res.json({

                    success: true,

                    total:
                        sessions.length,

                    sessions

                });

            } catch (error) {

                console.error(
                    "[SESSIONS API ERROR]",
                    error.message
                );


                res.status(500).json({

                    success: false,

                    error:
                        "Failed to load sessions"

                });

            }

        }

    );


    /* ======================================
       DELETE SESSION
    ====================================== */

    app.delete(
        "/api/sessions/:userId",

        async (req, res) => {

            try {

                const userId =
                    sanitizeUserId(
                        req.params.userId
                    );


                if (!userId) {

                    return res.status(400).json({

                        success: false,

                        error:
                            "Invalid session ID"

                    });

                }


                const removed =
                    await deleteSession(
                        userId
                    );


                if (!removed) {

                    return res.status(404).json({

                        success: false,

                        error:
                            "Session not found"

                    });

                }


                res.json({

                    success: true,

                    message:
                        "Session removed successfully"

                });


            } catch (error) {

                console.error(
                    "[REMOVE SESSION ERROR]",
                    error.message
                );


                res.status(500).json({

                    success: false,

                    error:
                        error.message ||
                        "Failed to remove session"

                });

            }

        }

    );


    /* ======================================
       GENERATE PAIRING CODE
    ====================================== */

    app.post(
        "/api/pair",

        async (req, res) => {

            try {

                let {
                    phoneNumber
                } = req.body;


                if (!phoneNumber) {

                    return res.status(400).json({

                        success: false,

                        error:
                            "WhatsApp number is required"

                    });

                }


                phoneNumber =
                    String(phoneNumber)
                        .replace(
                            /[^0-9]/g,
                            ""
                        );


                if (
                    phoneNumber.length < 8 ||
                    phoneNumber.length > 16
                ) {

                    return res.status(400).json({

                        success: false,

                        error:
                            "Enter a valid phone number with country code"

                    });

                }


                if (!newSession) {

                    throw new Error(
                        "Session pairing module is unavailable"
                    );

                }


                console.log(
                    `[PAIRING] Request received for ${phoneNumber}`
                );


                const result =
                    await generatePairingCode(
                        phoneNumber
                    );


                const pairingCode =
                    extractPairingCode(
                        result
                    );


                /*
                   Existing registered sessions
                   may return without a pairing code.
                */

                if (
                    result?.alreadyRegistered
                ) {

                    return res.json({

                        success: true,

                        phoneNumber,

                        alreadyRegistered: true,

                        connected:
                            result.connected || false,

                        message:
                            "This WhatsApp number is already connected"

                    });

                }


                if (!pairingCode) {

                    throw new Error(
                        "Pairing code was not generated"
                    );

                }


                res.json({

                    success: true,

                    phoneNumber,

                    code:
                        pairingCode,

                    pairingCode

                });


            } catch (error) {

                console.error(
                    "[PAIRING API ERROR]",
                    error.message
                );


                res.status(500).json({

                    success: false,

                    error:
                        error.message ||
                        "Failed to generate pairing code"

                });

            }

        }

    );


    /* ======================================
       API COMMANDS
    ====================================== */

    app.get(
        "/api/commands",

        async (req, res) => {

            try {

                const commands =
                    await getCommands();


                res.json({

                    success: true,

                    total:
                        commands.length,

                    commands

                });

            } catch (error) {

                console.error(
                    "[COMMANDS API ERROR]",
                    error.message
                );


                res.status(500).json({

                    success: false,

                    error:
                        "Failed to load commands"

                });

            }

        }

    );


    /* ======================================
       GET AUTO FEATURES
    ====================================== */

    app.get(
        "/api/features",

        (req, res) => {

            try {

                const features =
                    getFeatureSettings();


                res.json({

                    success: true,

                    features

                });

            } catch (error) {

                console.error(
                    "[FEATURES ERROR]",
                    error.message
                );


                res.status(500).json({

                    success: false,

                    error:
                        "Failed to load features"

                });

            }

        }

    );


    /* ======================================
       UPDATE AUTO FEATURE
    ====================================== */

    app.post(
        "/api/features/:featureName",

        (req, res) => {

            try {

                const featureName =
                    req.params.featureName;


                /*
                   Prevent arbitrary values.
                */

                if (
                    !Object.prototype.hasOwnProperty.call(
                        DEFAULT_FEATURES,
                        featureName
                    )
                ) {

                    return res.status(400).json({

                        success: false,

                        error:
                            "Invalid feature name"

                    });

                }


                /*
                   Only accept booleans.
                */

                if (
                    typeof req.body.enabled !==
                    "boolean"
                ) {

                    return res.status(400).json({

                        success: false,

                        error:
                            "Feature enabled value must be true or false"

                    });

                }


                const enabled =
                    req.body.enabled;


                const features =
                    getFeatureSettings();


                features[featureName] =
                    enabled;


                saveFeatureSettings(
                    features
                );


                console.log(
                    `[FEATURE] ${featureName}: ${enabled}`
                );


                res.json({

                    success: true,

                    feature:
                        featureName,

                    enabled,

                    features:
                        getFeatureSettings()

                });


            } catch (error) {

                console.error(
                    "[FEATURE UPDATE ERROR]",
                    error.message
                );


                res.status(500).json({

                    success: false,

                    error:
                        "Failed to update feature"

                });

            }

        }

    );


    /* ======================================
       GET ALL SETTINGS
    ====================================== */

    app.get(
        "/api/settings",

        (req, res) => {

            try {

                const settings =
                    readSettingsFile();


                res.json({

                    success: true,

                    settings

                });

            } catch (error) {

                console.error(
                    "[SETTINGS GET ERROR]",
                    error.message
                );


                res.status(500).json({

                    success: false,

                    error:
                        "Failed to load settings"

                });

            }

        }

    );


    /* ======================================
       UPDATE SETTINGS
    ====================================== */

    app.post(
        "/api/settings",

        (req, res) => {

            try {

                const currentSettings =
                    readSettingsFile();


                const requestBody =
                    req.body || {};


                /*
                   Safely merge features.
                */

                const newSettings = {

                    ...currentSettings,

                    ...requestBody,

                    features: {

                        ...DEFAULT_FEATURES,

                        ...(currentSettings.features || {}),

                        ...(requestBody.features || {})

                    }

                };


                /*
                   Remove invalid feature keys.
                */

                for (
                    const key
                    of Object.keys(
                        newSettings.features
                    )
                ) {

                    if (
                        !Object.prototype.hasOwnProperty.call(
                            DEFAULT_FEATURES,
                            key
                        )
                    ) {

                        delete newSettings.features[key];

                    }

                }


                writeSettingsFile(
                    newSettings
                );


                res.json({

                    success: true,

                    settings:
                        newSettings

                });


            } catch (error) {

                console.error(
                    "[SETTINGS ERROR]",
                    error.message
                );


                res.status(500).json({

                    success: false,

                    error:
                        "Failed to save settings"

                });

            }

        }

    );


    /* ======================================
       404 API HANDLER
    ====================================== */

    app.use(
        "/api",

        (req, res) => {

            res.status(404).json({

                success: false,

                error:
                    "API endpoint not found"

            });

        }

    );


    console.log(
        "[DASHBOARD] Dashboard routes initialized"
    );


    return app;

}


/* ==========================================
   PAIRING CODE GENERATOR
========================================== */

async function generatePairingCode(
    phoneNumber
) {

    if (!newSession) {

        throw new Error(
            "newSession.js module not found"
        );

    }


    const possibleFunctions = [

        "createNewSession",

        "startNewSession",

        "createSession",

        "connectNewSession",

        "generatePairingCode",

        "startSession"

    ];


    for (
        const functionName
        of possibleFunctions
    ) {

        if (
            typeof newSession[functionName] ===
            "function"
        ) {

            console.log(
                `[PAIRING] Using newSession.${functionName}()`
            );


            return await newSession[
                functionName
            ](phoneNumber);

        }

    }


    if (
        typeof newSession ===
        "function"
    ) {

        return await newSession(
            phoneNumber
        );

    }


    throw new Error(
        "No compatible pairing function found"
    );

}


/* ==========================================
   EXTRACT PAIRING CODE
========================================== */

function extractPairingCode(
    result
) {

    if (!result) {

        return null;

    }


    if (
        typeof result ===
        "string"
    ) {

        return result;

    }


    return (

        result.code ||

        result.pairingCode ||

        result.pairCode ||

        null

    );

}


/* ==========================================
   SANITIZE SESSION ID
========================================== */

function sanitizeUserId(
    userId
) {

    if (!userId) {

        return null;

    }


    const clean =
        String(userId)
            .trim();


    /*
       Only allow phone-number style
       session IDs.
    */

    if (
        !/^[0-9]{8,20}$/.test(
            clean
        )
    ) {

        return null;

    }


    return clean;

}


/* ==========================================
   GET ACTIVE AND SAVED SESSIONS
========================================== */

async function getSessions() {

    const sessionMap =
        new Map();


    /*
       Get active sessions.
    */

    if (
        sessionManager &&
        typeof sessionManager.getSessions ===
        "function"
    ) {

        const active =
            await sessionManager.getSessions();


        if (
            Array.isArray(active)
        ) {

            for (
                const session
                of active
            ) {

                sessionMap.set(

                    session.userId ||
                    session.id,

                    {

                        ...session,

                        connected:
                            true

                    }

                );

            }

        }

    }


    /*
       Include saved sessions that
       may currently be reconnecting.
    */

    if (
        fs.existsSync(
            config.SESSIONS_PATH
        )
    ) {

        const items =
            fs.readdirSync(

                config.SESSIONS_PATH,

                {
                    withFileTypes:
                        true
                }

            );


        for (
            const item
            of items
        ) {

            if (
                !item.isDirectory()
            ) {

                continue;

            }


            const userId =
                item.name;


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


            if (
                !sessionMap.has(
                    userId
                )
            ) {

                sessionMap.set(

                    userId,

                    {

                        userId,

                        id:
                            userId,

                        connected:
                            false

                    }

                );

            }

        }

    }


    return [
        ...sessionMap.values()
    ];

}


/* ==========================================
   DELETE SESSION
========================================== */

async function deleteSession(
    userId
) {

    if (!userId) {

        return false;

    }


    let removed =
        false;


    /*
       Remove through central
       session manager.
    */

    if (
        sessionManager &&
        typeof sessionManager.removeSession ===
        "function"
    ) {

        try {

            await sessionManager.removeSession(
                userId
            );


            removed =
                true;

        } catch (error) {}

    }


    /*
       Remove pending pairing session.
    */

    if (
        newSession &&
        typeof newSession.removeSession ===
        "function"
    ) {

        try {

            await newSession.removeSession(
                userId
            );


            removed =
                true;

        } catch (error) {}

    }


    /*
       Final filesystem cleanup.
    */

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


        removed =
            true;

    }


    return removed;

}


/* ==========================================
   GET COMMANDS
========================================== */

async function getCommands() {

    if (
        commandLoader &&
        typeof commandLoader.getCommands ===
        "function"
    ) {

        const commands =
            commandLoader.getCommands();


        if (
            Array.isArray(commands)
        ) {

            return commands.map(
                normalizeCommand
            );

        }

    }


    return loadCommandsFromFolder();

}


/* ==========================================
   LOAD COMMANDS FROM FOLDER
========================================== */

function loadCommandsFromFolder() {

    const commands = [];


    if (
        !fs.existsSync(
            config.COMMANDS_PATH
        )
    ) {

        return commands;

    }


    const files =
        fs.readdirSync(
            config.COMMANDS_PATH
        );


    for (
        const file
        of files
    ) {

        if (
            !file.endsWith(
                ".js"
            )
        ) {

            continue;

        }


        const filePath =
            path.join(
                config.COMMANDS_PATH,
                file
            );


        try {

            delete require.cache[
                require.resolve(
                    filePath
                )
            ];


            const command =
                require(filePath);


            commands.push(

                normalizeCommand(
                    command,
                    file
                )

            );


        } catch (error) {

            console.log(
                `[COMMAND LOAD ERROR] ${file}: ${error.message}`
            );

        }

    }


    return commands;

}


/* ==========================================
   NORMALIZE COMMAND
========================================== */

function normalizeCommand(
    command,
    fileName = ""
) {

    const fallbackName =
        fileName
            .replace(
                /\.js$/,
                ""
            )
            .replace(
                /\.command$/,
                ""
            );


    if (
        !command ||
        typeof command !==
        "object"
    ) {

        return {

            name:
                fallbackName,

            category:
                "General",

            description:
                "No description available."

        };

    }


    return {

        name:

            command.name ||

            command.command ||

            fallbackName,


        aliases:

            Array.isArray(
                command.aliases
            )

                ? command.aliases

                : [],


        category:

            command.category ||

            command.type ||

            "General",


        description:

            command.description ||

            command.desc ||

            "No description available."

    };

}


/* ==========================================
   FEATURE SETTINGS
========================================== */

function getFeatureSettings() {

    const settings =
        readSettingsFile();


    return {

        ...DEFAULT_FEATURES,

        ...(settings.features || {})

    };

}


/* ==========================================
   SAVE FEATURE SETTINGS
========================================== */

function saveFeatureSettings(
    features
) {

    const settings =
        readSettingsFile();


    settings.features = {

        ...DEFAULT_FEATURES,

        ...features

    };


    writeSettingsFile(
        settings
    );

}


/* ==========================================
   READ SETTINGS FILE
========================================== */

function readSettingsFile() {

    ensureDatabaseDirectory();


    const defaultSettings = {

        features:
            { ...DEFAULT_FEATURES }

    };


    if (
        !fs.existsSync(
            config.SETTINGS_DB
        )
    ) {

        writeSettingsFile(
            defaultSettings
        );


        return defaultSettings;

    }


    try {

        const content =
            fs.readFileSync(

                config.SETTINGS_DB,

                "utf8"

            );


        if (
            !content.trim()
        ) {

            writeSettingsFile(
                defaultSettings
            );


            return defaultSettings;

        }


        const parsed =
            JSON.parse(
                content
            );


        return {

            ...parsed,

            features: {

                ...DEFAULT_FEATURES,

                ...(parsed.features || {})

            }

        };


    } catch (error) {

        console.log(
            "[SETTINGS] Invalid settings file. Resetting."
        );


        writeSettingsFile(
            defaultSettings
        );


        return defaultSettings;

    }

}


/* ==========================================
   WRITE SETTINGS FILE
========================================== */

function writeSettingsFile(
    data
) {

    ensureDatabaseDirectory();


    fs.writeFileSync(

        config.SETTINGS_DB,

        JSON.stringify(
            data,
            null,
            2
        )

    );

}


/* ==========================================
   ENSURE DATABASE DIRECTORY
========================================== */

function ensureDatabaseDirectory() {

    if (
        !fs.existsSync(
            config.DATABASE_PATH
        )
    ) {

        fs.mkdirSync(

            config.DATABASE_PATH,

            {
                recursive:
                    true
            }

        );

    }

}


/* ==========================================
   EXPORT
========================================== */

module.exports =
    createDashboard;


module.exports.createDashboard =
    createDashboard;


module.exports.getSessions =
    getSessions;


module.exports.getCommands =
    getCommands;


module.exports.getFeatureSettings =
    getFeatureSettings;