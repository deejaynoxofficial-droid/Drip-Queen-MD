"use strict";

const fs = require("fs");
const config = require("../config");

const DEFAULT_SETTINGS = {
    autoRead: false,
    autoTyping: false,
    autoRecording: false,
    alwaysOnline: false,
    autoReact: false,
    autoStatus: false,
    autoReply: false,
    antiDelete: false,
    antiLink: false,
    antiCall: false,
    welcome: false,
    goodbye: false,
    autoBio: false,
    autoView: false
};

function readFile() {
    try {
        if (!fs.existsSync(config.SETTINGS_DB)) {
            return {};
        }
        const parsed = JSON.parse(fs.readFileSync(config.SETTINGS_DB, "utf8"));
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
        console.error("[AUTO SETTINGS READ ERROR]", error.message);
        return {};
    }
}

function normalizeUserId(value) {
    return String(value || "").replace(/\D/g, "");
}

function getUserFeatures(data, userId) {
    const normalized = normalizeUserId(userId);
    if (!normalized) {
        return data.features && typeof data.features === "object"
            ? data.features
            : {};
    }

    const users = data.users && typeof data.users === "object" ? data.users : {};
    const user = users[normalized] && typeof users[normalized] === "object"
        ? users[normalized]
        : {};

    if (user.settings?.features && typeof user.settings.features === "object") {
        return user.settings.features;
    }

    // Existing installations may still have a legacy global feature set.
    // Use it as the initial baseline for a user, without writing it back.
    return data.features && typeof data.features === "object"
        ? data.features
        : {};
}

function getSettings(userId) {
    const data = readFile();
    const features = getUserFeatures(data, userId);
    return { ...DEFAULT_SETTINGS, ...features };
}

function updateSetting(name, value, userId) {
    if (!Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, name)) {
        return false;
    }

    const data = readFile();
    const normalized = normalizeUserId(userId);

    if (normalized) {
        data.users = data.users && typeof data.users === "object" ? data.users : {};
        const currentUser = data.users[normalized] && typeof data.users[normalized] === "object"
            ? data.users[normalized]
            : {};
        const currentSettings = currentUser.settings && typeof currentUser.settings === "object"
            ? currentUser.settings
            : {};

        data.users[normalized] = {
            ...currentUser,
            settings: {
                ...currentSettings,
                features: {
                    ...DEFAULT_SETTINGS,
                    ...(data.features || {}),
                    ...(currentSettings.features || {}),
                    [name]: Boolean(value)
                }
            }
        };
    } else {
        // Keep the legacy/global store for admin or system-level callers.
        data.features = {
            ...DEFAULT_SETTINGS,
            ...(data.features || {}),
            [name]: Boolean(value)
        };
    }

    try {
        fs.mkdirSync(config.DATABASE_PATH, { recursive: true });
        fs.writeFileSync(config.SETTINGS_DB, JSON.stringify(data, null, 2), "utf8");
        return true;
    } catch (error) {
        console.error("[AUTO SETTINGS WRITE ERROR]", error.message);
        return false;
    }
}

module.exports = {
    DEFAULT_SETTINGS,
    getSettings,
    updateSetting,
    normalizeUserId
};
