/* ==========================================
   DRIP QUEEN MD - MAIN ENTRY FILE
   CREATED BY NOX STAR TECH
========================================== */

require("dotenv").config();


/* ==========================================
   IMPORTS
========================================== */

const fs = require("fs");
const path = require("path");

const config = require("./config");

const {
    startServer
} = require("./server");


/* ==========================================
   GLOBAL BOT STATE
========================================== */

global.botStatus = "starting";


global.botConnections =
    global.botConnections || new Map();


global.autoFeatures =
    global.autoFeatures || {

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
   CREATE REQUIRED DIRECTORIES
========================================== */

const directories = [

    config.SESSIONS_PATH,

    config.DATABASE_PATH,

    config.TEMP_PATH,

    config.LOGS_PATH,

    config.PUBLIC_PATH

];


function createDirectories() {

    directories.forEach(
        directory => {

            if (
                !fs.existsSync(directory)
            ) {

                fs.mkdirSync(
                    directory,
                    {
                        recursive: true
                    }
                );

                console.log(
                    `📁 Created: ${directory}`
                );

            }

        }
    );

}


/* ==========================================
   CREATE DATABASE FILES
========================================== */

function createDatabaseFiles() {

    const files = [

        {
            path:
                config.USERS_DB,

            content:
                {}
        },

        {
            path:
                config.SETTINGS_DB,

            content:
                {}
        },

        {
            path:
                config.GROUPS_DB,

            content:
                {}
        }

    ];


    files.forEach(
        file => {

            if (
                !fs.existsSync(
                    file.path
                )
            ) {

                fs.writeFileSync(

                    file.path,

                    JSON.stringify(
                        file.content,
                        null,
                        2
                    )

                );

                console.log(
                    `🗄️ Created database: ${file.path}`
                );

            }

        }
    );

}


/* ==========================================
   START WHATSAPP BOT
========================================== */

async function startBot() {

    try {

        console.log(
            "🤖 Starting WhatsApp Bot..."
        );


        /*
         =====================================

         IMPORTANT

         Your Baileys connection file should
         be connected here.

         Example:

         const {
             startWhatsApp
         } = require("./lib/whatsapp");

         await startWhatsApp();

         =====================================
        */


        /*
           For now the dashboard can start
           even if WhatsApp connection is
           still initializing.
        */

        global.botStatus =
            "online";


        console.log(
            "👑 DRIP QUEEN MD Bot Initialized"
        );


        return true;

    }

    catch (error) {

        global.botStatus =
            "offline";


        console.error(
            "❌ Bot Startup Error:",
            error.message
        );


        return false;

    }

}


/* ==========================================
   DISPLAY STARTUP BANNER
========================================== */

function showBanner() {

    console.clear();


    console.log("");

    console.log(
        "╔══════════════════════════════════════════╗"
    );

    console.log(
        "║                                          ║"
    );

    console.log(
        "║          👑 DRIP QUEEN MD 👑             ║"
    );

    console.log(
        "║                                          ║"
    );

    console.log(
        "╠══════════════════════════════════════════╣"
    );

    console.log(
        `║ Version : ${config.BOT_VERSION}`
    );

    console.log(
        `║ Creator : ${config.CREATOR}`
    );

    console.log(
        `║ Mode    : ${config.MODE}`
    );

    console.log(
        `║ Prefix  : ${config.PREFIX}`
    );

    console.log(
        "╚══════════════════════════════════════════╝"
    );

    console.log("");

}


/* ==========================================
   START APPLICATION
========================================== */

async function startApplication() {

    try {

        showBanner();


        console.log(
            "⚙️ Preparing application..."
        );


        /*
           CREATE DIRECTORIES
        */

        createDirectories();


        /*
           CREATE DATABASE FILES
        */

        createDatabaseFiles();


        /*
           START DASHBOARD SERVER FIRST

           This ensures the dashboard loads
           even while WhatsApp initializes.
        */

        console.log(
            "🌐 Starting Dashboard Server..."
        );


        await startServer();


        /*
           START WHATSAPP BOT
        */

        await startBot();


        console.log("");

        console.log(
            "════════════════════════════════════"
        );

        console.log(
            "🚀 DRIP QUEEN MD STARTED SUCCESSFULLY"
        );

        console.log(
            "════════════════════════════════════"
        );

        console.log("");

    }

    catch (error) {

        global.botStatus =
            "offline";


        console.error(
            "❌ Application Startup Failed:"
        );

        console.error(
            error
        );

    }

}


/* ==========================================
   PROCESS ERROR HANDLING
========================================== */

process.on(
    "uncaughtException",

    error => {

        console.error(
            "❌ Uncaught Exception:"
        );

        console.error(
            error
        );

    }

);


process.on(
    "unhandledRejection",

    error => {

        console.error(
            "❌ Unhandled Rejection:"
        );

        console.error(
            error
        );

    }

);


/* ==========================================
   START
========================================== */

startApplication();
