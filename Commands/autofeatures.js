const config = require("../config");

const {
    getSettings
} = require("../lib/autoSettings");

// ==========================================
// DRIP QUEEN MD - AUTO FEATURES DASHBOARD
// Creator: NOX STAR TECH
// ==========================================

module.exports = {
    name: "autofeatures",

    aliases: [
        "autofeature",
        "autolist",
        "automenu"
    ],

    category: "Auto Features",

    description:
        "View the status of all automatic bot features.",

    usage:
        `${config.PREFIX}autofeatures`,

    execute: async ({
        reply,
        react
    }) => {
        try {
            const settings = getSettings();

            await react("🤖");

            const status = value =>
                value ? "🟢 ON" : "🔴 OFF";

            await reply(`
╔══════════════════════════════╗
║    🤖 AUTO FEATURES PANEL    ║
╚══════════════════════════════╝

╭─〔 CURRENT STATUS 〕
│
│ ❤️ Auto React
│ ${status(settings.autoReact)}
│
│ 💬 Auto Reply
│ ${status(settings.autoReply)}
│
│ ⌨️ Auto Typing
│ ${status(settings.autoTyping)}
│
│ 🎙️ Auto Recording
│ ${status(settings.autoRecording)}
│
│ 🛡️ Anti Delete
│ ${status(settings.antiDelete)}
│
│ 🔗 Anti Link
│ ${status(settings.antiLink)}
│
│ 👋 Welcome
│ ${status(settings.welcome)}
│
│ 👋 Goodbye
│ ${status(settings.goodbye)}
│
│ 📱 Auto Status
│ ${status(settings.autoStatus)}
│
│ 👁️ Auto View
│ ${status(settings.autoView)}
│
╰────────────────────

╭─〔 AVAILABLE COMMANDS 〕
│
│ ${config.PREFIX}autoreact on/off
│ ${config.PREFIX}autoreply on/off
│ ${config.PREFIX}autotyping on/off
│ ${config.PREFIX}autorecording on/off
│
╰────────────────────

🤖 More Auto Features coming soon!

> ${config.BOT_NAME}
> Created by ${config.CREATOR}
`);

        } catch (error) {
            console.error(
                "[AUTOFEATURES COMMAND ERROR]",
                error.message
            );

            try {
                await reply(
                    "❌ Unable to load Auto Features status."
                );
            } catch {}
        }
    }
};