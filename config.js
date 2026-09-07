require("dotenv").config();

const path = require("path");


const ROOT_DIR = __dirname;


/* ==========================================
   CONFIGURATION
========================================== */

const config = {

    /* ==========================================
       BOT INFORMATION
    ========================================== */

    BOT_NAME:
        process.env.BOT_NAME ||
        "DRIP QUEEN MD",

    BOT_VERSION:
        process.env.BOT_VERSION ||
        "1.0.0",

    CREATOR:
        process.env.CREATOR ||
        "NOX STAR TECH",

    CREATOR_NAME:
        process.env.CREATOR_NAME ||
        "Nox Star",

    PREFIX:
        process.env.PREFIX ||
        ".",


    /* ==========================================
       WHATSAPP SETTINGS
    ========================================== */

    PAIRING_CODE_ONLY: true,

    MULTI_USER: true,


    /* ==========================================
       OWNER SETTINGS
    ========================================== */

    OWNER_NUMBERS:

        (
            process.env.OWNER_NUMBER ||
            ""
        )

            .split(",")

            .map(
                number =>
                    number
                        .replace(/\D/g, "")
                        .trim()
            )

            .filter(Boolean),


    /* ==========================================
       SERVER / DASHBOARD
    ========================================== */

    PORT:

        Number(
            process.env.PORT
        ) || 3000,


    HOST:

        process.env.HOST ||
        "0.0.0.0",


    /* ==========================================
       PROJECT PATHS
    ========================================== */

    ROOT_DIR,


    COMMANDS_PATH:

        path.join(
            ROOT_DIR,
            "Commands"
        ),


    LIB_PATH:

        path.join(
            ROOT_DIR,
            "lib"
        ),


    SESSIONS_PATH:

        path.join(
            ROOT_DIR,
            "sessions"
        ),


    DATABASE_PATH:

        path.join(
            ROOT_DIR,
            "database"
        ),


    TEMP_PATH:

        path.join(
            ROOT_DIR,
            "temp"
        ),


    LOGS_PATH:

        path.join(
            ROOT_DIR,
            "logs"
        ),


    /* ==========================================
       DATABASE FILES
    ========================================== */

    USERS_DB:

        path.join(
            ROOT_DIR,
            "database",
            "users.json"
        ),


    SETTINGS_DB:

        path.join(
            ROOT_DIR,
            "database",
            "settings.json"
        ),


    /* ==========================================
       DASHBOARD SETTINGS
    ========================================== */

    DASHBOARD_TITLE:

        "DRIP QUEEN MD Dashboard",


    DASHBOARD_ENABLED:

        true,


    /* ==========================================
       SESSION SETTINGS
    ========================================== */

    AUTO_RECONNECT:

        true,


    MAX_RECONNECT_ATTEMPTS:

        10,


    RECONNECT_DELAY:

        5000,


    /* ==========================================
       COMMAND SETTINGS
    ========================================== */

    COMMANDS_FOLDER:

        "Commands",


    AUTO_LOAD_COMMANDS:

        true,


    /* ==========================================
       BOT STATUS
    ========================================== */

    STATUS:

        "online",


    MODE:

        process.env.MODE ||
        "public"

};


/* ==========================================
   EXPORT
========================================== */

module.exports = config;