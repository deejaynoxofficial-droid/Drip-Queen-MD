const config = require("../config");

// ==========================================
// FORMAT BOT RUNTIME
// ==========================================

function formatRuntime(seconds) {
    seconds = Number(seconds);

    if (!Number.isFinite(seconds) || seconds < 0) {
        return "0s";
    }

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];

    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);

    parts.push(`${secs}s`);

    return parts.join(" ");
}

// ==========================================
// FORMAT LARGE NUMBERS
// ==========================================

function formatNumber(number) {
    const num = Number(number);

    if (!Number.isFinite(num)) {
        return "0";
    }

    return new Intl.NumberFormat("en-US").format(num);
}

// ==========================================
// CLEAN PHONE NUMBER
// ==========================================

function cleanPhoneNumber(number) {
    if (!number) return "";

    return String(number).replace(/[^0-9]/g, "");
}

// ==========================================
// CONVERT PHONE NUMBER TO WHATSAPP JID
// ==========================================

function toJid(number) {
    const cleaned = cleanPhoneNumber(number);

    if (!cleaned) return null;

    return `${cleaned}@s.whatsapp.net`;
}

// ==========================================
// GET PHONE NUMBER FROM JID
// ==========================================

function getNumberFromJid(jid) {
    if (!jid) return "";

    return jid.split("@")[0].split(":")[0];
}

// ==========================================
// CHECK IF JID IS A GROUP
// ==========================================

function isGroup(jid) {
    return typeof jid === "string" && jid.endsWith("@g.us");
}

// ==========================================
// EXTRACT MESSAGE TEXT SAFELY
// ==========================================

function getMessageText(message) {
    try {
        if (!message) return "";

        if (message.conversation) {
            return message.conversation;
        }

        if (message.extendedTextMessage?.text) {
            return message.extendedTextMessage.text;
        }

        if (message.imageMessage?.caption) {
            return message.imageMessage.caption;
        }

        if (message.videoMessage?.caption) {
            return message.videoMessage.caption;
        }

        if (message.documentMessage?.caption) {
            return message.documentMessage.caption;
        }

        return "";
    } catch (error) {
        return "";
    }
}

// ==========================================
// PARSE COMMAND
// ==========================================

function parseCommand(text) {
    if (!text || typeof text !== "string") {
        return null;
    }

    const prefix = config.PREFIX;

    if (!text.startsWith(prefix)) {
        return null;
    }

    const body = text.slice(prefix.length).trim();

    if (!body) {
        return null;
    }

    const args = body.split(/\s+/);
    const command = args.shift().toLowerCase();

    return {
        command,
        args,
        text: args.join(" "),
        prefix
    };
}

// ==========================================
// DELAY FUNCTION
// ==========================================

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ==========================================
// RANDOM ARRAY ITEM
// ==========================================

function getRandom(array) {
    if (!Array.isArray(array) || array.length === 0) {
        return null;
    }

    return array[Math.floor(Math.random() * array.length)];
}

// ==========================================
// GET CURRENT DATE
// ==========================================

function getDate() {
    return new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });
}

// ==========================================
// GET CURRENT TIME
// ==========================================

function getTime() {
    return new Date().toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    });
}

// ==========================================
// GET FULL DATE AND TIME
// ==========================================

function getDateTime() {
    return new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    });
}

// ==========================================
// SAFE JSON PARSER
// ==========================================

function safeJSONParse(data, fallback = {}) {
    try {
        return JSON.parse(data);
    } catch {
        return fallback;
    }
}

// ==========================================
// CAPITALIZE TEXT
// ==========================================

function capitalize(text) {
    if (!text || typeof text !== "string") {
        return "";
    }

    return text.charAt(0).toUpperCase() + text.slice(1);
}

// ==========================================
// EXPORT FUNCTIONS
// ==========================================

module.exports = {
    formatRuntime,
    formatNumber,

    cleanPhoneNumber,
    toJid,
    getNumberFromJid,
    isGroup,

    getMessageText,
    parseCommand,

    sleep,
    getRandom,

    getDate,
    getTime,
    getDateTime,

    safeJSONParse,
    capitalize
};