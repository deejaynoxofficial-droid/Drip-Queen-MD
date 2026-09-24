"use strict";

const fs = require("fs");
const path = require("path");
const config = require("../../config");
const {
    getSettings: getAutoSettings,
    updateSetting: updateAutoSetting,
    DEFAULT_SETTINGS
} = require("../../lib/autoSettings");
const {
    getBotSettings,
    updateBotSetting,
    resetBotSettings
} = require("../../lib/botSettings");

/*
 * Drip Queen MD - Smart Settings Dashboard
 *
 * `.settings` is a live owner-only dashboard. It displays the current
 * configuration and the current ON/OFF state of every editable automatic
 * feature. Creator and bot name are informational only and are deliberately
 * NOT exposed as editable settings.
 *
 * Numeric replies are not used here. Numeric replies remain exclusive to the
 * main `.menu` category selector.
 */

const FEATURE_LABELS = {
    autoRead: "📖 Auto Read",
    autoTyping: "⌨️ Auto Typing",
    autoRecording: "🎙️ Auto Recording",
    alwaysOnline: "🟢 Always Online",
    autoReact: "❤️ Auto React",
    autoStatus: "📡 Auto Status",
    autoReply: "💬 Auto Reply",
    antiDelete: "🗑️ Anti Delete",
    antiLink: "🔗 Anti Link",
    antiCall: "📵 Anti Call",
    welcome: "👋 Welcome",
    goodbye: "👋 Goodbye",
    autoBio: "📝 Auto Bio",
    autoView: "👁️ Auto View"
};

const PROTECTION_COMMANDS = {
    antispam: "🛡️ Anti Spam",
    antiflood: "🌊 Anti Flood",
    antibot: "🤖 Anti Bot",
    antimention: "🔕 Anti Mention",
    antitag: "🏷️ Anti Tag",
    antinsfw: "🔞 Anti NSFW"
};

const FEATURE_ALIASES = {
    read: "autoRead",
    autoread: "autoRead",
    autotyping: "autoTyping",
    typing: "autoTyping",
    autorecording: "autoRecording",
    recording: "autoRecording",
    alwaysonline: "alwaysOnline",
    online: "alwaysOnline",
    autoreact: "autoReact",
    react: "autoReact",
    autostatus: "autoStatus",
    status: "autoStatus",
    autoreply: "autoReply",
    reply: "autoReply",
    antidelete: "antiDelete",
    delete: "antiDelete",
    antilink: "antiLink",
    link: "antiLink",
    anticall: "antiCall",
    call: "antiCall",
    welcome: "welcome",
    goodbye: "goodbye",
    autobio: "autoBio",
    bio: "autoBio",
    autoview: "autoView",
    view: "autoView"
};

function normalizeSender(value) {
    return String(value || "").replace(/[^0-9]/g, "");
}

function isOwner(context) {
    if (context?.isFromMe || context?.isOwner) return true;

    const ownerNumbers = Array.isArray(config.OWNER_NUMBERS)
        ? config.OWNER_NUMBERS
        : [];

    const candidates = [
        context?.sender,
        context?.senderJid,
        context?.from,
        context?.chatId
    ].map(normalizeSender).filter(Boolean);

    return candidates.some(candidate =>
        ownerNumbers.some(owner => candidate === normalizeSender(owner))
    );
}

function status(value) {
    return value ? "🟢 ON" : "🔴 OFF";
}

function footer() {
    return `> ${config.BOT_NAME}\n> Powered by ${config.CREATOR}`;
}

function featureKey(value) {
    const raw = String(value || "").trim().toLowerCase();
    return FEATURE_ALIASES[raw] || raw;
}

function renderSettings() {
    const bot = getBotSettings();
    const auto = getAutoSettings();

    const featureLines = Object.keys(DEFAULT_SETTINGS)
        .map(key => `│ ${FEATURE_LABELS[key] || key} : ${status(auto[key])}`)
        .join("\n");

    const protectionLines = Object.entries(PROTECTION_COMMANDS)
        .map(([key, label]) => `│ ${label} → ${config.PREFIX}${key} on|off`)
        .join("\n");

    return `╔══════════════════════════════╗
║       ⚙️ BOT SETTINGS        ║
╚══════════════════════════════╝

╭─〔 🤖 BOT INFORMATION 〕
│ 🤖 Bot Name : ${bot.botName}
│ 👑 Creator  : ${bot.creator}
╰──────────────────────────────

╭─〔 🛠️ EDITABLE CONFIG 〕
│ 🔹 Prefix : ${bot.prefix}
│ 🌐 Mode   : ${bot.mode}
╰──────────────────────────────

╭─〔 🤖 AUTO FEATURES 〕
${featureLines}
╰──────────────────────────────

╭─〔 ✏️ HOW TO CHANGE 〕
│ 🔹 ${config.PREFIX}settings prefix <prefix>
│ 🌐 ${config.PREFIX}settings mode public|private
│
│ Toggle / set any feature:
│ ${config.PREFIX}settings <feature> on|off
│
│ Example:
│ ${config.PREFIX}settings autoview on
│ ${config.PREFIX}settings autoreact off
│ ${config.PREFIX}settings antilink on
│
│ Or toggle directly:
│ ${config.PREFIX}settings autoview
╰──────────────────────────────

🔄 ${config.PREFIX}settings reset

${footer()}`;
}

function imagePath() {
    const candidates = [
        config.BOT_IMAGE_PATH,
        path.join(config.ASSETS_PATH || path.join(config.ROOT_DIR, "assets"), "bot.png"),
        path.join(config.PUBLIC_PATH || path.join(config.ROOT_DIR, "public"), "bot.png")
    ].filter(Boolean);

    return candidates.find(file => fs.existsSync(file)) || null;
}

async function sendDashboard(context) {
    const caption = renderSettings();
    const img = imagePath();

    if (img && typeof context.sendMessage === "function") {
        try {
            return await context.sendMessage({
                image: { url: img },
                caption
            });
        } catch (error) {
            console.warn("[SETTINGS IMAGE FALLBACK]", error.message);
        }
    }

    return context.reply(caption);
}

function renderFeatureStatus() {
    const auto = getAutoSettings();
    const lines = Object.keys(DEFAULT_SETTINGS)
        .map(key => `${FEATURE_LABELS[key] || key}: ${status(auto[key])}`)
        .join("\n");

    return `🤖 *AUTO FEATURE STATUS*\n\n${lines}\n\n${footer()}`;
}

function renderHelp() {
    return `⚙️ *${config.BOT_NAME} SETTINGS*\n\n` +
        `Use ${config.PREFIX}settings to view the live dashboard.\n\n` +
        `EDITABLE CONFIG\n` +
        `• 🔹 Prefix → ${config.PREFIX}settings prefix <prefix>\n` +
        `• 🌐 Mode → ${config.PREFIX}settings mode public|private\n\n` +
        `AUTO FEATURES\n` +
        Object.entries(FEATURE_LABELS)
            .map(([key, label]) => `• ${label} → ${config.PREFIX}settings ${key} on|off`)
            .join("\n") +
        `\n\nGROUP PROTECTION\n` +
        Object.entries(PROTECTION_COMMANDS)
            .map(([key, label]) => `• ${label} → ${config.PREFIX}${key} on|off`)
            .join("\n") +
        `\n\n💡 Protection switches are group-specific and are changed with their own commands.` +
        `\n\n🔄 ${config.PREFIX}settings reset\n\n${footer()}`;
}

module.exports = {
    name: "settings",
    aliases: ["setting", "config", "botsettings"],
    category: "Owner",
    description: "View and manage bot configuration, automatic features, and group-protection controls.",
    usage: `${config.PREFIX}settings`,

    execute: async (context) => {
        const { args = [], reply, react } = context;

        if (!isOwner(context)) {
            return reply(`❌ Owner only.\n\n${footer()}`);
        }

        try {
            const action = String(args[0] || "").trim().toLowerCase();

            if (!action || ["show", "status", "menu", "list"].includes(action)) {
                await react?.("⚙️");
                return sendDashboard(context);
            }

            if (action === "help") return reply(renderHelp());

            if (["protection", "protections", "security"].includes(action)) {
                const lines = Object.entries(PROTECTION_COMMANDS)
                    .map(([key, label]) => `• ${label} → ${config.PREFIX}${key} on|off`)
                    .join("\n");

                return reply(
                    `🛡️ *GROUP PROTECTION COMMANDS*\n\n` +
                    `${lines}\n\n` +
                    `These settings are stored per group and are controlled by the protection commands.\n\n` +
                    footer()
                );
            }

            if (action === "prefix") {
                const value = String(args[1] || "").trim();
                if (!value || value.length > 3 || /\s/.test(value)) {
                    return reply(`❌ Prefix must be 1-3 characters with no spaces.\nExample: ${config.PREFIX}settings prefix !`);
                }
                updateBotSetting("prefix", value);
                return reply(`✅ Prefix changed to: *${config.PREFIX}*\n\n${footer()}`);
            }

            if (action === "mode") {
                const value = String(args[1] || "").toLowerCase();
                if (!["public", "private"].includes(value)) {
                    return reply(`❌ Use: ${config.PREFIX}settings mode public\nor\n${config.PREFIX}settings mode private`);
                }
                updateBotSetting("mode", value);
                return reply(`✅ Bot mode changed to: *${config.MODE}*\n\n${footer()}`);
            }

            if (["auto", "autofeature", "features", "feature"].includes(action)) {
                const featureArg = String(args[1] || "").trim().toLowerCase();
                if (!featureArg || ["status", "list", "show"].includes(featureArg)) {
                    return reply(renderFeatureStatus());
                }

                const feature = featureKey(featureArg);
                if (!Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, feature)) {
                    return reply(`❌ Unknown auto feature.\n\n${renderFeatureStatus()}`);
                }
                return changeFeature(feature, args[2], reply);
            }

            if (["reset", "restore"].includes(action)) {
                resetBotSettings();
                return sendDashboard(context);
            }

            // Direct feature syntax: .settings autoview on|off|toggle
            const feature = featureKey(action);
            if (Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, feature)) {
                return changeFeature(feature, args[1], reply);
            }

            return reply(`❌ Unknown settings option.\n\n${renderSettings()}`);
        } catch (error) {
            console.error("[SETTINGS COMMAND ERROR]", error.stack || error.message);
            return reply(`❌ Settings error: ${error.message}\n\n${footer()}`);
        }
    }
};

function changeFeature(feature, requestedValue, reply) {
    const current = Boolean(getAutoSettings()[feature]);
    const valueArg = String(requestedValue || "").trim().toLowerCase();

    let next;
    if (!valueArg || valueArg === "toggle") {
        next = !current;
    } else if (["on", "enable", "enabled", "true", "1"].includes(valueArg)) {
        next = true;
    } else if (["off", "disable", "disabled", "false", "0"].includes(valueArg)) {
        next = false;
    } else {
        return reply(`❌ Use: ${config.PREFIX}settings ${feature} on|off\n\nCurrent: ${status(current)}`);
    }

    const saved = updateAutoSetting(feature, next);
    if (!saved) return reply(`❌ Failed to save ${feature}.`);

    return reply(
        `✅ ${FEATURE_LABELS[feature] || feature}: *${status(next)}*\n\n` +
        `Use ${config.PREFIX}settings to view all current settings.\n\n${footer()}`
    );
}
