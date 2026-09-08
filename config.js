require("dotenv").config();

const path = require("path");


/* ==========================================
   ROOT DIRECTORY
========================================== */

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

    PAIRING_CODE_ONLY:

        true,


    MULTI_USER:

        true,


    MODE:

        process.env.MODE ||
        "public",


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
       SERVER SETTINGS
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


    SRC_PATH:

        path.join(
            ROOT_DIR,
            "src"
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


    PUBLIC_PATH:

        path.join(
            ROOT_DIR,
            "public"
        ),


    ASSETS_PATH:

        path.join(
            ROOT_DIR,
            "assets"
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


    GROUPS_DB:

        path.join(
            ROOT_DIR,
            "database",
            "groups.json"
        ),


    /* ==========================================
       DASHBOARD SETTINGS
    ========================================== */

    DASHBOARD_TITLE:

        process.env.DASHBOARD_TITLE ||
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

        Number(
            process.env.RECONNECT_DELAY
        ) || 5000,


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


    /* ==========================================
       API KEYS

       Add your keys in .env
       Never hardcode real API keys.
    ========================================== */

    API_KEYS: {


        /* General API */

        GENERAL:

            process.env.API_KEY ||
            "",


        /* Download API */

        DOWNLOAD:

            process.env.DOWNLOAD_API_KEY ||
            "",


        /* Upload API */

        UPLOAD:

            process.env.UPLOAD_API_KEY ||
            "",


        /* YouTube API */

        YOUTUBE:

            process.env.YOUTUBE_API_KEY ||
            "",


        /* Google API */

        GOOGLE:

            process.env.GOOGLE_API_KEY ||
            "",


        /* OpenAI API */

        OPENAI:

            process.env.OPENAI_API_KEY ||
            "",


        /* Gemini API */

        GEMINI:

            process.env.GEMINI_API_KEY ||
            "",


        /* RapidAPI */

        RAPIDAPI:

            process.env.RAPIDAPI_KEY ||
            "",


        /* Custom API */

        CUSTOM:

            process.env.CUSTOM_API_KEY ||
            "",


        /* Spotify */

        SPOTIFY_CLIENT_ID:

            process.env.SPOTIFY_CLIENT_ID ||
            "",


        SPOTIFY_CLIENT_SECRET:

            process.env.SPOTIFY_CLIENT_SECRET ||
            ""

    },


    /* ==========================================
       API URLS / ENDPOINTS
    ========================================== */

    API_URLS: {


        BASE:

            process.env.API_BASE_URL ||
            "",


        DOWNLOAD:

            process.env.DOWNLOAD_API_URL ||
            "",


        UPLOAD:

            process.env.UPLOAD_API_URL ||
            "",


        SEARCH:

            process.env.SEARCH_API_URL ||
            "",


        AI:

            process.env.AI_API_URL ||
            ""

    },


    /* ==========================================
       DOWNLOAD SETTINGS
    ========================================== */

    DOWNLOAD: {


        MAX_FILE_SIZE:

            Number(
                process.env.MAX_FILE_SIZE
            ) || 50 * 1024 * 1024,


        TEMP_FOLDER:

            path.join(
                ROOT_DIR,
                "temp"
            ),


        CLEAN_TEMP_FILES:

            true

    },


    /* ==========================================
       UPLOAD SETTINGS
    ========================================== */

    UPLOAD: {


        MAX_FILE_SIZE:

            Number(
                process.env.UPLOAD_MAX_FILE_SIZE
            ) || 100 * 1024 * 1024,


        TEMP_FOLDER:

            path.join(
                ROOT_DIR,
                "temp"
            ),


        ALLOWED_TYPES: [

            "image",

            "video",

            "audio",

            "document",

            "sticker"

        ]

    },


    /* ==========================================
       SEARCH SETTINGS
    ========================================== */

    SEARCH: {


        MAX_RESULTS:

            Number(
                process.env.SEARCH_MAX_RESULTS
            ) || 10,


        SAFE_SEARCH:

            String(
                process.env.SAFE_SEARCH
            ).toLowerCase() === "true"

    },


    /* ==========================================
       AI SETTINGS
    ========================================== */

    AI: {


        PROVIDER:

            process.env.AI_PROVIDER ||
            "gemini",


        MODEL:

            process.env.AI_MODEL ||
            "gemini-2.0-flash",


        MAX_TOKENS:

            Number(
                process.env.AI_MAX_TOKENS
            ) || 1000

    }

};


/* ==========================================
   EXPORT
========================================== */

module.exports = config;