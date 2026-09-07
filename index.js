require("dotenv").config();

const fs = require("fs");
const express = require("express");

const config = require("./config");


/* ==========================================
   SAFE REQUIRE FUNCTION
========================================== */

function safeRequire(modulePath) {

    try {

        return require(modulePath);

    } catch (error) {

        console.error(
            `[INDEX] Failed to load ${modulePath}:`,
            error.message
        );

        return null;

    }

}


/* ==========================================
   LOAD CORE MODULES
========================================== */

const createDashboard =
    safeRequire("./lib/dashboard");

const commandLoader =
    safeRequire("./lib/commandLoader");

const sessionManager =
    safeRequire("./lib/session");

const database =
    safeRequire("./lib/database");


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

    ];


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

        if (
            database &&
            typeof database.initializeDatabase ===
            "function"
        ) {

            database.initializeDatabase();

        }

    } catch (error) {

        console.error(
            "[DATABASE ERROR]",
            error.message
        );

    }

}


initializeDatabase();


/* ==========================================
   EXPRESS APPLICATION
========================================== */

const app = express();


/* ==========================================
   EXPRESS MIDDLEWARE
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
        new Map()

};


/* ==========================================
   DASHBOARD INITIALIZATION
========================================== */

function initializeDashboard() {

    try {

        if (
            typeof createDashboard ===
            "function"
        ) {

            createDashboard(app);

            console.log(
                "[DASHBOARD] Dashboard initialized"
            );

            return;

        }


        if (
            createDashboard &&
            typeof createDashboard.createDashboard ===
            "function"
        ) {

            createDashboard.createDashboard(
                app
            );

            console.log(
                "[DASHBOARD] Dashboard initialized"
            );

            return;

        }


        console.log(
            "[DASHBOARD] dashboard.js not available or invalid"
        );

    } catch (error) {

        console.error(
            "[DASHBOARD ERROR]",
            error.message
        );

    }

}


initializeDashboard();


/* ==========================================
   LOAD COMMANDS
========================================== */

async function initializeCommands() {

    try {

        if (!commandLoader) {

            console.log(
                "[COMMANDS] commandLoader.js not found"
            );

            return [];

        }


        if (
            typeof commandLoader.loadCommands !==
            "function"
        ) {

            console.log(
                "[COMMANDS] loadCommands() function not found"
            );

            return [];

        }


        console.log(
            "[COMMANDS] Loading commands..."
        );


        const commands =
            await commandLoader.loadCommands();


        global.DRIP_QUEEN_MD.commands =
            Array.isArray(commands)
                ? commands
                : [];


        console.log(
            `[COMMANDS] Loaded ${global.DRIP_QUEEN_MD.commands.length} commands`
        );


        return global.DRIP_QUEEN_MD.commands;


    } catch (error) {

        console.error(
            "[COMMANDS ERROR]",
            error
        );

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
                "[SESSIONS] session.js not found"
            );

            return [];

        }


        if (
            typeof sessionManager.restoreSessions !==
            "function"
        ) {

            console.log(
                "[SESSIONS] restoreSessions() function not found"
            );

            return [];

        }


        console.log(
            "[SESSIONS] Restoring saved sessions..."
        );


        const sessions =
            await sessionManager.restoreSessions();


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
   START SERVER
========================================== */

function startServer() {

    try {

        app.listen(
            config.PORT,
            config.HOST,

            () => {

                console.clear();


                console.log(
                    "╔══════════════════════════════════════════╗"
                );

                console.log(
                    `║ ${config.BOT_NAME.padEnd(40)} ║`
                );

                console.log(
                    "╠══════════════════════════════════════════╣"
                );

                console.log(
                    `║ Version: ${config.BOT_VERSION.padEnd(31)} ║`
                );

                console.log(
                    `║ Creator: ${config.CREATOR.padEnd(31)} ║`
                );

                console.log(
                    `║ Mode: ${config.MODE.padEnd(34)} ║`
                );

                console.log(
                    "╠══════════════════════════════════════════╣"
                );

                console.log(
                    `║ Dashboard Port: ${String(config.PORT).padEnd(24)} ║`
                );

                console.log(
                    `║ Host: ${config.HOST.padEnd(34)} ║`
                );

                console.log(
                    "╚══════════════════════════════════════════╝"
                );


                console.log("");


                console.log(
                    `[SERVER] Running on ${config.HOST}:${config.PORT}`
                );


                console.log(
                    `[BOT] ${config.BOT_NAME} is online`
                );


                global.DRIP_QUEEN_MD.status =
                    "online";

            }

        );

    } catch (error) {

        console.error(
            "[SERVER ERROR]",
            error
        );

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
           Step 1: Database
        */

        initializeDatabase();


        /*
           Step 2: Commands
        */

        await initializeCommands();


        /*
           Step 3: Restore WhatsApp sessions
        */

        await initializeSessions();


        /*
           Step 4: Start dashboard
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