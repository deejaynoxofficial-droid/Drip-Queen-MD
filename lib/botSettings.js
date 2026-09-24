"use strict";

const fs = require("fs");
const path = require("path");
const config = require("../config");

const BOT_KEYS = ["botName", "creator", "prefix", "mode"];

function readData() {
    try {
        if (!fs.existsSync(config.SETTINGS_DB)) return {};
        const parsed = JSON.parse(fs.readFileSync(config.SETTINGS_DB, "utf8"));
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

function getBotSettings() {
    const data = readData();
    return {
        botName: data.botName || config.BOT_NAME,
        creator: data.creator || config.CREATOR,
        prefix: data.prefix || config.PREFIX,
        mode: data.mode || config.MODE
    };
}

function updateBotSetting(key, value) {
    if (!BOT_KEYS.includes(key)) return false;

    const data = readData();
    data[key] = String(value);
    writeData(data);

    if (key === "botName") config.BOT_NAME = String(value);
    if (key === "creator") config.CREATOR = String(value);
    if (key === "prefix") config.PREFIX = String(value);
    if (key === "mode") config.MODE = String(value).toLowerCase();

    return true;
}

function updateFooter(botName, creator) {
    const data = readData();
    if (botName) {
        data.botName = String(botName).trim();
        config.BOT_NAME = data.botName;
    }
    if (creator) {
        data.creator = String(creator).trim();
        config.CREATOR = data.creator;
    }
    writeData(data);
    return true;
}

function resetBotSettings() {
    // Creator and bot name are intentionally read-only in the Settings
    // dashboard. Reset only the editable basic configuration.
    const data = readData();
    delete data.prefix;
    delete data.mode;
    writeData(data);

    config.PREFIX = process.env.PREFIX || ".";
    config.MODE = process.env.MODE || "public";
    return true;
}

module.exports = {
    BOT_KEYS,
    getBotSettings,
    updateBotSetting,
    updateFooter,
    resetBotSettings
};
