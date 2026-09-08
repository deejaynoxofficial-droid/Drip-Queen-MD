const fs = require("fs-extra");
const path = require("path");
const config = require("./config");


/* ==========================================
   DATABASE PATHS
========================================== */

const usersFile =
    config.USERS_DB;

const settingsFile =
    config.SETTINGS_DB;


/* ==========================================
   DEFAULT USERS DATA
========================================== */

const defaultUsers = {

    users: {}

};


/* ==========================================
   DEFAULT AUTO FEATURES
========================================== */

const defaultFeatures = {

    /* MESSAGE FEATURES */

    autoRead: false,

    autoReact: false,

    autoReply: false,

    autoTyping: false,

    autoRecording: false,


    /* ONLINE FEATURES */

    alwaysOnline: false,


    /* SECURITY FEATURES */

    antiDelete: false,

    antiLink: false,


    /* GROUP FEATURES */

    welcome: false,

    goodbye: false,


    /* STATUS FEATURES */

    autoStatus: false,

    autoView: false

};


/* ==========================================
   DEFAULT SETTINGS
========================================== */

const defaultSettings = {

    /* BOT SETTINGS */

    prefix:
        config.PREFIX,

    mode:
        config.MODE,

    botName:
        config.BOT_NAME,

    creator:
        config.CREATOR,


    /* AUTO FEATURES */

    features: {

        ...defaultFeatures

    },


    /* METADATA */

    createdAt:
        new Date().toISOString(),

    updatedAt:
        null

};


/* ==========================================
   ENSURE DATABASE DIRECTORY AND FILES EXIST
========================================== */

function initializeDatabase() {

    try {

        fs.ensureDirSync(
            config.DATABASE_PATH
        );


        if (
            !fs.existsSync(usersFile)
        ) {

            fs.writeJsonSync(
                usersFile,
                defaultUsers,
                {
                    spaces: 2
                }
            );

        }


        if (
            !fs.existsSync(settingsFile)
        ) {

            fs.writeJsonSync(
                settingsFile,
                defaultSettings,
                {
                    spaces: 2
                }
            );

        }


        console.log(
            "[DATABASE] Database initialized successfully."
        );


    } catch (error) {

        console.error(
            "[DATABASE ERROR] Failed to initialize database:",
            error.message
        );

    }

}


/* ==========================================
   SAFE JSON READER
========================================== */

function readJSON(
    file,
    defaultData
) {

    try {

        if (
            !fs.existsSync(file)
        ) {

            fs.ensureDirSync(
                path.dirname(file)
            );


            fs.writeJsonSync(
                file,
                defaultData,
                {
                    spaces: 2
                }
            );


            return {

                ...defaultData

            };

        }


        const data =
            fs.readJsonSync(file);


        if (
            !data ||
            typeof data !== "object" ||
            Array.isArray(data)
        ) {

            throw new Error(
                "Invalid JSON structure"
            );

        }


        return data;


    } catch (error) {

        console.error(
            `[DATABASE ERROR] Failed reading ${path.basename(file)}:`,
            error.message
        );


        try {

            fs.ensureDirSync(
                path.dirname(file)
            );


            fs.writeJsonSync(
                file,
                defaultData,
                {
                    spaces: 2
                }
            );

        } catch (writeError) {

            console.error(
                `[DATABASE ERROR] Failed repairing ${path.basename(file)}:`,
                writeError.message
            );

        }


        return {

            ...defaultData

        };

    }

}


/* ==========================================
   SAFE JSON WRITER
========================================== */

function writeJSON(
    file,
    data
) {

    try {

        fs.ensureDirSync(
            path.dirname(file)
        );


        fs.writeJsonSync(
            file,
            data,
            {
                spaces: 2
            }
        );


        return true;


    } catch (error) {

        console.error(
            `[DATABASE ERROR] Failed writing ${path.basename(file)}:`,
            error.message
        );


        return false;

    }

}


/* ==========================================
   USER MANAGEMENT
========================================== */

function getUsers() {

    const data =
        readJSON(
            usersFile,
            defaultUsers
        );


    if (
        !data.users ||
        typeof data.users !== "object" ||
        Array.isArray(data.users)
    ) {

        data.users = {};

        writeJSON(
            usersFile,
            data
        );

    }


    return data;

}


/* ==========================================
   GET USER
========================================== */

function getUser(userId) {

    if (!userId) {

        return null;

    }


    const data =
        getUsers();


    return (
        data.users[userId] ||
        null
    );

}


/* ==========================================
   ADD USER
========================================== */

function addUser(
    userId,
    userData = {}
) {

    if (!userId) {

        throw new Error(
            "User ID is required"
        );

    }


    const data =
        getUsers();


    const now =
        new Date().toISOString();


    const existingUser =
        data.users[userId] || {};


    data.users[userId] = {

        ...existingUser,

        id: userId,

        createdAt:
            existingUser.createdAt ||
            now,

        lastActive:
            now,

        ...userData

    };


    writeJSON(
        usersFile,
        data
    );


    return data.users[userId];

}


/* ==========================================
   UPDATE USER
========================================== */

function updateUser(
    userId,
    updates = {}
) {

    if (!userId) {

        throw new Error(
            "User ID is required"
        );

    }


    const data =
        getUsers();


    if (
        !data.users[userId]
    ) {

        return addUser(
            userId,
            updates
        );

    }


    data.users[userId] = {

        ...data.users[userId],

        ...updates,

        lastActive:
            new Date().toISOString()

    };


    writeJSON(
        usersFile,
        data
    );


    return data.users[userId];

}


/* ==========================================
   REMOVE USER
========================================== */

function removeUser(userId) {

    if (!userId) {

        return false;

    }


    const data =
        getUsers();


    if (
        !data.users[userId]
    ) {

        return false;

    }


    delete data.users[userId];


    return writeJSON(
        usersFile,
        data
    );

}


/* ==========================================
   GET ALL USERS
========================================== */

function getAllUsers() {

    const data =
        getUsers();


    return Object.values(
        data.users
    );

}


/* ==========================================
   GET SETTINGS
========================================== */

function getSettings() {

    const settings =
        readJSON(
            settingsFile,
            defaultSettings
        );


    /*
       Ensure features object exists.
    */

    if (
        !settings.features ||
        typeof settings.features !== "object" ||
        Array.isArray(settings.features)
    ) {

        settings.features = {};

    }


    /*
       Merge all default features.

       This automatically adds new features
       without deleting old saved settings.
    */

    settings.features = {

        ...defaultFeatures,

        ...settings.features

    };


    /*
       Merge missing main settings.
    */

    const balancedSettings = {

        ...defaultSettings,

        ...settings,

        features:
            settings.features

    };


    /*
       Save automatically if structure changed.
    */

    writeJSON(
        settingsFile,
        balancedSettings
    );


    return balancedSettings;

}


/* ==========================================
   UPDATE SETTINGS
========================================== */

function updateSettings(
    updates = {}
) {

    const settings =
        getSettings();


    const newSettings = {

        ...settings,

        ...updates,


        /*
           Merge features safely.
        */

        features: {

            ...defaultFeatures,

            ...settings.features,

            ...(updates.features || {})

        },


        updatedAt:
            new Date().toISOString()

    };


    writeJSON(
        settingsFile,
        newSettings
    );


    return newSettings;

}


/* ==========================================
   UPDATE SINGLE FEATURE
========================================== */

function updateFeature(
    featureName,
    value
) {

    if (!featureName) {

        throw new Error(
            "Feature name is required"
        );

    }


    if (
        !Object.prototype.hasOwnProperty.call(
            defaultFeatures,
            featureName
        )
    ) {

        throw new Error(
            `Unknown feature: ${featureName}`
        );

    }


    const settings =
        getSettings();


    const updatedSettings =
        updateSettings({

            features: {

                ...settings.features,

                [featureName]:
                    Boolean(value)

            }

        });


    return updatedSettings.features;

}


/* ==========================================
   GET ALL AUTO FEATURES
========================================== */

function getFeatures() {

    const settings =
        getSettings();


    return settings.features;

}


/* ==========================================
   GET SINGLE FEATURE
========================================== */

function getFeature(
    featureName
) {

    const features =
        getFeatures();


    return features[
        featureName
    ];

}


/* ==========================================
   TOGGLE FEATURE
========================================== */

function toggleFeature(
    featureName
) {

    if (
        !Object.prototype.hasOwnProperty.call(
            defaultFeatures,
            featureName
        )
    ) {

        throw new Error(
            `Unknown feature: ${featureName}`
        );

    }


    const currentValue =
        Boolean(
            getFeature(featureName)
        );


    updateFeature(
        featureName,
        !currentValue
    );


    return !currentValue;

}


/* ==========================================
   RESET ALL FEATURES
========================================== */

function resetFeatures() {

    const updated =
        updateSettings({

            features: {

                ...defaultFeatures

            }

        });


    return updated.features;

}


/* ==========================================
   INITIALIZE DATABASE
========================================== */

initializeDatabase();


/* ==========================================
   EXPORTS
========================================== */

module.exports = {

    /* Initialization */

    initializeDatabase,


    /* JSON */

    readJSON,

    writeJSON,


    /* Users */

    getUsers,

    getUser,

    addUser,

    updateUser,

    removeUser,

    getAllUsers,


    /* Settings */

    getSettings,

    updateSettings,


    /* Features */

    defaultFeatures,

    getFeatures,

    getFeature,

    updateFeature,

    toggleFeature,

    resetFeatures

};