require("dotenv").config();

const fs = require("fs");
const express = require("express");

const config = require("./config");


/* ==========================================
   DRIP QUEEN MD
   MAIN APPLICATION ENTRY
   CREATED BY NOX STAR TECH
========================================== */


/* ==========================================
   SAFE REQUIRE FUNCTION
========================================== */

function safeRequire(modulePath) {

    try {

        return require(modulePath);

    } catch (error) {

        console.error(
            `[INDEX] Failed to load ${modulePath}: ${error.message}`
        );

        return null;

    }

}


/* ==========================================
   REQUIRE WITH FALLBACK
========================================== */

function requireModule(...paths) {

    for (const modulePath of paths) {

        try {

            const module = require(modulePath);

            console.log(
                `[SYSTEM] Loaded module: ${modulePath}`
            );

            return module;

        } catch (error) {

            // Try next path silently

        }

    }

    console.error(
        `[SYSTEM] Could not load module from: ${paths.join(" OR ")}`
    );

    return null;

}


/* ==========================================
   LOAD CORE MODULES
========================================== */

/*
   Based on your actual project structure:

   src/
   ├── dashboard.js
   ├── commandLoader.js
   └── session.js

   lib/
   └── database.js
*/

const createDashboard = requireModule(

    "./src/dashboard",
    "./lib/dashboard"

);


const commandLoader = requireModule(

    "./src/commandLoader",
    "./lib/commandLoader"

);


const sessionManager = requireModule(

    "./src/session",
    "./lib/session"

);


const database = requireModule(

    "./lib/database",
    "./database/database"

);


/* ==========================================
   CREATE REQUIRED DIRECTORIES
========================================== */

function ensureDirectories() {

    const directories = [

        config.SESSIONS_PATH,
        config.DATABASE_PATH,
        config.TEMP_PATH,
        config.LOGS_PATH,
        config.COMMANDS_PATH,
        config.LIB_PATH

    ].filter(Boolean);


    for (const directory of directories) {

        try {

            if (!fs.existsSync(directory)) {

                fs.mkdirSync(
                    directory,
                    {
                        recursive: true
                    }
                );

                console.log(
                    `[SYSTEM] Created directory: ${directory}`
                );

            }

        } catch (error) {

            console.error(
                `[SYSTEM ERROR] Failed creating directory ${directory}:`,
                error.message
            );

        }

    }

}


ensureDirectories();


/* ==========================================
   INITIALIZE DATABASE
========================================== */

function initializeDatabase() {

    try {

        if (!database) {

            console.log(
                "[DATABASE] Database module not available"
            );

            return;

        }


        if (
            typeof database.initializeDatabase ===
            "function"
        ) {

            database.initializeDatabase();

            console.log(
                "[DATABASE] Database initialized"
            );

            return;

        }


        if (
            typeof database.initialize ===
            "function"
        ) {

            database.initialize();

            console.log(
                "[DATABASE] Database initialized"
            );

            return;

        }


        console.log(
            "[DATABASE] No initialization function found"
        );

    } catch (error) {

        console.error(
            "[DATABASE ERROR]",
            error.message
        );

    }

}


/* ==========================================
   EXPRESS APPLICATION
========================================== */

const app = express();


/* ==========================================
   EXPRESS MIDDLEWARE
========================================== */

app.use(
    express.json({
        limit: "10mb"
    })
);


app.use(
    express.urlencoded({
        extended: true,
        limit: "10mb"
    })
);


/* ==========================================
   GLOBAL BOT STATE
========================================== */

global.DRIP_QUEEN_MD = {

    startedAt:
        Date.now(),

    status:
        "starting",

    commands:
        [],

    sessions:
        new Map(),

    serverStarted:
        false

};


/* ==========================================
   DASHBOARD INITIALIZATION
========================================== */

function initializeDashboard() {

    try {

        if (!createDashboard) {

            console.error(
                "[DASHBOARD] Dashboard module could not be loaded"
            );

            return false;

        }


        /*
           Export style:

           module.exports = createDashboard;

           OR

           module.exports = {
               createDashboard
           };
        */

        if (
            typeof createDashboard ===
            "function"
        ) {

            createDashboard(app);

            console.log(
                "[DASHBOARD] Dashboard initialized successfully"
            );

            return true;

        }


        if (
            typeof createDashboard.createDashboard ===
            "function"
        ) {

            createDashboard.createDashboard(app);

            console.log(
                "[DASHBOARD] Dashboard initialized successfully"
            );

            return true;

        }


        console.error(
            "[DASHBOARD] Invalid dashboard export"
        );

        return false;

    } catch (error) {

        console.error(
            "[DASHBOARD ERROR]",
            error
        );

        return false;

    }

}


/* ==========================================
   LOAD COMMANDS
========================================== */

async function initializeCommands() {

    try {

        if (!commandLoader) {

            console.log(
                "[COMMANDS] commandLoader module not found"
            );

            return [];

        }


        console.log(
            "[COMMANDS] Loading commands..."
        );


        let commands = [];


        if (
            typeof commandLoader.loadCommands ===
            "function"
        ) {

            commands =
                await commandLoader.loadCommands();

        } else if (
            typeof commandLoader ===
            "function"
        ) {

            commands =
                await commandLoader();

        } else {

            console.log(
                "[COMMANDS] loadCommands() function not found"
            );

        }


        global.DRIP_QUEEN_MD.commands =
            Array.isArray(commands)
                ? commands
                : [];


        console.log(
            `[COMMANDS] Loaded ${global.DRIP_QUEEN_MD.commands.length} command(s)`
        );


        return global.DRIP_QUEEN_MD.commands;

    } catch (error) {

        console.error(
            "[COMMANDS ERROR]",
            error
        );

        global.DRIP_QUEEN_MD.commands = [];

        return [];

    }

}


/* ==========================================
   RESTORE EXISTING SESSIONS
========================================== */

async function initializeSessions() {

    try {

        if (!sessionManager) {

            console.log(
                "[SESSIONS] Session manager module not found"
            );

            return [];

        }


        console.log(
            "[SESSIONS] Restoring saved sessions..."
        );


        let sessions = [];


        if (
            typeof sessionManager.restoreSessions ===
            "function"
        ) {

            sessions =
                await sessionManager.restoreSessions();

        } else {

            console.log(
                "[SESSIONS] restoreSessions() function not found"
            );

        }


        if (!Array.isArray(sessions)) {

            sessions = [];

        }


        console.log(
            `[SESSIONS] Restored ${sessions.length} session(s)`
        );


        return sessions;

    } catch (error) {

        console.error(
            "[SESSIONS ERROR]",
            error
        );

        return [];

    }

}


/* ==========================================
   FALLBACK STATUS API
========================================== */

/*
   This route only responds if dashboard.js
   does not provide its own status system.
*/

app.get(
    "/api/status",
    (req, res) => {

        const uptime =
            Math.floor(
                (Date.now() -
                    global.DRIP_QUEEN_MD.startedAt) /
                1000
            );


        res.json({

            success:
                true,

            bot: config.BOT_NAME,

            version: config.BOT_VERSION,

            status:
                global.DRIP_QUEEN_MD.status,

            commands:
                global.DRIP_QUEEN_MD.commands.length,

            sessions:
                global.DRIP_QUEEN_MD.sessions.size,

            uptime

        });

    }
);


/* ==========================================
   START SERVER
========================================== */

function startServer() {

    try {

        const PORT =
            config.PORT ||
            process.env.PORT ||
            3000;


        const HOST =
            config.HOST ||
            "0.0.0.0";


        const server = app.listen(

            PORT,

            HOST,

            () => {

                global.DRIP_QUEEN_MD.status =
                    "online";


                global.DRIP_QUEEN_MD.serverStarted =
                    true;


                console.clear();


                console.log(
                    "╔══════════════════════════════════════════╗"
                );

                console.log(
                    `║ ${(config.BOT_NAME || "DRIP QUEEN MD").padEnd(40)} ║`
                );

                console.log(
                    "╠══════════════════════════════════════════╣"
                );

                console.log(
                    `║ Version: ${String(config.BOT_VERSION || "1.0.0").padEnd(31)} ║`
                );

                console.log(
                    `║ Creator: ${String(config.CREATOR || "NOX STAR TECH").padEnd(31)} ║`
                );

                console.log(
                    `║ Mode: ${String(config.MODE || "public").padEnd(34)} ║`
                );

                console.log(
                    "╠══════════════════════════════════════════╣"
                );

                console.log(
                    `║ Dashboard Port: ${String(PORT).padEnd(24)} ║`
                );

                console.log(
                    `║ Host: ${String(HOST).padEnd(34)} ║`
                );

                console.log(
                    "╚══════════════════════════════════════════╝"
                );


                console.log("");


                console.log(
                    `[SERVER] Running on http://${HOST}:${PORT}`
                );


                console.log(
                    `[BOT] ${config.BOT_NAME || "DRIP QUEEN MD"} is online`
                );


                console.log(
                    "[SYSTEM] All services started successfully"
                );

            }

        );


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
            "[SERVER ERROR]",
            error
        );

        return null;

    }

}


/* ==========================================
   MAIN START FUNCTION
========================================== */

async function startBot() {

    try {

        console.log(
            "[SYSTEM] Starting DRIP QUEEN MD..."
        );


        /*
           STEP 1
           Initialize Database
        */

        initializeDatabase();


        /*
           STEP 2
           Initialize Dashboard
        */

        initializeDashboard();


        /*
           STEP 3
           Load Commands
        */

        await initializeCommands();


        /*
           STEP 4
           Restore WhatsApp Sessions
        */

        await initializeSessions();


        /*
           STEP 5
           Start Express Server
        */

        startServer();


    } catch (error) {

        console.error(
            "[STARTUP ERROR]",
            error
        );


        global.DRIP_QUEEN_MD.status =
            "error";

    }

}


/* ==========================================
   ERROR HANDLERS
========================================== */

process.on(
    "uncaughtException",

    error => {

        console.error(
            "[UNCAUGHT EXCEPTION]",
            error
        );

    }

);


process.on(
    "unhandledRejection",

    error => {

        console.error(
            "[UNHANDLED REJECTION]",
            error
        );

    }

);


/* ==========================================
   GRACEFUL SHUTDOWN
========================================== */

async function shutdown(signal) {

    console.log(
        `\n[SYSTEM] Received ${signal}`
    );


    console.log(
        "[SYSTEM] Shutting down safely..."
    );


    global.DRIP_QUEEN_MD.status =
        "offline";


    try {

        if (
            sessionManager &&
            typeof sessionManager.shutdown ===
            "function"
        ) {

            await sessionManager.shutdown();

        }


        console.log(
            "[SYSTEM] Sessions closed"
        );

    } catch (error) {

        console.error(
            "[SHUTDOWN ERROR]",
            error
        );

    }


    console.log(
        "[SYSTEM] Shutdown complete"
    );


    process.exit(0);

}


/* ==========================================
   SHUTDOWN SIGNALS
========================================== */

process.on(
    "SIGINT",
    () => shutdown("SIGINT")
);


process.on(
    "SIGTERM",
    () => shutdown("SIGTERM")
);


/* ==========================================
   START APPLICATION
========================================== */

startBot();


/* ==========================================
   EXPORT EXPRESS APP
========================================== */

module.exports = app;
