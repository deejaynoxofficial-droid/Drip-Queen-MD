"use strict";

const fs = require("fs");
const path = require("path");
const config = require("../config");

const BOT_KEYS = ["prefix", "mode"];

function readData() {
    try {
        if (!fs.existsSync(config.SETTINGS_DB)) return {};
        const parsed = JSON.parse(fs.readFileSync(config.SETTINGS_DB, "utf8") || "{}");
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
        console.error("[BOT SETTINGS READ ERROR]", error.message);
        return {};
    }
}

function writeData(data) {
    fs.mkdirSync(path.dirname(config.SETTINGS_DB), { recursive: true });
    fs.writeFileSync(config.SETTINGS_DB, JSON.stringify(data, null, 2), "utf8");
    return true;
}

function normalizeUserId(value) {
    return String(value || "").replace(/\D/g, "");
}

function getUserSettings(data, userId) {
    const normalized = normalizeUserId(userId);
    if (!normalized) return {};
    const user = data.users?.[normalized];
    return user?.settings && typeof user.settings === "object" ? user.settings : {};
}

function getBotSettings(userId) {
    const data = readData();
    const user = getUserSettings(data, userId);

    return {
        botName: data.botName || config.BOT_NAME,
        creator: data.creator || config.CREATOR,
        prefix: user.prefix || data.prefix || config.PREFIX,
        mode: user.mode || data.mode || config.MODE
    };
}

function updateBotSetting(key, value, userId) {
    if (!BOT_KEYS.includes(key)) return false;

    const data = readData();
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
                [key]: key === "mode" ? String(value).toLowerCase() : String(value)
            }
        };
    } else {
        data[key] = String(value);
    }

    writeData(data);
    return true;
}

function updateFooter(botName, creator) {
    const data = readData();
    if (botName) data.botName = String(botName).trim();
    if (creator) data.creator = String(creator).trim();
    writeData(data);
    return true;
}

function resetBotSettings(userId) {
    const data = readData();
    const normalized = normalizeUserId(userId);

    if (normalized) {
        if (data.users?.[normalized]?.settings) {
            delete data.users[normalized].settings.prefix;
            delete data.users[normalized].settings.mode;
        }
    } else {
        delete data.prefix;
        delete data.mode;
    }

    writeData(data);
    return true;
}

module.exports = {
    BOT_KEYS,
    getBotSettings,
    updateBotSetting,
    updateFooter,
    resetBotSettings,
    normalizeUserId
};
