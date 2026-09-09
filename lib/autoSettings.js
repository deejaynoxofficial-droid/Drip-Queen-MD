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

function getSettings() {
    const data = readFile();
    const features = data.features && typeof data.features === "object"
        ? data.features
        : {};
    return { ...DEFAULT_SETTINGS, ...features };
}

function updateSetting(name, value) {
    if (!Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, name)) {
        return false;
    }

    const data = readFile();
    data.features = {
        ...DEFAULT_SETTINGS,
        ...(data.features || {}),
        [name]: Boolean(value)
    };

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
    updateSetting
};
